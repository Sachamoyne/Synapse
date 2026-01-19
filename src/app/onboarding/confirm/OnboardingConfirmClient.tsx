"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";

/**
 * Handles email confirmation redirect from Supabase.
 * After email confirmation, resumes the onboarding flow:
 * - FREE → redirect to /decks
 * - STARTER/PRO with pending subscription → trigger Stripe checkout
 * - STARTER/PRO with active subscription → redirect to /decks
 */
export default function OnboardingConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleConfirmation() {
      try {
        // Exchange code for session if present (email confirmation redirect)
        const code = searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("[onboarding/confirm] Failed to exchange code:", exchangeError);
            setError("Failed to confirm email. Please try again.");
            setStatus("error");
            return;
          }
        }

        // Get current session
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

        // Get user profile to determine next step
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("plan_name, subscription_status")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("[onboarding/confirm] Failed to fetch profile:", profileError);
          // Profile might not exist yet - create it with free plan
          await supabase.from("profiles").upsert(
            {
              id: user.id,
              email: user.email || "",
              role: "user",
              plan: "free",
            },
            { onConflict: "id", ignoreDuplicates: false }
          );
          // Redirect to app (free plan by default)
          router.replace("/decks");
          router.refresh();
          return;
        }

        const planName = (profile as any)?.plan_name;
        const subscriptionStatus = (profile as any)?.subscription_status;

        // FREE plan → redirect to app
        if (!planName || planName === "free") {
          router.replace("/decks");
          router.refresh();
          return;
        }

        // STARTER/PRO plan → check subscription status
        if (planName === "starter" || planName === "pro") {
          // If subscription is already active → redirect to app
          if (subscriptionStatus === "active") {
            router.replace("/decks");
            router.refresh();
            return;
          }

          // If subscription is pending → trigger Stripe checkout
          if (subscriptionStatus === "pending") {
            await triggerCheckout(planName, user.id);
            return;
          }

          // No subscription status → create profile with pending status and trigger checkout
          await supabase
            .from("profiles")
            .update({
              plan_name: planName,
              subscription_status: "pending",
            })
            .eq("id", user.id);

          await triggerCheckout(planName, user.id);
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
  }, [router, searchParams, supabase]);

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
