// Server-only Stripe utility.
// IMPORTANT: This file must ONLY be imported in:
// - app/api/route.ts files (API routes)
// - Other server-only code
// NEVER import this in client components or shared utilities.
import Stripe from "stripe";

// Lazy initialization - only creates Stripe instance when needed
// This prevents build-time errors if env vars are missing
let stripeInstance: Stripe | null = null;

/**
 * Returns the Stripe instance. Must be called inside a request handler.
 * Throws if STRIPE_SECRET_KEY is not set.
 */
export function getStripe(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }

  stripeInstance = new Stripe(secretKey);

  return stripeInstance;
}

/**
 * Explicit mapping of plan names to Stripe Price IDs.
 * Throws an error if a price_id is missing for a paid plan.
 */
export function getStripePriceId(plan: "starter" | "pro"): string {
  const priceIdMap: Record<"starter" | "pro", string | undefined> = {
    starter: process.env.SOMA_STARTER_PRICE_ID || process.env.STRIPE_STARTER_PRICE_ID,
    pro: process.env.SOMA_PRO_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID,
  };

  const priceId = priceIdMap[plan];

  if (!priceId) {
    throw new Error(`Missing Stripe price_id for plan: ${plan}. Please set SOMA_${plan.toUpperCase()}_PRICE_ID or STRIPE_${plan.toUpperCase()}_PRICE_ID environment variable.`);
  }

  return priceId;
}

// Plan configuration
export const PLANS = {
  free: {
    name: "Free",
    priceId: null,
    aiCardsPerMonth: 0,
    priceEuros: 0,
  },
  starter: {
    name: "Starter",
    priceId: () => process.env.SOMA_STARTER_PRICE_ID || process.env.STRIPE_STARTER_PRICE_ID,
    aiCardsPerMonth: 800,
    priceEuros: 8,
  },
  pro: {
    name: "Pro",
    priceId: () => process.env.SOMA_PRO_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID,
    aiCardsPerMonth: 2500,
    priceEuros: 15,
  },
  organization: {
    name: "Organization",
    priceId: null,
    aiCardsPerMonth: -1, // unlimited
    priceEuros: null, // contact only
  },
} as const;

export type PlanName = keyof typeof PLANS;
