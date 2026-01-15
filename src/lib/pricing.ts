/**
 * Pricing and quota utilities
 */

export type Plan = "free" | "starter" | "pro";

export interface QuotaInfo {
  plan: Plan;
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
}

export const PLAN_LIMITS: Record<Plan, number> = {
  free: 0,
  starter: 800,
  pro: 2500,
};

export const PLAN_PRICES: Record<Plan, number> = {
  free: 0,
  starter: 8,
  pro: 15,
};

/**
 * Get quota information for a user
 */
export async function getUserQuota(userId: string): Promise<QuotaInfo | null> {
  // This will be implemented in a server-side function
  // For now, return null as placeholder
  return null;
}

/**
 * Check if user can generate AI cards
 */
export function canGenerateAI(quota: QuotaInfo | null): boolean {
  if (!quota) return false;
  if (quota.plan === "free") return false;
  return quota.remaining > 0;
}
