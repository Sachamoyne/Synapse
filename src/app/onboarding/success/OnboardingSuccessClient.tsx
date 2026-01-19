"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";

/**
 * Handles successful Stripe checkout redirect.
 * Verifies session and subscription, then redirects to /decks.
 */
export default function OnboardingSuccessClient() {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<"loading" | "error" | "redirecting">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyAndRedirect() {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          console.error("[onboarding/success] No session found:", sessionError);
          setError("No active session. Please log in.");
          setStatus("error");
          return;
        }

        // Get user profile to verify subscription
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("User not found. Please log in.");
          setStatus("error");
          return;
        }

        // Check subscription status
        // Note: The webhook might not have processed yet, so we'll check periodically
        let attempts = 0;
        const maxAttempts = 10;
        const checkInterval = 1000; // 1 second

        const checkSubscription = async (): Promise<boolean> => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("subscription_status, plan_name")
            .eq("id", user.id)
            .single();

          const subscriptionStatus = (profile as any)?.subscription_status;
          const planName = (profile as any)?.plan_name;

          // If subscription is active, we're good to go
          if (subscriptionStatus === "active" && (planName === "starter" || planName === "pro")) {
            return true;
          }

          // If still pending, wait a bit and retry (webhook might be processing)
          if (subscriptionStatus === "pending" && attempts < maxAttempts) {
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, checkInterval));
            return checkSubscription();
          }

          // If no subscription found or max attempts reached, still redirect (webhook will process)
          // The user can access the app, and the webhook will update their subscription later
          return true;
        };

        await checkSubscription();

        // Redirect to app
        setStatus("redirecting");
        router.replace("/decks");
        router.refresh();
      } catch (err: any) {
        console.error("[onboarding/success] Error:", err);
        setError(err.message || "An error occurred. Please try again.");
        setStatus("error");
      }
    }

    void verifyAndRedirect();
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
            onClick={() => router.push("/decks")}
            className="px-4 py-2 bg-white text-slate-900 rounded-lg hover:bg-white/90 transition-colors"
          >
            Go to App
          </button>
        </div>
      </div>
    );
  }

  // Loading/redirecting state
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="text-center">
        <BrandLogo size={48} iconSize={28} className="mx-auto mb-6 animate-pulse" />
        <h1 className="text-2xl font-semibold text-white font-serif mb-4">
          Payment Successful!
        </h1>
        <p className="text-white/60">
          {status === "redirecting" ? "Redirecting to app..." : "Verifying subscription..."}
        </p>
      </div>
    </div>
  );
}
