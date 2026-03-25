import { addDays, format, startOfDay, startOfWeek } from "date-fns";

export type WeekColumn = {
  date: Date;
  dateKey: string;
  inWindow: boolean;
  label: string;
  isToday?: boolean;
};

export function enumerateWeekMondays(today0: Date, horizonEnd: Date): Date[] {
  const firstMonday = startOfWeek(today0, { weekStartsOn: 1 });
  const weeks: Date[] = [];
  let mon = firstMonday;
  while (mon <= horizonEnd && weeks.length < 6) {
    weeks.push(mon);
    mon = addDays(mon, 7);
  }
  return weeks;
}

export function buildWeekColumns(weekMonday: Date, today0: Date, horizonEnd: Date): WeekColumn[] {
  return [0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
    const d = addDays(weekMonday, dayIdx);
    const d0 = startOfDay(d);
    const t = d0.getTime();
    const inWindow = t >= today0.getTime() && t <= horizonEnd.getTime();
    return { date: d0, dateKey: format(d0, "yyyy-MM-dd"), inWindow, label: format(d0, "d") };
  });
}
