# Pricing Implementation - Documentation

## Overview

This document describes the pricing model implementation for Soma, including quotas, plans, and Stripe integration.

## Pricing Model

### Plans

1. **Free** - 0 €
   - AI flashcard generation: DISABLED
   - Manual flashcard creation: unlimited
   - Anki import: allowed
   - Basic stats only

2. **Starter** - 8 €/month
   - AI flashcard generation: 800 cards / month
   - Monthly reset (calendar month)
   - PDF / document import allowed, counted toward quota
   - Advanced stats enabled

3. **Pro** - 15 €/month
   - AI flashcard generation: 2,500 cards / month
   - Monthly reset (calendar month)
   - Heavy PDF / document imports allowed
   - Advanced stats + all power features

4. **Organization** - Custom
   - No automated checkout
   - "Contact us" only (no logic needed beyond UI)

## Database Schema

### Migration: `20250115_add_pricing_quotas.sql`

The migration adds the following fields to the `profiles` table:

- `plan`: TEXT (enum: 'free', 'starter', 'pro') - Default: 'free'
- `ai_cards_used_current_month`: INTEGER - Default: 0
- `ai_cards_monthly_limit`: INTEGER - Default: 0
- `ai_quota_reset_at`: TIMESTAMPTZ - Default: start of next month

### Functions

1. **`reset_monthly_ai_quotas()`**
   - Resets quotas for all users at the beginning of each month
   - Can be called by a scheduled job or trigger

2. **`check_and_increment_ai_quota(p_user_id, p_card_count)`**
   - Checks if user can generate cards
   - Automatically resets quota if new month has started
   - Increments counter if generation is allowed
   - Returns JSONB with quota information

## Quota Reset Logic

### Automatic Reset

Quotas are automatically reset at the beginning of each calendar month. The reset logic works as follows:

1. **On quota check**: When a user attempts to generate AI cards, the system checks if `ai_quota_reset_at <= NOW()`. If true, it resets the quota immediately.

2. **Reset date calculation**: The reset date is set to the first day of the next month at 00:00:00 UTC.

3. **Implementation**: The reset happens in two places:
   - In the `check_and_increment_ai_quota()` PostgreSQL function
   - In the `/api/quota` route (for UI display)
   - In the `/api/generate-cards` route (before checking quota)

### Manual Reset

The `reset_monthly_ai_quotas()` function can be called manually or scheduled via:
- Supabase Cron Jobs
- pg_cron extension
- External scheduler

## API Routes

### `/api/generate-cards` (POST)

Generates AI flashcards with quota checking:

1. Authenticates user
2. Verifies deck ownership
3. **Checks quota** (resets if needed)
4. Blocks if:
   - User is on free plan → Returns `QUOTA_FREE_PLAN` error
   - Quota exceeded → Returns `QUOTA_EXCEEDED` error
5. Calls LLM to generate cards
6. **Increments quota** with actual card count
7. Inserts cards into database

### `/api/quota` (GET)

Returns current quota information for authenticated user:
- `plan`: Current plan
- `used`: Cards used this month
- `limit`: Monthly limit
- `remaining`: Remaining cards
- `reset_at`: When quota resets

### `/api/checkout` (GET)

Creates Stripe Checkout session:
- Query params: `?plan=starter` or `?plan=pro`
- Returns Stripe Checkout URL
- Redirects to pricing page on cancel
- Redirects to decks page on success

### `/api/stripe/webhook` (POST)

Handles Stripe webhook events:

1. **`checkout.session.completed`**: 
   - Updates user profile with new plan
   - Sets monthly limit based on plan
   - Resets quota counter to 0
   - Sets reset date to start of next month

2. **`customer.subscription.updated`**:
   - Updates plan if subscription changes
   - Adjusts limits accordingly

3. **`customer.subscription.deleted`**:
   - Downgrades user to free plan
   - Sets limit to 0

## Frontend Components

### `PaywallModal`

Displays when:
- Free user attempts AI generation
- Starter/Pro user exceeds quota

Actions:
- Free users: "View Plans" → redirects to pricing
- Starter users: "Upgrade to Pro" → Stripe checkout
- All: "Continue with Manual Creation"

### `QuotaIndicator`

Displays remaining AI cards for Starter/Pro users:
- Shows: `used / limit` and `remaining`
- Progress bar with color coding:
  - Green: < 80% used
  - Orange: 80-95% used
  - Red: > 95% used
- Hidden for free users

## Stripe Configuration

### Required Environment Variables

```env
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
```

### Setup Steps

1. Create products in Stripe Dashboard:
   - Starter: 8 €/month recurring
   - Pro: 15 €/month recurring

2. Get Price IDs from Stripe Dashboard

3. Configure webhook endpoint:
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Events to listen:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Installation

1. Run migration:
   ```sql
   -- Execute in Supabase SQL Editor
   \i supabase/migrations/20250115_add_pricing_quotas.sql
   ```

2. Install Stripe:
   ```bash
   npm install stripe
   ```

3. Set environment variables (see above)

4. Configure Stripe webhook endpoint

## Testing

### Test Quota Reset

1. Set a user's `ai_quota_reset_at` to a past date
2. Attempt to generate cards
3. Verify quota is reset automatically

### Test Paywall

1. Free user: Attempt AI generation → Should see paywall
2. Starter user: Use 800 cards → Next attempt should show upgrade CTA
3. Pro user: Use 2500 cards → Next attempt should show limit message

### Test Stripe

1. Create test checkout session
2. Complete payment in Stripe test mode
3. Verify webhook updates user profile
4. Verify quota is set correctly

## Notes

- Quota reset happens automatically on first use after month change
- No scheduled job required (lazy reset)
- All quota checks use service role client to bypass RLS
- Quota is checked BEFORE calling LLM to avoid unnecessary costs
- Actual card count is used for increment (not estimated)
