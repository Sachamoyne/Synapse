"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { APP_NAME } from "@/lib/brand";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        // Wait a bit to ensure cookies are set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify session was created
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Session could not be established");
        }
        
        router.push("/dashboard");
        router.refresh();
      } else {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        // Check if email confirmation is required
        if (signUpData.user && !signUpData.session) {
          // Email confirmation is required
          setError("Veuillez vérifier votre email pour confirmer votre compte avant de vous connecter.");
          return;
        }

        // If session exists, user is automatically logged in (email confirmation disabled)
        if (signUpData.session) {
          // Wait a bit to ensure cookies are set
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Verify session was created
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error("Session could not be established");
          }
          
          router.push("/dashboard");
          router.refresh();
          return;
        }

        // Fallback: try to sign in if no session was returned
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          // If sign in fails, it might be because email confirmation is required
          if (signInError.message.includes("email") || signInError.message.includes("confirm")) {
            setError("Veuillez vérifier votre email pour confirmer votre compte avant de vous connecter.");
          } else {
            throw signInError;
          }
          return;
        }
        
        // Wait a bit to ensure cookies are set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify session was created
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Session could not be established");
        }
        
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <BookOpen className="h-12 w-12 text-gray-900" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {mode === "signin" ? "Welcome back" : "Create an account"}
          </CardTitle>
          <CardDescription>
            {mode === "signin"
              ? `Sign in to continue to ${APP_NAME}`
              : `Sign up to start using ${APP_NAME}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-900">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-900">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Loading..."
                : mode === "signin"
                  ? "Sign in"
                  : "Sign up"}
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError(null);
                }}
                className="text-gray-600 hover:text-gray-900 underline"
                disabled={loading}
              >
                {mode === "signin"
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
