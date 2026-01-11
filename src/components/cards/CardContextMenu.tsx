"use client";

import { useTranslation } from "@/i18n";

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
  const { t } = useTranslation();

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
        {t("cardContext.changeDeck")}
      </button>
      <button
        className={itemClassName}
        onClick={onSetDueDate}
      >
        {t("cardContext.setDueDate")}
      </button>
      <button
        className={`${itemClassName} ${warningTextClassName}`}
        onClick={onForget}
      >
        {t("cardContext.forget")}
      </button>
      <button
        className={`${itemClassName} ${warningTextClassName}`}
        onClick={onToggleSuspend}
      >
        {suspended ? t("cardContext.unsuspend") : t("cardContext.suspend")}
      </button>
      <button
        className={itemClassName}
        onClick={onToggleMark}
      >
        {marked ? t("cardContext.unmark") : t("cardContext.mark")}
      </button>
    </div>
  );
}
