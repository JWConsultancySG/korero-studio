"use client";

import { useMemo } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import type { AvailabilitySlot } from "@/types";
import { Trash2 } from "lucide-react";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);

type Props = {
  anchorDate: Date;
  availability: AvailabilitySlot[];
  confirmedSlots: AvailabilitySlot[];
  onRemoveFreeSlot: (slot: AvailabilitySlot) => void;
};

function hourInSlot(hour: number, s: AvailabilitySlot) {
  return hour >= s.startHour && hour < s.endHour;
}

/** Mon–Sun (columns) × time (rows), no internal scroll — grid flexes to fit the reserved height. */
export default function WeekHourGrid({
  anchorDate,
  availability,
  confirmedSlots,
  onRemoveFreeSlot,
}: Props) {
  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  return (
    <div className="flex flex-col rounded-2xl border border-border overflow-hidden bg-card select-none h-[min(70vh,calc(100dvh-14rem))] max-h-[calc(100dvh-11rem)] min-h-[200px]">
      <div className="grid grid-cols-[2.25rem_repeat(7,minmax(0,1fr))] shrink-0 border-b border-border bg-muted/30">
        <div className="h-7 border-r border-border bg-muted/50" />
        {days.map((d) => (
          <div
            key={d.toISOString()}
            className="h-7 flex flex-col items-center justify-center border-r border-border last:border-r-0 px-0.5"
          >
            <span className="text-[8px] font-black uppercase text-muted-foreground leading-none">
              {format(d, "EEE")}
            </span>
            <span className="text-[9px] font-black text-foreground tabular-nums leading-none">{format(d, "d")}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0 grid grid-rows-[repeat(15,minmax(0,1fr))]">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="grid grid-cols-[2.25rem_repeat(7,minmax(0,1fr))] min-h-0 border-b border-border last:border-b-0"
          >
            <div className="flex items-center justify-center border-r border-border bg-muted/20 min-h-0 px-0.5">
              <span className="text-[7px] font-bold text-muted-foreground tabular-nums leading-none">
                {`${hour.toString().padStart(2, "0")}:00`}
              </span>
            </div>
            {days.map((d) => {
              const dateKey = format(d, "yyyy-MM-dd");
              const conf = confirmedSlots.find((s) => s.date === dateKey && hourInSlot(hour, s));
              const free = availability
                .filter((s) => !s.isConfirmedClass)
                .find((s) => s.date === dateKey && hourInSlot(hour, s));
              const isFreeStart = free && free.startHour === hour;
              return (
                <div
                  key={`${dateKey}-${hour}`}
                  className={`relative border-r border-border last:border-r-0 min-h-0 flex items-center justify-center ${
                    conf
                      ? "bg-primary/25"
                      : free
                        ? "bg-accent/90"
                        : "bg-muted/15"
                  }`}
                >
                  {isFreeStart && free && (
                    <button
                      type="button"
                      onClick={() => onRemoveFreeSlot(free)}
                      className="absolute top-0.5 right-0.5 z-10 p-0.5 rounded hover:bg-background/80"
                      aria-label="Remove availability block"
                    >
                      <Trash2 className="w-2.5 h-2.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
