// Re-export all deck functions from the Supabase implementation
export {
  listDecks,
  createDeck,
  renameDeck,
  deleteDeck,
  getDeckAndAllChildren,
  getDeckPath,
  listDecksWithPaths,
  listCards,
  listCardsForDeckTree,
  listAllCards,
  setCardDueDate,
  forgetCard,
  setCardMarked,
  createCard,
  deleteCard,
  updateCard,
  suspendCard,
  unsuspendCard,
  moveCardsToDeck,
  getDueCards,
  getDueCount,
  getTotalCardCount,
  getDeckCardCounts,
  getAllDeckCounts,
  getAnkiCountsForDecks,
  reviewCard,
  getCardsStudiedToday,
  getCurrentStreak,
  getTotalReviews,
  getSettings,
  updateSettings,
  invalidateAllCaches,
  // Scheduler functions
  previewIntervals,
  formatInterval,
  formatIntervalDays,
  parseSteps,
  // Types
  type Deck,
  type Card,
  type Review,
  type ImportDoc,
  type GeneratedCard,
  type IntervalPreview,
  type SchedulerSettings,
  type Settings,
} from "@/lib/supabase-db";

// Note: Import-related functions are not yet migrated to Supabase
// These still use the old Dexie implementation for now
// You can migrate them later or keep them in Dexie since they're ephemeral

export { createImport, listImports, generateCards, persistGeneratedCards, type CardProposal, type GenerateCardsResult } from "./decks";
