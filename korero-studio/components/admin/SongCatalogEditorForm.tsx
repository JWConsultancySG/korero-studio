"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { ClassType, SongCatalogEntry } from "@/types";
import { CLASS_LABELS } from "@/lib/credits";
import { makeSongKey } from "@/lib/song-key";
import type { ValidateSongPayload } from "@/context/AppContext";
import { Loader2 } from "lucide-react";

const ALL_CLASS_TYPES: ClassType[] = ["no-filming", "half-song", "full-song"];

export type SongCatalogEditorMode = "create" | "edit";

type Props = {
  mode: SongCatalogEditorMode;
  /** When editing, seed fields from this entry. */
  initialEntry?: SongCatalogEntry;
  onSubmit: (payload: ValidateSongPayload, previousSongKey?: string) => void;
  onCancel?: () => void;
};

export function SongCatalogEditorForm({ mode, initialEntry, onSubmit, onCancel }: Props) {
  const [songTitle, setSongTitle] = useState(initialEntry?.songTitle ?? "");
  const [artist, setArtist] = useState(initialEntry?.artist ?? "");
  const [imageUrl, setImageUrl] = useState(initialEntry?.imageUrl ?? "");
  const [itunesId, setItunesId] = useState(
    initialEntry?.itunesTrackId != null ? String(initialEntry.itunesTrackId) : "",
  );
  const [formationSize, setFormationSize] = useState(String(initialEntry?.formationSize ?? 4));
  const [rolesText, setRolesText] = useState(
    initialEntry?.roleNames?.join(", ") ?? "Role 1, Role 2, Role 3, Role 4",
  );
  const [difficulty, setDifficulty] = useState(initialEntry?.difficulty ?? "Intermediate");
  const [teacherNotes, setTeacherNotes] = useState(initialEntry?.teacherNotes ?? "");
  const [classOpts, setClassOpts] = useState<ClassType[]>(
    initialEntry?.classTypeOptions?.length ? [...initialEntry.classTypeOptions] : [...ALL_CLASS_TYPES],
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!initialEntry) return;
    setSongTitle(initialEntry.songTitle);
    setArtist(initialEntry.artist);
    setImageUrl(initialEntry.imageUrl ?? "");
    setItunesId(initialEntry.itunesTrackId != null ? String(initialEntry.itunesTrackId) : "");
    setFormationSize(String(initialEntry.formationSize));
    setRolesText(initialEntry.roleNames.join(", "));
    setDifficulty(initialEntry.difficulty);
    setTeacherNotes(initialEntry.teacherNotes);
    setClassOpts(
      initialEntry.classTypeOptions?.length ? [...initialEntry.classTypeOptions] : [...ALL_CLASS_TYPES],
    );
  }, [initialEntry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Math.max(1, Math.min(15, parseInt(formationSize, 10) || 1));
    const parsed = rolesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const roles: string[] = [];
    for (let i = 0; i < n; i++) {
      roles.push(parsed[i] ?? `Member ${i + 1}`);
    }
    if (classOpts.length === 0) return;
    const title = songTitle.trim();
    const art = artist.trim();
    if (!title || !art) return;

    const songKey = makeSongKey(title, art);
    const itunesNum = itunesId.trim() ? parseInt(itunesId.trim(), 10) : undefined;
    const payload: ValidateSongPayload = {
      songKey,
      songTitle: title,
      artist: art,
      imageUrl: imageUrl.trim() || undefined,
      itunesTrackId: Number.isFinite(itunesNum) ? itunesNum : undefined,
      formationSize: n,
      roleNames: roles,
      difficulty,
      classTypeOptions: classOpts,
      teacherNotes,
    };

    const previousSongKey =
      mode === "edit" && initialEntry && songKey !== initialEntry.songKey ? initialEntry.songKey : undefined;

    setBusy(true);
    onSubmit(payload, previousSongKey);
    setBusy(false);
  };

  const previewKey = makeSongKey(songTitle.trim() || "—", artist.trim() || "—");

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="cat-title">Song title</Label>
          <Input
            id="cat-title"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            className="rounded-xl h-11"
            placeholder="Super Shy"
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="cat-artist">Artist</Label>
          <Input
            id="cat-artist"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            className="rounded-xl h-11"
            placeholder="NewJeans"
            required
          />
        </div>
      </div>
      <p className="text-[10px] font-mono text-muted-foreground break-all">
        Library key: <span className="text-foreground">{previewKey}</span>
      </p>

      <div className="space-y-2">
        <Label htmlFor="cat-image">Artwork URL (optional)</Label>
        <Input
          id="cat-image"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="rounded-xl h-11"
          placeholder="https://…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cat-itunes">iTunes track ID (optional)</Label>
        <Input
          id="cat-itunes"
          inputMode="numeric"
          value={itunesId}
          onChange={(e) => setItunesId(e.target.value)}
          className="rounded-xl h-11"
          placeholder="1234567890"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="formation">Formation size (members)</Label>
        <Input
          id="formation"
          type="number"
          min={2}
          max={15}
          value={formationSize}
          onChange={(e) => setFormationSize(e.target.value)}
          className="rounded-xl h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="roles">Role / slot names (comma-separated)</Label>
        <Textarea
          id="roles"
          value={rolesText}
          onChange={(e) => setRolesText(e.target.value)}
          rows={3}
          placeholder="Jisoo, Jennie, Rosé, Lisa"
          className="rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="diff">Difficulty</Label>
        <Input id="diff" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="rounded-xl h-11" />
      </div>

      <div className="space-y-2">
        <Label>Class types allowed for this song</Label>
        <div className="flex flex-wrap gap-3">
          {ALL_CLASS_TYPES.map((ct) => (
            <label key={ct} className="flex items-center gap-2 text-sm font-bold cursor-pointer">
              <Checkbox
                checked={classOpts.includes(ct)}
                onCheckedChange={(v) => {
                  if (v === true) setClassOpts((p) => (p.includes(ct) ? p : [...p, ct]));
                  else setClassOpts((p) => p.filter((x) => x !== ct));
                }}
              />
              {CLASS_LABELS[ct]}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Teacher notes</Label>
        <Textarea
          id="notes"
          value={teacherNotes}
          onChange={(e) => setTeacherNotes(e.target.value)}
          rows={3}
          className="rounded-xl"
          placeholder="Choreo focus, formation notes, etc."
        />
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={busy || classOpts.length === 0} className="rounded-2xl font-black gradient-purple">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {mode === "create" ? "Add to library" : "Save changes"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" className="rounded-2xl font-bold" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
