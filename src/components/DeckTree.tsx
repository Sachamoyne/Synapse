"use client";

import { useState } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createDeck, createCard } from "@/store/decks";
import type { Deck } from "@/lib/db";
import { ChevronRight, ChevronDown, BookOpen, Plus } from "lucide-react";
import { DeckSettingsMenu } from "@/components/DeckSettingsMenu";
import { createClient } from "@/lib/supabase/client";

interface DeckTreeProps {
  deck: Deck;
  allDecks: Deck[];
  cardCounts: Record<string, number>;
  learningCounts: Record<string, { new: number; learning: number; review: number }>;
  level: number;
  expandedDeckIds: Set<string>;
  onToggleExpand: (deckId: string) => void;
  onDeckCreated: () => void;
  onDeckDeleted: () => void;
}

export function DeckTree({
  deck,
  allDecks,
  cardCounts,
  learningCounts,
  level,
  expandedDeckIds,
  onToggleExpand,
  onDeckCreated,
  onDeckDeleted,
}: DeckTreeProps) {
  const router = useRouter();
  const supabase = createClient();
  const [subDeckDialogOpen, setSubDeckDialogOpen] = useState(false);
  const [subDeckName, setSubDeckName] = useState("");
  const [addCardDialogOpen, setAddCardDialogOpen] = useState(false);
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");

  // Find children and parent
  const children = allDecks.filter((d) => d.parent_deck_id === deck.id);
  const hasChildren = children.length > 0;
  const indent = level * 20; // 20px per level for clear hierarchy
  const expanded = expandedDeckIds.has(deck.id);
  const parentDeck = deck.parent_deck_id
    ? allDecks.find((d) => d.id === deck.parent_deck_id)
    : null;

  const handleCreateSubDeck = async () => {
    if (!subDeckName.trim()) return;

    try {
      await createDeck(subDeckName.trim(), deck.id);
      setSubDeckName("");
      setSubDeckDialogOpen(false);
      onDeckCreated();
    } catch (error) {
      console.error("Error creating sub-deck:", error);
    }
  };

  const handleDeckClick = () => {
    router.push(`/decks/${deck.id}`);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(deck.id);
  };

  const handleAddSubDeckClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSubDeckDialogOpen(true);
  };

  const handleAddCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAddCardDialogOpen(true);
  };

  const handleCreateCard = async () => {
    if (!cardFront.trim() || !cardBack.trim()) return;

    try {
      await createCard(deck.id, cardFront.trim(), cardBack.trim(), "basic", supabase);
      setCardFront("");
      setCardBack("");
      setAddCardDialogOpen(false);
      onDeckCreated(); // Reload counts
    } catch (error) {
      console.error("Error creating card:", error);
    }
  };

  return (
    <div>
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 last:border-b-0 hover:bg-white/5 transition-colors cursor-pointer group"
        style={{ paddingLeft: `${12 + indent}px` }}
        onClick={handleDeckClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleDeckClick();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Study deck: ${deck.name}`}
      >
        {/* Left: Chevron + Icon + Name */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hasChildren ? (
            <button
              onClick={handleExpandClick}
              className="p-0.5 hover:bg-white/10 rounded transition-colors flex-shrink-0"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-white/70" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-white/70" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}
          <BookOpen className="h-4 w-4 text-white/60 flex-shrink-0" />
          <span className="font-medium text-sm text-white/90 truncate">
            {deck.name}
          </span>
        </div>

        {/* Right: Counts + Actions */}
        <div className="flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Counts - Fixed width grid for strict alignment */}
          {(() => {
            const counts = learningCounts[deck.id] || { new: 0, learning: 0, review: 0 };
            const totalCards = cardCounts[deck.id] || 0;            

            if (learningCounts[deck.id] !== undefined) {
              return (
                <div className="grid grid-cols-4 w-52 gap-3">
                  <span
                    className={`text-xs font-medium text-right whitespace-nowrap ${
                      counts.new > 0
                        ? "text-sky-300"
                        : "text-white/40"
                    }`}
                  >
                    {counts.new}
                  </span>
                  <span
                    className={`text-xs font-medium text-right whitespace-nowrap ${
                      counts.learning > 0
                        ? "text-amber-300"
                        : "text-white/40"
                    }`}
                  >
                    {counts.learning}
                  </span>
                  <span
                    className={`text-xs font-medium text-right whitespace-nowrap ${
                      counts.review > 0
                        ? "text-emerald-300"
                        : "text-white/40"
                    }`}
                  >
                    {counts.review}
                  </span>
                  <span className="text-xs text-white/50 text-right whitespace-nowrap">
                    ({totalCards})
                  </span>
                </div>
              );
            }
            return (
              <div className="w-52 text-right">
                <span className="text-xs text-white/50 whitespace-nowrap">
                  {totalCards}
                </span>
              </div>
            );
          })()}

          {/* Actions - visible on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleAddCardClick}
              aria-label="Add card"
              className="h-7 px-2 text-xs hover:bg-white/10"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <DeckSettingsMenu
              deckId={deck.id}
              deckName={deck.name}
              onUpdate={onDeckDeleted}
            />
          </div>
        </div>
      </div>

      {hasChildren && expanded && (
        <div>
          {children.map((child) => (
            <DeckTree
              key={child.id}
              deck={child}
              allDecks={allDecks}
              cardCounts={cardCounts}
              learningCounts={learningCounts}
              level={level + 1}
              expandedDeckIds={expandedDeckIds}
              onToggleExpand={onToggleExpand}
              onDeckCreated={onDeckCreated}
              onDeckDeleted={onDeckDeleted}
            />
          ))}
        </div>
      )}

      <Dialog open={subDeckDialogOpen} onOpenChange={setSubDeckDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New sub-deck</DialogTitle>
            <DialogDescription>
              Create a sub-deck under &quot;{deck.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Sub-deck name"
              value={subDeckName}
              onChange={(e) => setSubDeckName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateSubDeck();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDeckDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubDeck}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addCardDialogOpen} onOpenChange={setAddCardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New card</DialogTitle>
            <DialogDescription>
              Add a new card to &quot;{deck.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Front</label>
              <Input
                placeholder="Question or front text"
                value={cardFront}
                onChange={(e) => {
                  setCardFront(e.target.value);
                }}
              />
              <div className="mt-1 text-xs text-muted-foreground">
                DEBUG State: {cardFront} | Reversed: {cardFront.split("").reverse().join("")}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Back</label>
              <Input
                placeholder="Answer or back text"
                value={cardBack}
                onChange={(e) => {
                  setCardBack(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && cardFront.trim() && cardBack.trim()) {
                    handleCreateCard();
                  }
                }}
              />
              <div className="mt-1 text-xs text-muted-foreground">
                DEBUG State: {cardBack} | Reversed: {cardBack.split("").reverse().join("")}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCardDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCard}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
