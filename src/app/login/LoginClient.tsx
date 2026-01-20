"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, CheckCircle, Mail } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { BrandLogo } from "@/components/BrandLogo";
import { Playfair_Display } from "next/font/google";
import { useTranslation } from "@/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { mapAuthError } from "@/lib/auth-errors";

const playfair = Playfair_Display({ subsets: ["latin"] });

export default function LoginClient() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paidEmailPending, setPaidEmailPending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Check for checkout=success in URL (user just paid)
  const checkoutSuccess = searchParams.get("checkout") === "success";

  useEffect(() => {
    // If a valid session already exists, redirect away from /login
    let cancelled = false;

    async function checkSession() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        // Handle auth errors gracefully - don't show "loader failed"
        if (userError) {
          console.log("[LoginPage] No active session or auth error:", userError.message);
          // This is normal for users who aren't logged in - don't show error
          return;
        }

        if (!cancelled && user) {
          // Get profile to check onboarding status and plan
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("onboarding_status, plan_name, plan")
            .eq("id", user.id)
            .single();

          // Handle profile fetch errors gracefully
          if (profileError && profileError.code !== "PGRST116") {
            console.error("[LoginPage] Profile fetch error:", profileError);
            // Don't show error to user, just let them log in normally
          }

          const onboardingStatus = profile?.onboarding_status as string | null | undefined;
          const planName = profile?.plan_name as string | null | undefined;
          const plan = profile?.plan as string | null | undefined;

          // Also check user metadata for plan info (in case profile hasn't been updated yet)
          const metaPlanName = user.user_metadata?.plan_name as string | undefined;

          // CRITICAL: Check both plan and plan_name to determine if user is paid
          const isPaid = planName === "starter" || planName === "pro" ||
                         plan === "starter" || plan === "pro" ||
                         metaPlanName === "starter" || metaPlanName === "pro";

          // RULE #1: If onboarding_status === "active", user can access the app
          // This is the PRIMARY check - payment was validated by Stripe webhook
          if (onboardingStatus === "active") {
            // For paid users without email confirmation, they can still access
            // For free users, email confirmation is required
            if (!isPaid && !user.email_confirmed_at) {
              await supabase.auth.signOut();
              setError("Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception.");
              return;
            }
            router.replace("/decks");
            router.refresh();
            return;
          }

          // RULE #2: Paid user with pending_payment - redirect to Stripe checkout
          if (onboardingStatus === "pending_payment") {
            // If email not confirmed, show message but don't block payment flow
            if (!user.email_confirmed_at) {
              setPaidEmailPending(true);
            }

            // Try to redirect to checkout
            try {
              const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
              const checkoutPlan = planName || plan || metaPlanName || "starter";
              if (backendUrl && (checkoutPlan === "starter" || checkoutPlan === "pro")) {
                const { data: { session } } = await supabase.auth.getSession();
                const checkoutResponse = await fetch(`${backendUrl}/stripe/checkout`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                  },
                  body: JSON.stringify({ plan: checkoutPlan, userId: user.id }),
                });

                const checkoutData = (await checkoutResponse.json()) as {
                  url?: string;
                  error?: string;
                };

                if (checkoutResponse.ok && checkoutData.url) {
                  window.location.href = checkoutData.url;
                  return;
                }
              }
            } catch (err) {
              console.error("[login] Failed to trigger checkout:", err);
            }

            setError("Votre paiement n'a pas encore été finalisé. Veuillez compléter le paiement.");
            return;
          }

          // RULE #3: No profile - wait for server-side creation
          if (!profile) {
            setError("Votre profil est en cours de création. Veuillez patienter quelques instants et réessayer.");
            return;
          }

          // RULE #4: Free user without email confirmation
          if (!user.email_confirmed_at) {
            await supabase.auth.signOut();
            setError("Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception.");
            return;
          }

          // Fallback: unknown state
          setError("État du compte non reconnu. Veuillez contacter le support.");
        }
      } catch (error) {
        // Catch all errors - don't let them bubble up as "loader failed"
        console.error("[LoginPage] Failed to check existing session:", error);
        // Don't set error for session check failures - just let user try to log in
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log("[LoginPage] Starting Google OAuth sign in...");

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oauthError) {
        console.error("[LoginPage] Google OAuth error:", oauthError);
        const authError = mapAuthError(oauthError, "signin");
        setError(authError.message);
        setLoading(false);
        return;
      }

      console.log("[LoginPage] Google OAuth initiated successfully:", data);
    } catch (err) {
      console.error("[LoginPage] Unexpected error during Google sign in:", err);
      const authError = mapAuthError(err, "signin");
      setError(authError.message || "Erreur lors de la connexion avec Google. Veuillez réessayer.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setPaidEmailPending(false);

    try {
      // SIGN IN only (existing accounts)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Handle specific Supabase auth errors with clear messages
      if (signInError) {
        console.log("[LoginPage] Sign in error:", signInError.message, signInError.status);

        // Check for specific error types
        if (signInError.message?.includes("Email not confirmed") ||
            signInError.message?.includes("email_not_confirmed")) {
          setError("Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception (et les spams).");
          return;
        }

        if (signInError.message?.includes("Invalid login credentials") ||
            signInError.status === 400) {
          setError("Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.");
          return;
        }

        // Generic auth error handling
        const authError = mapAuthError(signInError, "signin");
        setError(authError.message);
        return;
      }

      const user = signInData.user;
      if (!user) {
        setError("Aucun compte trouvé avec cet email.");
        return;
      }

      // Get user metadata for paid plan detection
      const userMetadata = user.user_metadata || {};
      const metaPlanName = userMetadata.plan_name as string | undefined;

      // Check profile status
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("onboarding_status, plan_name, plan")
        .eq("id", user.id)
        .single();

      // Handle profile fetch error gracefully
      if (profileError && profileError.code !== "PGRST116") {
        console.error("[LoginPage] Profile fetch error:", profileError);
      }

      const onboardingStatus = profile?.onboarding_status as string | null | undefined;
      const planName = profile?.plan_name as string | null | undefined;
      const plan = profile?.plan as string | null | undefined;

      // CRITICAL: Check both plan, plan_name AND user metadata to determine if user is paid
      const isPaid = planName === "starter" || planName === "pro" ||
                     plan === "starter" || plan === "pro" ||
                     metaPlanName === "starter" || metaPlanName === "pro";

      // RULE #1: If onboarding_status === "active", user can access the app
      // This is the PRIMARY check - payment was validated by Stripe webhook
      if (onboardingStatus === "active") {
        // For paid users, email confirmation is NOT required
        // For free users, email confirmation IS required
        if (!isPaid && !user.email_confirmed_at) {
          await supabase.auth.signOut();
          setError("Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception.");
          return;
        }
        router.push("/decks");
        router.refresh();
        return;
      }

      // RULE #2: Paid user with pending_payment - redirect to Stripe checkout
      if (onboardingStatus === "pending_payment") {
        // Show email pending message if applicable
        if (!user.email_confirmed_at) {
          setPaidEmailPending(true);
        }

        // Try to redirect to checkout
        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
          const checkoutPlan = planName || plan || metaPlanName || "starter";
          if (backendUrl && (checkoutPlan === "starter" || checkoutPlan === "pro")) {
            const { data: { session } } = await supabase.auth.getSession();
            const checkoutResponse = await fetch(`${backendUrl}/stripe/checkout`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
              },
              body: JSON.stringify({ plan: checkoutPlan, userId: user.id }),
            });

            const checkoutData = (await checkoutResponse.json()) as {
              url?: string;
              error?: string;
            };

            if (checkoutResponse.ok && checkoutData.url) {
              window.location.href = checkoutData.url;
              return;
            }
          }
        } catch (err) {
          console.error("[login] Failed to trigger checkout:", err);
        }

        setError("Votre paiement n'a pas encore été finalisé. Veuillez compléter le paiement.");
        return;
      }

      // RULE #3: No profile - wait for server-side creation
      if (!profile) {
        setError("Votre profil est en cours de création. Veuillez patienter quelques instants et réessayer.");
        return;
      }

      // RULE #4: Free user without email confirmation
      if (!user.email_confirmed_at) {
        await supabase.auth.signOut();
        setError("Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception.");
        return;
      }

      // Fallback: unknown state
      setError("État du compte non reconnu. Veuillez contacter le support.");
    } catch (err) {
      // Catch all unexpected errors
      console.error("[LoginPage] Unexpected error during login:", err);
      const authError = mapAuthError(err, "signin");
      setError(authError.message || "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="relative isolate min-h-screen overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 1000'><defs><linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23030812'/><stop offset='100%' stop-color='%230a1224'/></linearGradient><radialGradient id='vignette' cx='50%' cy='50%' r='70%'><stop offset='0%' stop-color='%23030812' stop-opacity='0'/><stop offset='70%' stop-color='%23030812' stop-opacity='0.35'/><stop offset='100%' stop-color='%23030812' stop-opacity='0.7'/></radialGradient><radialGradient id='somaCore' cx='48%' cy='52%' r='30%'><stop offset='0%' stop-color='%23f8fafc' stop-opacity='0.7'/><stop offset='45%' stop-color='%23c7d2fe' stop-opacity='0.5'/><stop offset='100%' stop-color='%2393c5fd' stop-opacity='0.12'/></radialGradient><radialGradient id='somaGlow' cx='48%' cy='52%' r='55%'><stop offset='0%' stop-color='%23438bff' stop-opacity='0.25'/><stop offset='70%' stop-color='%230a1224' stop-opacity='0.06'/><stop offset='100%' stop-color='%230a1224' stop-opacity='0'/></radialGradient><filter id='blurDeep' x='-80%' y='-80%' width='260%' height='260%'><feGaussianBlur stdDeviation='20'/></filter><filter id='glow' x='-60%' y='-60%' width='220%' height='220%'><feGaussianBlur stdDeviation='14' result='b'/><feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge></filter></defs><rect width='1600' height='1000' fill='url(%23bg)'/><rect width='1600' height='1000' fill='url(%23somaGlow)'/><g filter='url(%23blurDeep)' stroke='%2383b2ff' stroke-opacity='0.25' stroke-width='2.1' fill='none'><path d='M700 520 C560 420, 420 340, 240 300'/><path d='M840 520 C980 420, 1160 380, 1360 340'/><path d='M760 600 C840 720, 980 820, 1180 900'/></g><g stroke='%2393c5fd' stroke-opacity='0.45' stroke-width='2.2' fill='none'><path d='M730 520 C620 420, 520 340, 380 300'/><path d='M780 500 C720 380, 720 260, 780 160'/><path d='M830 520 C960 440, 1080 400, 1220 360'/><path d='M780 560 C860 680, 980 760, 1120 820'/></g><g fill='%23f8fafc' fill-opacity='0.6'><circle cx='760' cy='520' r='72' fill='url(%23somaCore)' filter='url(%23glow)'/><circle cx='380' cy='300' r='10'/><circle cx='780' cy='160' r='9'/><circle cx='1220' cy='360' r='10'/><circle cx='1120' cy='820' r='9'/></g><rect width='1600' height='1000' fill='url(%23vignette)'/></svg>\")",
          }}
        />
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[4px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/50 to-slate-950/80" />

        {/* Language toggle in top right */}
        <div className="absolute top-6 right-6 z-20">
          <LanguageToggle variant="minimal" />
        </div>

        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col items-center gap-4 text-center">
              <BrandLogo size={48} iconSize={28} />
              <div>
                <h1 className={`${playfair.className} text-2xl font-semibold text-white`}>
                  {t("auth.signIn", { appName: APP_NAME })}
                </h1>
              </div>
            </div>

            {/* Success message after Stripe checkout */}
            {checkoutSuccess && (
              <div className="mt-6 rounded-2xl border border-green-500/50 bg-green-500/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-200">Paiement confirmé !</p>
                    <p className="mt-1 text-xs text-green-200/80">
                      Votre abonnement est actif. Connectez-vous pour accéder à {APP_NAME}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Paid user with email not confirmed */}
            {paidEmailPending && (
              <div className="mt-6 rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-200">Une dernière étape !</p>
                    <p className="mt-1 text-xs text-amber-200/80">
                      Votre paiement est confirmé. Confirmez votre email pour finaliser votre accès à {APP_NAME}.
                      Vérifiez votre boîte de réception.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs uppercase tracking-[0.25em] text-white/60">
                  {t("auth.email")}
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 border-white/15 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/40"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-xs uppercase tracking-[0.25em] text-white/60">
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    className="h-11 border-white/15 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/40 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-3">
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}

              {success && (
                <div className="rounded-2xl border border-green-500/50 bg-green-500/10 p-3">
                  <p className="text-sm text-green-200">{success}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold bg-white text-slate-900 hover:bg-white/90"
                disabled={loading}
              >
                {loading ? t("common.loading") : t("auth.continue")}
              </Button>

              <p className="text-xs text-white/50 text-center leading-relaxed">
                En continuant, vous acceptez notre{" "}
                <Link
                  href="/confidentialite"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-white/70 transition-colors"
                >
                  Politique de Confidentialité
                </Link>
                {" "}et nos{" "}
                <Link
                  href="/cgu-cgv"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-white/70 transition-colors"
                >
                  CGU/CGV
                </Link>
                .
              </p>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                className="w-full h-11 font-semibold bg-white text-slate-900 border border-white/80 shadow-sm hover:bg-white/90"
                disabled={loading}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  aria-hidden="true"
                  focusable="false"
                  data-prefix="fab"
                  data-icon="google"
                  role="img"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 488 512"
                >
                  <path
                    fill="#4285F4"
                    d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                  ></path>
                </svg>
                {t("auth.continueWithGoogle")}
              </Button>

              <div className="text-center text-xs text-white/60">
                <Link href="/pricing" className="transition hover:text-white">
                  Voir les plans
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
