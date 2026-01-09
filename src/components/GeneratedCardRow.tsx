"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";

export interface CardProposal {
  front: string;
  back: string;
  confidence?: number;
  tags?: string[];
}

interface GeneratedCardRowProps {
  card: CardProposal;
  index: number;
  selected: boolean;
  onToggle: (index: number) => void;
  onUpdate: (index: number, front: string, back: string) => void;
  onDelete: (index: number) => void;
}

export function GeneratedCardRow({
  card,
  index,
  selected,
  onToggle,
  onUpdate,
  onDelete,
}: GeneratedCardRowProps) {
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);

  const handleFrontChange = (value: string) => {
    setFront(value);
    onUpdate(index, value, back);
  };

  const handleBackChange = (value: string) => {
    setBack(value);
    onUpdate(index, front, value);
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-card"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(index)}
            className="h-4 w-4 rounded border-white/20"
          />
          <span className="text-sm font-medium">
            Card {index + 1}
            {card.confidence !== undefined && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({Math.round(card.confidence * 100)}%)
              </span>
            )}
          </span>
        </label>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(index)}
          className="h-8 w-8"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Front
          </label>
          <Input
            value={front}
            onChange={(e) => handleFrontChange(e.target.value)}
            placeholder="Question or front text"
            className="text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Back
          </label>
          <Input
            value={back}
            onChange={(e) => handleBackChange(e.target.value)}
            placeholder="Answer or back text"
            className="text-sm"
          />
        </div>
        {card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.tags.map((tag, i) => (
              <span
                key={i}
                className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
