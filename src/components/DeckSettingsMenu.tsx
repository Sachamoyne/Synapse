"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { renameDeck, deleteDeck } from "@/store/decks";
import { Settings, Edit, Package, Download, Trash2 } from "lucide-react";
import { DeckOptions } from "@/components/DeckOptions";
import { useTranslation } from "@/i18n";

interface DeckSettingsMenuProps {
  deckId: string;
  deckName: string;
  onUpdate: () => void;
}

export function DeckSettingsMenu({ deckId, deckName, onUpdate }: DeckSettingsMenuProps) {
  const { t } = useTranslation();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  const [newDeckName, setNewDeckName] = useState(deckName);

  const handleRename = async () => {
    if (!newDeckName.trim()) return;

    try {
      await renameDeck(deckId, newDeckName.trim());
      setRenameDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error renaming deck:", error);
      alert("Error renaming deck: " + (error as Error).message);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDeck(deckId);
      setDeleteDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error deleting deck:", error);
      alert("Error deleting deck: " + (error as Error).message);
    }
  };

  const handleExport = async () => {
    setExportDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-11 w-11 sm:h-7 sm:w-7 px-0 hover:bg-gray-200"
            aria-label="Deck settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setNewDeckName(deckName);
              setRenameDialogOpen(true);
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            {t("deckSettings.rename")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setOptionsDialogOpen(true);
            }}
          >
            <Package className="mr-2 h-4 w-4" />
            {t("deckSettings.options")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setExportDialogOpen(true);
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            {t("deckSettings.export")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setDeleteDialogOpen(true);
            }}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("deckSettings.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deckSettings.renameTitle")}</DialogTitle>
            <DialogDescription>
              {t("deckSettings.renameDesc", { deckName })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder={t("decks.deckName")}
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRename();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleRename}>{t("deckSettings.rename").split(" ")[0]}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deckSettings.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("deckSettings.deleteDesc", { deckName })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deckSettings.exportTitle")}</DialogTitle>
            <DialogDescription>
              {t("deckSettings.exportDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              {t("common.close")}
            </Button>
            <Button onClick={handleExport} disabled>
              {t("deckSettings.export")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeckOptions
        open={optionsDialogOpen}
        onOpenChange={setOptionsDialogOpen}
        deckId={deckId}
        deckName={deckName}
        onSaved={onUpdate}
      />
    </>
  );
}
