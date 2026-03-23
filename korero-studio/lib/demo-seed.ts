/**
 * Rich demo data for admin/student testing. Loaded when localStorage has no persisted groups.
 * Run `supabase/seed.sql` in the Supabase SQL editor for matching reference rows (optional).
 */
import type { SongGroup, ClassSession, Booking, AdminAlert, AvailabilitySlot, TimeSlot, RoleName } from "@/types";
import { makeSongKey } from "@/lib/song-key";

const SLOT: AvailabilitySlot[] = [
  { date: "2025-06-10", startHour: 18, endHour: 20 },
  { date: "2025-06-12", startHour: 19, endHour: 21 },
];

function e(
  studentId: string,
  studentName: string,
  slotLabel: string,
  slots: AvailabilitySlot[] = SLOT,
) {
  return { studentId, studentName, slotLabel, availabilitySlots: slots.map((s) => ({ ...s })) };
}

/** Demo groups: mix of forming, confirmed, awaiting validation, with enrollments. */
export const RICH_MOCK_GROUPS: SongGroup[] = [
  {
    id: "demo-seed-1",
    songTitle: "Super Shy",
    artist: "NewJeans",
    songKey: makeSongKey("Super Shy", "NewJeans"),
    interestCount: 4,
    status: "forming",
    members: ["demo-stu-a", "demo-stu-b", "demo-stu-c", "demo-stu-d"],
    maxMembers: 5,
    imageUrl: undefined,
    slotLabels: ["Minji", "Hanni", "Danielle", "Haerin", "Hyein"],
    creatorId: "demo-stu-a",
    creatorSlotLabel: "Minji",
    enrollments: [
      e("demo-stu-a", "Alex Kim", "Minji"),
      e("demo-stu-b", "Sam Lee", "Hanni"),
      e("demo-stu-c", "Jordan Tan", "Danielle"),
      e("demo-stu-d", "Riley Ng", "Haerin"),
    ],
    creditsCharged: 2,
    classTypeAtCreation: "half-song",
    itunesTrackId: 1693713844,
    awaitingSongValidation: false,
  },
  {
    id: "demo-seed-2",
    songTitle: "Magnetic",
    artist: "ILLIT",
    songKey: makeSongKey("Magnetic", "ILLIT"),
    interestCount: 5,
    status: "confirmed",
    members: ["demo-stu-e", "demo-stu-f", "demo-stu-g", "demo-stu-h", "demo-stu-i"],
    maxMembers: 5,
    slotLabels: ["Wonhee", "Minju", "Moka", "Iroha", "Yunah"],
    creatorId: "demo-stu-e",
    creatorSlotLabel: "Wonhee",
    enrollments: [
      e("demo-stu-e", "Casey Lim", "Wonhee"),
      e("demo-stu-f", "Drew Ong", "Minju"),
      e("demo-stu-g", "Jamie Chua", "Moka"),
      e("demo-stu-h", "Taylor Sim", "Iroha"),
      e("demo-stu-i", "Morgan Yeo", "Yunah"),
    ],
    creditsCharged: 2,
    classTypeAtCreation: "full-song",
    awaitingSongValidation: false,
  },
  {
    id: "demo-seed-3",
    songTitle: "New Song Demo",
    artist: "Unknown Artist",
    songKey: makeSongKey("New Song Demo", "Unknown Artist"),
    interestCount: 2,
    status: "forming",
    members: ["demo-stu-j", "demo-stu-k"],
    maxMembers: 6,
    slotLabels: ["P1", "P2", "P3", "P4", "P5", "P6"],
    creatorId: "demo-stu-j",
    creatorSlotLabel: "P1",
    enrollments: [e("demo-stu-j", "Chris Wong", "P1"), e("demo-stu-k", "Pat Ng", "P2")],
    creditsCharged: 2,
    classTypeAtCreation: "no-filming",
    awaitingSongValidation: true,
  },
  {
    id: "demo-seed-4",
    songTitle: "Supernova",
    artist: "aespa",
    songKey: makeSongKey("Supernova", "aespa"),
    interestCount: 3,
    status: "forming",
    members: ["demo-stu-l", "demo-stu-m", "demo-stu-n"],
    maxMembers: 4,
    slotLabels: ["Karina", "Giselle", "Winter", "Ningning"],
    creatorId: "demo-stu-l",
    creatorSlotLabel: "Karina",
    enrollments: [
      e("demo-stu-l", "Quinn Ho", "Karina"),
      e("demo-stu-m", "Sky Teo", "Giselle"),
      e("demo-stu-n", "Blair Goh", "Winter"),
    ],
    creditsCharged: 2,
    classTypeAtCreation: "half-song",
    awaitingSongValidation: false,
  },
];

export const RICH_MOCK_SESSIONS: ClassSession[] = [
  { id: "demo-sess-1", groupId: "demo-seed-2", room: "Farrer Park", day: "Wednesday", time: "7:00 PM", confirmed: true },
  { id: "demo-sess-2", groupId: "demo-seed-1", room: "Orchard", day: "Saturday", time: "2:00 PM", confirmed: true },
];

const MOCK_SLOT: TimeSlot = { id: "t-demo", day: "Monday", time: "6:00 PM", available: true };

export const RICH_MOCK_BOOKINGS: Booking[] = [
  {
    id: "demo-book-1",
    studentId: "demo-stu-a",
    groupId: "demo-seed-1",
    role: "Main Vocal" as RoleName,
    timeSlot: MOCK_SLOT,
    paymentStatus: "paid",
    amount: 45,
    createdAt: new Date().toISOString(),
  },
];

/** One validation alert tied to the awaiting-validation group */
export const RICH_MOCK_ADMIN_ALERTS: AdminAlert[] = [
  {
    id: "demo-alert-1",
    kind: "song_validation",
    message: "New song group created — New Song Demo / Unknown Artist. Validate to activate.",
    groupId: "demo-seed-3",
    songKey: makeSongKey("New Song Demo", "Unknown Artist"),
    createdAt: new Date().toISOString(),
  },
];

export const STORAGE_KEYS = {
  groups: "korero.groups",
  sessions: "korero.sessions",
  bookings: "korero.bookings",
  whatsAppFullNotified: "korero.whatsAppFullNotified",
} as const;

export function readFullNotifiedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.whatsAppFullNotified);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export function markGroupFullNotified(groupId: string) {
  if (typeof window === "undefined") return;
  const s = readFullNotifiedIds();
  s.add(groupId);
  window.localStorage.setItem(STORAGE_KEYS.whatsAppFullNotified, JSON.stringify([...s]));
}
