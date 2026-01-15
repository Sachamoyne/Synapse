import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const PLAN_LIMITS: Record<string, number> = {
  starter: 800,
  pro: 2500,
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  // Initialize Supabase service client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("[stripe-webhook] Missing Supabase configuration");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const supabase = createServiceClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;

        if (!userId || !plan || !["starter", "pro"].includes(plan)) {
          console.error("[stripe-webhook] Invalid session metadata:", session.metadata);
          return NextResponse.json({ received: true });
        }

        const limit = PLAN_LIMITS[plan];
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        nextMonth.setHours(0, 0, 0, 0);

        // Update or create user profile
        const { error: updateError } = await supabase
          .from("profiles")
          .upsert(
            {
              user_id: userId,
              plan: plan,
              ai_cards_monthly_limit: limit,
              ai_cards_used_current_month: 0,
              ai_quota_reset_at: nextMonth.toISOString(),
            },
            {
              onConflict: "user_id",
            }
          );

        if (updateError) {
          console.error("[stripe-webhook] Failed to update profile:", updateError);
          return NextResponse.json(
            { error: "Failed to update user profile" },
            { status: 500 }
          );
        }

        console.log(`[stripe-webhook] Updated user ${userId} to plan ${plan}`);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (!userId) {
          // Try to get from customer
          const customer = await stripe.customers.retrieve(
            subscription.customer as string
          );
          if (typeof customer === "object" && customer.metadata?.user_id) {
            const userIdFromCustomer = customer.metadata.user_id;
            const plan =
              subscription.status === "active" &&
              subscription.items.data[0]?.price.id ===
                process.env.STRIPE_PRO_PRICE_ID
                ? "pro"
                : subscription.status === "active" &&
                    subscription.items.data[0]?.price.id ===
                      process.env.STRIPE_STARTER_PRICE_ID
                  ? "starter"
                  : "free";

            const limit = plan === "free" ? 0 : PLAN_LIMITS[plan];
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            nextMonth.setDate(1);
            nextMonth.setHours(0, 0, 0, 0);

            await supabase.from("profiles").upsert(
              {
                user_id: userIdFromCustomer,
                plan: plan,
                ai_cards_monthly_limit: limit,
                ai_quota_reset_at: nextMonth.toISOString(),
              },
              { onConflict: "user_id" }
            );
          }
        }
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe-webhook] Error processing event:", error);
    return NextResponse.json(
      { error: "Error processing webhook" },
      { status: 500 }
    );
  }
}
