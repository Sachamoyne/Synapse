import express, { Request, Response } from "express";
// @ts-ignore stripe types may be missing in local env; present in prod deps
import Stripe from "stripe";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const router = express.Router();

type Plan = "starter" | "pro";

// Initialize Stripe instance (lazy - only when needed)
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }

  stripeInstance = new Stripe(secretKey);

  return stripeInstance;
}

/**
 * POST /stripe/checkout
 * Creates a Stripe Checkout Session for subscription.
 * Supports:
 * - Authenticated calls (Authorization header via requireAuth middleware)
 * - Unauthenticated calls if userId is provided (for paid onboarding before email confirmation)
 */
router.post("/checkout", async (req: Request, res: Response) => {
  try {
    console.log("[STRIPE/CHECKOUT] Request received");

    // If requireAuth is enabled, userId is injected by middleware.
    // Otherwise we allow passing userId explicitly for paid onboarding.
    const authedUserId = (req as any).userId as string | undefined;
    const bodyUserId = (req.body as { userId?: string } | undefined)?.userId;
    const userId = authedUserId || bodyUserId;

    if (!userId) {
      console.error("[STRIPE/CHECKOUT] No valid user token");
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing userId",
      });
    }

    // Extract and type the plan from request body
    const { plan } = req.body as { plan?: Plan };

    // Validate plan is provided and is either "starter" or "pro"
    if (plan !== "starter" && plan !== "pro") {
      return res.status(400).json({
        error: "INVALID_PLAN",
        message: "Plan must be 'starter' or 'pro'",
      });
    }

    // At this point, TypeScript knows plan is "starter" | "pro"
    // Define price ID mapping with strict typing
    const PRICE_IDS: Record<Plan, string | undefined> = {
      starter: process.env.SOMA_STARTER_PRICE_ID || process.env.STRIPE_STARTER_PRICE_ID,
      pro: process.env.SOMA_PRO_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID,
    };

    // Access price_id after validation - TypeScript knows plan is Plan
    const priceId = PRICE_IDS[plan];

    if (!priceId) {
      console.error(`[STRIPE/CHECKOUT] Missing price_id for plan: ${plan}`);
      return res.status(500).json({
        error: "MISSING_PRICE_ID",
        message: `Missing Stripe price_id for plan: ${plan}. Please configure SOMA_${plan.toUpperCase()}_PRICE_ID or STRIPE_${plan.toUpperCase()}_PRICE_ID environment variable.`,
      });
    }

    // Get frontend URL for success/cancel redirects
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      console.error("[STRIPE/CHECKOUT] Missing FRONTEND_URL");
      return res.status(500).json({
        error: "MISSING_CONFIGURATION",
        message: "FRONTEND_URL environment variable is not set",
      });
    }

    // Initialize Stripe
    const stripe = getStripe();

    // Get or create Stripe customer for the user
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.error("[STRIPE/CHECKOUT] Missing Supabase configuration");
      return res.status(500).json({
        error: "MISSING_CONFIGURATION",
        message: "Supabase configuration not set",
      });
    }

    const supabase = createSupabaseClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user profile to check for existing Stripe customer ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, stripe_customer_id, onboarding_status, subscription_status, plan_name")
      .eq("id", userId)
      .single();

    // Prevent double payment if already active
    const onboardingStatus = (profile as any)?.onboarding_status as string | null | undefined;
    const legacySubscriptionStatus = (profile as any)?.subscription_status as string | null | undefined;
    if (onboardingStatus === "active" || legacySubscriptionStatus === "active") {
      return res.status(409).json({
        error: "ALREADY_ACTIVE",
        message: "Subscription already active",
      });
    }

    let customerId = profile?.stripe_customer_id;

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || undefined,
        metadata: {
          supabase_user_id: userId,
        },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${frontendUrl}/decks?checkout=success`,
      cancel_url: `${frontendUrl}/pricing`,
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          plan_name: plan,
        },
      },
      metadata: {
        supabase_user_id: userId,
        plan_name: plan,
      },
    });

    if (!session.url) {
      console.error("[STRIPE/CHECKOUT] Stripe session created but URL is missing");
      return res.status(500).json({
        error: "STRIPE_ERROR",
        message: "Failed to create checkout session URL",
      });
    }

    console.log(`[STRIPE/CHECKOUT] Session created: ${session.id} for plan: ${plan}`);
    return res.json({ url: session.url });
  } catch (error) {
    console.error("[STRIPE/CHECKOUT] Error:", error);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

/**
 * POST /stripe/webhook
 * Stripe sends checkout.session.completed here.
 * We verify the signature and then activate the user's onboarding status.
 *
 * IMPORTANT: this handler MUST be wired with express.raw({ type: "application/json" }) in index.ts.
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[STRIPE/WEBHOOK] Missing STRIPE_WEBHOOK_SECRET");
      return res.status(500).send("Missing webhook configuration");
    }

    const stripe = getStripe();
    const signature = req.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
      console.error("[STRIPE/WEBHOOK] Missing stripe-signature header");
      return res.status(400).send("Missing signature");
    }

    // req.body is a Buffer because of express.raw()
    const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);

    if (event.type !== "checkout.session.completed") {
      return res.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const supabaseUserId =
      (session.metadata?.supabase_user_id as string | undefined) ||
      ((session.subscription as any)?.metadata?.supabase_user_id as string | undefined);
    const planName = session.metadata?.plan_name as Plan | undefined;

    if (!supabaseUserId) {
      console.error("[STRIPE/WEBHOOK] Missing supabase_user_id in metadata");
      return res.status(400).send("Missing supabase_user_id");
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      console.error("[STRIPE/WEBHOOK] Missing Supabase configuration");
      return res.status(500).send("Missing Supabase configuration");
    }

    const supabase = createSupabaseClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Activate onboarding + set plan fields correctly.
    // CRITICAL: Both `plan` and `plan_name` must be set to the paid plan.
    // This overwrites any incorrect values (e.g., plan="free" from signup).
    const updatePayload: Record<string, unknown> = {
      onboarding_status: "active",
      subscription_status: "active",
    };
    if (planName === "starter" || planName === "pro") {
      updatePayload.plan = planName;
      updatePayload.plan_name = planName;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", supabaseUserId);

    if (updateError) {
      console.error("[STRIPE/WEBHOOK] Failed to update profile:", updateError);
      return res.status(500).send("Failed to update profile");
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("[STRIPE/WEBHOOK] Error:", error);
    return res.status(400).send("Webhook Error");
  }
}

export default router;
