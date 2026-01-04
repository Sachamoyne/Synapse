-- =============================================================================
-- FIX COMPLET: Résoudre l'erreur "Database error saving new user"
-- =============================================================================
-- À exécuter dans le SQL Editor de Supabase (https://app.supabase.com)
-- Ce script est IDEMPOTENT (peut être exécuté plusieurs fois sans problème)
-- =============================================================================
-- 
-- PROBLÈME: Lors de la création d'un compte, le trigger doit créer 
-- automatiquement une ligne dans la table settings. Si des colonnes manquent
-- ou si le trigger plante, l'inscription échoue avec l'erreur 
-- "Database error saving new user"
-- =============================================================================

-- =============================================================================
-- ÉTAPE 1: S'assurer que toutes les colonnes de settings existent
-- =============================================================================

-- Colonnes de base
ALTER TABLE settings ADD COLUMN IF NOT EXISTS new_cards_per_day INTEGER NOT NULL DEFAULT 20;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS max_reviews_per_day INTEGER NOT NULL DEFAULT 9999;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS learning_mode TEXT NOT NULL DEFAULT 'normal' CHECK (learning_mode IN ('fast', 'normal', 'deep'));
ALTER TABLE settings ADD COLUMN IF NOT EXISTS again_delay_minutes INTEGER NOT NULL DEFAULT 10;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS review_order TEXT NOT NULL DEFAULT 'mixed' CHECK (review_order IN ('mixed', 'oldFirst', 'newFirst'));

-- Colonnes Anki SM-2 (ajoutées par la migration 20250122_anki_sm2_scheduler.sql)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS learning_steps TEXT NOT NULL DEFAULT '1m 10m';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS relearning_steps TEXT NOT NULL DEFAULT '10m';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS graduating_interval_days INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS easy_interval_days INTEGER NOT NULL DEFAULT 4;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS starting_ease DECIMAL(3,2) NOT NULL DEFAULT 2.50;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS easy_bonus DECIMAL(3,2) NOT NULL DEFAULT 1.30;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS hard_interval DECIMAL(3,2) NOT NULL DEFAULT 1.20;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS interval_modifier DECIMAL(3,2) NOT NULL DEFAULT 1.00;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS new_interval_multiplier DECIMAL(3,2) NOT NULL DEFAULT 0.00;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS minimum_interval_days INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS maximum_interval_days INTEGER NOT NULL DEFAULT 36500;

-- Colonnes de timestamp
ALTER TABLE settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- =============================================================================
-- ÉTAPE 2: Mettre à jour les lignes existantes avec des valeurs par défaut
-- =============================================================================

UPDATE settings SET
  learning_steps = COALESCE(learning_steps, '1m 10m'),
  relearning_steps = COALESCE(relearning_steps, '10m'),
  graduating_interval_days = COALESCE(graduating_interval_days, 1),
  easy_interval_days = COALESCE(easy_interval_days, 4),
  starting_ease = COALESCE(starting_ease, 2.50),
  easy_bonus = COALESCE(easy_bonus, 1.30),
  hard_interval = COALESCE(hard_interval, 1.20),
  interval_modifier = COALESCE(interval_modifier, 1.00),
  new_interval_multiplier = COALESCE(new_interval_multiplier, 0.00),
  minimum_interval_days = COALESCE(minimum_interval_days, 1),
  maximum_interval_days = COALESCE(maximum_interval_days, 36500)
WHERE learning_steps IS NULL OR relearning_steps IS NULL;

-- =============================================================================
-- ÉTAPE 3: Supprimer l'ancien trigger et la fonction
-- =============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_default_settings();

-- =============================================================================
-- ÉTAPE 4: Créer la fonction qui crée les settings par défaut
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_default_settings()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insérer une nouvelle ligne dans settings avec toutes les valeurs par défaut
  -- Inclut tous les champs requis après la migration Anki SM-2
  INSERT INTO public.settings (
    user_id,
    new_cards_per_day,
    max_reviews_per_day,
    learning_mode,
    again_delay_minutes,
    review_order,
    learning_steps,
    relearning_steps,
    graduating_interval_days,
    easy_interval_days,
    starting_ease,
    easy_bonus,
    hard_interval,
    interval_modifier,
    new_interval_multiplier,
    minimum_interval_days,
    maximum_interval_days
  ) VALUES (
    NEW.id,
    20,
    9999,
    'normal',
    10,
    'mixed',
    '1m 10m',
    '10m',
    1,
    4,
    2.50,
    1.30,
    1.20,
    1.00,
    0.00,
    1,
    36500
  )
  ON CONFLICT (user_id) DO NOTHING; -- Évite les erreurs si la ligne existe déjà

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log l'erreur mais ne fait pas échouer l'inscription
    -- Cela permet à l'utilisateur de s'inscrire même si la création de settings échoue
    RAISE WARNING 'Failed to create default settings for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- =============================================================================
-- ÉTAPE 5: Créer le trigger sur auth.users
-- =============================================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_settings();

-- =============================================================================
-- ÉTAPE 6: Vérifier que tout fonctionne
-- =============================================================================

SELECT
  t.tgname AS trigger_name,
  CASE t.tgenabled
    WHEN 'O' THEN '✓ ENABLED'
    ELSE '✗ DISABLED'
  END AS enabled,
  p.proname AS function_name,
  t.tgrelid::regclass AS table_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- Si cette requête retourne une ligne avec "✓ ENABLED", le trigger est bien créé ! ✅

-- =============================================================================
-- ÉTAPE 7: Vérifier la structure de la table settings
-- =============================================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'settings'
ORDER BY ordinal_position;

-- Cette requête affiche toutes les colonnes de la table settings pour vérification

