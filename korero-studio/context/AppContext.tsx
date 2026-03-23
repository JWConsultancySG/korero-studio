'use client';

/* AppContext - centralized state */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
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
  GroupMemberEnrollment,
  CreditTransaction,
  SongCatalogEntry,
  StudioRoom,
  AdminAlert,
  StudentNotification,
} from '@/types';
import { creditsForClass, sgdForCredits, CLASS_LABELS } from '@/lib/credits';
import type { User } from '@supabase/supabase-js';
import { isAdminUser } from '@/lib/admin-auth';
import { makeSongKey } from '@/lib/song-key';
import { hoursToBlocks, slotsToHoursForDate } from '@/lib/availability-blocks';

export type CreateSongGroupPayload = {
  songTitle: string;
  artist: string;
  imageUrl?: string;
  maxMembers: number;
  slotLabels: string[];
  creatorSlotLabel: string;
  classType: ClassType;
  /** Clears temporary slot holds for this draft after successful creation. */
  draftId?: string;
  itunesTrackId?: number;
  /** Admin / staff creating a group — skips pending song validation. */
  skipSongValidation?: boolean;
};

export type CreditPurchaseMeta = {
  paymentMethod: 'paynow' | 'card';
  paymentRef?: string;
};

export type CreateSongGroupResult =
  | {
      ok: true;
      groupId: string;
      creditsCharged: number;
      topUpCredits: 0;
      topUpSgd: 0;
      awaitingSongValidation?: boolean;
    }
  | { ok: false; reason: 'unauthenticated' | 'insufficient_credits' };

export type ValidateSongPayload = {
  songKey: string;
  songTitle: string;
  artist: string;
  imageUrl?: string;
  itunesTrackId?: number;
  formationSize: number;
  roleNames: string[];
  difficulty: string;
  classTypeOptions: ClassType[];
  teacherNotes: string;
};

const MOCK_GROUPS: SongGroup[] = [
  { id: '1', songTitle: 'Super Shy', artist: 'NewJeans', interestCount: 3, status: 'forming', members: [], maxMembers: 5 },
  { id: '3', songTitle: 'Magnetic', artist: 'ILLIT', interestCount: 4, status: 'forming', members: [], maxMembers: 5 },
  { id: '5', songTitle: 'Supernova', artist: 'aespa', interestCount: 4, status: 'confirmed', members: [], maxMembers: 4 },
  { id: '6', songTitle: 'RUDE!', artist: 'Hearts2Hearts', interestCount: 5, status: 'forming', members: [], maxMembers: 8 },
  { id: '7', songTitle: 'Perfect Night', artist: 'LE SSERAFIM', interestCount: 3, status: 'forming', members: [], maxMembers: 5 },
  { id: '8', songTitle: 'No Doubt', artist: 'ENHYPEN', interestCount: 6, status: 'forming', members: [], maxMembers: 7 },
  { id: '9', songTitle: 'BLACKHOLE', artist: 'IVE', interestCount: 4, status: 'forming', members: [], maxMembers: 6 },
  { id: '10', songTitle: 'This Is For', artist: 'TWICE', interestCount: 7, status: 'forming', members: [], maxMembers: 9 },
];

const MOCK_TIME_SLOTS: TimeSlot[] = [
  { id: 't1', day: 'Monday', time: '6:00 PM', available: true },
  { id: 't2', day: 'Monday', time: '7:30 PM', available: true },
  { id: 't3', day: 'Tuesday', time: '6:00 PM', available: true },
  { id: 't4', day: 'Wednesday', time: '7:00 PM', available: true },
  { id: 't5', day: 'Thursday', time: '6:00 PM', available: false },
  { id: 't6', day: 'Friday', time: '7:00 PM', available: true },
  { id: 't7', day: 'Saturday', time: '10:00 AM', available: true },
  { id: 't8', day: 'Saturday', time: '2:00 PM', available: true },
  { id: 't9', day: 'Sunday', time: '11:00 AM', available: true },
];

const DEFAULT_ROLES: Role[] = [
  { name: 'Main Vocal', available: true },
  { name: 'Sub Vocal', available: true },
  { name: 'Main Dancer', available: true },
  { name: 'Sub Dancer', available: true },
  { name: 'Rapper', available: true },
  { name: 'Center', available: true },
];

const MOCK_SESSIONS: ClassSession[] = [
  { id: 's1', groupId: '5', room: 'Farrer Park', day: 'Wednesday', time: '7:00 PM', confirmed: true },
];

function seedCatalogFromMockGroups(groups: SongGroup[]): Record<string, SongCatalogEntry> {
  const out: Record<string, SongCatalogEntry> = {};
  for (const g of groups) {
    const songKey = makeSongKey(g.songTitle, g.artist);
    out[songKey] = {
      songKey,
      songTitle: g.songTitle,
      artist: g.artist,
      imageUrl: g.imageUrl,
      validated: true,
      formationSize: g.maxMembers,
      roleNames: Array.from({ length: g.maxMembers }, (_, i) => `Member ${i + 1}`),
      difficulty: 'Mixed',
      classTypeOptions: ['no-filming', 'half-song', 'full-song'],
      teacherNotes: '',
      validatedAt: new Date().toISOString(),
    };
  }
  return out;
}

type RegisteredUserRecord = { email: string; password: string; student: Student };

const STORAGE_KEYS = {
  users: 'korero.registeredUsers',
  student: 'korero.studentSession',
} as const;

const readStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const removeStorage = (key: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
};

const STORAGE_KEYS_HOLDS = 'korero.draftSlotHolds' as const;

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

const normalizeEmail = (email: string) => email.trim().toLowerCase();

interface AppState {
  student: Student | null;
  groups: SongGroup[];
  bookings: Booking[];
  sessions: ClassSession[];
  timeSlots: TimeSlot[];
  roles: Role[];
  pendingGroups: SongGroup[];
  isAdmin: boolean;
  /** True after first Supabase session resolution (avoids UI flash). */
  authSessionReady: boolean;
  /** Current Supabase Auth user, if any. */
  authUser: User | null;
  isAuthenticated: boolean;
  availability: AvailabilitySlot[];
  creditTransactions: CreditTransaction[];
  /** Validated song library (key = makeSongKey). */
  songCatalog: Record<string, SongCatalogEntry>;
  adminAlerts: AdminAlert[];
  studentNotifications: StudentNotification[];
}

interface AppContextType extends AppState {
  registerStudent: (s: Omit<Student, 'id'> & { password: string }) => boolean;
  /** Sets the signed-in student when registration/login is handled by Supabase Auth. */
  syncStudentFromAuth: (student: Student) => void;
  loginStudent: (email: string, password: string) => boolean;
  logoutStudent: () => void;
  joinGroup: (groupId: string) => void;
  /** Create a song group with slots, credits, and creator enrollment (replaces legacy createGroup). */
  createSongGroup: (payload: CreateSongGroupPayload) => CreateSongGroupResult;
  /** Add credits only after payment UI confirms (see CreditsPaymentDialog). */
  purchaseCredits: (credits: number, meta?: CreditPurchaseMeta) => void;
  /** Buy credits bundled as a class-format plan (logged as class_plan). */
  purchaseClassPlan: (classType: ClassType, meta?: CreditPurchaseMeta) => void;
  approveGroup: (groupId: string) => void;
  rejectGroup: (groupId: string) => void;
  selectRole: (role: RoleName) => void;
  createBooking: (groupId: string, role: RoleName, timeSlot: TimeSlot) => Booking;
  completePayment: (bookingId: string) => void;
  /** Sign out Supabase session (same as logging out the shared admin or student account). */
  logoutAdmin: () => void;
  assignSession: (groupId: string, room: StudioRoom, day: string, time: string) => void;
  removeSession: (sessionId: string) => void;
  validateSong: (payload: ValidateSongPayload) => void;
  getSongCatalogEntry: (songKey: string) => SongCatalogEntry | undefined;
  markNotificationRead: (id: string) => void;
  dismissAdminAlert: (id: string) => void;
  addAvailability: (slot: AvailabilitySlot) => void;
  removeAvailability: (date: string, startHour: number, endHour: number) => void;
  setAvailabilityBatch: (slots: AvailabilitySlot[]) => void;
  /** Replace all free (non-class) slots for one date from an hour set (8–22). */
  setFreeSlotsForDate: (dateKey: string, hours: Set<number>) => void;
  /** Toggle one hour for a date (functional update — safe for drag). */
  toggleFreeHour: (dateKey: string, hour: number) => void;
  clearAllAvailability: () => void;
  setClassPreference: (pref: ClassType) => void;
  /** Temporary slot holds while creating a group (30 min, shared across tabs). */
  claimSlotHold: (draftId: string, slotLabel: string) => boolean;
  releaseSlotHold: (draftId: string, slotLabel: string) => void;
  clearDraftSlotHolds: (draftId: string) => void;
  getSlotHoldsForDraft: (draftId: string) => Record<string, SlotHoldEntry>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUserRecord[]>(() =>
    readStorage<RegisteredUserRecord[]>(STORAGE_KEYS.users, [])
  );
  const [student, setStudent] = useState<Student | null>(() =>
    readStorage<Student | null>(STORAGE_KEYS.student, null)
  );
  const studentRef = useRef<Student | null>(student);
  studentRef.current = student;
  const [groups, setGroups] = useState<SongGroup[]>(MOCK_GROUPS);
  const [pendingGroups, setPendingGroups] = useState<SongGroup[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>(MOCK_SESSIONS);
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authSessionReady, setAuthSessionReady] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [draftSlotHolds, setDraftSlotHolds] = useState<DraftSlotHoldMap>(() =>
    readStorage<DraftSlotHoldMap>(STORAGE_KEYS_HOLDS, {}),
  );
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>(() =>
    readStorage<CreditTransaction[]>('korero.creditTransactions', []),
  );
  const [songCatalog, setSongCatalog] = useState<Record<string, SongCatalogEntry>>(() => {
    const stored = readStorage<Record<string, SongCatalogEntry>>('korero.songCatalog', {});
    if (Object.keys(stored).length > 0) return stored;
    return seedCatalogFromMockGroups(MOCK_GROUPS);
  });
  const [adminAlerts, setAdminAlerts] = useState<AdminAlert[]>(() =>
    readStorage<AdminAlert[]>('korero.adminAlerts', []),
  );
  const [studentNotifications, setStudentNotifications] = useState<StudentNotification[]>(() =>
    readStorage<StudentNotification[]>('korero.studentNotifications', []),
  );

  const isAuthenticated = Boolean(student);

  useEffect(() => {
    writeStorage(STORAGE_KEYS_HOLDS, draftSlotHolds);
  }, [draftSlotHolds]);

  useEffect(() => {
    writeStorage('korero.creditTransactions', creditTransactions);
  }, [creditTransactions]);

  useEffect(() => {
    writeStorage('korero.songCatalog', songCatalog);
  }, [songCatalog]);

  useEffect(() => {
    writeStorage('korero.adminAlerts', adminAlerts);
  }, [adminAlerts]);

  useEffect(() => {
    writeStorage('korero.studentNotifications', studentNotifications);
  }, [studentNotifications]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS_HOLDS && e.newValue) {
        try {
          setDraftSlotHolds(JSON.parse(e.newValue) as DraftSlotHoldMap);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setDraftSlotHolds(prev => pruneExpiredDraftHolds(prev));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.users, registeredUsers);
  }, [registeredUsers]);

  useEffect(() => {
    if (student) {
      writeStorage(STORAGE_KEYS.student, student);
      return;
    }
    removeStorage(STORAGE_KEYS.student);
  }, [student]);

  useEffect(() => {
    const supabase = createClient();
    const apply = (user: User | null) => {
      setAuthUser(user);
      setIsAdmin(isAdminUser(user));
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

  const registerStudent = useCallback((s: Omit<Student, 'id'> & { password: string }): boolean => {
    const email = normalizeEmail(s.email);
    const exists = registeredUsers.some(u => u.email === email);
    if (exists) return false;

    const newStudent: Student = {
      id: crypto.randomUUID(),
      name: s.name,
      whatsapp: s.whatsapp,
      email,
      credits: 0,
    };

    setRegisteredUsers(prev => [...prev, { email, password: s.password, student: newStudent }]);
    setStudent(newStudent);
    return true;
  }, [registeredUsers]);

  const syncStudentFromAuth = useCallback((s: Student) => {
    setStudent({ ...s, credits: s.credits ?? 0 });
  }, []);

  const loginStudent = useCallback((email: string, password: string): boolean => {
    const user = registeredUsers.find(
      u => u.email === normalizeEmail(email) && u.password === password
    );
    if (user) {
      setStudent({ ...user.student, credits: user.student.credits ?? 0 });
      return true;
    }
    return false;
  }, [registeredUsers]);

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
  }, []);

  const joinGroup = useCallback((groupId: string) => {
    const sid = student?.id || '';
    const snap = availability.filter(a => !a.isConfirmedClass).map(s => ({ ...s }));
    const enrollment: GroupMemberEnrollment = {
      studentId: sid,
      studentName: student?.name || 'Member',
      slotLabel: 'Member',
      availabilitySlots: snap,
    };
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        interestCount: g.interestCount + 1,
        members: [...g.members, sid],
        enrollments: [...(g.enrollments || []), enrollment],
      };
    }));
  }, [student, availability]);

  const purchaseCredits = useCallback((credits: number, meta?: CreditPurchaseMeta) => {
    if (credits <= 0) return;
    const methodLabel = meta?.paymentMethod === 'card' ? 'Card' : 'PayNow';
    const refBit = meta?.paymentRef ? ` · ${meta.paymentRef}` : '';
    setStudent(prev => {
      if (!prev) return prev;
      const next: Student = { ...prev, credits: (prev.credits ?? 0) + credits };
      setRegisteredUsers(users => users.map(u =>
        u.student.id === prev.id ? { ...u, student: next } : u
      ));
      return next;
    });
    const tx: CreditTransaction = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      kind: 'top_up',
      creditsDelta: credits,
      sgdDelta: sgdForCredits(credits),
      label: `Credits top-up (+${credits} credits) · ${methodLabel}${refBit}`,
      paymentRef: meta?.paymentRef,
    };
    setCreditTransactions(txs => [...txs, tx]);
  }, []);

  const purchaseClassPlan = useCallback((classType: ClassType, meta?: CreditPurchaseMeta) => {
    const credits = creditsForClass(classType);
    if (credits <= 0) return;
    const methodLabel = meta?.paymentMethod === 'card' ? 'Card' : 'PayNow';
    const refBit = meta?.paymentRef ? ` · ${meta.paymentRef}` : '';
    setStudent(prev => {
      if (!prev) return prev;
      const next: Student = { ...prev, credits: (prev.credits ?? 0) + credits };
      setRegisteredUsers(users => users.map(u =>
        u.student.id === prev.id ? { ...u, student: next } : u
      ));
      return next;
    });
    const tx: CreditTransaction = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      kind: 'class_plan',
      creditsDelta: credits,
      sgdDelta: sgdForCredits(credits),
      label: `Class plan: ${CLASS_LABELS[classType]} · ${credits} credits · ${methodLabel}${refBit}`,
      classType,
      paymentRef: meta?.paymentRef,
    };
    setCreditTransactions(txs => [...txs, tx]);
  }, []);

  const createSongGroup = useCallback((payload: CreateSongGroupPayload): CreateSongGroupResult => {
    const st = studentRef.current;
    if (!st) return { ok: false, reason: 'unauthenticated' };
    const songKey = makeSongKey(payload.songTitle, payload.artist);
    const catalogEntry = songCatalog[songKey];
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
    }

    const awaitingSongValidation = !payload.skipSongValidation && !isValidated;

    const cost = creditsForClass(payload.classType);
    const balance = st.credits ?? 0;
    if (balance < cost) {
      return { ok: false, reason: 'insufficient_credits' };
    }

    const snapshot = availability.filter(a => !a.isConfirmedClass);
    const enrollment: GroupMemberEnrollment = {
      studentId: st.id,
      studentName: st.name,
      slotLabel: creatorSlot,
      availabilitySlots: snapshot.map(s => ({ ...s })),
    };

    const newGroup: SongGroup = {
      id: crypto.randomUUID(),
      songTitle: payload.songTitle,
      artist: payload.artist,
      interestCount: 1,
      status: 'forming',
      members: [st.id],
      maxMembers,
      imageUrl: payload.imageUrl,
      slotLabels,
      creatorId: st.id,
      creatorSlotLabel: creatorSlot,
      enrollments: [enrollment],
      creditsCharged: cost,
      classTypeAtCreation: payload.classType,
      songKey,
      itunesTrackId: payload.itunesTrackId,
      awaitingSongValidation,
    };

    setGroups(prev => [...prev, newGroup]);

    if (awaitingSongValidation) {
      const alert: AdminAlert = {
        id: crypto.randomUUID(),
        kind: 'song_validation',
        message: `New song group created — ${payload.songTitle} / ${payload.artist}. Validate to activate.`,
        groupId: newGroup.id,
        songKey,
        createdAt: new Date().toISOString(),
      };
      setAdminAlerts(prev => [...prev, alert]);
    }

    if (payload.draftId) {
      setDraftSlotHolds(prev => {
        const { [payload.draftId!]: _, ...rest } = prev;
        return rest;
      });
    }

    const txLabel = `New song group: "${payload.songTitle}" (${cost} credits)`;
    setCreditTransactions(txs => [
      ...txs,
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        kind: 'group_create',
        creditsDelta: -cost,
        label: txLabel,
        groupId: newGroup.id,
        classType: payload.classType,
      },
    ]);

    setStudent(prev => {
      if (!prev) return prev;
      const next: Student = { ...prev, credits: balance - cost };
      setRegisteredUsers(users => users.map(u =>
        u.student.id === prev.id ? { ...u, student: next } : u
      ));
      return next;
    });

    return {
      ok: true,
      groupId: newGroup.id,
      creditsCharged: cost,
      topUpCredits: 0,
      topUpSgd: 0,
      awaitingSongValidation,
    };
  }, [availability, songCatalog]);

  const validateSong = useCallback((input: ValidateSongPayload) => {
    const roles = input.roleNames
      .map((r) => r.trim())
      .filter(Boolean)
      .slice(0, input.formationSize);
    const entry: SongCatalogEntry = {
      songKey: input.songKey,
      songTitle: input.songTitle,
      artist: input.artist,
      imageUrl: input.imageUrl,
      itunesTrackId: input.itunesTrackId,
      validated: true,
      formationSize: roles.length,
      roleNames: roles,
      difficulty: input.difficulty,
      classTypeOptions: input.classTypeOptions,
      teacherNotes: input.teacherNotes,
      validatedAt: new Date().toISOString(),
    };
    setSongCatalog((prev) => ({ ...prev, [input.songKey]: entry }));

    setGroups((prev) => {
      const creatorSeen = new Set<string>();
      const creatorIds: string[] = [];
      const next = prev.map((g) => {
        if (g.songKey !== input.songKey || !g.awaitingSongValidation) return g;
        if (g.creatorId && !creatorSeen.has(g.creatorId)) {
          creatorSeen.add(g.creatorId);
          creatorIds.push(g.creatorId);
        }
        const slotList = roles.length > 0 ? roles : g.slotLabels ?? [];
        const max = Math.max(1, slotList.length);
        let creatorSlot = g.creatorSlotLabel ?? '';
        if (!slotList.includes(creatorSlot)) {
          creatorSlot = slotList[0] ?? creatorSlot;
        }
        return {
          ...g,
          awaitingSongValidation: false,
          maxMembers: max,
          slotLabels: slotList,
          creatorSlotLabel: creatorSlot,
          enrollments: g.enrollments?.map((e) => {
            if (e.studentId !== g.creatorId) return e;
            const sl = slotList.includes(e.slotLabel) ? e.slotLabel : slotList[0];
            return { ...e, slotLabel: sl ?? e.slotLabel };
          }),
        };
      });
      if (creatorIds.length > 0) {
        const msg = `Your group for "${input.songTitle}" is now live!`;
        setStudentNotifications((sn) => [
          ...sn,
          ...creatorIds.map((studentId) => ({
            id: crypto.randomUUID(),
            studentId,
            message: msg,
            read: false,
            createdAt: new Date().toISOString(),
          })),
        ]);
      }
      return next;
    });

    setAdminAlerts((prev) => prev.filter((a) => a.songKey !== input.songKey));
  }, []);

  const getSongCatalogEntry = useCallback(
    (songKey: string) => songCatalog[songKey],
    [songCatalog],
  );

  const markNotificationRead = useCallback((id: string) => {
    setStudentNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const dismissAdminAlert = useCallback((id: string) => {
    setAdminAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const approveGroup = useCallback((groupId: string) => {
    setPendingGroups(prev => {
      const group = prev.find(g => g.id === groupId);
      if (group) {
        setGroups(gPrev => [...gPrev, { ...group, status: 'forming' }]);
      }
      return prev.filter(g => g.id !== groupId);
    });
  }, []);

  const rejectGroup = useCallback((groupId: string) => {
    setPendingGroups(prev => prev.filter(g => g.id !== groupId));
  }, []);

  const selectRole = useCallback((roleName: RoleName) => {
    setRoles(prev => prev.map(r => {
      // Release any role previously held by this student
      if (r.heldBy === student?.id && r.name !== roleName) {
        return { ...r, available: true, heldBy: undefined, holdExpiry: undefined };
      }
      // Hold the new role
      if (r.name === roleName) {
        return { ...r, available: false, heldBy: student?.id, holdExpiry: Date.now() + 30 * 60 * 1000 };
      }
      return r;
    }));
  }, [student]);

  const createBooking = useCallback((groupId: string, role: RoleName, timeSlot: TimeSlot): Booking => {
    const booking: Booking = {
      id: crypto.randomUUID(),
      studentId: student?.id || '',
      groupId,
      role,
      timeSlot,
      paymentStatus: 'pending',
      amount: 45,
      createdAt: new Date().toISOString(),
    };
    setBookings(prev => [...prev, booking]);
    return booking;
  }, [student]);

  const completePayment = useCallback((bookingId: string) => {
    setBookings(prev => prev.map(b =>
      b.id === bookingId ? { ...b, paymentStatus: 'paid' } : b
    ));
  }, []);

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

  const assignSession = useCallback((groupId: string, room: StudioRoom, day: string, time: string) => {
    setSessions(prev => [...prev, {
      id: crypto.randomUUID(),
      groupId,
      room,
      day,
      time,
      confirmed: true,
    }]);
  }, []);

  const removeSession = useCallback((sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }, []);

  const addAvailability = useCallback((slot: AvailabilitySlot) => {
    setAvailability(prev => [...prev, slot]);
  }, []);

  const removeAvailability = useCallback((date: string, startHour: number, endHour: number) => {
    setAvailability(prev => prev.filter(s => !(s.date === date && s.startHour === startHour && s.endHour === endHour)));
  }, []);

  const setAvailabilityBatch = useCallback((slots: AvailabilitySlot[]) => {
    setAvailability(prev => {
      const confirmed = prev.filter(s => s.isConfirmedClass);
      return [...confirmed, ...slots];
    });
  }, []);

  const setFreeSlotsForDate = useCallback((dateKey: string, hours: Set<number>) => {
    const blocks = hoursToBlocks(hours);
    setAvailability(prev => {
      const confirmed = prev.filter(s => s.isConfirmedClass);
      const rest = prev.filter(s => !s.isConfirmedClass && s.date !== dateKey);
      const next: AvailabilitySlot[] = blocks.map(b => ({ date: dateKey, startHour: b.startHour, endHour: b.endHour }));
      return [...confirmed, ...rest, ...next];
    });
  }, []);

  const toggleFreeHour = useCallback((dateKey: string, hour: number) => {
    setAvailability(prev => {
      const current = slotsToHoursForDate(prev, dateKey);
      const next = new Set(current);
      if (next.has(hour)) next.delete(hour);
      else next.add(hour);
      const blocks = hoursToBlocks(next);
      const confirmed = prev.filter(s => s.isConfirmedClass);
      const rest = prev.filter(s => !s.isConfirmedClass && s.date !== dateKey);
      const newSlots: AvailabilitySlot[] = blocks.map(b => ({ date: dateKey, startHour: b.startHour, endHour: b.endHour }));
      return [...confirmed, ...rest, ...newSlots];
    });
  }, []);

  const clearAllAvailability = useCallback(() => {
    setAvailability(prev => prev.filter(s => s.isConfirmedClass));
  }, []);

  const setClassPreference = useCallback((pref: ClassType) => {
    setStudent(prev => {
      if (!prev) return prev;
      const updated = { ...prev, classPreference: pref };
      // Also update in registeredUsers
      setRegisteredUsers(users => users.map(u =>
        u.student.id === prev.id ? { ...u, student: updated } : u
      ));
      return updated;
    });
  }, []);

  const claimSlotHold = useCallback((draftId: string, slotLabel: string): boolean => {
    if (!student) return false;
    let ok = false;
    setDraftSlotHolds(prev => {
      const { next, ok: success } = tryClaimSlot(prev, draftId, slotLabel, student);
      ok = success;
      return next;
    });
    return ok;
  }, [student]);

  const releaseSlotHold = useCallback((draftId: string, slotLabel: string) => {
    setDraftSlotHolds(prev => {
      const draft = { ...(prev[draftId] || {}) };
      delete draft[slotLabel];
      if (Object.keys(draft).length === 0) {
        const { [draftId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [draftId]: draft };
    });
  }, []);

  const clearDraftSlotHolds = useCallback((draftId: string) => {
    setDraftSlotHolds(prev => {
      const { [draftId]: _, ...rest } = prev;
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
    <AppContext.Provider value={{
      student, groups, bookings, sessions, timeSlots: MOCK_TIME_SLOTS, roles, pendingGroups, isAdmin, authSessionReady, authUser, isAuthenticated, availability,
      creditTransactions, songCatalog, adminAlerts, studentNotifications,
      registerStudent, syncStudentFromAuth, loginStudent, logoutStudent, joinGroup, createSongGroup, purchaseCredits, purchaseClassPlan, approveGroup, rejectGroup, selectRole,
      createBooking, completePayment, logoutAdmin, assignSession, removeSession, validateSong, getSongCatalogEntry, markNotificationRead, dismissAdminAlert,
      addAvailability, removeAvailability,
      setAvailabilityBatch, setFreeSlotsForDate, toggleFreeHour, clearAllAvailability, setClassPreference,
      claimSlotHold, releaseSlotHold, clearDraftSlotHolds, getSlotHoldsForDraft,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
