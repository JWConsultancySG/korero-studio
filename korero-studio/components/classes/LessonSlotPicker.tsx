"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MatchedHourSlot } from "@/types";
import { CalendarCheck, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatHour12(h: number): string {
  if (h === 0 || h === 24) return "12am";
  if (h === 12) return "12pm";
  if (h > 12) return `${h - 12}pm`;
  return `${h}am`;
}

function slotKey(s: MatchedHourSlot) {
  return `${s.date}|${s.hour}`;
}

type Props = {
  availableSlots: MatchedHourSlot[];
  requiredCount: number;
  onConfirm: (selected: MatchedHourSlot[]) => Promise<void>;
};

export default function LessonSlotPicker({ availableSlots, requiredCount, onConfirm }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, MatchedHourSlot[]>();
    for (const s of availableSlots) {
      const arr = map.get(s.date) ?? [];
      arr.push(s);
      map.set(s.date, arr);
    }
    for (const [key, arr] of map) {
      map.set(key, arr.sort((a, b) => a.hour - b.hour));
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [availableSlots]);

  const toggle = (slot: MatchedHourSlot) => {
    const key = slotKey(slot);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else if (next.size < requiredCount) {
        next.add(key);
      } else {
        toast.error(`You can only select ${requiredCount} lesson slots`);
        return prev;
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selected.size !== requiredCount) return;
    setSubmitting(true);
    try {
      const slots = availableSlots.filter((s) => selected.has(slotKey(s)));
      await onConfirm(slots);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary" />
          <h3 className="text-base font-black text-foreground">Select Lesson Slots</h3>
        </div>
        <Badge variant={selected.size === requiredCount ? "default" : "secondary"} className="font-bold tabular-nums">
          {selected.size}/{requiredCount} selected
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Choose exactly <span className="font-bold text-foreground">{requiredCount}</span> time slots from the common
        availability below. These will become the confirmed lesson schedule for all students.
      </p>

      <div className="space-y-3">
        {groupedByDate.map(([dateStr, slots]) => {
          const dateObj = parseISO(dateStr);
          return (
            <div key={dateStr} className="rounded-xl border border-border bg-card/50 p-3">
              <p className="text-xs font-black text-foreground mb-2">
                {format(dateObj, "EEEE, MMM d")}
              </p>
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => {
                  const key = slotKey(slot);
                  const isSelected = selected.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggle(slot)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-xs font-bold transition-all flex items-center gap-1.5",
                        isSelected
                          ? "border-primary bg-primary/15 text-primary ring-1 ring-primary"
                          : "border-border bg-background hover:bg-muted/50 text-foreground",
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <Clock className="w-3 h-3" />
                      {formatHour12(slot.hour)}–{formatHour12(slot.hour + 1)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        onClick={handleConfirm}
        disabled={selected.size !== requiredCount || submitting}
        className="w-full rounded-2xl gradient-purple text-primary-foreground font-black btn-press h-12"
      >
        {submitting ? "Confirming…" : "Confirm Lesson Schedule"}
      </Button>
    </div>
  );
}
