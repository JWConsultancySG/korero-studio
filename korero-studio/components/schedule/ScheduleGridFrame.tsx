"use client";

import type { Dispatch, SetStateAction } from "react";
import { addDays, format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeekColumn } from "@/components/schedule/schedule-week";

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);

export const formatHour24 = (h: number) => `${h.toString().padStart(2, "0")}:00`;

export type ScheduleMode = "pattern" | "week";

type Props = {
  mode: ScheduleMode;
  setMode: (m: ScheduleMode) => void;
  weekIndex: number;
  setWeekIndex: Dispatch<SetStateAction<number>>;
  weekMondays: Date[];
  weekMonday: Date;
  weekColumns: WeekColumn[];
  hintPattern: string;
  hintWeek: string;
  onGridPointerEnd: () => void;
  renderPatternCell: (dayIdx: number, hour: number) => React.ReactNode;
  renderWeekCell: (dayIdx: number, hour: number, col: WeekColumn | undefined) => React.ReactNode;
  patternFooter?: React.ReactNode;
  /** e.g. studio room toggle — same width row as mode switch */
  leadingControls?: React.ReactNode;
};

export function ScheduleGridFrame({
  mode,
  setMode,
  weekIndex,
  setWeekIndex,
  weekMondays,
  weekMonday,
  weekColumns,
  hintPattern,
  hintWeek,
  onGridPointerEnd,
  renderPatternCell,
  renderWeekCell,
  patternFooter,
  leadingControls,
}: Props) {
  return (
    <div className="space-y-4">
      {leadingControls}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 p-1 bg-muted rounded-2xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setMode("pattern")}
            className={cn(
              "flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-black transition-all btn-press",
              mode === "pattern" ? "gradient-purple text-primary-foreground glow-purple" : "text-muted-foreground",
            )}
          >
            Recurring week
          </button>
          <button
            type="button"
            onClick={() => setMode("week")}
            className={cn(
              "flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-black transition-all btn-press",
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
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-border bg-background/80 hover:bg-muted btn-press disabled:opacity-40"
              disabled={weekIndex <= 0}
              onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
              aria-label="Previous week"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-foreground tabular-nums min-w-[10rem] text-center px-1">
              {format(weekMonday, "MMM d")} – {format(addDays(weekMonday, 6), "MMM d, yyyy")}
            </span>
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-border bg-background/80 hover:bg-muted btn-press disabled:opacity-40"
              disabled={weekIndex >= weekMondays.length - 1}
              onClick={() => setWeekIndex((i) => Math.min(weekMondays.length - 1, i + 1))}
              aria-label="Next week"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">{mode === "pattern" ? hintPattern : hintWeek}</p>

      <div
        className="card-premium rounded-2xl overflow-hidden select-none touch-none"
        onPointerUp={onGridPointerEnd}
        onPointerLeave={onGridPointerEnd}
        onPointerCancel={onGridPointerEnd}
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
                {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) =>
                  mode === "pattern" ? (
                    <div key={`p-${dayIdx}-${hour}`} className="min-h-0 min-w-0">
                      {renderPatternCell(dayIdx, hour)}
                    </div>
                  ) : (
                    <div key={`w-${dayIdx}-${hour}`} className="min-h-0 min-w-0">
                      {renderWeekCell(dayIdx, hour, weekColumns[dayIdx])}
                    </div>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {patternFooter}
    </div>
  );
}
