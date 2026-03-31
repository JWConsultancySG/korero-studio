import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AdminAlert,
  AvailabilitySlot,
  Booking,
  ClassSession,
  ClassType,
  CreditTransaction,
  GroupMemberEnrollment,
  SongCatalogEntry,
  SongGroup,
  Studio,
  Student,
  StudentNotification,
  TimeSlot,
} from '@/types';
import { creditsForClass, sgdForCredits } from '@/lib/credits';
import { makeSongKey } from '@/lib/song-key';
import type { CreateSongGroupPayload, CreateSongGroupResult } from '@/lib/korero-types';
import {
  mapAdminAlertRow,
  mapBookingRow,
  mapClassSessionRow,
  mapCreditTransactionRow,
  mapEnrollmentRow,
  mapProfileToStudent,
  mapSongCatalogRow,
  mapStudentAvailabilityRow,
  mapStudentNotificationRow,
  mapBookingSlotRow,
  mapStudioRow,
  mergeSongGroup,
  type GroupEnrollmentRow,
  type ProfileRow,
  type SongGroupRow,
  type SongCatalogRow,
} from '@/lib/korero-mappers';

/** PostgrestError often prints as `{}` in the console — stringify useful fields. */
function formatSupabaseError(err: unknown): string {
  if (err == null) return 'unknown error';
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    const e = err as { message: string; code?: string; details?: string; hint?: string };
    return [e.message, e.code, e.details, e.hint].filter(Boolean).join(' | ');
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

async function hasSupabaseAuthSession(supabase: SupabaseClient): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return Boolean(session?.user);
}

export type KoreroLoadedData = {
  student: Student | null;
  groups: SongGroup[];
  bookings: Booking[];
  sessions: ClassSession[];
  timeSlots: TimeSlot[];
  songCatalog: Record<string, SongCatalogEntry>;
  creditTransactions: CreditTransaction[];
  adminAlerts: AdminAlert[];
  studentNotifications: StudentNotification[];
  availability: AvailabilitySlot[];
  studios: Studio[];
};

export async function loadBookingTimeSlots(supabase: SupabaseClient): Promise<TimeSlot[]> {
  const { data, error } = await supabase
    .from('booking_time_slot_templates')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error || !data?.length) {
    return [];
  }
  return data.map((r) => mapBookingSlotRow(r as Parameters<typeof mapBookingSlotRow>[0]));
}

/** If bulk enrollment merge missed the current user (RLS edge cases), patch members from own rows. */
async function ensureUserMembershipOnGroups(
  supabase: SupabaseClient,
  groups: SongGroup[],
  uid: string,
): Promise<SongGroup[]> {
  if (!(await hasSupabaseAuthSession(supabase))) {
    return groups;
  }
  const { data: mine, error } = await supabase.from('class_enrollments').select('class_id').eq('student_id', uid);
  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[korero] ensureUserMembershipOnGroups', formatSupabaseError(error));
    }
    return groups;
  }
  const enrolledIds = new Set((mine ?? []).map((r) => r.class_id as string));
  if (enrolledIds.size === 0) return groups;
  return groups.map((g) => {
    if (!enrolledIds.has(g.id)) return g;
    const members = g.members ?? [];
    if (members.includes(uid)) return g;
    return { ...g, members: [...members, uid] };
  });
}

export async function fetchSongGroupsMerged(
  supabase: SupabaseClient,
  includeEnrollments: boolean,
): Promise<SongGroup[]> {
  const { data: groups, error } = await supabase
    .from('classes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[korero] fetchSongGroupsMerged', error);
    return [];
  }
  const gRows = (groups ?? []) as SongGroupRow[];
  if (!includeEnrollments) {
    return gRows.map((g) => mergeSongGroup(g, []));
  }
  if (!(await hasSupabaseAuthSession(supabase))) {
    return gRows.map((g) => mergeSongGroup(g, []));
  }
  const [{ data: ens, error: ensError }, { data: studioSelections }, { data: instructorAssignments }] =
    await Promise.all([
      supabase.from('class_enrollments').select('*'),
      supabase.from('class_studio_selection').select('*'),
      supabase.from('class_instructor_assignments').select('*').order('requested_at', { ascending: false }),
    ]);
  if (ensError) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[korero] fetchSongGroupsMerged class_enrollments', formatSupabaseError(ensError));
    }
  }
  const byGroup = new Map<string, GroupEnrollmentRow[]>();
  for (const e of (ens ?? []) as GroupEnrollmentRow[]) {
    const arr = byGroup.get(e.class_id) ?? [];
    arr.push(e);
    byGroup.set(e.class_id, arr);
  }
  const studioRows = studioSelections ?? [];
  const studioByGroup = new Map<string, (typeof studioRows)[number]>();
  for (const s of studioRows) studioByGroup.set(s.class_id as string, s);
  const assignmentRows = instructorAssignments ?? [];
  const instructorByGroup = new Map<string, (typeof assignmentRows)[number]>();
  for (const a of assignmentRows) {
    const key = a.class_id as string;
    const prev = instructorByGroup.get(key);
    if (!prev || (prev.status !== 'confirmed' && a.status === 'confirmed')) instructorByGroup.set(key, a);
  }

  return gRows.map((g) => {
    const rows = byGroup.get(g.id) ?? [];
    const studio = studioByGroup.get(g.id);
    const instructor = instructorByGroup.get(g.id);
    return mergeSongGroup(
      g,
      rows.map(mapEnrollmentRow),
      studio
        ? {
            groupId: studio.class_id as string,
            studioId: studio.studio_id as string,
            selectedBy: (studio.selected_by as string | null) ?? undefined,
            selectedAt: studio.selected_at as string,
          }
        : undefined,
      instructor
        ? {
            id: instructor.id as string,
            groupId: instructor.class_id as string,
            instructorId: instructor.instructor_id as string,
            status: instructor.status as 'pending' | 'confirmed' | 'rejected',
            requestedAt: instructor.requested_at as string,
            decidedAt: (instructor.decided_at as string | null) ?? undefined,
            decidedBy: (instructor.decided_by as string | null) ?? undefined,
          }
        : undefined,
    );
  });
}

export async function fetchStudios(supabase: SupabaseClient): Promise<Studio[]> {
  const { data, error } = await supabase.from('studios').select('*').order('name', { ascending: true });
  if (error || !data) return [];
  return data.map((r) => mapStudioRow(r as Parameters<typeof mapStudioRow>[0]));
}

export async function fetchSongCatalogMap(supabase: SupabaseClient): Promise<Record<string, SongCatalogEntry>> {
  const { data, error } = await supabase.from('song_catalog').select('*');
  if (error || !data) return {};
  const out: Record<string, SongCatalogEntry> = {};
  for (const row of data as SongCatalogRow[]) {
    const e = mapSongCatalogRow(row);
    out[e.songKey] = e;
  }
  return out;
}

export async function fetchProfile(supabase: SupabaseClient, userId: string): Promise<Student | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return mapProfileToStudent(data as ProfileRow);
}

export async function loadKoreroData(
  supabase: SupabaseClient,
  opts: { userId: string | null },
): Promise<KoreroLoadedData> {
  if (opts.userId) {
    await supabase.auth.getSession();
  }
  const timeSlots = await loadBookingTimeSlots(supabase);
  const songCatalog = await fetchSongCatalogMap(supabase);
  const studios = await fetchStudios(supabase);
  const includeEnrollments = Boolean(opts.userId);
  let groups = await fetchSongGroupsMerged(supabase, includeEnrollments);
  if (opts.userId && includeEnrollments) {
    groups = await ensureUserMembershipOnGroups(supabase, groups, opts.userId);
  }

  if (!opts.userId) {
    return {
      student: null,
      groups,
      bookings: [],
      sessions: [],
      timeSlots,
      songCatalog,
      creditTransactions: [],
      adminAlerts: [],
      studentNotifications: [],
      availability: [],
      studios,
    };
  }

  const uid = opts.userId;

  const student = await fetchProfile(supabase, uid);
  const [bookingsRes, sessionsRes, creditRes, notifRes, availRes] = await Promise.all([
    supabase.from('bookings').select('*').eq('student_id', uid).order('created_at', { ascending: false }),
    supabase.from('class_sessions').select('*'),
    supabase.from('credit_transactions').select('*').eq('profile_id', uid).order('at', { ascending: false }),
    supabase.from('student_notifications').select('*').eq('student_id', uid).order('created_at', { ascending: false }),
    supabase.from('student_availability_slots').select('*').eq('student_id', uid),
  ]);
  const bookingRows = bookingsRes.data;
  const sessionRows = sessionsRes.data;
  const creditRows = creditRes.data;
  const notifRows = notifRes.data;
  const availRows = availRes.data;

  let adminAlerts: AdminAlert[] = [];
  if (student?.appRole === 'admin') {
    const { data: alertRows } = await supabase.from('admin_alerts').select('*').order('created_at', { ascending: false });
    adminAlerts = (alertRows ?? [])
      .map((r) => mapAdminAlertRow(r as Parameters<typeof mapAdminAlertRow>[0]))
      .filter((a): a is AdminAlert => a != null);
  }

  return {
    student: student ?? {
      id: uid,
      name: '',
      whatsapp: '',
      email: '',
      credits: 0,
      appRole: 'student',
    },
    groups,
    bookings: (bookingRows ?? []).map((r) => mapBookingRow(r as Parameters<typeof mapBookingRow>[0])),
    sessions: (sessionRows ?? []).map((r) => mapClassSessionRow(r as Parameters<typeof mapClassSessionRow>[0])),
    timeSlots,
    songCatalog,
    creditTransactions: (creditRows ?? []).map((r) =>
      mapCreditTransactionRow(r as Parameters<typeof mapCreditTransactionRow>[0]),
    ),
    adminAlerts,
    studentNotifications: (notifRows ?? []).map((r) =>
      mapStudentNotificationRow(r as Parameters<typeof mapStudentNotificationRow>[0]),
    ),
    availability: (availRows ?? []).map((r) =>
      mapStudentAvailabilityRow(r as Parameters<typeof mapStudentAvailabilityRow>[0]),
    ),
    studios,
  };
}

/** After join/create, check if group is full and notify once (server updates full_notified_at). */
export async function notifyIfClassBecameFull(
  group: SongGroup,
  prevGroup: SongGroup | undefined,
): Promise<void> {
  const headcount = group.enrollments?.length ?? group.interestCount;
  const isFull = headcount >= group.maxMembers && group.maxMembers > 0;
  if (!isFull || group.status !== 'confirmed') return;
  if (group.fullNotifiedAt) return;
  if (prevGroup?.fullNotifiedAt) return;

  const { notifyClassThresholdReached } = await import('@/app/actions/notifications');
  await notifyClassThresholdReached({
    groupId: group.id,
    songTitle: group.songTitle,
    artist: group.artist,
    interestCount: headcount,
    maxMembers: group.maxMembers,
  });
}

type CreateSongGroupCtx = {
  supabase: SupabaseClient;
  student: Student;
  songCatalog: Record<string, SongCatalogEntry>;
  availability: AvailabilitySlot[];
};

export async function createSongGroupInDb(
  ctx: CreateSongGroupCtx,
  payload: CreateSongGroupPayload,
): Promise<CreateSongGroupResult> {
  const { supabase, student: st, songCatalog: catalog, availability: avail } = ctx;
  const songKey = makeSongKey(payload.songTitle, payload.artist);
  const catalogEntry = catalog[songKey];
  const isValidated = Boolean(catalogEntry?.validated);

  let maxMembers = payload.maxMembers;
  let slotLabels = [...payload.slotLabels];
  let creatorSlot = payload.creatorSlotLabel;
  if (isValidated && catalogEntry) {
    maxMembers = catalogEntry.formationSize;
    slotLabels = [...catalogEntry.roleNames];
    if (!slotLabels.includes(creatorSlot)) {
      creatorSlot = slotLabels[0] ?? creatorSlot;
    }
  } else if (!slotLabels.includes(creatorSlot)) {
    creatorSlot = slotLabels[0] ?? creatorSlot;
  }

  const awaitingSongValidation = !payload.skipSongValidation && !isValidated;
  const cost = creditsForClass(payload.classType);
  const balance = st.credits ?? 0;
  if (balance < cost) {
    return { ok: false, reason: 'insufficient_credits' };
  }

  const snapshot = avail.filter((a) => !a.isConfirmedClass);
  const enrollment: GroupMemberEnrollment = {
    studentId: st.id,
    studentName: st.name,
    slotLabel: creatorSlot,
    availabilitySlots: snapshot.map((s) => ({ ...s })),
  };

  const insertRow = {
    song_title: payload.songTitle,
    artist: payload.artist,
    song_key: isValidated ? songKey : null,
    interest_count: 0,
    status: 'forming' as const,
    max_members: maxMembers,
    image_url: payload.imageUrl ?? null,
    slot_labels: slotLabels,
    creator_id: st.id,
    creator_slot_label: creatorSlot,
    credits_charged: cost,
    class_type_at_creation: payload.classType,
    itunes_track_id: payload.itunesTrackId ?? null,
    awaiting_song_validation: awaitingSongValidation,
  };

  const { data: inserted, error: gErr } = await supabase.from('classes').insert(insertRow).select('id').single();
  if (gErr || !inserted?.id) {
    console.error('[korero] createSongGroup insert', gErr);
    return { ok: false, reason: 'error' };
  }
  const groupId = inserted.id as string;

  const { error: eErr } = await supabase.from('class_enrollments').insert({
    class_id: groupId,
    student_id: st.id,
    student_name: st.name,
    slot_label: creatorSlot,
    availability_slots: enrollment.availabilitySlots,
  });
  if (eErr) {
    console.error('[korero] createSongGroup enrollment', eErr);
    await supabase.from('classes').delete().eq('id', groupId);
    return { ok: false, reason: 'error' };
  }

  if (awaitingSongValidation) {
    await supabase.from('admin_alerts').insert({
      kind: 'song_validation',
      message: `New song group created — ${payload.songTitle} / ${payload.artist}. Validate to activate.`,
      class_id: groupId,
      song_key: songKey,
    });
  }

  const newCredits = balance - cost;
  await supabase.from('profiles').update({ credits: newCredits }).eq('id', st.id);

  await supabase.from('credit_transactions').insert({
    profile_id: st.id,
    kind: 'group_create',
    credits_delta: -cost,
    label: `New song group: "${payload.songTitle}" (${cost} credits)`,
    class_id: groupId,
    class_type: payload.classType,
  });

  return {
    ok: true,
    groupId,
    creditsCharged: cost,
    topUpCredits: 0,
    topUpSgd: 0,
    awaitingSongValidation,
  };
}

export async function joinGroupInDb(
  supabase: SupabaseClient,
  student: Student,
  groupId: string,
  availability: AvailabilitySlot[],
  slotLabel?: string,
): Promise<{ ok: boolean; error?: string }> {
  const snap = availability.filter((a) => !a.isConfirmedClass).map((s) => ({ ...s }));
  const enrollment: GroupMemberEnrollment = {
    studentId: student.id,
    studentName: student.name,
    slotLabel: slotLabel?.trim() || 'Member',
    availabilitySlots: snap,
  };

  const { error } = await supabase.from('class_enrollments').insert({
    class_id: groupId,
    student_id: student.id,
    student_name: student.name,
    slot_label: enrollment.slotLabel,
    availability_slots: enrollment.availabilitySlots,
  });
  if (error) {
    const duplicateEnrollment = error.code === '23505';
    if (duplicateEnrollment) {
      // Treat repeated joins as a no-op so UI stays stable/idempotent.
      return { ok: true };
    }
    console.error('[korero] joinGroup', formatSupabaseError(error));
    return { ok: false, error: formatSupabaseError(error) };
  }
  return { ok: true };
}

/** Replace all availability rows for a student (confirmed + free). */
export async function replaceStudentAvailability(
  supabase: SupabaseClient,
  studentId: string,
  slots: AvailabilitySlot[],
): Promise<void> {
  await supabase.from('student_availability_slots').delete().eq('student_id', studentId);
  const freeSlots = slots.filter((s) => !s.isConfirmedClass).map((s) => ({ ...s }));
  const { error: enrollErr } = await supabase
    .from('class_enrollments')
    .update({ availability_slots: freeSlots })
    .eq('student_id', studentId);
  if (enrollErr) {
    console.error('[korero] sync group_enrollments availability', enrollErr);
  }
  if (slots.length === 0) return;
  const rows = slots.map((s) => ({
    student_id: studentId,
    date: s.date,
    start_hour: s.startHour,
    end_hour: s.endHour,
    is_confirmed_class: Boolean(s.isConfirmedClass),
    confirmed_class_id: s.confirmedGroupId ?? null,
  }));
  const { error } = await supabase.from('student_availability_slots').insert(rows);
  if (error) console.error('[korero] replaceStudentAvailability', error);
}

export async function appendCreditTopUp(
  supabase: SupabaseClient,
  profileId: string,
  credits: number,
  label: string,
  meta?: { paymentRef?: string; kind?: 'top_up' | 'class_plan'; classType?: ClassType },
): Promise<void> {
  const newBal = await supabase.from('profiles').select('credits').eq('id', profileId).single();
  const cur = (newBal.data?.credits as number) ?? 0;
  const next = cur + credits;
  await supabase.from('profiles').update({ credits: next }).eq('id', profileId);
  await supabase.from('credit_transactions').insert({
    profile_id: profileId,
    kind: meta?.kind ?? 'top_up',
    credits_delta: credits,
    sgd_delta: sgdForCredits(credits),
    label,
    class_type: meta?.classType ?? null,
    payment_ref: meta?.paymentRef ?? null,
  });
}
