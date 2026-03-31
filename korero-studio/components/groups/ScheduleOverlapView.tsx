"use client";

import { useMemo, type KeyboardEvent } from "react";
import type { GroupMemberEnrollment } from "@/types";
import { expandSlotsToWeekdayHourKeys, maxOverlapCount } from "@/lib/schedule-overlap";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const formatHour = (h: number) => {
  if (h === 12) return "12 PM";
  if (h > 12) return `${h - 12} PM`;
  return `${h} AM`;
};

type Props = {
  enrollments: GroupMemberEnrollment[];
  maxMembers: number;
  /** When set, cells are tappable (e.g. admin matcher detail). */
  onCellClick?: (detail: { dayIndex: number; hour: number; count: number }) => void;
};

export default function ScheduleOverlapView({ enrollments, maxMembers, onCellClick }: Props) {
  const members = useMemo(
    () => enrollments.map((e) => ({ studentId: e.studentId, slots: e.availabilitySlots })),
    [enrollments],
  );

  const peak = useMemo(() => (members.length ? maxOverlapCount(members, HOURS) : 0), [members]);

  const cellClass = (count: number) => {
    if (count === 0) return "bg-muted/40 text-muted-foreground/50";
    const ratio = maxMembers > 0 ? count / maxMembers : 0;
    if (ratio >= 0.75) return "bg-primary text-primary-foreground font-black";
    if (ratio >= 0.5) return "bg-primary/50 text-primary-foreground font-bold";
    if (ratio > 0) return "bg-primary/20 text-foreground font-semibold";
    return "bg-muted/40";
  };

  if (members.length === 0) {
    return (
      <div className="rounded-2xl md:rounded-3xl border border-dashed border-border bg-muted/20 p-8 md:p-10 text-center">
        <Users className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-sm md:text-base font-bold text-foreground mb-1">No availability yet</p>
        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-sm md:max-w-md mx-auto">
          When members add their schedule in My Schedule, you&apos;ll see overlapping free times here so the class can align on a slot.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs md:text-sm font-bold text-muted-foreground">
          Darker = more members free at once · Peak:{" "}
          <span className="text-foreground">{peak}</span> / {maxMembers}
        </p>
      </div>

      <div className="card-premium rounded-2xl md:rounded-3xl overflow-hidden select-none -mx-1 px-1 sm:mx-0 sm:px-0">
        <div className="h-[min(62vh,calc(100dvh-13rem))] max-h-[min(520px,calc(100dvh-10rem))] min-h-[200px] flex flex-col">
          <div className="grid grid-cols-[2.25rem_repeat(7,minmax(0,1fr))] shrink-0 border-b border-border bg-muted/30">
            <div className="h-7 border-r border-border" />
            {DAYS.map((d) => (
              <div key={d} className="h-7 flex items-center justify-center border-r border-border last:border-r-0 px-0.5">
                <span className="text-[9px] font-black text-muted-foreground uppercase">{d}</span>
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
                  <span className="text-[7px] font-bold text-muted-foreground leading-none text-center">
                    {formatHour(hour)}
                  </span>
                </div>
                {DAYS.map((_, dayIdx) => {
                  const key = `${dayIdx}-${hour}`;
                  const count = members.filter((m) =>
                    expandSlotsToWeekdayHourKeys(m.slots).has(key),
                  ).length;
                  const interactive = Boolean(onCellClick);
                  const inner = (
                    <>
                      {count > 0 ? count : "·"}
                    </>
                  );
                  return (
                    <div
                      key={`${hour}-${dayIdx}`}
                      className={cn(
                        "min-h-0 flex items-center justify-center border-r border-border last:border-r-0 text-[8px] sm:text-[9px] tabular-nums px-0.5",
                        cellClass(count),
                        interactive && "cursor-pointer btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                      )}
                      {...(interactive
                        ? {
                            role: "button" as const,
                            tabIndex: 0,
                            onClick: () => onCellClick?.({ dayIndex: dayIdx, hour, count }),
                            onKeyDown: (e: KeyboardEvent) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onCellClick?.({ dayIndex: dayIdx, hour, count });
                              }
                            },
                          }
                        : {})}
                    >
                      {inner}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed max-w-prose">
        Tip: if you see a hot column (evenings/weekends), consider updating your availability in{" "}
        <span className="font-semibold text-foreground">Schedule</span> to match the class.
      </p>
    </div>
  );
}
