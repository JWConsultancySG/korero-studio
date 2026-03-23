import type { AvailabilitySlot } from "@/types";

/** Merge contiguous hours into blocks [startHour, endHour). */
export function hoursToBlocks(hours: Set<number>): { startHour: number; endHour: number }[] {
  if (hours.size === 0) return [];
  const sorted = [...hours].sort((a, b) => a - b);
  const blocks: { startHour: number; endHour: number }[] = [];
  let start = sorted[0];
  let end = sorted[0] + 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end) {
      end++;
    } else {
      blocks.push({ startHour: start, endHour: end });
      start = sorted[i];
      end = sorted[i] + 1;
    }
  }
  blocks.push({ startHour: start, endHour: end });
  return blocks;
}

export function slotsToHoursForDate(slots: AvailabilitySlot[], dateKey: string): Set<number> {
  const set = new Set<number>();
  for (const s of slots) {
    if (s.date !== dateKey || s.isConfirmedClass) continue;
    for (let h = s.startHour; h < s.endHour; h++) set.add(h);
  }
  return set;
}
