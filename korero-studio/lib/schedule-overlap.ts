import type { AvailabilitySlot, GroupMemberEnrollment } from "@/types";
import { addDays, format, startOfDay } from "date-fns";

/** Retained for legacy UI labels; scheduling logic is date-time based. */
export const WEEKDAY_FULL_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

/** Same hour range as My Schedule (8:00–22:00). */
export const SCHEDULE_GRID_HOURS = Array.from({ length: 15 }, (_, i) => i + 8);

/** Keys like "2026-03-24-18" for one date-time hour block. */
export function expandSlotsToDateHourKeys(slots: AvailabilitySlot[]): Set<string> {
  const keys = new Set<string>();
  for (const s of slots) {
    if (s.isConfirmedClass) continue;
    for (let h = s.startHour; h < s.endHour; h++) {
      keys.add(`${s.date}-${h}`);
    }
  }
  return keys;
}

/** Backward-compatible helper; now derived from date-time keys. */
export function expandSlotsToWeekdayHourKeys(slots: AvailabilitySlot[]): Set<string> {
  const keys = new Set<string>();
  for (const s of slots) {
    if (s.isConfirmedClass) continue;
    const d = new Date(`${s.date}T12:00:00`);
    const js = d.getDay();
    const dayIdx = js === 0 ? 6 : js - 1;
    for (let h = s.startHour; h < s.endHour; h++) keys.add(`${dayIdx}-${h}`);
  }
  return keys;
}

export type OverlapCell = {
  count: number;
  memberIds: string[];
};

/** For each date + hour in window, how many distinct members are free. */
export function buildOverlapGrid(
  members: { studentId: string; slots: AvailabilitySlot[] }[],
  hours: readonly number[],
  opts?: { startDate?: Date; days?: number },
): { dateKey: string; dateLabel: string; hour: number; count: number; memberIds: string[] }[] {
  const cells: { dateKey: string; dateLabel: string; hour: number; count: number; memberIds: string[] }[] = [];
  const base = startOfDay(opts?.startDate ?? new Date());
  const days = opts?.days ?? 30;

  for (let offset = 0; offset < days; offset++) {
    const d = addDays(base, offset);
    const dateKey = format(d, "yyyy-MM-dd");
    const dateLabel = format(d, "EEE, MMM d");
    for (const hour of hours) {
      const memberIds: string[] = [];
      for (const m of members) {
        const keys = expandSlotsToDateHourKeys(m.slots);
        if (keys.has(`${dateKey}-${hour}`)) {
          memberIds.push(m.studentId);
        }
      }
      cells.push({
        dateKey,
        dateLabel,
        hour,
        count: memberIds.length,
        memberIds,
      });
    }
  }
  return cells;
}

export function maxOverlapCount(
  members: { studentId: string; slots: AvailabilitySlot[] }[],
  hours: readonly number[],
  opts?: { startDate?: Date; days?: number },
): number {
  const grid = buildOverlapGrid(members, hours, opts);
  return grid.reduce((acc, c) => Math.max(acc, c.count), 0);
}

const HOURS_DEFAULT = SCHEDULE_GRID_HOURS;

/** Display e.g. "6:00 PM" for hour 18. */
export function formatOverlapHourLabel(h: number): string {
  if (h === 12) return "12 PM";
  if (h > 12) return `${h - 12} PM`;
  return `${h} AM`;
}

/** Sorted best-first; ties break by weekday then hour. */
export function rankOverlapSlots(
  members: { studentId: string; slots: AvailabilitySlot[] }[],
  hours: readonly number[] = HOURS_DEFAULT,
  limit = 24,
  opts?: { startDate?: Date; days?: number },
): {
  dateKey: string;
  dateLabel: string;
  hour: number;
  timeLabel: string;
  count: number;
  memberIds: string[];
}[] {
  const grid = buildOverlapGrid(members, hours, opts);
  return grid
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || a.dateKey.localeCompare(b.dateKey) || a.hour - b.hour)
    .slice(0, limit)
    .map((c) => ({
      dateKey: c.dateKey,
      dateLabel: c.dateLabel,
      hour: c.hour,
      timeLabel: formatOverlapHourLabel(c.hour),
      count: c.count,
      memberIds: c.memberIds,
    }));
}

/** How many hour-cells have every member free (full consensus). */
export function countFullConsensusCells(
  members: { studentId: string; slots: AvailabilitySlot[] }[],
  hours: readonly number[] = HOURS_DEFAULT,
  opts?: { startDate?: Date; days?: number },
): number {
  const n = members.length;
  if (n === 0) return 0;
  const grid = buildOverlapGrid(members, hours, opts);
  return grid.filter((c) => c.count === n).length;
}

/** Who is free vs not at a specific date + hour. */
export function splitMembersAtCell(
  enrollments: GroupMemberEnrollment[],
  dateKey: string,
  hour: number,
): { free: GroupMemberEnrollment[]; notFree: GroupMemberEnrollment[] } {
  const free: GroupMemberEnrollment[] = [];
  const notFree: GroupMemberEnrollment[] = [];
  for (const e of enrollments) {
    const keys = expandSlotsToDateHourKeys(e.availabilitySlots);
    if (keys.has(`${dateKey}-${hour}`)) free.push(e);
    else notFree.push(e);
  }
  return { free, notFree };
}

function formatHourLabel(h: number): string {
  return formatOverlapHourLabel(h);
}

/** Best weekday+hour where most members overlap; used for “majority free” nudges. */
export function getMajorityOverlapSuggestion(
  enrollments: GroupMemberEnrollment[],
  studentId: string,
  hours: readonly number[] = HOURS_DEFAULT,
): {
  label: string;
  dayLabel: string;
  hour: number;
  count: number;
  memberTotal: number;
  studentFree: boolean;
} | null {
  if (enrollments.length < 2) return null;
  const members = enrollments.map((e) => ({
    studentId: e.studentId,
    slots: e.availabilitySlots,
  }));
  const grid = buildOverlapGrid(members, hours);
  let best = grid[0];
  for (const cell of grid) {
    if (cell.count > best.count) best = cell;
  }
  if (best.count < 2) return null;
  const studentFree = best.memberIds.includes(studentId);
  const label = `${best.dateLabel} ${formatHourLabel(best.hour)}`;
  return {
    label,
    dayLabel: best.dateLabel,
    hour: best.hour,
    count: best.count,
    memberTotal: enrollments.length,
    studentFree,
  };
}
