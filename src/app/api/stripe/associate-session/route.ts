import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, PLANS, PlanName } from "@/lib/stripe";

/**
 * Associates a Stripe checkout session with a newly created Supabase user account.
 * Called after signup for paid plans to link the payment to the user.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId || !sessionId.startsWith("cs_")) {
      return NextResponse.json(
        { error: "Invalid session ID" },
        { status: 400 }
      );
    }

    // Authenticate user (must be logged in)
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Verify payment status
    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 402 }
      );
    }

    // Update session metadata with user ID
    await stripe.checkout.sessions.update(sessionId, {
      metadata: {
        ...session.metadata,
        supabase_user_id: user.id,
      },
    });

    // Update subscription metadata if it exists
    if (session.subscription && typeof session.subscription === "string") {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      await stripe.subscriptions.update(session.subscription, {
        metadata: {
          ...subscription.metadata,
          supabase_user_id: user.id,
        },
      });
    }

    // Update customer metadata if it exists
    if (session.customer && typeof session.customer === "string") {
      await stripe.customers.update(session.customer, {
        metadata: {
          supabase_user_id: user.id,
        },
      });

      // Save customer ID to profile
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: session.customer })
        .eq("id", user.id);
    }

    // Trigger webhook processing by retrieving the subscription
    // The webhook will process it now that metadata is updated
    if (session.subscription && typeof session.subscription === "string") {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      const planName = session.metadata?.plan_name as PlanName;
      
      if (planName === "starter" || planName === "pro") {
        const plan = PLANS[planName];
        // Manually trigger subscription activation (same logic as webhook)
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            subscription_id: subscription.id,
            subscription_status: subscription.status,
            plan_name: planName,
            ai_cards_monthly_limit: plan.aiCardsPerMonth,
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
          })
          .eq("id", user.id);

        if (updateError) {
          console.error("[associate-session] Failed to update profile:", updateError);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[stripe/associate-session] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
