"use client";

import { useState, useCallback, useMemo } from "react";
import { addDays, format, startOfDay } from "date-fns";
import {
  Building2,
  CalendarPlus,
  Check,
  Lock,
  MapPin,
  Music2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import type { ClassSession, StudioRoom } from "@/types";
import { ScheduleGridFrame, type ScheduleMode } from "@/components/schedule/ScheduleGridFrame";
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
const PATTERN_DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function sessionAt(
  sessions: ClassSession[],
  room: StudioRoom,
  dayName: string,
  hour: number,
): ClassSession | undefined {
  return sessions.find((s) => {
    if (s.room !== room || s.day !== dayName) return false;
    const h = parseTimeLabelToHour(s.time);
    return h === hour;
  });
}

export default function StudioRoomsTimetable() {
  const { sessions, groups, assignSession, removeSession } = useApp();
  const [room, setRoom] = useState<StudioRoom>("Farrer Park");
  const [mode, setMode] = useState<ScheduleMode>("week");
  const [weekIndex, setWeekIndex] = useState(0);

  const today0 = startOfDay(new Date());
  const horizonEnd = startOfDay(addDays(today0, 29));

  const weekMondays = useMemo(() => enumerateWeekMondays(today0, horizonEnd), [today0, horizonEnd]);
  const weekMonday = weekMondays[Math.min(weekIndex, weekMondays.length - 1)] ?? weekMondays[0];
  const weekColumns = useMemo(
    () => buildWeekColumns(weekMonday, today0, horizonEnd),
    [weekMonday, today0, horizonEnd],
  );

  const [assignOpen, setAssignOpen] = useState(false);
  const [pending, setPending] = useState<{ dayName: string; hour: number } | null>(null);
  const [pickGroupId, setPickGroupId] = useState("");
  const [removeTarget, setRemoveTarget] = useState<ClassSession | null>(null);

  const confirmedGroups = useMemo(() => groups.filter((g) => g.status === "confirmed"), [groups]);

  const groupTitle = useCallback(
    (id: string) => groups.find((g) => g.id === id)?.songTitle ?? "Class",
    [groups],
  );

  const openAssign = useCallback(
    (dayName: string, hour: number) => {
      if (sessionAt(sessions, room, dayName, hour)) return;
      setPending({ dayName, hour });
      setPickGroupId("");
      setAssignOpen(true);
    },
    [sessions, room],
  );

  const confirmAssign = useCallback(() => {
    if (!pending || !pickGroupId) return;
    const exists = sessionAt(sessions, room, pending.dayName, pending.hour);
    if (exists) {
      toast.error("This slot is already booked.");
      setAssignOpen(false);
      return;
    }
    assignSession(pickGroupId, room, pending.dayName, hourNumberToTimeLabel(pending.hour));
    toast.success("Class assigned to timetable");
    setAssignOpen(false);
    setPending(null);
  }, [pending, pickGroupId, sessions, room, assignSession]);

  const renderCell = useCallback(
    (dayName: string, hour: number, disabled: boolean) => {
      const sess = disabled ? undefined : sessionAt(sessions, room, dayName, hour);
      const title = sess ? groupTitle(sess.groupId) : "";

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
        <button
          type="button"
          onClick={() => openAssign(dayName, hour)}
          title={`Add class — ${dayName} ${hourNumberToTimeLabel(hour)}`}
          className={cn(
            "group relative min-h-0 h-full w-full border-r border-border/40 btn-press",
            "bg-background/40 hover:bg-primary/10 active:bg-primary/15",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
          )}
          aria-label={`Assign class ${dayName} ${hourNumberToTimeLabel(hour)}`}
        >
          <Plus className="absolute inset-0 m-auto w-3.5 h-3.5 text-muted-foreground/25 group-hover:text-primary/70 transition-colors" />
        </button>
      );
    },
    [sessions, room, groupTitle, openAssign],
  );

  const renderPatternCell = useCallback(
    (dayIdx: number, hour: number) => {
      const dayName = PATTERN_DAY_NAMES[dayIdx];
      return renderCell(dayName, hour, false);
    },
    [renderCell],
  );

  const renderWeekCell = useCallback(
    (dayIdx: number, hour: number, col: (typeof weekColumns)[0] | undefined) => {
      const disabled = !col?.inWindow;
      const dayName = col ? format(col.date, "EEEE") : PATTERN_DAY_NAMES[dayIdx];
      return renderCell(dayName, hour, disabled);
    },
    [renderCell, weekColumns],
  );

  const legend = (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 rounded-2xl border border-border/80 bg-card/60 px-3 py-2.5 sm:px-4">
      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground w-full sm:w-auto">Legend</span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/80 px-2.5 py-1 text-[10px] font-bold text-foreground">
          <span className="flex h-5 w-5 items-center justify-center rounded-md border border-dashed border-border bg-background/80">
            <Plus className="h-2.5 w-2.5 text-muted-foreground" />
          </span>
          Free — tap to assign
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
                  Timetable is per room — switch to paint Farrer Park or Orchard.
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
        mode={mode}
        setMode={setMode}
        weekIndex={weekIndex}
        setWeekIndex={setWeekIndex}
        weekMondays={weekMondays}
        weekMonday={weekMonday}
        weekColumns={weekColumns}
        hintPattern="Same grid as My Schedule (recurring week): bookings repeat every week by weekday. Tap + to assign; tap a green cell to remove."
        hintWeek="Same 30-day window as students: move between weeks, then tap + on an open slot. Grey cells are outside the window."
        onGridPointerEnd={() => {}}
        renderPatternCell={renderPatternCell}
        renderWeekCell={renderWeekCell}
      />

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md rounded-3xl border-2 border-border p-0 gap-0 overflow-hidden sm:rounded-3xl">
          <div className="gradient-purple-subtle px-6 pt-6 pb-4">
            <DialogHeader className="space-y-1 text-left">
              <div className="flex items-center gap-2 text-primary mb-1">
                <CalendarPlus className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-wider">New booking</span>
              </div>
              <DialogTitle className="text-xl font-black tracking-tight">Assign confirmed group</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                This slot will appear on the shared timetable for students in that group.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 pb-6 space-y-4">
            {pending ? (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-muted/60 border border-border px-4 py-3">
                <Badge variant="secondary" className="rounded-lg font-bold text-[10px]">
                  {room}
                </Badge>
                <span className="text-sm font-bold text-foreground">{pending.dayName}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-sm font-black tabular-nums text-primary">{hourNumberToTimeLabel(pending.hour)}</span>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="studio-group-pick" className="text-xs font-black text-foreground">
                Confirmed group
              </Label>
              <Select value={pickGroupId} onValueChange={setPickGroupId}>
                <SelectTrigger
                  id="studio-group-pick"
                  className="h-12 rounded-2xl border-2 border-input bg-background text-left font-bold data-[placeholder]:text-muted-foreground"
                >
                  <SelectValue placeholder="Choose a group…" />
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
                  No confirmed groups yet — confirm a listing under Classes first.
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end border-t border-border bg-muted/30 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-12 rounded-2xl border-2 font-bold"
              onClick={() => setAssignOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto h-12 rounded-2xl font-black gradient-purple text-primary-foreground glow-purple btn-press px-8 disabled:opacity-50"
              disabled={!pickGroupId || confirmedGroups.length === 0}
              onClick={confirmAssign}
            >
              <Check className="h-4 w-4 mr-2" />
              Assign to slot
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
              The class disappears from the room timetable only. The song group is not deleted.
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
