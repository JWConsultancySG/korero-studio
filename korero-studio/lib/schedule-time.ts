import { format, isValid, parse } from "date-fns";

/** Match stored session times like "6:00 PM" to an hour row (8–22) on the shared grid. */
export function parseTimeLabelToHour(label: string): number | null {
  const t = label.trim();
  for (const fmt of ["h:mm a", "hh:mm a", "H:mm", "HH:mm"] as const) {
    const d = parse(t, fmt, new Date(2000, 0, 1));
    if (isValid(d)) return d.getHours();
  }
  return null;
}

/** Produce labels consistent with existing mock sessions (e.g. "6:00 PM"). */
export function hourNumberToTimeLabel(hour: number): string {
  const d = new Date(2000, 0, 1, hour, 0, 0);
  return format(d, "h:mm a");
}
