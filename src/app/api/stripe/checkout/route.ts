import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getStripePriceId } from "@/lib/stripe";

const requestSchema = z.object({
  plan: z.enum(["starter", "pro"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan } = requestSchema.parse(body);

    // Get price ID for the plan (throws if missing)
    let priceId: string;
    try {
      priceId = getStripePriceId(plan);
    } catch (error) {
      console.error(`[stripe/checkout] Missing price_id for plan ${plan}:`, error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Price ID not configured for this plan" },
        { status: 500 }
      );
    }

    // Get base URL from request headers
    const origin = request.headers.get("origin") || "http://localhost:3000";

    // Initialize Stripe (lazy, inside request handler)
    const stripe = getStripe();

    // Try to authenticate user (optional - for existing users upgrading)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let customerId: string | undefined;
    let metadata: Record<string, string> = {
      plan_name: plan,
    };

    if (user) {
      // Existing user: use their customer ID or create one
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .single();

      customerId = profile?.stripe_customer_id;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            supabase_user_id: user.id,
          },
        });
        customerId = customer.id;

        await supabase
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", user.id);
      }

      metadata.supabase_user_id = user.id;
    }
    // If no user, Stripe will collect email and create customer automatically

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      ...(customerId ? { customer: customerId } : {}),
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/signup?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      subscription_data: {
        metadata,
      },
      metadata,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: `Validation error: ${error.message}` },
        { status: 400 }
      );
    }
    console.error("[stripe/checkout] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
