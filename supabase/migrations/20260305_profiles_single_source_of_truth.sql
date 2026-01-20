-- Migration: Single source of truth for profiles (auth trigger + backfill + guard)

-- 1) Ensure required columns exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id UUID,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2) Ensure constraints exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('user', 'founder', 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_plan_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_plan_check
      CHECK (plan IN ('free', 'starter', 'pro'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_onboarding_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_onboarding_status_check
      CHECK (onboarding_status IS NULL OR onboarding_status IN ('pending_payment', 'active'));
  END IF;
END $$;

-- 3) Backfill id from legacy user_id if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) THEN
    UPDATE public.profiles
    SET id = user_id
    WHERE id IS NULL;
  END IF;
END $$;

-- 4) Ensure id is unique for upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_id_unique ON public.profiles(id);

-- 5) Backfill missing profiles from auth.users (idempotent)
DO $$
DECLARE
  v_has_user_id BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) INTO v_has_user_id;

  IF v_has_user_id THEN
    INSERT INTO public.profiles (
      id,
      user_id,
      email,
      role,
      plan,
      plan_name,
      onboarding_status,
      created_at
    )
    SELECT
      u.id,
      u.id,
      u.email,
      'user',
      CASE
        WHEN (u.raw_user_meta_data->>'plan_name') IN ('starter', 'pro') THEN u.raw_user_meta_data->>'plan_name'
        ELSE 'free'
      END,
      CASE
        WHEN (u.raw_user_meta_data->>'plan_name') IN ('starter', 'pro', 'free') THEN u.raw_user_meta_data->>'plan_name'
        ELSE 'free'
      END,
      CASE
        WHEN (u.raw_user_meta_data->>'onboarding_status') IN ('pending_payment', 'active') THEN u.raw_user_meta_data->>'onboarding_status'
        WHEN (u.raw_user_meta_data->>'plan_name') IN ('starter', 'pro') THEN 'pending_payment'
        ELSE 'active'
      END,
      NOW()
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL;
  ELSE
    INSERT INTO public.profiles (
      id,
      email,
      role,
      plan,
      plan_name,
      onboarding_status,
      created_at
    )
    SELECT
      u.id,
      u.email,
      'user',
      CASE
        WHEN (u.raw_user_meta_data->>'plan_name') IN ('starter', 'pro') THEN u.raw_user_meta_data->>'plan_name'
        ELSE 'free'
      END,
      CASE
        WHEN (u.raw_user_meta_data->>'plan_name') IN ('starter', 'pro', 'free') THEN u.raw_user_meta_data->>'plan_name'
        ELSE 'free'
      END,
      CASE
        WHEN (u.raw_user_meta_data->>'onboarding_status') IN ('pending_payment', 'active') THEN u.raw_user_meta_data->>'onboarding_status'
        WHEN (u.raw_user_meta_data->>'plan_name') IN ('starter', 'pro') THEN 'pending_payment'
        ELSE 'active'
      END,
      NOW()
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL;
  END IF;
END $$;

-- 6) Repair existing profiles (no paid -> free downgrade)
UPDATE public.profiles p
SET
  email = COALESCE(p.email, u.email),
  plan_name = CASE
    WHEN p.plan_name IN ('starter', 'pro') THEN p.plan_name
    WHEN p.plan IN ('starter', 'pro') THEN p.plan
    WHEN (u.raw_user_meta_data->>'plan_name') IN ('starter', 'pro') THEN u.raw_user_meta_data->>'plan_name'
    WHEN p.plan_name IS NULL THEN 'free'
    ELSE p.plan_name
  END,
  plan = CASE
    WHEN p.plan IN ('starter', 'pro') THEN p.plan
    WHEN p.plan_name IN ('starter', 'pro') THEN p.plan_name
    WHEN (u.raw_user_meta_data->>'plan_name') IN ('starter', 'pro') THEN u.raw_user_meta_data->>'plan_name'
    WHEN p.plan IS NULL THEN 'free'
    ELSE p.plan
  END,
  onboarding_status = CASE
    WHEN p.onboarding_status IN ('pending_payment', 'active') THEN p.onboarding_status
    WHEN (u.raw_user_meta_data->>'onboarding_status') IN ('pending_payment', 'active') THEN u.raw_user_meta_data->>'onboarding_status'
    WHEN (u.raw_user_meta_data->>'plan_name') IN ('starter', 'pro') THEN 'pending_payment'
    ELSE 'active'
  END
FROM auth.users u
WHERE p.id = u.id
  AND (
    p.email IS NULL
    OR p.plan IS NULL
    OR p.plan_name IS NULL
    OR p.onboarding_status IS NULL
    OR (p.plan IN ('free') AND (u.raw_user_meta_data->>'plan_name') IN ('starter', 'pro'))
    OR (p.plan_name IN ('free') AND (u.raw_user_meta_data->>'plan_name') IN ('starter', 'pro'))
  );

-- 7) Create trigger to auto-create profile on signup (single source of truth)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan_name TEXT;
  v_plan TEXT;
  v_onboarding_status TEXT;
  v_has_user_id BOOLEAN;
BEGIN
  v_plan_name := CASE
    WHEN (NEW.raw_user_meta_data->>'plan_name') IN ('starter', 'pro', 'free') THEN NEW.raw_user_meta_data->>'plan_name'
    ELSE 'free'
  END;

  v_plan := CASE
    WHEN v_plan_name IN ('starter', 'pro') THEN v_plan_name
    ELSE 'free'
  END;

  v_onboarding_status := CASE
    WHEN (NEW.raw_user_meta_data->>'onboarding_status') IN ('pending_payment', 'active') THEN NEW.raw_user_meta_data->>'onboarding_status'
    WHEN v_plan IN ('starter', 'pro') THEN 'pending_payment'
    ELSE 'active'
  END;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) INTO v_has_user_id;

  IF v_has_user_id THEN
    EXECUTE
      'INSERT INTO public.profiles (id, user_id, email, role, plan, plan_name, onboarding_status, created_at)
       VALUES ($1, $1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (id) DO UPDATE
       SET email = COALESCE(public.profiles.email, EXCLUDED.email),
           plan_name = CASE
             WHEN public.profiles.plan_name IN (''starter'', ''pro'') THEN public.profiles.plan_name
             WHEN public.profiles.plan IN (''starter'', ''pro'') THEN public.profiles.plan
             ELSE EXCLUDED.plan_name
           END,
           plan = CASE
             WHEN public.profiles.plan IN (''starter'', ''pro'') THEN public.profiles.plan
             WHEN public.profiles.plan_name IN (''starter'', ''pro'') THEN public.profiles.plan_name
             ELSE EXCLUDED.plan
           END,
           onboarding_status = COALESCE(public.profiles.onboarding_status, EXCLUDED.onboarding_status)'
    USING NEW.id, NEW.email, 'user', v_plan, v_plan_name, v_onboarding_status;
  ELSE
    INSERT INTO public.profiles (id, email, role, plan, plan_name, onboarding_status, created_at)
    VALUES (NEW.id, NEW.email, 'user', v_plan, v_plan_name, v_onboarding_status, NOW())
    ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(public.profiles.email, EXCLUDED.email),
        plan_name = CASE
          WHEN public.profiles.plan_name IN ('starter', 'pro') THEN public.profiles.plan_name
          WHEN public.profiles.plan IN ('starter', 'pro') THEN public.profiles.plan
          ELSE EXCLUDED.plan_name
        END,
        plan = CASE
          WHEN public.profiles.plan IN ('starter', 'pro') THEN public.profiles.plan
          WHEN public.profiles.plan_name IN ('starter', 'pro') THEN public.profiles.plan_name
          ELSE EXCLUDED.plan
        END,
        onboarding_status = COALESCE(public.profiles.onboarding_status, EXCLUDED.onboarding_status);
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profiles ON auth.users;

CREATE TRIGGER on_auth_user_created_profiles
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- 8) Guard against paid -> free downgrade (safety net)
CREATE OR REPLACE FUNCTION public.prevent_paid_to_free_downgrade()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF (OLD.plan IN ('starter', 'pro') OR OLD.plan_name IN ('starter', 'pro')) AND
     (NEW.plan IN ('free') OR NEW.plan IS NULL OR NEW.plan_name IN ('free') OR NEW.plan_name IS NULL) THEN
    NEW.plan := COALESCE(OLD.plan, NEW.plan);
    NEW.plan_name := COALESCE(OLD.plan_name, NEW.plan_name);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_paid_to_free_downgrade ON public.profiles;

CREATE TRIGGER prevent_paid_to_free_downgrade
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_paid_to_free_downgrade();
