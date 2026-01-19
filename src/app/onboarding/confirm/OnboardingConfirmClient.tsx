"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";

/**
 * Handles email confirmation redirect from Supabase.
 * After email confirmation, resumes the onboarding flow:
 * - FREE → redirect to /decks
 * - STARTER/PRO with pending subscription → trigger Stripe checkout
 * - STARTER/PRO with active subscription → redirect to /decks
 * 
 * NOTE: Supabase automatically exchanges the OTP code in the confirmation link
 * before this component runs. We should NEVER call exchangeCodeForSession manually.
 */
export default function OnboardingConfirmClient() {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleConfirmation() {
      try {
        // Get current session (Supabase has already exchanged the OTP code automatically)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          console.error("[onboarding/confirm] No session found:", sessionError);
          setError("No active session. Please log in.");
          setStatus("error");
          return;
        }

        // Verify email is confirmed
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email_confirmed_at) {
          setError("Email not confirmed. Please check your inbox.");
          setStatus("error");
          return;
        }

        // Get plan_name from user_metadata (stored during signup)
        const planName = (user.user_metadata?.plan_name as string) || "free";

        // Check if profile already exists (idempotent check)
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("plan_name, subscription_status")
          .eq("id", user.id)
          .single();

        // Profile does NOT exist → create it NOW (after email confirmation)
        if (!existingProfile) {
          // Determine subscription_status based on plan
          const subscriptionStatus = planName === "free" ? "active" : "pending";

          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
              {
                id: user.id,
                email: user.email || "",
                role: "user",
                plan: "free", // Default plan, will be updated by webhook for paid plans
                plan_name: planName,
                subscription_status: subscriptionStatus,
              },
              {
                onConflict: "id",
                ignoreDuplicates: false,
              }
            );

          if (profileError) {
            console.error("[onboarding/confirm] Failed to create profile:", profileError);
            setError("Failed to create profile. Please try again.");
            setStatus("error");
            return;
          }

          // Profile created successfully - proceed to next step
        }

        // Profile exists or was just created - get current status
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan_name, subscription_status")
          .eq("id", user.id)
          .single();

        const currentPlanName = (profile as any)?.plan_name || planName;
        const subscriptionStatus = (profile as any)?.subscription_status;

        // FREE plan → redirect to app
        if (!currentPlanName || currentPlanName === "free") {
          router.replace("/decks");
          router.refresh();
          return;
        }

        // STARTER/PRO plan → check subscription status
        if (currentPlanName === "starter" || currentPlanName === "pro") {
          // If subscription is already active → redirect to app
          if (subscriptionStatus === "active") {
            router.replace("/decks");
            router.refresh();
            return;
          }

          // If subscription is pending → trigger Stripe checkout
          if (subscriptionStatus === "pending") {
            await triggerCheckout(currentPlanName, user.id);
            return;
          }

          // No subscription status or unexpected state → set to pending and trigger checkout
          await supabase
            .from("profiles")
            .update({
              plan_name: currentPlanName,
              subscription_status: "pending",
            })
            .eq("id", user.id);

          await triggerCheckout(currentPlanName, user.id);
          return;
        }

        // Unknown plan → default to /decks
        router.replace("/decks");
        router.refresh();
      } catch (err: any) {
        console.error("[onboarding/confirm] Error:", err);
        setError(err.message || "An error occurred. Please try again.");
        setStatus("error");
      }
    }

    async function triggerCheckout(plan: "starter" | "pro", userId: string) {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (!backendUrl) {
          throw new Error("Backend URL not configured");
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error("Authentication error: no access token");
        }

        const response = await fetch(`${backendUrl}/stripe/checkout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ plan }),
        });

        const data = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !data.url) {
          throw new Error(data.error || `Checkout failed (HTTP ${response.status})`);
        }

        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } catch (err: any) {
        console.error("[onboarding/confirm] Checkout error:", err);
        setError(err.message || "Failed to initiate payment. Please try again.");
        setStatus("error");
      }
    }

    void handleConfirmation();
  }, [router, supabase]);

  if (status === "error") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <BrandLogo size={48} iconSize={28} className="mx-auto mb-6" />
          <h1 className="text-2xl font-semibold text-white font-serif mb-4">
            Error
          </h1>
          <p className="text-white/60 mb-6">{error}</p>
          <button
            onClick={() => router.push("/pricing")}
            className="px-4 py-2 bg-white text-slate-900 rounded-lg hover:bg-white/90 transition-colors"
          >
            Return to Pricing
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="text-center">
        <BrandLogo size={48} iconSize={28} className="mx-auto mb-6 animate-pulse" />
        <p className="text-white/60">Confirming your email...</p>
      </div>
    </div>
  );
}
