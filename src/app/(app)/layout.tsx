import AppShellClient from "./AppShellClient";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Simple server-side auth guard for all routes under (app)
  // - If no authenticated user: redirect to /login
  // - If authenticated: render the authenticated app shell
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // subscription_status is the SINGLE SOURCE OF TRUTH
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  const subscriptionStatus = (profile as any)?.subscription_status as string | null | undefined;

  // RULE 1: subscription_status === "active" → unconditional access
  if (subscriptionStatus === "active") {
    return <AppShellClient>{children}</AppShellClient>;
  }

  // RULE 2: subscription_status === "pending_payment" → /pricing
  if (subscriptionStatus === "pending_payment") {
    redirect("/pricing");
  }

  // RULE 3: Free user (null or "free") → email required
  if (!user.email_confirmed_at) {
    redirect("/login");
  }

  // Free user with confirmed email → access granted

  return <AppShellClient>{children}</AppShellClient>;
}
