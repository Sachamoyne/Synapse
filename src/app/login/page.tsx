"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { LoginCardGenerationPreview } from "@/components/LoginCardGenerationPreview";
import { BrandLogo } from "@/components/BrandLogo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        router.push("/decks");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        router.push("/decks");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <div className="mx-auto max-w-7xl">
        <div className="grid min-h-screen lg:grid-cols-[1.4fr,1fr]">
          {/* Left column - Value proposition & Demo */}
          <div className="flex flex-col justify-center px-6 py-12 lg:px-12 lg:py-20">
            <div className="mx-auto w-full max-w-xl space-y-8">
              {/* Logo for mobile */}
              <div className="flex items-center gap-2 lg:hidden">
                <BrandLogo size={40} iconSize={24} />
                <span className="text-2xl font-bold">{APP_NAME}</span>
              </div>

              {/* Main heading */}
              <div className="space-y-4">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Retenez vraiment ce que vous apprenez.
                </h1>
                <p className="text-lg text-muted-foreground lg:text-xl">
                  Flashcards intelligentes, import Anki et répétition espacée.
                </p>
              </div>

              {/* Card generation preview */}
              <div className="py-4">
                <LoginCardGenerationPreview />
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Compatible Anki</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Données sécurisées</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Gratuit pour commencer</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Login form */}
          <div className="flex items-center justify-center border-l-0 bg-muted/30 px-6 py-12 lg:border-l lg:px-8">
            <div className="w-full max-w-md">
              <Card className="border-2 shadow-xl">
                <CardHeader className="space-y-4 text-center pb-6">
                  {/* Logo */}
                  <div className="flex flex-col items-center gap-3">
                    <BrandLogo />
                    <div>
                      <h2 className="text-2xl font-bold">{APP_NAME}</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Learn once. Remember forever.
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email field */}
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium">
                        Email address
                      </label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="sacha@hec.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                        className="h-11"
                      />
                    </div>

                    {/* Password field with toggle */}
                    <div className="space-y-2">
                      <label htmlFor="password" className="text-sm font-medium">
                        Password
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
                          className="h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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

                    {/* Forgot password link */}
                    {mode === "signin" && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
                          disabled={loading}
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    {/* Error message */}
                    {error && (
                      <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    {/* Submit button */}
                    <Button
                      type="submit"
                      className="w-full h-11 text-base font-semibold shadow-lg"
                      disabled={loading}
                    >
                      {loading ? "Loading..." : "Continue"}
                    </Button>

                    {/* Separator */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                          Or
                        </span>
                      </div>
                    </div>

                    {/* Google button (UI only) */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 font-semibold"
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
                          fill="currentColor"
                          d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                        ></path>
                      </svg>
                      Continue with Google
                    </Button>

                    {/* Sign up link */}
                    <div className="text-center text-sm pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMode(mode === "signin" ? "signup" : "signin");
                          setError(null);
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        disabled={loading}
                      >
                        {mode === "signin" ? (
                          <>
                            Don&apos;t have an account?{" "}
                            <span className="font-semibold text-primary">
                              Sign up
                            </span>
                          </>
                        ) : (
                          <>
                            Already have an account?{" "}
                            <span className="font-semibold text-primary">
                              Sign in
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
