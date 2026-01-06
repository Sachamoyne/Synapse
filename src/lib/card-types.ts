/**
 * Card Type System
 *
 * Defines the different types of flashcards supported by the system.
 * Each card type has different behavior during study sessions.
 */

export type CardType = "basic" | "reversible" | "typed";

export interface CardTypeInfo {
  id: CardType;
  label: string;
  description: string;
}

/**
 * Card type definitions:
 * - basic: Standard flashcard (front → back, press to reveal)
 * - reversible: Can appear as front→back OR back→front randomly
 * - typed: User must type the answer to proceed
 */
export const CARD_TYPES: CardTypeInfo[] = [
  {
    id: "basic",
    label: "Basic",
    description: "Front → Back (press to reveal)",
  },
  {
    id: "reversible",
    label: "Reversible",
    description: "Front ⇄ Back (random direction)",
  },
  {
    id: "typed",
    label: "Typed Answer",
    description: "Type the answer to proceed",
  },
];

/**
 * Extended card interface that includes type and extra fields.
 * This extends the base Card type from Supabase.
 */
export interface CardWithType {
  type: CardType;
  extra?: Record<string, any> | null;
}

/**
 * Validates if a string is a valid card type
 */
export function isValidCardType(type: string): type is CardType {
  return type === "basic" || type === "reversible" || type === "typed";
}

/**
 * Gets the default card type for new cards
 */
export function getDefaultCardType(): CardType {
  return "basic";
}

/**
 * Normalizes answer for comparison (case-insensitive, trimmed)
 */
export function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase();
}

/**
 * Checks if a typed answer is correct
 * Currently uses exact match after normalization
 * Future: Could support fuzzy matching, tolerance settings from extra field
 */
export function isAnswerCorrect(
  userAnswer: string,
  correctAnswer: string
): boolean {
  return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
}

/**
 * Randomly decides orientation for reversible cards
 * Returns true for normal (front→back), false for reversed (back→front)
 */
export function getReversibleOrientation(): boolean {
  return Math.random() >= 0.5;
}
