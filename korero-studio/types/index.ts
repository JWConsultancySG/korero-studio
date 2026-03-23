export type ClassType = 'no-filming' | 'half-song' | 'full-song';

export interface Student {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  classPreference?: ClassType;
  /** Credits balance for booking / creating groups (1 credit = SGD 20). */
  credits?: number;
}

export type GroupStatus = 'forming' | 'confirmed' | 'pending';

/** Physical studio locations (two rooms). */
export type StudioRoom = 'Farrer Park' | 'Orchard';

/** Validated once per song key — reused for all future groups of that song. */
export interface SongCatalogEntry {
  songKey: string;
  songTitle: string;
  artist: string;
  imageUrl?: string;
  itunesTrackId?: number;
  validated: boolean;
  formationSize: number;
  roleNames: string[];
  difficulty: string;
  classTypeOptions: ClassType[];
  teacherNotes: string;
  validatedAt?: string;
}

export interface SongGroup {
  id: string;
  songTitle: string;
  artist: string;
  interestCount: number;
  status: GroupStatus;
  members: string[]; // student IDs
  maxMembers: number;
  imageUrl?: string;
  /** Member position names (e.g. Jennie, Lisa) — length matches maxMembers when set. */
  slotLabels?: string[];
  creatorId?: string;
  /** Creator's chosen slot label from slotLabels. */
  creatorSlotLabel?: string;
  enrollments?: GroupMemberEnrollment[];
  creditsCharged?: number;
  classTypeAtCreation?: ClassType;
  /** Matches `makeSongKey(songTitle, artist)` for library / validation. */
  songKey?: string;
  itunesTrackId?: number;
  /** True until admin validates the song profile — hidden from public group browse. */
  awaitingSongValidation?: boolean;
}

export type RoleName = 'Main Vocal' | 'Sub Vocal' | 'Main Dancer' | 'Sub Dancer' | 'Rapper' | 'Center';

export interface Role {
  name: RoleName;
  available: boolean;
  heldBy?: string;
  holdExpiry?: number;
}

export type TimeSlot = {
  id: string;
  day: string;
  time: string;
  available: boolean;
};

export type BookingStep = 'availability' | 'role' | 'payment' | 'confirmation';

export interface Booking {
  id: string;
  studentId: string;
  groupId: string;
  role: RoleName;
  timeSlot: TimeSlot;
  paymentStatus: 'pending' | 'paid';
  amount: number;
  createdAt: string;
}

export interface AvailabilitySlot {
  date: string; // ISO date string YYYY-MM-DD
  startHour: number; // 8-22 (8am-10pm)
  endHour: number; // 9-23 (9am-11pm)
  isConfirmedClass?: boolean;
  confirmedGroupId?: string;
}

/** A member in a song group with their chosen slot name and availability snapshot. */
export interface GroupMemberEnrollment {
  studentId: string;
  studentName: string;
  slotLabel: string;
  availabilitySlots: AvailabilitySlot[];
}

export type PaymentMethod = 'stripe' | 'paynow';

/** Ledger row for credits (mock / local-first). */
export interface CreditTransaction {
  id: string;
  at: string; // ISO
  kind: 'top_up' | 'group_create' | 'adjustment' | 'class_plan';
  /** Positive = credits added, negative = spent. */
  creditsDelta: number;
  sgdDelta?: number;
  label: string;
  groupId?: string;
  /** When relevant (e.g. class plan purchase or group charge). */
  classType?: ClassType;
  /** Set after a completed checkout step (demo reference). */
  paymentRef?: string;
}

export interface ClassSession {
  id: string;
  groupId: string;
  room: StudioRoom;
  day: string;
  time: string;
  confirmed: boolean;
}

export interface AdminAlert {
  id: string;
  kind: 'song_validation';
  message: string;
  groupId: string;
  songKey: string;
  createdAt: string;
}

export interface StudentNotification {
  id: string;
  studentId: string;
  message: string;
  read: boolean;
  createdAt: string;
}
