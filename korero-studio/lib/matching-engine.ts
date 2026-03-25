import type { AvailabilitySlot, ClassType, MatchedHourSlot } from '@/types';

const REQUIRED_HOURS_BY_CLASS: Record<ClassType, number> = {
  'no-filming': 4,
  'half-song': 6,
  'full-song': 8,
};

type HourKey = `${string}|${number}`;

function expandToHourKeys(slots: AvailabilitySlot[]): Set<HourKey> {
  const out = new Set<HourKey>();
  for (const slot of slots) {
    if (slot.isConfirmedClass) continue;
    for (let h = slot.startHour; h < slot.endHour; h += 1) {
      out.add(`${slot.date}|${h}`);
    }
  }
  return out;
}

function intersectSets<T>(sets: Set<T>[]): Set<T> {
  if (sets.length === 0) return new Set<T>();
  const [first, ...rest] = sets;
  const out = new Set<T>();
  for (const v of first) {
    if (rest.every((s) => s.has(v))) out.add(v);
  }
  return out;
}

function toMatchedHourSlots(keys: Set<HourKey>): MatchedHourSlot[] {
  return Array.from(keys)
    .map((k) => {
      const [date, hourStr] = k.split('|');
      return { date, hour: Number(hourStr) };
    })
    .sort((a, b) => (a.date === b.date ? a.hour - b.hour : a.date.localeCompare(b.date)));
}

export function requiredMatchHours(classType?: ClassType): number {
  if (!classType) return 0;
  return REQUIRED_HOURS_BY_CLASS[classType];
}

export function computeMultiPartyIntersection(inputs: AvailabilitySlot[][]): MatchedHourSlot[] {
  const expanded = inputs.map((slots) => expandToHourKeys(slots));
  return toMatchedHourSlots(intersectSets(expanded));
}

export function isGoldenForClassType(classType: ClassType | undefined, matchedSlots: MatchedHourSlot[]): boolean {
  if (!classType) return false;
  const requiredHours = requiredMatchHours(classType);
  if (requiredHours === 0) return false;
  if (matchedSlots.length < requiredHours) return false;
  const distinctDays = new Set(matchedSlots.map((s) => s.date));
  return distinctDays.size >= requiredHours;
}

export function overlapHoursCount(a: AvailabilitySlot[], b: AvailabilitySlot[]): number {
  const overlap = intersectSets([expandToHourKeys(a), expandToHourKeys(b)]);
  return overlap.size;
}
