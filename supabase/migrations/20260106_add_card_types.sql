-- Migration: Add card types support (basic, reversible, typed)
-- Date: 2026-01-06
-- Description: Extend cards table to support multiple card types with backward compatibility

-- ============================================================================
-- STEP 1: Add new columns to cards table
-- ============================================================================

-- Add type column with default 'basic' for backward compatibility
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'basic'
CHECK (type IN ('basic', 'reversible', 'typed'));

-- Add extra JSON column for future type-specific extensions
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS extra JSONB;

-- ============================================================================
-- STEP 2: Add index for card type filtering
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(type);

-- ============================================================================
-- STEP 3: Update existing cards to have 'basic' type
-- ============================================================================

-- Ensure all existing cards are marked as 'basic' type
UPDATE cards SET type = 'basic' WHERE type IS NULL;

-- ============================================================================
-- NOTES:
-- - All existing cards default to 'basic' type (front → back, press to reveal)
-- - 'reversible' type: card can appear as front→back OR back→front randomly
-- - 'typed' type: user must type the answer to proceed
-- - 'extra' field: JSON storage for future type-specific data (e.g., validation rules)
-- ============================================================================
