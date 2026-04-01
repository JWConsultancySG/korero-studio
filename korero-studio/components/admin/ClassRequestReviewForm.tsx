"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { SongGroup, ClassType } from "@/types";
import { CLASS_LABELS } from "@/lib/credits";
import { makeSongKey } from "@/lib/song-key";
import type { ReviewClassRequestPayload } from "@/context/AppContext";
import { Loader2, Plus, X } from "lucide-react";

const ALL_CLASS_TYPES: ClassType[] = ["no-filming", "half-song", "full-song"];

type Props = {
  group: SongGroup;
  onSubmit: (payload: ReviewClassRequestPayload) => void;
  onCancel?: () => void;
};

export function ClassRequestReviewForm({ group, onSubmit, onCancel }: Props) {
  const songKey = group.songKey ?? makeSongKey(group.songTitle, group.artist);
  const [formationSize, setFormationSize] = useState(String(group.maxMembers || 4));
  const [roleNames, setRoleNames] = useState<string[]>(
    group.slotLabels?.length ? [...group.slotLabels] : ["Role 1", "Role 2", "Role 3", "Role 4"],
  );
  const [newRoleName, setNewRoleName] = useState("");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [teacherNotes, setTeacherNotes] = useState("");
  const [classOpts, setClassOpts] = useState<ClassType[]>(["no-filming", "half-song", "full-song"]);
  const [busy, setBusy] = useState(false);

  const image = group.imageUrl;

  useEffect(() => {
    const n = Math.max(1, Math.min(15, parseInt(formationSize, 10) || 1));
    setRoleNames((prev) => {
      if (prev.length === n) return prev;
      const next = [...prev];
      if (next.length > n) return next.slice(0, n);
      for (let i = next.length; i < n; i++) next.push(`Member ${i + 1}`);
      return next;
    });
  }, [formationSize]);

  const updateRoleName = (idx: number, value: string) => {
    setRoleNames((prev) => prev.map((r, i) => (i === idx ? value : r)));
  };

  const removeRoleAt = (idx: number) => {
    setRoleNames((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== idx);
      setFormationSize(String(next.length));
      return next;
    });
  };

  const addRole = () => {
    const name = newRoleName.trim();
    if (!name) return;
    setRoleNames((prev) => {
      if (prev.length >= 15) return prev;
      const next = [...prev, name];
      setFormationSize(String(next.length));
      return next;
    });
    setNewRoleName("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Math.max(1, Math.min(15, parseInt(formationSize, 10) || 1));
    const roles = roleNames.map((s) => s.trim()).filter(Boolean).slice(0, n);
    if (roles.length < n) {
      for (let i = roles.length; i < n; i++) roles.push(`Member ${i + 1}`);
    }
    if (classOpts.length === 0) return;
    setBusy(true);
    const payload: ReviewClassRequestPayload = {
      songKey,
      songTitle: group.songTitle,
      artist: group.artist,
      imageUrl: image,
      itunesTrackId: group.itunesTrackId,
      formationSize: n,
      roleNames: roles,
      difficulty,
      classTypeOptions: classOpts,
      teacherNotes,
    };
    onSubmit(payload);
    setBusy(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left max-w-lg mx-auto">
      <div className="flex gap-4 items-start">
        {image ? (
          <img src={image} alt="" className="w-20 h-20 rounded-2xl object-cover shrink-0 ring-2 ring-primary/20" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-muted shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-black text-foreground leading-tight">{group.songTitle}</p>
          <p className="text-sm text-muted-foreground font-bold">{group.artist}</p>
          <p className="text-[10px] font-mono text-muted-foreground mt-1 truncate">Key: {songKey}</p>
        </div>
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
        <Label>Role / slot names</Label>
        <div className="space-y-2">
          {roleNames.map((name, idx) => (
            <div key={`${idx}-${name}`} className="flex items-center gap-2">
              <Input
                value={name}
                onChange={(e) => updateRoleName(idx, e.target.value)}
                className="rounded-xl h-11"
                placeholder={`Member ${idx + 1}`}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-xl shrink-0"
                onClick={() => removeRoleAt(idx)}
                disabled={roleNames.length <= 1}
                aria-label={`Remove role ${idx + 1}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Add a new role/slot"
              className="rounded-xl h-11"
              maxLength={40}
            />
            <Button type="button" variant="outline" className="rounded-xl font-bold shrink-0" onClick={addRole}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="diff">Difficulty</Label>
        <Input id="diff" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="rounded-xl h-11" />
      </div>

      <div className="space-y-2">
        <Label>Class types allowed for this class</Label>
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
          Approve &amp; publish
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
