"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ClipboardCheck,
  ExternalLink,
  Hash,
  Loader2,
  Music,
  Pencil,
  Search,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import type { SongGroup, GroupStatus, ClassType, GroupMemberEnrollment } from "@/types";
import { CLASS_LABELS } from "@/lib/credits";
import { makeSongKey, groupSongKey } from "@/lib/song-key";
import { AdminTutorialCallout } from "@/components/admin/AdminTutorialCallout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const CLASS_TYPES: ClassType[] = ["no-filming", "half-song", "full-song"];
const STATUSES: GroupStatus[] = ["forming", "confirmed", "pending"];

type FilterKey = "all" | "forming" | "confirmed" | "pending" | "awaiting_validation";

function countAvailabilitySlots(e: GroupMemberEnrollment): number {
  return e.availabilitySlots?.length ?? 0;
}

type Props = {
  onValidateSong: (g: SongGroup) => void;
};

export default function AdminClassListingsPanel({ onValidateSong }: Props) {
  const {
    groups,
    sessions,
    bookings,
    songCatalog,
    pendingGroups,
    approveGroup,
    rejectGroup,
    updateSongGroup,
    deleteSongGroup,
    removeSongGroupMember,
    confirmInstructorForGroup,
    recomputeGroupMatching,
  } = useApp();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [editGroup, setEditGroup] = useState<SongGroup | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<SongGroup | null>(null);
  const [removeMember, setRemoveMember] = useState<{ groupId: string; studentId: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((g) => {
      if (filter === "forming" && g.status !== "forming") return false;
      if (filter === "confirmed" && g.status !== "confirmed") return false;
      if (filter === "pending" && g.status !== "pending") return false;
      if (filter === "awaiting_validation" && !g.awaitingSongValidation) return false;
      if (!q) return true;
      return (
        g.songTitle.toLowerCase().includes(q) ||
        g.artist.toLowerCase().includes(q) ||
        g.id.toLowerCase().includes(q) ||
        (g.songKey ?? "").toLowerCase().includes(q) ||
        (g.enrollments ?? []).some(
          (e) =>
            e.studentName.toLowerCase().includes(q) ||
            e.studentId.toLowerCase().includes(q) ||
            e.slotLabel.toLowerCase().includes(q),
        )
      );
    });
  }, [groups, query, filter]);

  const sessionsByGroup = useMemo(() => {
    const m = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const arr = m.get(s.groupId) ?? [];
      arr.push(s);
      m.set(s.groupId, arr);
    }
    return m;
  }, [sessions]);

  const bookingsByGroup = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bookings) {
      m.set(b.groupId, (m.get(b.groupId) ?? 0) + 1);
    }
    return m;
  }, [bookings]);

  const handleSaveEdit = async () => {
    if (!editGroup) return;
    const g = editGroup;
    setSaving(true);
    try {
      await updateSongGroup(g.id, {
        songTitle: g.songTitle.trim(),
        artist: g.artist.trim(),
        status: g.status,
        maxMembers: g.maxMembers,
        slotLabels: g.slotLabels?.map((s) => s.trim()).filter(Boolean) ?? [],
        classTypeAtCreation: g.classTypeAtCreation,
        imageUrl: g.imageUrl?.trim() || undefined,
        itunesTrackId: g.itunesTrackId,
        awaitingSongValidation: g.awaitingSongValidation,
        creatorSlotLabel: g.creatorSlotLabel?.trim() || undefined,
      });
      toast.success("Class listing updated.");
      setEditGroup(null);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteGroup) return;
    await deleteSongGroup(deleteGroup.id);
    toast.success("Listing removed.");
    setDeleteGroup(null);
  };

  const confirmRemoveMember = async () => {
    if (!removeMember) return;
    const { groupId, studentId } = removeMember;
    await removeSongGroupMember(groupId, studentId);
    toast.success("Member removed from class.");
    setRemoveMember(null);
    setEditGroup((prev) => {
      if (!prev || prev.id !== groupId) return prev;
      const enrollments = (prev.enrollments ?? []).filter((e) => e.studentId !== studentId);
      const members = prev.members.filter((id) => id !== studentId);
      return { ...prev, enrollments, members, interestCount: enrollments.length };
    });
  };

  return (
    <div className="space-y-5">
      <AdminTutorialCallout title="How class listings work">
        <p>
          Each row is a <strong>public class</strong> students can join. <strong>Formation</strong> comes from the song
          library once the song is validated, or from the creator&apos;s draft if it&apos;s still pending.
        </p>
        <p>
          <strong>Members</strong> are everyone enrolled (with a slot / role name). Use <strong>Edit</strong> to fix
          typos, capacity, or validation flags; use <strong>Delete</strong> only if the class should disappear entirely
          (sessions and demo bookings tied to it are cleared too).
        </p>
        <p>
          Open <strong>Validate song</strong> when you see &quot;Awaiting validation&quot; — that activates the listing
          and applies library defaults for new joins.
        </p>
      </AdminTutorialCallout>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, artist, member, or ID…"
            className="pl-9 rounded-xl h-11"
            aria-label="Search classes"
          />
        </div>
        <Button asChild variant="outline" className="rounded-xl font-bold shrink-0">
          <Link href="/browse/new?asAdmin=1">
            <ExternalLink className="w-4 h-4 mr-2" /> New class
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["forming", "Forming"],
            ["confirmed", "Confirmed"],
            ["pending", "Pending"],
            ["awaiting_validation", "Awaiting validation"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={filter === key ? "default" : "outline"}
            className={cn("rounded-full font-bold", filter === key && "gradient-purple")}
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {pendingGroups.length > 0 && (
        <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-primary">Legacy pending approval</p>
          <div className="space-y-2">
            {pendingGroups.map((g) => (
              <div key={g.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-card/80 border border-border p-3">
                <Music className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{g.songTitle}</p>
                  <p className="text-xs text-muted-foreground">{g.artist}</p>
                </div>
                <Button
                  size="sm"
                  className="rounded-xl"
                  onClick={() => {
                    approveGroup(g.id);
                    toast.success("Approved");
                  }}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    rejectGroup(g.id);
                    toast.error("Rejected");
                  }}
                >
                  Reject
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-16 border border-dashed rounded-2xl">
          No classes match your filters.
        </p>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {filtered.map((g) => {
            const sk = g.songKey ?? makeSongKey(g.songTitle, g.artist);
            const lib = songCatalog[sk];
            const groupSessions = sessionsByGroup.get(g.id) ?? [];
            const bookingN = bookingsByGroup.get(g.id) ?? 0;
            const enrollments = g.enrollments ?? [];

            return (
              <AccordionItem
                key={g.id}
                value={g.id}
                className="border rounded-2xl bg-card/40 px-1 border-border/80"
              >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline rounded-2xl [&[data-state=open]]:bg-muted/30">
                    <div className="flex flex-1 items-start gap-3 text-left min-w-0">
                      {g.imageUrl ? (
                        <img src={g.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 ring-1 ring-border" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-muted shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-foreground truncate pr-2">{g.songTitle}</p>
                        <p className="text-sm text-muted-foreground font-bold truncate">{g.artist}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {g.status}
                          </Badge>
                          {g.classTypeAtCreation && (
                            <Badge className="text-[10px] gradient-purple text-primary-foreground">
                              {CLASS_LABELS[g.classTypeAtCreation]}
                            </Badge>
                          )}
                          {g.awaitingSongValidation ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Awaiting validation
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Live
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {g.interestCount}/{g.maxMembers} members
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-0">
                    <div className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {g.awaitingSongValidation && (
                          <Button size="sm" className="rounded-xl font-bold" onClick={() => onValidateSong(g)}>
                            <ClipboardCheck className="w-4 h-4 mr-1.5" />
                            Validate song
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="rounded-xl font-bold" onClick={() => setEditGroup({ ...g })}>
                          <Pencil className="w-4 h-4 mr-1.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl font-bold text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => setDeleteGroup(g)}
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          Delete
                        </Button>
                        <Button asChild size="sm" variant="ghost" className="rounded-xl font-bold ml-auto">
                          <Link href={`/browse/${g.id}`}>
                            <ExternalLink className="w-4 h-4 mr-1.5" />
                            Public page
                          </Link>
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-[11px]">
                        <div className="rounded-lg bg-muted/40 p-2.5">
                          <p className="text-muted-foreground font-bold uppercase flex items-center gap-1">
                            <Hash className="w-3 h-3" /> Song key
                          </p>
                          <p className="font-mono text-[10px] break-all mt-1 text-foreground">{sk}</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-2.5">
                          <p className="text-muted-foreground font-bold uppercase">Listing ID</p>
                          <p className="font-mono text-[10px] break-all mt-1 text-foreground">{g.id}</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-2.5">
                          <p className="text-muted-foreground font-bold uppercase">Credits charged</p>
                          <p className="font-black text-foreground mt-1">{g.creditsCharged ?? "—"}</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-2.5">
                          <p className="text-muted-foreground font-bold uppercase">Demo bookings</p>
                          <p className="font-black text-foreground mt-1">{bookingN}</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-2.5 sm:col-span-2">
                          <p className="text-muted-foreground font-bold uppercase">Library match</p>
                          <p className="text-foreground mt-1 text-xs">
                            {lib?.validated ? (
                              <>
                                <span className="font-bold">{lib.songTitle}</span> — {lib.difficulty}
                              </>
                            ) : (
                              <span className="text-amber-700 dark:text-amber-300 font-bold">No validated library entry for this key yet</span>
                            )}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-2.5 sm:col-span-2">
                          <p className="text-muted-foreground font-bold uppercase flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Scheduled sessions
                          </p>
                          {groupSessions.length === 0 ? (
                            <p className="text-muted-foreground mt-1 text-xs">None in timetable</p>
                          ) : (
                            <ul className="mt-1 space-y-1 text-xs text-foreground">
                              {groupSessions.map((s) => (
                                <li key={s.id}>
                                  <span className="font-bold">{s.room}</span> · {s.day} {s.time}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-primary mb-2 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Members ({enrollments.length})
                        </p>
                        {enrollments.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No enrollments recorded.</p>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-border">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-muted/50 text-left text-[10px] uppercase font-bold text-muted-foreground">
                                  <th className="p-2.5">Student</th>
                                  <th className="p-2.5">Slot / role</th>
                                  <th className="p-2.5">Student ID</th>
                                  <th className="p-2.5">Availability blocks</th>
                                  <th className="p-2.5 w-24" />
                                </tr>
                              </thead>
                              <tbody>
                                {enrollments.map((e) => (
                                  <tr key={e.studentId} className="border-b border-border/60 last:border-0">
                                    <td className="p-2.5 font-bold">{e.studentName}</td>
                                    <td className="p-2.5">{e.slotLabel}</td>
                                    <td className="p-2.5 font-mono text-[10px]">{e.studentId}</td>
                                    <td className="p-2.5 text-muted-foreground">{countAvailabilitySlots(e)}</td>
                                    <td className="p-2.5">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-destructive hover:text-destructive"
                                        onClick={() =>
                                          setRemoveMember({ groupId: g.id, studentId: e.studentId, name: e.studentName })
                                        }
                                      >
                                        <UserMinus className="w-4 h-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <div>
                          <span className="font-bold text-foreground">Creator ID: </span>
                          {g.creatorId ?? "—"}
                        </div>
                        <div>
                          <span className="font-bold text-foreground">Creator slot: </span>
                          {g.creatorSlotLabel ?? "—"}
                        </div>
                        <div className="sm:col-span-2">
                          <span className="font-bold text-foreground">Formation slots: </span>
                          {(g.slotLabels ?? []).join(", ") || "—"}
                        </div>
                        <div>
                          <span className="font-bold text-foreground">Matching state: </span>
                          {g.matchingState ?? "forming"}
                        </div>
                        <div>
                          <span className="font-bold text-foreground">Instructor: </span>
                          {g.instructorAssignment
                            ? `${g.instructorAssignment.instructorId} (${g.instructorAssignment.status})`
                            : "none"}
                        </div>
                      </div>
                      {g.instructorAssignment?.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              void confirmInstructorForGroup(g.id, g.instructorAssignment ? g.instructorAssignment.id : "")
                            }
                          >
                            Confirm instructor
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void recomputeGroupMatching(g.id)}>
                            Recompute matching
                          </Button>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <Dialog open={editGroup !== null} onOpenChange={(o) => !o && setEditGroup(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Edit class listing</DialogTitle>
            <DialogDescription>
              Changes save to this device&apos;s demo state. Renaming song or artist updates the internal song key to
              match the library.
            </DialogDescription>
          </DialogHeader>
          {editGroup && (
            <ClassEditBody
              group={editGroup}
              onChange={setEditGroup}
              onRemoveMember={(studentId, name) => {
                const g = editGroup;
                setRemoveMember({ groupId: g.id, studentId, name });
              }}
            />
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditGroup(null)}>
              Cancel
            </Button>
            <Button className="rounded-xl font-black gradient-purple" onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteGroup !== null} onOpenChange={(o) => !o && setDeleteGroup(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this class listing?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteGroup ? (
                <>
                  <span className="font-bold text-foreground">{deleteGroup.songTitle}</span> will be removed. Scheduled
                  sessions and demo bookings for this class are removed too. This cannot be undone in the demo.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete listing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removeMember !== null} onOpenChange={(o) => !o && setRemoveMember(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeMember ? (
                <>
                  Remove <span className="font-bold text-foreground">{removeMember.name}</span> from this class?
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl" onClick={confirmRemoveMember}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClassEditBody({
  group,
  onChange,
  onRemoveMember,
}: {
  group: SongGroup;
  onChange: (g: SongGroup) => void;
  onRemoveMember: (studentId: string, name: string) => void;
}) {
  const slotsText = (group.slotLabels ?? []).join(", ");

  return (
    <div className="space-y-4 py-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Song title</Label>
          <Input
            value={group.songTitle}
            onChange={(e) => onChange({ ...group, songTitle: e.target.value })}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label>Artist</Label>
          <Input value={group.artist} onChange={(e) => onChange({ ...group, artist: e.target.value })} className="rounded-xl" />
        </div>
      </div>
      <p className="text-[10px] font-mono text-muted-foreground break-all">
        Key: {groupSongKey(group)} → {makeSongKey(group.songTitle, group.artist)}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={group.status}
            onValueChange={(v) => onChange({ ...group, status: v as GroupStatus })}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Max members</Label>
          <Input
            type="number"
            min={1}
            max={30}
            value={group.maxMembers}
            onChange={(e) => onChange({ ...group, maxMembers: Math.max(1, parseInt(e.target.value, 10) || 1) })}
            className="rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Class format (at creation)</Label>
        <Select
          value={group.classTypeAtCreation ?? "half-song"}
          onValueChange={(v) => onChange({ ...group, classTypeAtCreation: v as ClassType })}
        >
          <SelectTrigger className="rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CLASS_TYPES.map((c) => (
              <SelectItem key={c} value={c}>
                {CLASS_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Formation / slot labels (comma-separated)</Label>
        <Textarea
          value={slotsText}
          onChange={(e) =>
            onChange({
              ...group,
              slotLabels: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          rows={2}
          className="rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label>Artwork URL</Label>
        <Input
          value={group.imageUrl ?? ""}
          onChange={(e) => onChange({ ...group, imageUrl: e.target.value || undefined })}
          className="rounded-xl"
          placeholder="https://…"
        />
      </div>

      <div className="space-y-2">
        <Label>iTunes track ID</Label>
        <Input
          inputMode="numeric"
          value={group.itunesTrackId != null ? String(group.itunesTrackId) : ""}
          onChange={(e) => {
            const v = e.target.value.trim();
            const n = v ? parseInt(v, 10) : NaN;
            onChange({
              ...group,
              itunesTrackId: Number.isFinite(n) ? n : undefined,
            });
          }}
          className="rounded-xl"
        />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-3">
        <div>
          <p className="font-bold text-sm">Awaiting song validation</p>
          <p className="text-xs text-muted-foreground">Hide from browse until you validate in the Validation tab.</p>
        </div>
        <Switch
          checked={Boolean(group.awaitingSongValidation)}
          onCheckedChange={(c) => onChange({ ...group, awaitingSongValidation: c })}
        />
      </div>

      <div className="space-y-2">
        <Label>Creator slot label</Label>
        <Input
          value={group.creatorSlotLabel ?? ""}
          onChange={(e) => onChange({ ...group, creatorSlotLabel: e.target.value || undefined })}
          className="rounded-xl"
        />
      </div>

      <div className="rounded-xl border border-dashed border-border p-3 space-y-2">
        <p className="text-xs font-bold text-foreground">Members</p>
        {(group.enrollments ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No members.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(group.enrollments ?? []).map((e) => (
              <li key={e.studentId} className="flex items-center justify-between gap-2">
                <span>
                  <span className="font-bold">{e.studentName}</span>{" "}
                  <span className="text-muted-foreground">({e.slotLabel})</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive h-8"
                  onClick={() => onRemoveMember(e.studentId, e.studentName)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
