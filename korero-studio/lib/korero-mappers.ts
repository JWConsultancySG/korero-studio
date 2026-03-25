import type {
  AvailabilitySlot,
  AdminAlert,
  AppRole,
  Booking,
  ClassSession,
  ClassType,
  CreditTransaction,
  GroupMemberEnrollment,
  RoleName,
  SongCatalogEntry,
  SongGroup,
  GroupStudioSelection,
  GroupInstructorAssignment,
  MatchedHourSlot,
  Student,
  StudentNotification,
  StudioRoom,
  TimeSlot,
} from '@/types';

/** booking_time_slot_templates row */
export type BookingSlotTemplateRow = {
  id: string;
  day: string;
  time: string;
  available: boolean;
  sort_order: number;
};

export function mapBookingSlotRow(row: BookingSlotTemplateRow): TimeSlot {
  return {
    id: row.id,
    day: row.day,
    time: row.time,
    available: row.available,
  };
}

export type ProfileRow = {
  id: string;
  full_name: string;
  whatsapp: string;
  email: string;
  class_preference: ClassType | null;
  credits: number;
  app_role: AppRole;
};

export function mapProfileToStudent(row: ProfileRow): Student {
  return {
    id: row.id,
    name: row.full_name,
    whatsapp: row.whatsapp,
    email: row.email,
    classPreference: row.class_preference ?? undefined,
    credits: row.credits,
    appRole: row.app_role,
  };
}

export type SongGroupRow = {
  id: string;
  song_title: string;
  artist: string;
  song_key: string | null;
  interest_count: number;
  status: string;
  max_members: number;
  image_url: string | null;
  slot_labels: string[] | null;
  creator_id: string | null;
  creator_slot_label: string | null;
  credits_charged: number | null;
  class_type_at_creation: ClassType | null;
  itunes_track_id: number | null;
  awaiting_song_validation: boolean;
  full_notified_at: string | null;
  matching_state?: SongGroup['matchingState'] | null;
  golden_at?: string | null;
  fixed_at?: string | null;
  required_match_hours?: number | null;
  accepted_by_students?: unknown;
  accepted_by_instructor?: boolean | null;
  finalized_slot_blocks?: unknown;
  final_payment_status?: SongGroup['finalPaymentStatus'] | null;
};

export type GroupEnrollmentRow = {
  id: string;
  class_id: string;
  student_id: string;
  student_name: string;
  slot_label: string;
  availability_slots: unknown;
};

export function mapEnrollmentRow(row: GroupEnrollmentRow): GroupMemberEnrollment {
  const slots = Array.isArray(row.availability_slots) ? row.availability_slots : [];
  return {
    studentId: row.student_id,
    studentName: row.student_name,
    slotLabel: row.slot_label,
    availabilitySlots: slots as AvailabilitySlot[],
  };
}

export function mergeSongGroup(
  row: SongGroupRow,
  enrollments: GroupMemberEnrollment[],
  studioSelection?: GroupStudioSelection,
  instructorAssignment?: GroupInstructorAssignment,
): SongGroup {
  const members = enrollments.map((e) => e.studentId);
  return {
    id: row.id,
    songTitle: row.song_title,
    artist: row.artist,
    songKey: row.song_key ?? undefined,
    interestCount: row.interest_count,
    status: row.status as SongGroup['status'],
    maxMembers: row.max_members,
    imageUrl: row.image_url ?? undefined,
    slotLabels: row.slot_labels ?? undefined,
    creatorId: row.creator_id ?? undefined,
    creatorSlotLabel: row.creator_slot_label ?? undefined,
    creditsCharged: row.credits_charged ?? undefined,
    classTypeAtCreation: row.class_type_at_creation ?? undefined,
    itunesTrackId: row.itunes_track_id ?? undefined,
    awaitingSongValidation: row.awaiting_song_validation,
    fullNotifiedAt: row.full_notified_at ?? undefined,
    matchingState: row.matching_state ?? undefined,
    goldenAt: row.golden_at ?? undefined,
    fixedAt: row.fixed_at ?? undefined,
    requiredMatchHours: row.required_match_hours ?? undefined,
    acceptedByStudents: Array.isArray(row.accepted_by_students) ? (row.accepted_by_students as string[]) : [],
    acceptedByInstructor: row.accepted_by_instructor ?? false,
    finalizedSlotBlocks: Array.isArray(row.finalized_slot_blocks)
      ? (row.finalized_slot_blocks as MatchedHourSlot[])
      : [],
    finalPaymentStatus: row.final_payment_status ?? 'pending',
    studioSelection,
    instructorAssignment,
    enrollments,
    members,
  };
}

export type SongCatalogRow = {
  song_key: string;
  song_title: string;
  artist: string;
  image_url: string | null;
  itunes_track_id: number | null;
  validated: boolean;
  formation_size: number;
  role_names: string[] | null;
  difficulty: string;
  class_type_options: ClassType[] | null;
  teacher_notes: string;
  validated_at: string | null;
};

export function mapSongCatalogRow(row: SongCatalogRow): SongCatalogEntry {
  return {
    songKey: row.song_key,
    songTitle: row.song_title,
    artist: row.artist,
    imageUrl: row.image_url ?? undefined,
    itunesTrackId: row.itunes_track_id ?? undefined,
    validated: row.validated,
    formationSize: row.formation_size,
    roleNames: row.role_names ?? [],
    difficulty: row.difficulty,
    classTypeOptions: (row.class_type_options ?? []) as ClassType[],
    teacherNotes: row.teacher_notes,
    validatedAt: row.validated_at ?? undefined,
  };
}

export type BookingRow = {
  id: string;
  student_id: string;
  class_id: string;
  role: RoleName;
  time_slot: unknown;
  payment_status: string;
  amount: string | number;
  created_at: string;
};

export function mapBookingRow(row: BookingRow): Booking {
  const ts = row.time_slot as TimeSlot;
  return {
    id: row.id,
    studentId: row.student_id,
    groupId: row.class_id,
    role: row.role,
    timeSlot: ts,
    paymentStatus: row.payment_status as Booking['paymentStatus'],
    amount: typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount,
    createdAt: row.created_at,
  };
}

export type ClassSessionRow = {
  id: string;
  class_id: string;
  room: StudioRoom;
  day?: string | null;
  time?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  confirmed: boolean;
  studio_id?: string | null;
};

export function mapClassSessionRow(row: ClassSessionRow): ClassSession {
  return {
    id: row.id,
    groupId: row.class_id,
    room: row.room,
    day: row.day ?? undefined,
    time: row.time ?? undefined,
    startAt: row.start_at ?? undefined,
    endAt: row.end_at ?? undefined,
    confirmed: row.confirmed,
    studioId: row.studio_id ?? undefined,
  };
}

export type StudioRow = {
  id: string;
  name: string;
  is_active: boolean;
  location: string;
  address: string;
  timezone: string;
  capacity: number;
  notes: string;
};

export function mapStudioRow(row: StudioRow) {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    location: row.location,
    address: row.address,
    timezone: row.timezone,
    capacity: row.capacity,
    notes: row.notes,
  };
}

export type CreditTransactionRow = {
  id: string;
  profile_id: string;
  at: string;
  kind: CreditTransaction['kind'];
  credits_delta: number;
  sgd_delta: string | number | null;
  label: string;
  class_id: string | null;
  class_type: ClassType | null;
  payment_ref: string | null;
};

export function mapCreditTransactionRow(row: CreditTransactionRow): CreditTransaction {
  const sgd =
    row.sgd_delta == null
      ? undefined
      : typeof row.sgd_delta === 'string'
        ? parseFloat(row.sgd_delta)
        : row.sgd_delta;
  return {
    id: row.id,
    at: row.at,
    kind: row.kind,
    creditsDelta: row.credits_delta,
    sgdDelta: sgd,
    label: row.label,
    groupId: row.class_id ?? undefined,
    classType: row.class_type ?? undefined,
    paymentRef: row.payment_ref ?? undefined,
  };
}

export type AdminAlertRow = {
  id: string;
  kind: 'song_validation';
  message: string;
  class_id: string;
  song_key: string;
  created_at: string;
  dismissed_at: string | null;
};

export function mapAdminAlertRow(row: AdminAlertRow): AdminAlert | null {
  if (row.dismissed_at) return null;
  return {
    id: row.id,
    kind: row.kind,
    message: row.message,
    groupId: row.class_id,
    songKey: row.song_key,
    createdAt: row.created_at,
  };
}

export type StudentNotificationRow = {
  id: string;
  student_id: string;
  message: string;
  read: boolean;
  created_at: string;
};

export function mapStudentNotificationRow(row: StudentNotificationRow): StudentNotification {
  return {
    id: row.id,
    studentId: row.student_id,
    message: row.message,
    read: row.read,
    createdAt: row.created_at,
  };
}

export type StudentAvailabilityRow = {
  id: string;
  student_id: string;
  date: string;
  start_hour: number;
  end_hour: number;
  is_confirmed_class: boolean;
  confirmed_class_id: string | null;
};

export function mapStudentAvailabilityRow(row: StudentAvailabilityRow): AvailabilitySlot {
  return {
    date: row.date,
    startHour: row.start_hour,
    endHour: row.end_hour,
    isConfirmedClass: row.is_confirmed_class,
    confirmedGroupId: row.confirmed_class_id ?? undefined,
  };
}
