"use client";

import { useMemo, useState } from "react";
import { addDays, format, isSameDay, startOfDay, startOfWeek } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GroupMemberEnrollment } from "@/types";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const HOUR_START = 8;
const HOUR_END = 23; // exclusive
const WINDOW_DAYS = 30;

const formatHour = (h: number) => {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  if (h > 12) return `${h - 12} PM`;
  return `${h} AM`;
};

type Props = {
  enrollments: GroupMemberEnrollment[];
};

function buildDateHourOverlap(enrollments: GroupMemberEnrollment[]): Map<string, Map<number, Set<string>>> {
  const out = new Map<string, Map<number, Set<string>>>();

  for (const e of enrollments) {
    for (const slot of e.availabilitySlots) {
      if (slot.isConfirmedClass) continue;
      const dateMap = out.get(slot.date) ?? new Map<number, Set<string>>();
      for (let h = slot.startHour; h < slot.endHour; h++) {
        const members = dateMap.get(h) ?? new Set<string>();
        members.add(e.studentId);
        dateMap.set(h, members);
      }
      out.set(slot.date, dateMap);
    }
  }

  return out;
}

export default function DateTimeOverlapView({ enrollments }: Props) {
  const memberCount = enrollments.length;
  const today = startOfDay(new Date());

  const overlapByDateHour = useMemo(() => buildDateHourOverlap(enrollments), [enrollments]);

  const dateWindow = useMemo(
    () => Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(today, i)),
    [today],
  );

  const fullOverlapByDate = useMemo(() => {
    const out = new Map<string, number[]>();
    for (const d of dateWindow) {
      const key = format(d, "yyyy-MM-dd");
      const dateMap = overlapByDateHour.get(key);
      if (!dateMap || memberCount <= 0) {
        out.set(key, []);
        continue;
      }
      const hours: number[] = [];
      for (let h = HOUR_START; h < HOUR_END; h++) {
        const count = dateMap.get(h)?.size ?? 0;
        if (count === memberCount) hours.push(h);
      }
      out.set(key, hours);
    }
    return out;
  }, [dateWindow, overlapByDateHour, memberCount]);

  const firstDateWithConsensus = useMemo(
    () => dateWindow.find((d) => (fullOverlapByDate.get(format(d, "yyyy-MM-dd")) ?? []).length > 0) ?? today,
    [dateWindow, fullOverlapByDate, today],
  );

  const [selectedDate, setSelectedDate] = useState<Date>(firstDateWithConsensus);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(firstDateWithConsensus, { weekStartsOn: 1 }));

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const lastWindowDate = dateWindow[dateWindow.length - 1];

  const canGoPrevWeek = weekStart > startOfWeek(today, { weekStartsOn: 1 });
  const canGoNextWeek = addDays(weekStart, 7) <= lastWindowDate;
  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedFullOverlapHours = fullOverlapByDate.get(selectedKey) ?? [];

  if (memberCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-sm font-bold text-foreground mb-1">No members to compare yet</p>
        <p className="text-xs text-muted-foreground">Joiners need to share schedule availability first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs md:text-sm font-bold text-muted-foreground">
          Showing only <span className="text-foreground">full class availability</span> slots ({memberCount}/{memberCount} members free).
        </p>
        <Badge variant="outline" className="font-bold">
          30-day window
        </Badge>
      </div>

      <div className="card-premium rounded-2xl p-3 md:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setWeekStart((d) => addDays(d, -7))}
            disabled={!canGoPrevWeek}
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <p className="text-xs font-bold text-foreground text-center">
            {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setWeekStart((d) => addDays(d, 7))}
            disabled={!canGoNextWeek}
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((d) => {
            const isPast = d < today;
            const isSelected = isSameDay(d, selectedDate);
            const key = format(d, "yyyy-MM-dd");
            const consensusCount = (fullOverlapByDate.get(key) ?? []).length;
            return (
              <button
                key={key}
                type="button"
                disabled={isPast || d > lastWindowDate}
                onClick={() => setSelectedDate(d)}
                className={cn(
                  "rounded-xl border px-1 py-2 text-center min-h-[64px] transition-colors",
                  isSelected ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/50",
                  (isPast || d > lastWindowDate) && "opacity-40 cursor-not-allowed hover:bg-background",
                )}
              >
                <p className="text-[10px] font-black text-muted-foreground uppercase">{format(d, "EEE")}</p>
                <p className="text-sm font-black text-foreground leading-tight">{format(d, "d")}</p>
                <p className="text-[10px] font-bold text-primary mt-1">{consensusCount} slot{consensusCount === 1 ? "" : "s"}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          <p className="text-sm font-black text-foreground">{format(selectedDate, "EEEE, MMM d")}</p>
        </div>
        {selectedFullOverlapHours.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedFullOverlapHours.map((h) => (
              <Badge key={h} className="rounded-xl gradient-purple text-primary-foreground font-bold px-3 py-1.5">
                <Clock className="w-3 h-3 mr-1.5" />
                {formatHour(h)} - {formatHour(h + 1)}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground leading-relaxed">
            No full class-availability slots on this date. Try another day in this week.
          </p>
        )}
      </div>
    </div>
  );
}
