import type { ClassType } from "@/types";

export function isClassType(s: unknown): s is ClassType {
  return s === "no-filming" || s === "half-song" || s === "full-song";
}

/** Credits charged to create/join a song group by class format. */
export const CREDITS_BY_CLASS: Record<ClassType, number> = {
  "no-filming": 5,
  "half-song": 9,
  "full-song": 14,
};

export const SGD_PER_CREDIT = 20;

export function creditsForClass(classType: ClassType): number {
  return CREDITS_BY_CLASS[classType];
}

export function sgdForCredits(credits: number): number {
  return credits * SGD_PER_CREDIT;
}

export const CLASS_LABELS: Record<ClassType, string> = {
  "no-filming": "No filming",
  "half-song": "Half song",
  "full-song": "Full song",
};
