'use client';

/* AppContext — Supabase-backed state */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  Student,
  SongGroup,
  Booking,
  ClassSession,
  TimeSlot,
  RoleName,
  Role,
  AvailabilitySlot,
  ClassType,
  CreditTransaction,
  SongCatalogEntry,
  AdminAlert,
  StudentNotification,
  Studio,
} from '@/types';
import { creditsForClass, CLASS_LABELS } from '@/lib/credits';
import type { User } from '@supabase/supabase-js';
import { isAdminFromAppRole } from '@/lib/admin-auth';
import { makeSongKey, groupSongKey } from '@/lib/song-key';
import { hoursToBlocks, slotsToHoursForDate } from '@/lib/availability-blocks';
import {
  loadKoreroData,
  createSongGroupInDb,
  joinGroupInDb,
  appendCreditTopUp,
  replaceStudentAvailability,
  notifyIfClassBecameFull,
  type KoreroLoadedData,
} from '@/lib/korero-db';
import { persistSongCatalogEntry, deleteSongCatalogFromDb } from '@/lib/korero-catalog';
import type {
  CreateSongGroupPayload,
  CreditPurchaseMeta,
  CreateSongGroupResult,
  ReviewClassRequestPayload,
} from '@/lib/korero-types';
import type { MatchedHourSlot } from '@/types';
import {
  confirmInstructorAssignment,
  finalizeGroupClass,
  precheckGroupStudioOverlap,
  recomputeMatchingForCurrentUserEnrollments,
  recomputeGroupMatchingState,
  requestInstructorAssignment,
  selectGroupStudio,
  submitFinalAcceptance,
  selectLessonSlots as selectLessonSlotsAction,
  confirmStudentPayment as confirmStudentPaymentAction,
  cancelClass as cancelClassAction,
} from '@/app/actions/matching';
import { addStudio as addStudioAction, deleteStudio as deleteStudioAction, updateStudio as updateStudioAction } from '@/app/actions/studios';

export type {
  CreateSongGroupPayload,
  CreditPurchaseMeta,
  CreateSongGroupResult,
  ReviewClassRequestPayload,
} from '@/lib/korero-types';

const DEFAULT_ROLES: Role[] = [
  { name: 'Main Vocal', available: true },
  { name: 'Sub Vocal', available: true },
  { name: 'Main Dancer', available: true },
  { name: 'Sub Dancer', available: true },
  { name: 'Rapper', available: true },
  { name: 'Center', available: true },
];

export type SlotHoldEntry = {
  studentId: string;
  studentName: string;
  expiresAt: number;
};

export type DraftSlotHoldMap = Record<string, Record<string, SlotHoldEntry>>;

const HOLD_MS = 30 * 60 * 1000;

function tryClaimSlot(
  prev: DraftSlotHoldMap,
  draftId: string,
  slotLabel: string,
  st: Student,
): { next: DraftSlotHoldMap; ok: boolean } {
  const draft = { ...(prev[draftId] || {}) };
  const now = Date.now();
  for (const k of Object.keys(draft)) {
    if (draft[k].expiresAt <= now) delete draft[k];
  }
  const existing = draft[slotLabel];
  if (existing && existing.studentId !== st.id && existing.expiresAt > now) {
    return { next: prev, ok: false };
  }
  for (const k of Object.keys(draft)) {
    if (draft[k].studentId === st.id && k !== slotLabel) delete draft[k];
  }
  draft[slotLabel] = { studentId: st.id, studentName: st.name, expiresAt: now + HOLD_MS };
  return { next: { ...prev, [draftId]: draft }, ok: true };
}

function pruneExpiredDraftHolds(map: DraftSlotHoldMap): DraftSlotHoldMap {
  const now = Date.now();
  const out: DraftSlotHoldMap = {};
  for (const [draftId, slots] of Object.entries(map)) {
    const next: Record<string, SlotHoldEntry> = {};
    for (const [label, h] of Object.entries(slots)) {
      if (h.expiresAt > now) next[label] = h;
    }
    if (Object.keys(next).length > 0) out[draftId] = next;
  }
  return out;
}

interface AppState {
  student: Student | null;
  groups: SongGroup[];
  bookings: Booking[];
  sessions: ClassSession[];
  timeSlots: TimeSlot[];
  roles: Role[];
  pendingGroups: SongGroup[];
  isAdmin: boolean;
  authSessionReady: boolean;
  authUser: User | null;
  isAuthenticated: boolean;
  availability: AvailabilitySlot[];
  creditTransactions: CreditTransaction[];
  songCatalog: Record<string, SongCatalogEntry>;
  adminAlerts: AdminAlert[];
  studentNotifications: StudentNotification[];
  dataLoading: boolean;
  studios: Studio[];
}

interface AppContextType extends AppState {
  /** Reload Korero state from Supabase (e.g. after role change). */
  refreshApp: () => Promise<void>;
  syncStudentFromAuth: (student: Student) => void;
  logoutStudent: () => void;
  joinGroup: (groupId: string, slotLabel?: string) => Promise<void>;
  createSongGroup: (payload: CreateSongGroupPayload) => Promise<CreateSongGroupResult>;
  purchaseCredits: (credits: number, meta?: CreditPurchaseMeta) => Promise<void>;
  purchaseClassPlan: (classType: ClassType, meta?: CreditPurchaseMeta) => Promise<void>;
  approveGroup: (groupId: string) => void;
  rejectGroup: (groupId: string) => void;
  updateSongGroup: (groupId: string, patch: Partial<Omit<SongGroup, 'id'>>) => Promise<void>;
  deleteSongGroup: (groupId: string) => Promise<void>;
  removeSongGroupMember: (groupId: string, studentId: string) => Promise<void>;
  selectRole: (role: RoleName) => void;
  createBooking: (groupId: string, role: RoleName, timeSlot: TimeSlot) => Promise<Booking>;
  completePayment: (bookingId: string) => Promise<void>;
  logoutAdmin: () => void;
  chooseStudioForGroup: (groupId: string, studioId: string) => Promise<{ ok: boolean; overlapHours?: number }>;
  addStudio: (input: {
    name: string;
    location?: string;
    address?: string;
    timezone?: string;
    capacity?: number;
    notes?: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  updateStudio: (
    studioId: string,
    patch: {
      name?: string;
      location?: string;
      address?: string;
      timezone?: string;
      capacity?: number;
      notes?: string;
      isActive?: boolean;
    },
  ) => Promise<{ ok: boolean; message?: string }>;
  deleteStudio: (studioId: string) => Promise<{ ok: boolean; message?: string }>;
  requestInstructorForGroup: (groupId: string) => Promise<void>;
  confirmInstructorForGroup: (groupId: string, assignmentId: string) => Promise<void>;
  recomputeGroupMatching: (groupId: string) => Promise<void>;
  submitGroupFinalAcceptance: (groupId: string) => Promise<void>;
  finalizeGroupLesson: (groupId: string) => Promise<void>;
  selectLessonSlots: (
    classId: string,
    slots: MatchedHourSlot[],
  ) => Promise<
    | { ok: true; studentsNotified: number; notifyFailed: boolean }
    | { ok: false; reason?: string }
  >;
  confirmPayment: (
    classId: string,
  ) => Promise<
    | { ok: true; allPaid?: boolean; alreadyPaid?: boolean }
    | {
        ok: false;
        reason: string;
        costCredits?: number;
        balance?: number;
        classId?: string;
      }
  >;
  cancelClassById: (classId: string, reason: string) => Promise<{ ok: boolean }>;
  approveClassRequest: (payload: ReviewClassRequestPayload) => Promise<void>;
  saveSongCatalogEntry: (payload: ReviewClassRequestPayload, previousSongKey?: string) => Promise<void>;
  deleteSongCatalogEntry: (songKey: string) => Promise<{ ok: true } | { ok: false; reason: 'in_use' }>;
  getSongCatalogEntry: (songKey: string) => SongCatalogEntry | undefined;
  markNotificationRead: (id: string) => Promise<void>;
  dismissAdminAlert: (id: string) => Promise<void>;
  addAvailability: (slot: AvailabilitySlot) => void;
  removeAvailability: (date: string, startHour: number, endHour: number) => void;
  setAvailabilityBatch: (slots: AvailabilitySlot[]) => void;
  setFreeSlotsForDate: (dateKey: string, hours: Set<number>) => void;
  toggleFreeHour: (dateKey: string, hour: number) => void;
  clearAllAvailability: () => void;
  setClassPreference: (pref: ClassType) => Promise<void>;
  claimSlotHold: (draftId: string, slotLabel: string) => boolean;
  releaseSlotHold: (draftId: string, slotLabel: string) => void;
  clearDraftSlotHolds: (draftId: string) => void;
  getSlotHoldsForDraft: (draftId: string) => Record<string, SlotHoldEntry>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [groups, setGroups] = useState<SongGroup[]>([]);
  const [pendingGroups, setPendingGroups] = useState<SongGroup[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authSessionReady, setAuthSessionReady] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [draftSlotHolds, setDraftSlotHolds] = useState<DraftSlotHoldMap>({});
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [songCatalog, setSongCatalog] = useState<Record<string, SongCatalogEntry>>({});
  const [adminAlerts, setAdminAlerts] = useState<AdminAlert[]>([]);
  const [studentNotifications, setStudentNotifications] = useState<StudentNotification[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [studios, setStudios] = useState<Studio[]>([]);

  const studentRef = useRef<Student | null>(null);
  studentRef.current = student;
  const authUserRef = useRef<User | null>(null);
  authUserRef.current = authUser;
  const availabilityHydratedRef = useRef(false);
  /** Only true after a successful `student_availability_slots` read — blocks accidental DB wipes. */
  const availabilityPersistAllowedRef = useRef(false);

  const isAuthenticated = Boolean(student);

  const applyLoadedData = useCallback((data: KoreroLoadedData) => {
    setGroups(data.groups);
    setBookings(data.bookings);
    setSessions(data.sessions);
    setTimeSlots(data.timeSlots);
    setSongCatalog(data.songCatalog);
    setCreditTransactions(data.creditTransactions);
    setAdminAlerts(data.adminAlerts);
    setStudentNotifications(data.studentNotifications);
    if (!data.availabilityLoadFailed) {
      setAvailability(data.availability);
    }
    setStudios(data.studios);
    availabilityHydratedRef.current = true;
    if (data.student) {
      setStudent(data.student);
      availabilityPersistAllowedRef.current = !data.availabilityLoadFailed;
    } else {
      setStudent(null);
      availabilityPersistAllowedRef.current = false;
    }
    setIsAdmin(isAdminFromAppRole(data.student?.appRole));
  }, []);

  const refresh = useCallback(async (): Promise<KoreroLoadedData> => {
    const supabase = createClient();
    const uid = authUserRef.current?.id ?? null;
    const data = await loadKoreroData(supabase, { userId: uid });
    applyLoadedData(data);
    return data;
  }, [applyLoadedData]);

  const refreshApp = useCallback(async () => {
    await refresh();
  }, [refresh]);

  useEffect(() => {
    const supabase = createClient();
    const apply = (user: User | null) => {
      setAuthUser(user);
      setIsAdmin(false);
      setAuthSessionReady(true);
    };
    void supabase.auth.getSession().then(({ data: { session } }) => {
      apply(session?.user ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authSessionReady) return;
      setDataLoading(true);
      const supabase = createClient();
      const uid = authUser?.id ?? null;
      try {
        const data = await loadKoreroData(supabase, { userId: uid });
        if (cancelled) return;
        applyLoadedData(data);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authSessionReady, authUser?.id, applyLoadedData, authUser]);

  useEffect(() => {
    const t = setInterval(() => {
      setDraftSlotHolds((prev) => pruneExpiredDraftHolds(prev));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!authSessionReady || !availabilityHydratedRef.current || !student?.id) return;
    if (!availabilityPersistAllowedRef.current) return;
    const t = setTimeout(() => {
      void (async () => {
        const supabase = createClient();
        await replaceStudentAvailability(supabase, student.id, availability);
        await recomputeMatchingForCurrentUserEnrollments();
      })();
    }, 450);
    return () => clearTimeout(t);
  }, [availability, authSessionReady, student?.id]);

  const syncStudentFromAuth = useCallback((s: Student) => {
    setStudent({ ...s, credits: s.credits ?? 0 });
    setIsAdmin(isAdminFromAppRole(s.appRole));
  }, []);

  const logoutStudent = useCallback(() => {
    void (async () => {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
    })();
    setStudent(null);
    availabilityHydratedRef.current = false;
    availabilityPersistAllowedRef.current = false;
  }, []);

  const joinGroup = useCallback(
    async (groupId: string, slotLabel?: string) => {
      const st = studentRef.current;
      if (!st) return;
      if (st.appRole === 'instructor') {
        await requestInstructorAssignment(groupId);
        await refresh();
        return;
      }
      const supabase = createClient();
      const prevGroup = groups.find((g) => g.id === groupId);
      const res = await joinGroupInDb(supabase, st, groupId, availability, slotLabel);
      if (!res.ok) return;
      const data = await refresh();
      const nextG = data.groups.find((g) => g.id === groupId);
      let shouldRefreshAgain = false;
      if (prevGroup && nextG) {
        await notifyIfClassBecameFull(nextG, prevGroup);
        shouldRefreshAgain = true;
      }
      // Keep common slots in sync right after enrollment changes.
      if (nextG?.studioSelection?.studioId) {
        await recomputeGroupMatchingState(groupId);
        shouldRefreshAgain = true;
      }
      if (shouldRefreshAgain) {
        await refresh();
      }
    },
    [groups, availability, refresh],
  );

  const createSongGroup = useCallback(
    async (payload: CreateSongGroupPayload): Promise<CreateSongGroupResult> => {
      const st = studentRef.current;
      if (!st) return { ok: false, reason: 'unauthenticated' };
      const supabase = createClient();
      const result = await createSongGroupInDb(
        { supabase, student: st, songCatalog, availability },
        payload,
      );
      if (!result.ok) return result;
      if (payload.draftId) {
        setDraftSlotHolds((prev) => {
          const rest = { ...prev };
          delete rest[payload.draftId!];
          return rest;
        });
      }
      await refresh();
      return result;
    },
    [songCatalog, availability, refresh],
  );

  const purchaseCredits = useCallback(
    async (credits: number, meta?: CreditPurchaseMeta) => {
      if (credits <= 0) return;
      const st = studentRef.current;
      if (!st) return;
      const supabase = createClient();
      const methodLabel = meta?.paymentMethod === 'card' ? 'Card' : 'PayNow';
      const refBit = meta?.paymentRef ? ` · ${meta.paymentRef}` : '';
      await appendCreditTopUp(
        supabase,
        st.id,
        credits,
        `Credits top-up (+${credits} credits) · ${methodLabel}${refBit}`,
        { paymentRef: meta?.paymentRef, kind: 'top_up' },
      );
      await refresh();
    },
    [refresh],
  );

  const purchaseClassPlan = useCallback(
    async (classType: ClassType, meta?: CreditPurchaseMeta) => {
      const credits = creditsForClass(classType);
      if (credits <= 0) return;
      const st = studentRef.current;
      if (!st) return;
      const supabase = createClient();
      const methodLabel = meta?.paymentMethod === 'card' ? 'Card' : 'PayNow';
      const refBit = meta?.paymentRef ? ` · ${meta.paymentRef}` : '';
      await appendCreditTopUp(
        supabase,
        st.id,
        credits,
        `Class plan: ${CLASS_LABELS[classType]} · ${credits} credits · ${methodLabel}${refBit}`,
        { paymentRef: meta?.paymentRef, kind: 'class_plan', classType },
      );
      await refresh();
    },
    [refresh],
  );

  const saveSongCatalogEntry = useCallback(
    async (input: ReviewClassRequestPayload, previousSongKey?: string) => {
      const supabase = createClient();
      await persistSongCatalogEntry(supabase, input, previousSongKey);
      await refresh();
    },
    [refresh],
  );

  const approveClassRequest = useCallback(
    async (input: ReviewClassRequestPayload) => {
      await saveSongCatalogEntry(input);
    },
    [saveSongCatalogEntry],
  );

  const deleteSongCatalogEntry = useCallback(
    async (songKey: string): Promise<{ ok: true } | { ok: false; reason: 'in_use' }> => {
      if (groups.some((g) => groupSongKey(g) === songKey)) {
        return { ok: false, reason: 'in_use' };
      }
      const supabase = createClient();
      await deleteSongCatalogFromDb(supabase, songKey);
      await refresh();
      return { ok: true };
    },
    [groups, refresh],
  );

  const getSongCatalogEntry = useCallback(
    (songKey: string) => songCatalog[songKey],
    [songCatalog],
  );

  const markNotificationRead = useCallback(
    async (id: string) => {
      const supabase = createClient();
      await supabase.from('student_notifications').update({ read: true }).eq('id', id);
      await refresh();
    },
    [refresh],
  );

  const dismissAdminAlert = useCallback(
    async (id: string) => {
      const supabase = createClient();
      await supabase.from('admin_alerts').update({ dismissed_at: new Date().toISOString() }).eq('id', id);
      await refresh();
    },
    [refresh],
  );

  const approveGroup = useCallback((groupId: string) => {
    setPendingGroups((prev) => {
      const group = prev.find((g) => g.id === groupId);
      if (group) {
        setGroups((gPrev) => [...gPrev, { ...group, status: 'forming' }]);
      }
      return prev.filter((g) => g.id !== groupId);
    });
  }, []);

  const rejectGroup = useCallback((groupId: string) => {
    setPendingGroups((prev) => prev.filter((g) => g.id !== groupId));
  }, []);

  const updateSongGroup = useCallback(
    async (groupId: string, patch: Partial<Omit<SongGroup, 'id'>>) => {
      const supabase = createClient();
      const prevGroup = groups.find((g) => g.id === groupId);
      const row: Record<string, unknown> = {};
      if (patch.songTitle !== undefined) row.song_title = patch.songTitle;
      if (patch.artist !== undefined) row.artist = patch.artist;
      if (patch.songTitle !== undefined || patch.artist !== undefined) {
        const t = patch.songTitle ?? prevGroup?.songTitle ?? '';
        const a = patch.artist ?? prevGroup?.artist ?? '';
        row.song_key = makeSongKey(t, a);
      }
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.maxMembers !== undefined) row.max_members = patch.maxMembers;
      if (patch.imageUrl !== undefined) row.image_url = patch.imageUrl;
      if (patch.slotLabels !== undefined) row.slot_labels = patch.slotLabels;
      if (patch.creatorSlotLabel !== undefined) row.creator_slot_label = patch.creatorSlotLabel;
      if (patch.awaitingAdminReview !== undefined) row.awaiting_song_validation = patch.awaitingAdminReview;
      if (patch.itunesTrackId !== undefined) row.itunes_track_id = patch.itunesTrackId;
      if (patch.classTypeAtCreation !== undefined) row.class_type_at_creation = patch.classTypeAtCreation;

      if (Object.keys(row).length > 0) {
        await supabase.from('classes').update(row).eq('id', groupId);
      }

      if (patch.enrollments !== undefined) {
        await supabase.from('class_enrollments').delete().eq('class_id', groupId);
        for (const e of patch.enrollments) {
          await supabase.from('class_enrollments').insert({
            class_id: groupId,
            student_id: e.studentId,
            student_name: e.studentName,
            slot_label: e.slotLabel,
            availability_slots: e.availabilitySlots,
          });
        }
      }

      const data = await refresh();
      const nextG = data.groups.find((g) => g.id === groupId);
      if (prevGroup && nextG) {
        await notifyIfClassBecameFull(nextG, prevGroup);
        await refresh();
      }
    },
    [groups, refresh],
  );

  const deleteSongGroup = useCallback(
    async (groupId: string) => {
      const supabase = createClient();
      await supabase.from('classes').delete().eq('id', groupId);
      await refresh();
    },
    [refresh],
  );

  const removeSongGroupMember = useCallback(
    async (groupId: string, memberId: string) => {
      const supabase = createClient();
      await supabase.from('class_enrollments').delete().eq('class_id', groupId).eq('student_id', memberId);
      await refresh();
    },
    [refresh],
  );

  const selectRole = useCallback(
    (roleName: RoleName) => {
      setRoles((prev) =>
        prev.map((r) => {
          if (r.heldBy === student?.id && r.name !== roleName) {
            return { ...r, available: true, heldBy: undefined, holdExpiry: undefined };
          }
          if (r.name === roleName) {
            return { ...r, available: false, heldBy: student?.id, holdExpiry: Date.now() + 30 * 60 * 1000 };
          }
          return r;
        }),
      );
    },
    [student],
  );

  const createBooking = useCallback(
    async (groupId: string, role: RoleName, timeSlot: TimeSlot): Promise<Booking> => {
      const st = studentRef.current;
      if (!st) {
        throw new Error('Not signed in');
      }
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          student_id: st.id,
          class_id: groupId,
          role,
          time_slot: timeSlot,
          payment_status: 'pending',
          amount: 45,
        })
        .select('*')
        .single();
      if (error || !data) throw error ?? new Error('booking failed');
      await refresh();
      const row = data as {
        id: string;
        student_id: string;
        class_id: string;
        role: RoleName;
        time_slot: TimeSlot;
        payment_status: string;
        amount: number;
        created_at: string;
      };
      return {
        id: row.id,
        studentId: row.student_id,
        groupId: row.class_id,
        role: row.role,
        timeSlot: row.time_slot,
        paymentStatus: row.payment_status as Booking['paymentStatus'],
        amount: row.amount,
        createdAt: row.created_at,
      };
    },
    [refresh],
  );

  const completePayment = useCallback(
    async (bookingId: string) => {
      const supabase = createClient();
      await supabase.from('bookings').update({ payment_status: 'paid' }).eq('id', bookingId);
      await refresh();
    },
    [refresh],
  );

  const logoutAdmin = useCallback(() => {
    void (async () => {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
    })();
    setStudent(null);
    setIsAdmin(false);
  }, []);


  const chooseStudioForGroup = useCallback(async (groupId: string, studioId: string) => {
    const selected = await selectGroupStudio(groupId, studioId);
    if (!selected.ok) return { ok: false };
    const precheck = await precheckGroupStudioOverlap(groupId, studioId);
    await recomputeGroupMatchingState(groupId);
    await refresh();
    return { ok: true, overlapHours: precheck.ok ? precheck.overlapHours : 0 };
  }, [refresh]);

  const addStudio = useCallback(
    async (input: {
      name: string;
      location?: string;
      address?: string;
      timezone?: string;
      capacity?: number;
      notes?: string;
    }) => {
      const result = await addStudioAction(input);
      if (!result.ok) return { ok: false, message: result.message ?? result.error };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  const updateStudio = useCallback(
    async (
      studioId: string,
      patch: {
        name?: string;
        location?: string;
        address?: string;
        timezone?: string;
        capacity?: number;
        notes?: string;
        isActive?: boolean;
      },
    ) => {
      const result = await updateStudioAction(studioId, patch);
      if (!result.ok) return { ok: false, message: result.message ?? result.error };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  const deleteStudio = useCallback(
    async (studioId: string) => {
      const result = await deleteStudioAction(studioId);
      if (!result.ok) return { ok: false, message: result.message ?? result.error };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  const requestInstructorForGroup = useCallback(async (groupId: string) => {
    await requestInstructorAssignment(groupId);
    await refresh();
  }, [refresh]);

  const confirmInstructorForGroup = useCallback(async (groupId: string, assignmentId: string) => {
    await confirmInstructorAssignment(groupId, assignmentId);
    await recomputeGroupMatchingState(groupId);
    await refresh();
  }, [refresh]);

  const recomputeGroupMatching = useCallback(async (groupId: string) => {
    await recomputeGroupMatchingState(groupId);
    await refresh();
  }, [refresh]);

  const submitGroupFinalAcceptance = useCallback(async (groupId: string) => {
    await submitFinalAcceptance(groupId);
    await refresh();
  }, [refresh]);

  const finalizeGroupLesson = useCallback(async (groupId: string) => {
    await finalizeGroupClass(groupId);
    await refresh();
  }, [refresh]);

  const selectLessonSlots = useCallback(async (classId: string, slots: MatchedHourSlot[]) => {
    const res = await selectLessonSlotsAction(classId, slots);
    await refresh();
    if (!res.ok) return { ok: false as const, reason: (res as { reason?: string }).reason };
    return {
      ok: true as const,
      studentsNotified: res.studentsNotified,
      notifyFailed: res.notifyFailed,
    };
  }, [refresh]);

  const confirmPayment = useCallback(async (classId: string) => {
    const res = await confirmStudentPaymentAction(classId);
    await refresh();
    return res;
  }, [refresh]);

  const cancelClassById = useCallback(async (classId: string, reason: string) => {
    const res = await cancelClassAction(classId, reason);
    await refresh();
    return { ok: res.ok };
  }, [refresh]);

  const addAvailability = useCallback((slot: AvailabilitySlot) => {
    setAvailability((prev) => [...prev, slot]);
  }, []);

  const removeAvailability = useCallback((date: string, startHour: number, endHour: number) => {
    setAvailability((prev) => prev.filter((s) => !(s.date === date && s.startHour === startHour && s.endHour === endHour)));
  }, []);

  const setAvailabilityBatch = useCallback((slots: AvailabilitySlot[]) => {
    setAvailability((prev) => {
      const confirmed = prev.filter((s) => s.isConfirmedClass);
      return [...confirmed, ...slots];
    });
  }, []);

  const setFreeSlotsForDate = useCallback((dateKey: string, hours: Set<number>) => {
    const blocks = hoursToBlocks(hours);
    setAvailability((prev) => {
      const confirmed = prev.filter((s) => s.isConfirmedClass);
      const rest = prev.filter((s) => !s.isConfirmedClass && s.date !== dateKey);
      const next: AvailabilitySlot[] = blocks.map((b) => ({
        date: dateKey,
        startHour: b.startHour,
        endHour: b.endHour,
      }));
      return [...confirmed, ...rest, ...next];
    });
  }, []);

  const toggleFreeHour = useCallback((dateKey: string, hour: number) => {
    setAvailability((prev) => {
      const current = slotsToHoursForDate(prev, dateKey);
      const next = new Set(current);
      if (next.has(hour)) next.delete(hour);
      else next.add(hour);
      const blocks = hoursToBlocks(next);
      const confirmed = prev.filter((s) => s.isConfirmedClass);
      const rest = prev.filter((s) => !s.isConfirmedClass && s.date !== dateKey);
      const newSlots: AvailabilitySlot[] = blocks.map((b) => ({
        date: dateKey,
        startHour: b.startHour,
        endHour: b.endHour,
      }));
      return [...confirmed, ...rest, ...newSlots];
    });
  }, []);

  const clearAllAvailability = useCallback(() => {
    setAvailability((prev) => prev.filter((s) => s.isConfirmedClass));
  }, []);

  const setClassPreference = useCallback(
    async (pref: ClassType) => {
      const st = studentRef.current;
      if (!st) return;
      const supabase = createClient();
      await supabase.from('profiles').update({ class_preference: pref }).eq('id', st.id);
      setStudent((prev) => (prev ? { ...prev, classPreference: pref } : prev));
      await refresh();
    },
    [refresh],
  );

  const claimSlotHold = useCallback((draftId: string, slotLabel: string): boolean => {
    if (!student) return false;
    let ok = false;
    setDraftSlotHolds((prev) => {
      const { next, ok: success } = tryClaimSlot(prev, draftId, slotLabel, student);
      ok = success;
      return next;
    });
    return ok;
  }, [student]);

  const releaseSlotHold = useCallback((draftId: string, slotLabel: string) => {
    setDraftSlotHolds((prev) => {
      const draft = { ...(prev[draftId] || {}) };
      delete draft[slotLabel];
      if (Object.keys(draft).length === 0) {
        const rest = { ...prev };
        delete rest[draftId];
        return rest;
      }
      return { ...prev, [draftId]: draft };
    });
  }, []);

  const clearDraftSlotHolds = useCallback((draftId: string) => {
    setDraftSlotHolds((prev) => {
      const rest = { ...prev };
      delete rest[draftId];
      return rest;
    });
  }, []);

  const getSlotHoldsForDraft = useCallback(
    (draftId: string) => {
      const draft = draftSlotHolds[draftId] || {};
      const now = Date.now();
      const out: Record<string, SlotHoldEntry> = {};
      for (const [k, v] of Object.entries(draft)) {
        if (v.expiresAt > now) out[k] = v;
      }
      return out;
    },
    [draftSlotHolds],
  );

  return (
    <AppContext.Provider
      value={{
        student,
        groups,
        bookings,
        sessions,
        timeSlots,
        roles,
        pendingGroups,
        isAdmin,
        authSessionReady,
        authUser,
        isAuthenticated,
        availability,
        creditTransactions,
        songCatalog,
        adminAlerts,
        studentNotifications,
        dataLoading,
        studios,
        refreshApp,
        syncStudentFromAuth,
        logoutStudent,
        joinGroup,
        createSongGroup,
        purchaseCredits,
        purchaseClassPlan,
        approveGroup,
        rejectGroup,
        updateSongGroup,
        deleteSongGroup,
        removeSongGroupMember,
        selectRole,
        createBooking,
        completePayment,
        logoutAdmin,
        chooseStudioForGroup,
        addStudio,
        updateStudio,
        deleteStudio,
        requestInstructorForGroup,
        confirmInstructorForGroup,
        recomputeGroupMatching,
        submitGroupFinalAcceptance,
        finalizeGroupLesson,
        selectLessonSlots,
        confirmPayment,
        cancelClassById,
        approveClassRequest,
        saveSongCatalogEntry,
        deleteSongCatalogEntry,
        getSongCatalogEntry,
        markNotificationRead,
        dismissAdminAlert,
        addAvailability,
        removeAvailability,
        setAvailabilityBatch,
        setFreeSlotsForDate,
        toggleFreeHour,
        clearAllAvailability,
        setClassPreference,
        claimSlotHold,
        releaseSlotHold,
        clearDraftSlotHolds,
        getSlotHoldsForDraft,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
