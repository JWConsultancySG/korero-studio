"use client";

import { useState, useCallback, useMemo } from "react";
import { addDays, format, startOfDay, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AvailabilitySlot } from "@/types";
import { slotsToHoursForDate } from "@/lib/availability-blocks";
import { cn } from "@/lib/utils";
import type { WeeklyTemplate } from "@/components/schedule/WeeklyGrid";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);

const formatHour24 = (h: number) => `${h.toString().padStart(2, "0")}:00`;

type ScheduleMode = "pattern" | "week";

type Props = {
  weeklyTemplate: WeeklyTemplate;
  onTemplateChange: (t: WeeklyTemplate) => void;
  onApplyPatternTo30Days: () => void;
  onClearPatternAndAvailability: () => void;
  hasExistingSlots: boolean;
  availability: AvailabilitySlot[];
  toggleFreeHour: (dateKey: string, hour: number) => void;
  today: Date;
};

function enumerateWeekMondays(today0: Date, horizonEnd: Date): Date[] {
  const firstMonday = startOfWeek(today0, { weekStartsOn: 1 });
  const weeks: Date[] = [];
  let mon = firstMonday;
  while (mon <= horizonEnd && weeks.length < 6) {
    weeks.push(mon);
    mon = addDays(mon, 7);
  }
  return weeks;
}

export default function ScheduleTimetable({
  weeklyTemplate,
  onTemplateChange,
  onApplyPatternTo30Days,
  onClearPatternAndAvailability,
  hasExistingSlots,
  availability,
  toggleFreeHour,
  today,
}: Props) {
  const [mode, setMode] = useState<ScheduleMode>("pattern");
  const [weekIndex, setWeekIndex] = useState(0);

  const today0 = startOfDay(today);
  const horizonEnd = startOfDay(addDays(today0, 29));

  const weekMondays = useMemo(() => enumerateWeekMondays(today0, horizonEnd), [today0, horizonEnd]);

  const weekMonday = weekMondays[Math.min(weekIndex, weekMondays.length - 1)] ?? weekMondays[0];

  const weekColumns = useMemo(() => {
    return [0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
      const d = addDays(weekMonday, dayIdx);
      const d0 = startOfDay(d);
      const t = d0.getTime();
      const inWindow = t >= today0.getTime() && t <= horizonEnd.getTime();
      return { date: d0, dateKey: format(d0, "yyyy-MM-dd"), inWindow, label: format(d0, "d") };
    });
  }, [weekMonday, today0, horizonEnd]);

  /* —— Pattern mode (recurring week) —— */
  const [dragPattern, setDragPattern] = useState(false);
  const [patternDragMode, setPatternDragMode] = useState<"add" | "remove">("add");

  const togglePatternCell = useCallback(
    (dayIdx: number, hour: number) => {
      const newTemplate = { ...weeklyTemplate };
      const daySet = new Set(newTemplate[dayIdx] || []);
      if (daySet.has(hour)) daySet.delete(hour);
      else daySet.add(hour);
      newTemplate[dayIdx] = daySet;
      onTemplateChange(newTemplate);
    },
    [weeklyTemplate, onTemplateChange],
  );

  const onPatternPointerDown = useCallback(
    (dayIdx: number, hour: number) => {
      const daySet = weeklyTemplate[dayIdx] || new Set();
      setPatternDragMode(daySet.has(hour) ? "remove" : "add");
      setDragPattern(true);
      togglePatternCell(dayIdx, hour);
    },
    [weeklyTemplate, togglePatternCell],
  );

  const onPatternPointerEnter = useCallback(
    (dayIdx: number, hour: number) => {
      if (!dragPattern) return;
      const daySet = weeklyTemplate[dayIdx] || new Set();
      const selected = daySet.has(hour);
      if ((patternDragMode === "add" && !selected) || (patternDragMode === "remove" && selected)) {
        togglePatternCell(dayIdx, hour);
      }
    },
    [dragPattern, patternDragMode, weeklyTemplate, togglePatternCell],
  );

  /* —— Week mode (specific week in next 30 days) —— */
  const [dragWeek, setDragWeek] = useState(false);
  const [weekDragMode, setWeekDragMode] = useState<"add" | "remove">("add");

  const onWeekPointerDown = useCallback(
    (dateKey: string | null, hour: number) => {
      if (!dateKey) return;
      const current = slotsToHoursForDate(availability, dateKey);
      const has = current.has(hour);
      setWeekDragMode(has ? "remove" : "add");
      setDragWeek(true);
      toggleFreeHour(dateKey, hour);
    },
    [availability, toggleFreeHour],
  );

  const onWeekPointerEnter = useCallback(
    (dateKey: string | null, hour: number) => {
      if (!dragWeek || !dateKey) return;
      const current = slotsToHoursForDate(availability, dateKey);
      const selected = current.has(hour);
      if ((weekDragMode === "add" && !selected) || (weekDragMode === "remove" && selected)) {
        toggleFreeHour(dateKey, hour);
      }
    },
    [dragWeek, weekDragMode, availability, toggleFreeHour],
  );

  const endDrag = useCallback(() => {
    setDragPattern(false);
    setDragWeek(false);
  }, []);

  const patternTotal = Object.values(weeklyTemplate).reduce((sum, set) => sum + (set?.size ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 p-1 bg-muted rounded-2xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setMode("pattern")}
            className={cn(
              "flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition-all btn-press",
              mode === "pattern" ? "gradient-purple text-primary-foreground glow-purple" : "text-muted-foreground",
            )}
          >
            Recurring week
          </button>
          <button
            type="button"
            onClick={() => setMode("week")}
            className={cn(
              "flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition-all btn-press",
              mode === "week" ? "gradient-purple text-primary-foreground glow-purple" : "text-muted-foreground",
            )}
          >
            Specific week (30 days)
          </button>
        </div>

        {mode === "week" && weekMondays.length > 0 && (
          <div className="flex items-center gap-2 justify-center sm:justify-end">
            <button
              type="button"
              className="p-2 rounded-xl border border-border hover:bg-muted btn-press disabled:opacity-40"
              disabled={weekIndex <= 0}
              onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
              aria-label="Previous week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-foreground tabular-nums min-w-[10rem] text-center">
              {format(weekMonday, "MMM d")} – {format(addDays(weekMonday, 6), "MMM d, yyyy")}
            </span>
            <button
              type="button"
              className="p-2 rounded-xl border border-border hover:bg-muted btn-press disabled:opacity-40"
              disabled={weekIndex >= weekMondays.length - 1}
              onClick={() => setWeekIndex((i) => Math.min(weekMondays.length - 1, i + 1))}
              aria-label="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {mode === "pattern"
          ? "Paint your usual free hours (Mon–Sun). Apply copies this pattern across the next 30 days."
          : "Drag across cells to add or remove free hours for this calendar week only. Confirmed class times from the studio cannot be edited here."}
      </p>

      <div
        className="card-premium rounded-2xl overflow-hidden select-none touch-none"
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="grid grid-cols-[40px_repeat(7,1fr)]">
          <div className="h-8 bg-muted/50 border-b border-r border-border" />
          {DAY_LABELS.map((day, i) => (
            <div
              key={day}
              className="h-8 flex flex-col items-center justify-center bg-muted/30 border-b border-border px-0.5"
            >
              <span className="text-[8px] font-black text-muted-foreground uppercase leading-none">{day}</span>
              {mode === "week" && weekColumns[i] && (
                <span className="text-[9px] font-black text-foreground leading-none">{weekColumns[i].label}</span>
              )}
            </div>
          ))}
        </div>

        <div className="h-[min(62vh,calc(100dvh-16rem))] max-h-[540px] min-h-[200px] flex flex-col">
          <div className="flex-1 min-h-0 grid grid-rows-[repeat(15,minmax(0,1fr))]">
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-[40px_repeat(7,1fr)] min-h-0 border-b border-border last:border-b-0">
                <div className="flex items-center justify-center bg-muted/30 border-r border-border min-h-0 px-0.5">
                  <span className="text-[7px] font-bold text-muted-foreground leading-none">{formatHour24(hour)}</span>
                </div>
                {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                  if (mode === "pattern") {
                    const daySet = weeklyTemplate[dayIdx] || new Set();
                    const isSelected = daySet.has(hour);
                    const isPrevSelected = daySet.has(hour - 1);
                    const isNextSelected = daySet.has(hour + 1);
                    return (
                      <div
                        key={`p-${dayIdx}-${hour}`}
                        onPointerDown={() => onPatternPointerDown(dayIdx, hour)}
                        onPointerEnter={() => onPatternPointerEnter(dayIdx, hour)}
                        className={cn(
                          "min-h-0 border-r border-border/40 transition-colors duration-75 cursor-pointer",
                          isSelected
                            ? `bg-primary/80 ${!isPrevSelected ? "rounded-t-sm" : ""} ${!isNextSelected ? "rounded-b-sm" : ""}`
                            : "hover:bg-accent/60",
                        )}
                      />
                    );
                  }

                  const col = weekColumns[dayIdx];
                  const disabled = !col?.inWindow;
                  const dateKey = col?.dateKey ?? "";
                  const current = slotsToHoursForDate(availability, dateKey);
                  const isSelected = !disabled && current.has(hour);
                  const isPrevSelected = !disabled && current.has(hour - 1);
                  const isNextSelected = !disabled && current.has(hour + 1);

                  return (
                    <div
                      key={`w-${dayIdx}-${hour}`}
                      onPointerDown={() => onWeekPointerDown(disabled ? null : dateKey, hour)}
                      onPointerEnter={() => onWeekPointerEnter(disabled ? null : dateKey, hour)}
                      className={cn(
                        "min-h-0 border-r border-border/40 transition-colors duration-75",
                        disabled ? "bg-muted/40 cursor-not-allowed" : "cursor-pointer",
                        !disabled && isSelected
                          ? `bg-primary/80 ${!isPrevSelected ? "rounded-t-sm" : ""} ${!isNextSelected ? "rounded-b-sm" : ""}`
                          : !disabled && "hover:bg-accent/60",
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {mode === "pattern" && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            {patternTotal > 0 ? (
              <p className="text-xs text-muted-foreground">
                <span className="font-black text-foreground">{patternTotal}</span> hour
                {patternTotal !== 1 ? "s" : ""} per week
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Paint the grid to set your typical availability.</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClearPatternAndAvailability}
            className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground btn-press px-2 py-1 rounded-lg"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <Button
            type="button"
            onClick={onApplyPatternTo30Days}
            disabled={patternTotal === 0}
            className="rounded-2xl gradient-purple text-primary-foreground font-bold btn-press h-11 px-5 disabled:opacity-40"
          >
            <Check className="w-4 h-4 mr-1.5" />
            {hasExistingSlots ? "Update next 30 days" : "Apply to next 30 days"}
          </Button>
        </div>
      )}
    </div>
  );
}
