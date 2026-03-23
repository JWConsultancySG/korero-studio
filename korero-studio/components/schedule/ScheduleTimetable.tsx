"use client";

import { useState, useCallback, useMemo } from "react";
import { addDays, startOfDay } from "date-fns";
import { RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AvailabilitySlot } from "@/types";
import { slotsToHoursForDate } from "@/lib/availability-blocks";
import { cn } from "@/lib/utils";
import type { WeeklyTemplate } from "@/components/schedule/WeeklyGrid";
import { ScheduleGridFrame, type ScheduleMode } from "@/components/schedule/ScheduleGridFrame";
import { buildWeekColumns, enumerateWeekMondays } from "@/components/schedule/schedule-week";

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

  const weekColumns = useMemo(
    () => buildWeekColumns(weekMonday, today0, horizonEnd),
    [weekMonday, today0, horizonEnd],
  );

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

  const renderPatternCell = useCallback(
    (dayIdx: number, hour: number) => {
      const daySet = weeklyTemplate[dayIdx] || new Set();
      const isSelected = daySet.has(hour);
      const isPrevSelected = daySet.has(hour - 1);
      const isNextSelected = daySet.has(hour + 1);
      return (
        <div
          onPointerDown={() => onPatternPointerDown(dayIdx, hour)}
          onPointerEnter={() => onPatternPointerEnter(dayIdx, hour)}
          className={cn(
            "min-h-0 h-full border-r border-border/40 transition-colors duration-75 cursor-pointer",
            isSelected
              ? `bg-primary/80 ${!isPrevSelected ? "rounded-t-sm" : ""} ${!isNextSelected ? "rounded-b-sm" : ""}`
              : "hover:bg-accent/60",
          )}
        />
      );
    },
    [weeklyTemplate, onPatternPointerDown, onPatternPointerEnter],
  );

  const renderWeekCell = useCallback(
    (dayIdx: number, hour: number, col: (typeof weekColumns)[0] | undefined) => {
      const disabled = !col?.inWindow;
      const dateKey = col?.dateKey ?? "";
      const current = slotsToHoursForDate(availability, dateKey);
      const isSelected = !disabled && current.has(hour);
      const isPrevSelected = !disabled && current.has(hour - 1);
      const isNextSelected = !disabled && current.has(hour + 1);

      return (
        <div
          onPointerDown={() => onWeekPointerDown(disabled ? null : dateKey, hour)}
          onPointerEnter={() => onWeekPointerEnter(disabled ? null : dateKey, hour)}
          className={cn(
            "min-h-0 h-full border-r border-border/40 transition-colors duration-75",
            disabled ? "bg-muted/40 cursor-not-allowed" : "cursor-pointer",
            !disabled && isSelected
              ? `bg-primary/80 ${!isPrevSelected ? "rounded-t-sm" : ""} ${!isNextSelected ? "rounded-b-sm" : ""}`
              : !disabled && "hover:bg-accent/60",
          )}
        />
      );
    },
    [availability, onWeekPointerDown, onWeekPointerEnter],
  );

  return (
    <ScheduleGridFrame
      mode={mode}
      setMode={setMode}
      weekIndex={weekIndex}
      setWeekIndex={setWeekIndex}
      weekMondays={weekMondays}
      weekMonday={weekMonday}
      weekColumns={weekColumns}
      hintPattern="Paint your usual free hours (Mon–Sun). Apply copies this pattern across the next 30 days."
      hintWeek="Drag across cells to add or remove free hours for this calendar week only. Confirmed class times from the studio cannot be edited here."
      onGridPointerEnd={endDrag}
      renderPatternCell={renderPatternCell}
      renderWeekCell={renderWeekCell}
      patternFooter={
        mode === "pattern" ? (
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
        ) : undefined
      }
    />
  );
}
