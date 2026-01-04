-- =============================================================================
-- FIX: Trigger pour création automatique de settings lors de l'inscription
-- =============================================================================
-- À exécuter dans le SQL Editor de Supabase (https://app.supabase.com)
-- Ce script est IDEMPOTENT (peut être exécuté plusieurs fois sans problème)
-- =============================================================================
-- 
-- PROBLÈME: Lors de la création d'un compte, le trigger doit créer 
-- automatiquement une ligne dans la table settings. Si ce trigger n'existe 
-- pas ou plante, l'inscription peut échouer avec l'erreur 
-- "Database error saving new user"
-- =============================================================================

-- 1. Supprimer le trigger s'il existe déjà (pour éviter les doublons)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Supprimer la fonction si elle existe déjà
DROP FUNCTION IF EXISTS public.create_default_settings();

-- 3. Créer la fonction qui crée les settings par défaut
-- Cette fonction utilise SECURITY DEFINER pour contourner RLS
-- et SET search_path pour éviter les problèmes de sécurité
-- IMPORTANT: Cette fonction doit inclure TOUS les champs de la table settings
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

-- 4. Créer le trigger sur auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_settings();

-- 5. Vérifier que tout fonctionne
SELECT
  t.tgname AS trigger_name,
  t.tgenabled AS enabled,
  p.proname AS function_name,
  t.tgrelid::regclass AS table_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- Si cette requête retourne une ligne, le trigger est bien créé ! ✅

