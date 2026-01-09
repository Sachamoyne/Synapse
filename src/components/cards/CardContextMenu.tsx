"use client";

import type React from "react";

interface CardContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  suspended: boolean;
  marked: boolean;
  onChangeDeck: () => void;
  onSetDueDate: () => void;
  onForget: () => void;
  onToggleSuspend: () => void;
  onToggleMark: () => void;
}

export function CardContextMenu({
  open,
  x,
  y,
  suspended,
  marked,
  onChangeDeck,
  onSetDueDate,
  onForget,
  onToggleSuspend,
  onToggleMark,
}: CardContextMenuProps) {
  if (!open) return null;

  const itemClassName =
    "w-full px-3 py-2 text-left cursor-pointer select-none outline-none " +
    "hover:bg-muted focus-visible:bg-muted active:bg-muted/70";
  const warningTextClassName = "text-amber-300";

  return (
    <div
      className="fixed z-50 min-w-56 rounded-md border border-white/10 bg-card shadow-lg py-1 text-sm text-foreground"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        className={itemClassName}
        onClick={onChangeDeck}
      >
        Change deck...
      </button>
      <button
        className={itemClassName}
        onClick={onSetDueDate}
      >
        Set due date...
      </button>
      <button
        className={`${itemClassName} ${warningTextClassName}`}
        onClick={onForget}
      >
        Forget
      </button>
      <button
        className={`${itemClassName} ${warningTextClassName}`}
        onClick={onToggleSuspend}
      >
        {suspended ? "Unsuspend" : "Suspend"}
      </button>
      <button
        className={itemClassName}
        onClick={onToggleMark}
      >
        {marked ? "Unmark" : "Mark"}
      </button>
    </div>
  );
}
