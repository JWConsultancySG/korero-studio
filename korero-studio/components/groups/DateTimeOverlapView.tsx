"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
  format,
} from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GroupMemberEnrollment, MatchedHourSlot } from "@/types";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const HOUR_START = 8;
const HOUR_END = 23;
const WINDOW_DAYS = 30;
const DAYS_HEADER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** e.g. 18 → "6pm", 0 → "12am", 12 → "12pm" */
function formatHour12(h: number): string {
  if (h === 0 || h === 24) return "12am";
  if (h === 12) return "12pm";
  if (h > 12) return `${h - 12}pm`;
  return `${h}am`;
}

/** One-hour window label, e.g. hour 18 → "6pm–7pm" */
function formatOneHourSlotLabel(hour: number): string {
  return `${formatHour12(hour)}–${formatHour12(hour + 1)}`;
}

type Props = {
  enrollments: GroupMemberEnrollment[];
  matchedSlots?: MatchedHourSlot[];
};

export default function DateTimeOverlapView({ matchedSlots }: Props) {
  const [today] = useState<Date>(() => startOfDay(new Date()));
  const lastWindowDate = addDays(today, WINDOW_DAYS - 1);
  const safeMatchedSlots = Array.isArray(matchedSlots) ? matchedSlots : [];

  const slotsByDate = useMemo(() => {
    const out = new Map<string, number[]>();
    for (const slot of safeMatchedSlots) {
      if (slot.hour < HOUR_START || slot.hour >= HOUR_END) continue;
      const arr = out.get(slot.date) ?? [];
      arr.push(slot.hour);
      out.set(slot.date, arr);
    }
    for (const [key, arr] of out) {
      out.set(key, arr.sort((a, b) => a - b));
    }
    return out;
  }, [safeMatchedSlots]);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const firstDateWithSlots = useMemo(() => {
    for (let i = 0; i < WINDOW_DAYS; i++) {
      const d = addDays(today, i);
      const key = format(d, "yyyy-MM-dd");
      if ((slotsByDate.get(key) ?? []).length > 0) return d;
    }
    return null;
  }, [today, slotsByDate]);

  useEffect(() => {
    if (firstDateWithSlots && !selectedDate) {
      setSelectedDate(firstDateWithSlots);
    }
  }, [firstDateWithSlots, selectedDate]);

  const calendarWeeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const weeks: Date[][] = [];
    let cursor = calStart;
    while (cursor <= calEnd) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(addDays(cursor, i));
      }
      weeks.push(week);
      cursor = addDays(cursor, 7);
    }
    return weeks;
  }, [currentMonth]);

  const canGoPrev = startOfMonth(currentMonth) > startOfMonth(today);
  const canGoNext = startOfMonth(addMonths(currentMonth, 1)) <= startOfMonth(lastWindowDate);

  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedHours = selectedKey ? slotsByDate.get(selectedKey) ?? [] : [];

  const totalSlotDays = useMemo(() => {
    let count = 0;
    for (let i = 0; i < WINDOW_DAYS; i++) {
      const key = format(addDays(today, i), "yyyy-MM-dd");
      if ((slotsByDate.get(key) ?? []).length > 0) count++;
    }
    return count;
  }, [today, slotsByDate]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs md:text-sm text-muted-foreground leading-snug max-w-[min(100%,28rem)]">
          <span className="font-bold text-foreground">{totalSlotDays} day{totalSlotDays === 1 ? "" : "s"}</span> with
          common availability in the next 30 days.
        </p>
        <Badge variant="outline" className="font-bold shrink-0">
          Next 30 days
        </Badge>
      </div>

      <div className="card-premium rounded-2xl p-3 md:p-4 space-y-3">
        {/* Month navigation */}
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((m) => addMonths(m, -1))}
            disabled={!canGoPrev}
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <p className="text-sm font-black text-foreground text-center">
            {format(currentMonth, "MMMM yyyy")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            disabled={!canGoNext}
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 gap-1">
          {DAYS_HEADER.map((d) => (
            <div key={d} className="text-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase">{d}</p>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarWeeks.flat().map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const isCurrentMonth = isSameMonth(d, currentMonth);
            const isToday = isSameDay(d, today);
            const isPast = isBefore(d, today);
            const isOutOfWindow = d > lastWindowDate;
            const isDisabled = isPast || isOutOfWindow || !isCurrentMonth;
            const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;
            const hours = slotsByDate.get(key) ?? [];
            const hasSlots = hours.length > 0;

            return (
              <button
                key={key}
                type="button"
                disabled={isDisabled}
                onClick={() => setSelectedDate(d)}
                className={cn(
                  "rounded-xl border text-left transition-colors min-h-[56px] md:min-h-[72px] p-1 md:p-1.5 flex flex-col",
                  isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : hasSlots
                    ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                    : "border-border bg-background hover:bg-muted/50",
                  isDisabled && "opacity-30 cursor-not-allowed hover:bg-background",
                  isToday && !isSelected && "ring-1 ring-primary/50",
                )}
              >
                <p
                  className={cn(
                    "text-[11px] md:text-xs font-black leading-none",
                    hasSlots ? "text-primary" : "text-muted-foreground",
                    isSelected && "text-primary",
                  )}
                >
                  {format(d, "d")}
                </p>
                {hasSlots && (
                  <div className="mt-0.5 flex-1 min-h-0 overflow-hidden">
                    {/* Mobile: show count */}
                    <p className="text-[8px] font-bold text-primary leading-tight md:hidden">
                      {hours.length} slot{hours.length === 1 ? "" : "s"}
                    </p>
                    {/* Desktop: first few 1-hour slots */}
                    <div className="hidden md:flex flex-col gap-0.5 overflow-hidden">
                      {hours.slice(0, 3).map((h) => (
                        <span key={h} className="text-[8px] font-bold text-primary leading-none truncate">
                          {formatOneHourSlotLabel(h)}
                        </span>
                      ))}
                      {hours.length > 3 && (
                        <span className="text-[7px] font-bold text-primary/70 leading-none">
                          +{hours.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="rounded-2xl border border-border bg-card/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-primary" />
            <p className="text-sm font-black text-foreground">{format(selectedDate, "EEEE, MMM d")}</p>
          </div>
          {selectedHours.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedHours.map((h) => (
                <Badge
                  key={h}
                  className="rounded-xl gradient-purple text-primary-foreground font-bold px-3 py-1.5"
                >
                  <Clock className="w-3 h-3 mr-1.5" />
                  {formatOneHourSlotLabel(h)}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              No common availability on this day.{" "}
              Try other days, or update{" "}
              <Link href="/schedule" className="font-bold text-primary underline-offset-2 hover:underline">
                My Schedule
              </Link>{" "}
              to add more free time.
            </p>
          )}
        </div>
      )}

      <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed border-t border-border/60 pt-3">
        <span className="font-semibold text-foreground">Reminder:</span>{" "}
        this is coordination data from participant availability. Final room and class timing are confirmed by Korero.
      </p>
    </div>
  );
}
