import type { AvailabilitySlot, GroupMemberEnrollment } from "@/types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Full weekday names (Monday = index 0), aligned with grid day index. */
export const WEEKDAY_FULL_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** Same hour range as My Schedule (8:00–22:00). */
export const SCHEDULE_GRID_HOURS = Array.from({ length: 15 }, (_, i) => i + 8);

/** JS getDay() Mon=1..Sun=0 → grid index Mon=0..Sun=6 */
export function dateToGridDayIndex(isoDate: string): number {
  const d = new Date(`${isoDate}T12:00:00`);
  const js = d.getDay();
  return js === 0 ? 6 : js - 1;
}

/** Keys like "3-18" for Wed 6pm — one hour block */
export function expandSlotsToWeekdayHourKeys(slots: AvailabilitySlot[]): Set<string> {
  const keys = new Set<string>();
  for (const s of slots) {
    if (s.isConfirmedClass) continue;
    const dayIdx = dateToGridDayIndex(s.date);
    for (let h = s.startHour; h < s.endHour; h++) {
      keys.add(`${dayIdx}-${h}`);
    }
  }
  return keys;
}

export type OverlapCell = {
  count: number;
  memberIds: string[];
};

/** For each weekday + hour, how many distinct members are free (union of their slots). */
export function buildOverlapGrid(
  members: { studentId: string; slots: AvailabilitySlot[] }[],
  hours: readonly number[],
): { dayIndex: number; dayLabel: string; hour: number; count: number; memberIds: string[] }[] {
  const cells: { dayIndex: number; dayLabel: string; hour: number; count: number; memberIds: string[] }[] = [];

  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    for (const hour of hours) {
      const memberIds: string[] = [];
      for (const m of members) {
        const keys = expandSlotsToWeekdayHourKeys(m.slots);
        if (keys.has(`${dayIdx}-${hour}`)) {
          memberIds.push(m.studentId);
        }
      }
      cells.push({
        dayIndex: dayIdx,
        dayLabel: DAYS[dayIdx],
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
): number {
  let max = 0;
  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    for (const hour of hours) {
      let c = 0;
      for (const m of members) {
        const keys = expandSlotsToWeekdayHourKeys(m.slots);
        if (keys.has(`${dayIdx}-${hour}`)) c++;
      }
      if (c > max) max = c;
    }
  }
  return max;
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
): {
  dayIndex: number;
  dayLabelShort: string;
  dayLabelFull: string;
  hour: number;
  timeLabel: string;
  count: number;
  memberIds: string[];
}[] {
  const grid = buildOverlapGrid(members, hours);
  return grid
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || a.dayIndex - b.dayIndex || a.hour - b.hour)
    .slice(0, limit)
    .map((c) => ({
      dayIndex: c.dayIndex,
      dayLabelShort: c.dayLabel,
      dayLabelFull: WEEKDAY_FULL_NAMES[c.dayIndex],
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
): number {
  const n = members.length;
  if (n === 0) return 0;
  const grid = buildOverlapGrid(members, hours);
  return grid.filter((c) => c.count === n).length;
}

/** Who is free vs not at a specific weekday index + hour. */
export function splitMembersAtCell(
  enrollments: GroupMemberEnrollment[],
  dayIdx: number,
  hour: number,
): { free: GroupMemberEnrollment[]; notFree: GroupMemberEnrollment[] } {
  const free: GroupMemberEnrollment[] = [];
  const notFree: GroupMemberEnrollment[] = [];
  for (const e of enrollments) {
    const keys = expandSlotsToWeekdayHourKeys(e.availabilitySlots);
    if (keys.has(`${dayIdx}-${hour}`)) free.push(e);
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
  const label = `${best.dayLabel} ${formatHourLabel(best.hour)}`;
  return {
    label,
    dayLabel: best.dayLabel,
    hour: best.hour,
    count: best.count,
    memberTotal: enrollments.length,
    studentFree,
  };
}
