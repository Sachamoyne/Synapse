"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/shell/Topbar";
import { DeckTree } from "@/components/DeckTree";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listDecks, createDeck, getAllDeckCounts } from "@/store/decks";
import { ImportDialog } from "@/components/ImportDialog";
import type { Deck } from "@/lib/db";
import { BookOpen } from "lucide-react";

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [dueCounts, setDueCounts] = useState<Record<string, number>>({});
  const [learningCounts, setLearningCounts] = useState<
    Record<string, { new: number; learning: number; review: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deckName, setDeckName] = useState("");

  const loadDecks = async () => {
    try {
      console.log('📂 loadDecks START');
      const loadedDecks = await listDecks();
      console.log('✅ Loaded', loadedDecks.length, 'decks:', loadedDecks);
      setDecks(loadedDecks);

      // OPTIMIZED: Get all counts in a single batch query instead of N+1 queries
      // This reduces from 3*N database calls to just 2 calls (cards + decks)
      const deckIds = loadedDecks.map(d => d.id);
      const { cardCounts, dueCounts, learningCounts } = await getAllDeckCounts(deckIds);

      setCardCounts(cardCounts);
      setDueCounts(dueCounts);
      setLearningCounts(learningCounts);
      console.log('✅ loadDecks COMPLETE');
    } catch (error) {
      console.error("❌ Error loading decks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDecks();
  }, []);

  const handleCreateDeck = async () => {
    if (!deckName.trim()) return;

    try {
      console.log('🔷 handleCreateDeck START with name:', deckName.trim());
      const newDeck = await createDeck(deckName.trim());
      console.log('✅ Deck created:', newDeck);

      console.log('📂 Reloading decks...');
      await loadDecks();
      console.log('✅ Decks reloaded');

      setDeckName("");
      setDialogOpen(false);
    } catch (error) {
      console.error("❌ Error creating deck:", error);
      alert("Error creating deck: " + (error as Error).message);
    }
  };

  const handleImportSuccess = async () => {
    await loadDecks();
  };

  // Get root decks (decks without parent)
  const rootDecks = decks.filter((d) => !d.parent_deck_id);

  return (
    <>
      <Topbar
        title="Decks"
        showNewDeck
        onNewDeck={() => setDialogOpen(true)}
        showImport
        onImport={() => setImportDialogOpen(true)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="h-full">
            {loading ? (
              <div className="rounded-xl border bg-white px-6 py-12 text-center">
                <p className="text-gray-500">Loading decks...</p>
              </div>
            ) : rootDecks.length === 0 ? (
              <div className="rounded-xl border bg-white px-6 py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No decks yet</h3>
                <p className="text-gray-500 mb-6">Create your first deck to start learning</p>
                <Button onClick={() => setDialogOpen(true)}>
                  Create your first deck
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border bg-white overflow-hidden h-full flex flex-col">
                {/* Header explicatif - aligné avec les colonnes des decks */}
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50/50 border-b">
                  {/* Left: Espace pour chevron + icon + nom */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-4" />
                    <span className="text-xs font-medium text-muted-foreground">Deck</span>
                  </div>

                  {/* Right: Labels alignés avec les colonnes de chiffres */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Grille identique à celle de DeckTree pour alignement parfait */}
                    <div className="grid grid-cols-4 w-52 gap-3">
                      <span className="text-xs font-medium text-muted-foreground text-right whitespace-nowrap">New</span>
                      <span className="text-xs font-medium text-muted-foreground text-right whitespace-nowrap">Learning</span>
                      <span className="text-xs font-medium text-muted-foreground text-right whitespace-nowrap">Review</span>
                      <span className="text-xs font-medium text-muted-foreground text-right whitespace-nowrap">Total</span>
                    </div>

                    {/* Espace pour les actions (boutons hover) - invisible dans header */}
                    <div className="w-16" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {rootDecks.map((deck) => (
                    <DeckTree
                      key={deck.id}
                      deck={deck}
                      allDecks={decks}
                      cardCounts={cardCounts}
                      dueCounts={dueCounts}
                      learningCounts={learningCounts}
                      level={0}
                      onDeckCreated={loadDecks}
                      onDeckDeleted={loadDecks}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New deck</DialogTitle>
            <DialogDescription>
              Create a new deck to organize your cards.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Deck name"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateDeck();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDeck}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        initialDeckId={null}
        onSuccess={handleImportSuccess}
      />
    </>
  );
}
