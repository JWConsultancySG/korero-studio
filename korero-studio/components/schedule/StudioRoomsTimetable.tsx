"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { addDays, format, startOfDay } from "date-fns";
import {
  Building2,
  CalendarPlus,
  Check,
  Lock,
  MapPin,
  Music2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import type { ClassSession, StudioRoom } from "@/types";
import { ScheduleGridFrame } from "@/components/schedule/ScheduleGridFrame";
import { buildWeekColumns, enumerateWeekMondays } from "@/components/schedule/schedule-week";
import { hourNumberToTimeLabel, parseTimeLabelToHour } from "@/lib/schedule-time";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const STUDIO_ROOMS: StudioRoom[] = ["Farrer Park", "Orchard"];

function slotKey(dateKey: string, hour: number) {
  return `${dateKey}|${hour}`;
}

function sessionAt(
  sessions: ClassSession[],
  room: StudioRoom,
  dateKey: string,
  hour: number,
): ClassSession | undefined {
  return sessions.find((s) => {
    if (s.room !== room) return false;
    if (s.startAt) {
      const d = new Date(s.startAt);
      return format(d, "yyyy-MM-dd") === dateKey && d.getHours() === hour;
    }
    if (!s.day || !s.time) return false;
    const dayName = format(new Date(`${dateKey}T12:00:00`), "EEEE");
    const h = parseTimeLabelToHour(s.time);
    return s.day === dayName && h === hour;
  });
}

export default function StudioRoomsTimetable() {
  const { sessions, groups, assignSession, removeSession } = useApp();
  const [room, setRoom] = useState<StudioRoom>("Farrer Park");
  const [weekIndex, setWeekIndex] = useState(0);

  const today0 = startOfDay(new Date());
  const horizonEnd = startOfDay(addDays(today0, 29));

  const weekMondays = useMemo(() => enumerateWeekMondays(today0, horizonEnd), [today0, horizonEnd]);
  const weekMonday = weekMondays[Math.min(weekIndex, weekMondays.length - 1)] ?? weekMondays[0];
  const weekColumns = useMemo(
    () => buildWeekColumns(weekMonday, today0, horizonEnd),
    [weekMonday, today0, horizonEnd],
  );

  const [selection, setSelection] = useState<Set<string>>(() => new Set());
  const selectionRef = useRef(selection);
  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  const [dragSel, setDragSel] = useState(false);
  const [dragSelMode, setDragSelMode] = useState<"add" | "remove">("add");

  const [assignOpen, setAssignOpen] = useState(false);
  const [pendingSlots, setPendingSlots] = useState<{ dateKey: string; dayName: string; hour: number }[]>([]);
  const [pickGroupId, setPickGroupId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ClassSession | null>(null);

  useEffect(() => {
    setSelection(new Set());
  }, [room, weekIndex]);

  const confirmedGroups = useMemo(() => groups.filter((g) => g.status === "confirmed"), [groups]);

  const groupTitle = useCallback(
    (id: string) => groups.find((g) => g.id === id)?.songTitle ?? "Class",
    [groups],
  );

  const endDrag = useCallback(() => {
    setDragSel(false);
  }, []);

  const toggleSelectionCell = useCallback((dateKey: string, hour: number) => {
    const k = slotKey(dateKey, hour);
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }, []);

  const onEmptyPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, dateKey: string, hour: number) => {
      if (e.pointerType === "touch") e.preventDefault();
      const k = slotKey(dateKey, hour);
      const has = selectionRef.current.has(k);
      setDragSelMode(has ? "remove" : "add");
      setDragSel(true);
      toggleSelectionCell(dateKey, hour);
    },
    [toggleSelectionCell],
  );

  const onEmptyPointerEnter = useCallback(
    (dateKey: string, hour: number) => {
      if (!dragSel) return;
      const k = slotKey(dateKey, hour);
      setSelection((prev) => {
        const has = prev.has(k);
        if ((dragSelMode === "add" && !has) || (dragSelMode === "remove" && has)) {
          const next = new Set(prev);
          if (dragSelMode === "add") next.add(k);
          else next.delete(k);
          return next;
        }
        return prev;
      });
    },
    [dragSel, dragSelMode],
  );

  const openAssignDialog = useCallback(() => {
    if (selection.size === 0) return;
    const slots = Array.from(selection)
      .map((k) => {
        const pipe = k.lastIndexOf("|");
        const dateKey = k.slice(0, pipe);
        const hour = parseInt(k.slice(pipe + 1), 10);
        const dayName = format(new Date(`${dateKey}T12:00:00`), "EEEE");
        return { dateKey, dayName, hour };
      })
      .filter((s) => !Number.isNaN(s.hour))
      .sort((a, b) => (a.dateKey !== b.dateKey ? a.dateKey.localeCompare(b.dateKey) : a.hour - b.hour));
    setPendingSlots(slots);
    setPickGroupId("");
    setAssignOpen(true);
  }, [selection]);

  const confirmAssign = useCallback(async () => {
    if (pendingSlots.length === 0 || !pickGroupId) return;

    for (const slot of pendingSlots) {
      if (sessionAt(sessions, room, slot.dateKey, slot.hour)) {
        toast.error("One or more selected slots are already booked. Clear selection and try again.");
        return;
      }
    }

    for (const slot of pendingSlots) {
      const groupAlreadyBookedAtTime = sessions.some((s) => {
        if (s.groupId !== pickGroupId) return false;
        if (s.startAt) {
          const d = new Date(s.startAt);
          return format(d, "yyyy-MM-dd") === slot.dateKey && d.getHours() === slot.hour;
        }
        if (!s.day || !s.time) return false;
        return s.day === slot.dayName && parseTimeLabelToHour(s.time) === slot.hour;
      });
      if (groupAlreadyBookedAtTime) {
        toast.error("This class listing already has a session at one of the selected times.");
        return;
      }
    }

    setAssigning(true);
    try {
      for (const slot of pendingSlots) {
        const startAt = new Date(`${slot.dateKey}T00:00:00`);
        startAt.setHours(slot.hour, 0, 0, 0);
        const endAt = new Date(startAt);
        endAt.setHours(startAt.getHours() + 1, 0, 0, 0);
        await assignSession(pickGroupId, room, startAt.toISOString(), endAt.toISOString());
      }
      toast.success(
        pendingSlots.length === 1
          ? "Class assigned to timetable"
          : `Assigned ${pendingSlots.length} slots to the timetable`,
      );
      setSelection(new Set());
      setAssignOpen(false);
      setPendingSlots([]);
    } catch {
      toast.error("Could not assign every slot — check the timetable and try again.");
    } finally {
      setAssigning(false);
    }
  }, [pendingSlots, pickGroupId, sessions, room, assignSession]);

  const renderCell = useCallback(
    (dateKey: string, dayName: string, hour: number, disabled: boolean) => {
      const sess = disabled ? undefined : sessionAt(sessions, room, dateKey, hour);
      const title = sess ? groupTitle(sess.groupId) : "";
      const k = slotKey(dateKey, hour);
      const inSelection = selection.has(k);
      const prevSel = selection.has(slotKey(dateKey, hour - 1));
      const nextSel = selection.has(slotKey(dateKey, hour + 1));

      if (disabled) {
        return (
          <div
            className="group relative min-h-0 h-full bg-muted/50 cursor-not-allowed border-r border-border/40"
            title="Outside the 30-day booking window"
          >
            <Lock className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 text-muted-foreground/40" aria-hidden />
          </div>
        );
      }

      if (sess) {
        return (
          <button
            type="button"
            onClick={() => setRemoveTarget(sess)}
            title={`${title} — tap to remove`}
            className={cn(
              "group relative min-h-0 h-full w-full border-r border-border/40 px-0.5 py-0.5 text-left btn-press",
              "bg-gradient-to-b from-emerald-600/20 to-emerald-700/25 hover:from-emerald-600/35 hover:to-emerald-700/40",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
            )}
          >
            <Music2 className="absolute top-0.5 right-0.5 w-2.5 h-2.5 text-emerald-700/80 dark:text-emerald-400/90" aria-hidden />
            <span className="text-[8px] font-black text-foreground leading-tight line-clamp-2 break-words block pr-2 pt-0.5">
              {title}
            </span>
            <span className="sr-only">Booked — open to remove</span>
          </button>
        );
      }

      return (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleSelectionCell(dateKey, hour);
            }
          }}
          onPointerDown={(e) => onEmptyPointerDown(e, dateKey, hour)}
          onPointerEnter={() => onEmptyPointerEnter(dateKey, hour)}
          title={`${dateKey} ${hourNumberToTimeLabel(hour)} — drag like My Schedule to select`}
          className={cn(
            "min-h-0 h-full border-r border-border/40 transition-colors duration-75 touch-none",
            inSelection
              ? `bg-primary/80 ${!prevSel ? "rounded-t-sm" : ""} ${!nextSel ? "rounded-b-sm" : ""}`
              : "cursor-pointer bg-background/40 hover:bg-accent/60",
          )}
          aria-label={`${dayName} ${hourNumberToTimeLabel(hour)}${inSelection ? ", selected" : ""}`}
        />
      );
    },
    [sessions, room, groupTitle, selection, onEmptyPointerDown, onEmptyPointerEnter, toggleSelectionCell],
  );

  const renderPatternCell = useCallback(
    (dayIdx: number, hour: number) => {
      const col = weekColumns[dayIdx];
      if (!col) return null;
      return renderCell(col.dateKey, format(col.date, "EEEE"), hour, !col.inWindow);
    },
    [renderCell, weekColumns],
  );

  const renderWeekCell = useCallback(
    (dayIdx: number, hour: number, col: (typeof weekColumns)[0] | undefined) => {
      const disabled = !col?.inWindow;
      const dayName = col ? format(col.date, "EEEE") : format(addDays(weekMonday, dayIdx), "EEEE");
      const dateKey = col?.dateKey ?? format(addDays(weekMonday, dayIdx), "yyyy-MM-dd");
      return renderCell(dateKey, dayName, hour, disabled);
    },
    [renderCell, weekColumns, weekMonday],
  );

  const selectionCount = selection.size;

  const legend = (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 rounded-2xl border border-border/80 bg-card/60 px-3 py-2.5 sm:px-4">
      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground w-full sm:w-auto">Legend</span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/80 px-2.5 py-1 text-[10px] font-bold text-foreground">
          <span className="h-5 w-5 rounded-sm bg-primary/80 shrink-0" aria-hidden />
          Free — drag to select (same as student My Schedule)
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-foreground ring-1 ring-emerald-500/20">
          <Music2 className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
          Booked — tap to clear
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
          <Lock className="h-3 w-3" />
          Locked window
        </span>
      </div>
    </div>
  );

  const selectionFooter = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
      <p className="text-xs text-muted-foreground">
        {selectionCount > 0 ? (
          <>
            <span className="font-black text-foreground">{selectionCount}</span> slot{selectionCount !== 1 ? "s" : ""}{" "}
            selected — pick a class below.
          </>
        ) : (
          "Drag across empty cells to select one or more hours, then assign a confirmed class."
        )}
      </p>
      <div className="flex flex-wrap gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl font-bold"
          disabled={selectionCount === 0}
          onClick={() => setSelection(new Set())}
        >
          Clear selection
        </Button>
        <Button
          type="button"
          size="sm"
          className="rounded-xl font-black gradient-purple text-primary-foreground"
          disabled={selectionCount === 0}
          onClick={openAssignDialog}
        >
          Assign class…
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {legend}

      <ScheduleGridFrame
        leadingControls={
          <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card to-muted/30 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl gradient-purple-deep text-primary-foreground glow-purple">
                <Building2 className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-primary">Which studio?</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  Timetable is per room — switching room clears your cell selection.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  {STUDIO_ROOMS.map((r) => {
                    const active = room === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRoom(r)}
                        className={cn(
                          "flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-all btn-press sm:min-w-[140px]",
                          active
                            ? "gradient-purple text-primary-foreground shadow-md glow-purple"
                            : "border-2 border-border bg-background/80 text-muted-foreground hover:border-primary/40 hover:bg-muted/50 hover:text-foreground",
                        )}
                      >
                        <MapPin className={cn("h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-60")} />
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        }
        mode="week"
        setMode={() => undefined}
        weekIndex={weekIndex}
        setWeekIndex={setWeekIndex}
        weekMondays={weekMondays}
        weekMonday={weekMonday}
        weekColumns={weekColumns}
        hintPattern=""
        hintWeek="Same interaction as student My Schedule: drag on empty cells to paint selection, release, then use Assign class. Booked slots: tap to remove."
        onGridPointerEnd={endDrag}
        renderPatternCell={renderPatternCell}
        renderWeekCell={renderWeekCell}
        showModeTabs={false}
        patternFooter={selectionFooter}
      />

      <Dialog
        open={assignOpen}
        onOpenChange={(o) => {
          setAssignOpen(o);
          if (!o) setPendingSlots([]);
        }}
      >
        <DialogContent className="max-w-md rounded-3xl border-2 border-border p-0 gap-0 overflow-hidden sm:rounded-3xl">
          <div className="gradient-purple-subtle px-6 pt-6 pb-4">
            <DialogHeader className="space-y-1 text-left">
              <div className="flex items-center gap-2 text-primary mb-1">
                <CalendarPlus className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-wider">New booking</span>
              </div>
              <DialogTitle className="text-xl font-black tracking-tight">Assign confirmed class</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                {pendingSlots.length <= 1
                  ? "This slot will appear on the shared timetable for students in that class."
                  : `These ${pendingSlots.length} slots will appear on the shared timetable for students in that class.`}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 pb-6 space-y-4">
            {pendingSlots.length > 0 ? (
              <div className="rounded-2xl bg-muted/60 border border-border px-4 py-3 max-h-40 overflow-y-auto space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-lg font-bold text-[10px]">
                    {room}
                  </Badge>
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {pendingSlots.length} time slot{pendingSlots.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <ul className="text-xs font-medium text-foreground space-y-1">
                  {pendingSlots.map((s) => (
                    <li key={`${s.dateKey}-${s.hour}`} className="tabular-nums">
                      {s.dayName} · {s.dateKey} · {hourNumberToTimeLabel(s.hour)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="studio-group-pick" className="text-xs font-black text-foreground">
                Confirmed class
              </Label>
              <Select value={pickGroupId} onValueChange={setPickGroupId}>
                <SelectTrigger
                  id="studio-group-pick"
                  className="h-12 rounded-2xl border-2 border-input bg-background text-left font-bold data-[placeholder]:text-muted-foreground"
                >
                  <SelectValue placeholder="Choose a class…" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {confirmedGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id} className="rounded-xl font-medium">
                      <span className="font-bold">{g.songTitle}</span>
                      <span className="text-muted-foreground"> — {g.artist}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {confirmedGroups.length === 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  No confirmed classes yet — confirm a listing under Classes first.
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end border-t border-border bg-muted/30 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-12 rounded-2xl border-2 font-bold"
              disabled={assigning}
              onClick={() => setAssignOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto h-12 rounded-2xl font-black gradient-purple text-primary-foreground glow-purple btn-press px-8 disabled:opacity-50"
              disabled={!pickGroupId || confirmedGroups.length === 0 || assigning}
              onClick={() => void confirmAssign()}
            >
              {assigning ? (
                "Assigning…"
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Assign to {pendingSlots.length === 1 ? "slot" : `${pendingSlots.length} slots`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeTarget !== null} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent className="max-w-md rounded-3xl border-2">
          <AlertDialogHeader className="text-left space-y-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
              <Trash2 className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-xl font-black">Remove this slot?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              The class disappears from the room timetable only. The song class listing is not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
            <AlertDialogCancel className="w-full sm:w-auto h-12 rounded-2xl border-2 font-bold mt-0">
              Keep slot
            </AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto h-12 rounded-2xl font-black bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (removeTarget) removeSession(removeTarget.id);
                setRemoveTarget(null);
                toast.success("Slot cleared");
              }}
            >
              Remove booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
