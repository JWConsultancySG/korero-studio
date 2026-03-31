"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import type { SongCatalogEntry } from "@/types";
import { CLASS_LABELS } from "@/lib/credits";
import type { ValidateSongPayload } from "@/context/AppContext";
import { SongCatalogEditorForm } from "@/components/admin/SongCatalogEditorForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminTutorialCallout } from "@/components/admin/AdminTutorialCallout";

export default function AdminSongLibraryPanel() {
  const { songCatalog, saveSongCatalogEntry, deleteSongCatalogEntry } = useApp();
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editEntry, setEditEntry] = useState<SongCatalogEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<SongCatalogEntry | null>(null);

  const list = useMemo(() => {
    const rows = Object.values(songCatalog).filter((e) => e.validated);
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter(
          (e) =>
            e.songTitle.toLowerCase().includes(q) ||
            e.artist.toLowerCase().includes(q) ||
            e.songKey.toLowerCase().includes(q),
        )
      : rows;
    return filtered.sort((a, b) => a.songTitle.localeCompare(b.songTitle));
  }, [songCatalog, query]);

  const openCreate = () => {
    setEditorMode("create");
    setEditEntry(null);
    setEditorOpen(true);
  };

  const openEdit = (e: SongCatalogEntry) => {
    setEditorMode("edit");
    setEditEntry(e);
    setEditorOpen(true);
  };

  const handleSave = async (payload: ValidateSongPayload, previousSongKey?: string) => {
    if (editorMode === "create") {
      if (songCatalog[payload.songKey]) {
        toast.error("That song title + artist is already in the library.");
        return;
      }
    }
    await saveSongCatalogEntry(payload, previousSongKey);
    toast.success(editorMode === "create" ? "Song added to library." : "Library entry saved.");
    setEditorOpen(false);
    setEditEntry(null);
  };

  const confirmDelete = async () => {
    if (!deleteEntry) return;
    const result = await deleteSongCatalogEntry(deleteEntry.songKey);
    if (!result.ok) {
      toast.error("Cannot delete — a class listing still uses this song. Remove or reassign classes first.");
    } else {
      toast.success("Removed from library.");
    }
    setDeleteEntry(null);
  };

  return (
    <div className="space-y-4">
      <AdminTutorialCallout title="Song library & new classes">
        <p>
          Each entry is the <strong>canonical profile</strong> for a song title + artist. When students create a class,
          the app matches their pick to this row — formation, roles, and allowed class types apply automatically.
        </p>
        <p>
          Use <strong>Add song</strong> to seed the library before anyone lists that track, or finish profiles from the{" "}
          <strong>Validation</strong> tab when students submit new music.
        </p>
      </AdminTutorialCallout>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Add, edit, or remove validated songs. New listings reuse formation and roles from here. Renaming title or artist
        updates the library key and fixes matching class rows.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, artist, or key…"
            className="pl-9 rounded-xl h-11"
            aria-label="Search song library"
          />
        </div>
        <Button type="button" onClick={openCreate} className="rounded-2xl font-black gradient-purple shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Add song
        </Button>
      </div>

      <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden bg-card/30">
        {list.length === 0 ? (
          <p className="p-8 text-sm text-muted-foreground text-center">
            {query.trim()
              ? "No songs match your search."
              : "No songs in the library yet — add one to seed formations for new classes."}
          </p>
        ) : (
          list.map((e, i) => (
            <motion.div
              key={e.songKey}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              {e.imageUrl ? (
                <img src={e.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 ring-1 ring-border" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-muted shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-foreground">{e.songTitle}</p>
                <p className="text-xs text-muted-foreground font-bold">{e.artist}</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-1 truncate">{e.songKey}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {e.formationSize} members · {e.difficulty} · {e.roleNames.join(", ")}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {e.classTypeOptions.map((c) => (
                    <Badge key={c} variant="secondary" className="text-[9px]">
                      {CLASS_LABELS[c]}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold"
                  onClick={() => openEdit(e)}
                >
                  <Pencil className="w-4 h-4 mr-1.5" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setDeleteEntry(e)}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <Dialog open={editorOpen} onOpenChange={(o) => !o && setEditorOpen(false)}>
        <DialogContent className="max-w-lg max-h-[min(90vh,720px)] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              {editorMode === "create" ? "Add song to library" : "Edit library entry"}
            </DialogTitle>
            <DialogDescription className="text-left text-sm">
              {editorMode === "create"
                ? "Creates a validated profile students will match when they list the same title and artist."
                : "Changes apply immediately. Renaming updates the key and linked class rows when needed."}
            </DialogDescription>
          </DialogHeader>
          <SongCatalogEditorForm
            key={editorMode === "create" ? "create" : editEntry?.songKey ?? "edit"}
            mode={editorMode}
            initialEntry={editEntry ?? undefined}
            onSubmit={handleSave}
            onCancel={() => setEditorOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteEntry !== null} onOpenChange={(o) => !o && setDeleteEntry(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from library?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteEntry ? (
                <>
                  <span className="font-bold text-foreground">{deleteEntry.songTitle}</span> by{" "}
                  <span className="font-bold text-foreground">{deleteEntry.artist}</span> will be removed. You cannot
                  delete a song while a class listing still references it.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
