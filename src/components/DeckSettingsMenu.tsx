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

interface DeckSettingsMenuProps {
  deckId: string;
  deckName: string;
  onUpdate: () => void;
}

export function DeckSettingsMenu({ deckId, deckName, onUpdate }: DeckSettingsMenuProps) {
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
    alert("Export functionality coming soon!");
    setExportDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="hover:bg-gray-200"
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
            Renommer le deck
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setOptionsDialogOpen(true);
            }}
          >
            <Package className="mr-2 h-4 w-4" />
            Options du paquet
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setExportDialogOpen(true);
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Exporter le paquet
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
            Supprimer le paquet
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer le deck</DialogTitle>
            <DialogDescription>
              Entrez le nouveau nom pour &quot;{deckName}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Nom du deck"
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
              Annuler
            </Button>
            <Button onClick={handleRename}>Renommer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le deck</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer &quot;{deckName}&quot; ? Cette action
              supprimera également tous les sous-decks et toutes les cartes. Cette action
              est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exporter le paquet</DialogTitle>
            <DialogDescription>
              L&apos;export au format Anki (.apkg) ou JSON sera disponible prochainement.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Fermer
            </Button>
            <Button onClick={handleExport} disabled>
              Exporter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Options Dialog */}
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
