/* AppContext - centralized state */
import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Student, SongGroup, Booking, ClassSession, TimeSlot, RoleName, Role, AvailabilitySlot, ClassType } from '@/types';

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
  { id: 's1', groupId: '5', room: 'Room A', day: 'Wednesday', time: '7:00 PM', confirmed: true },
];

type RegisteredUserRecord = { email: string; password: string; student: Student };

const STORAGE_KEYS = {
  users: 'korero.registeredUsers',
  student: 'korero.studentSession',
  admin: 'korero.adminSession',
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
  isAuthenticated: boolean;
  availability: AvailabilitySlot[];
}

interface AppContextType extends AppState {
  registerStudent: (s: Omit<Student, 'id'> & { password: string }) => boolean;
  loginStudent: (email: string, password: string) => boolean;
  logoutStudent: () => void;
  joinGroup: (groupId: string) => void;
  createGroup: (songTitle: string, artist: string, imageUrl?: string) => void;
  approveGroup: (groupId: string) => void;
  rejectGroup: (groupId: string) => void;
  selectRole: (role: RoleName) => void;
  createBooking: (groupId: string, role: RoleName, timeSlot: TimeSlot) => Booking;
  completePayment: (bookingId: string) => void;
  loginAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
  assignSession: (groupId: string, room: 'Room A' | 'Room B', day: string, time: string) => void;
  addAvailability: (slot: AvailabilitySlot) => void;
  removeAvailability: (date: string, startHour: number, endHour: number) => void;
  setAvailabilityBatch: (slots: AvailabilitySlot[]) => void;
  clearAllAvailability: () => void;
  setClassPreference: (pref: ClassType) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUserRecord[]>(() =>
    readStorage<RegisteredUserRecord[]>(STORAGE_KEYS.users, [])
  );
  const [student, setStudent] = useState<Student | null>(() =>
    readStorage<Student | null>(STORAGE_KEYS.student, null)
  );
  const [groups, setGroups] = useState<SongGroup[]>(MOCK_GROUPS);
  const [pendingGroups, setPendingGroups] = useState<SongGroup[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>(MOCK_SESSIONS);
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => readStorage<boolean>(STORAGE_KEYS.admin, false));
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);

  const isAuthenticated = Boolean(student);

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
    writeStorage(STORAGE_KEYS.admin, isAdmin);
  }, [isAdmin]);

  const registerStudent = useCallback((s: Omit<Student, 'id'> & { password: string }): boolean => {
    const email = normalizeEmail(s.email);
    const exists = registeredUsers.some(u => u.email === email);
    if (exists) return false;

    const newStudent: Student = {
      id: crypto.randomUUID(),
      name: s.name,
      whatsapp: s.whatsapp,
      email,
    };

    setRegisteredUsers(prev => [...prev, { email, password: s.password, student: newStudent }]);
    setStudent(newStudent);
    return true;
  }, [registeredUsers]);

  const loginStudent = useCallback((email: string, password: string): boolean => {
    const user = registeredUsers.find(
      u => u.email === normalizeEmail(email) && u.password === password
    );
    if (user) {
      setStudent(user.student);
      return true;
    }
    return false;
  }, [registeredUsers]);

  const logoutStudent = useCallback(() => {
    setStudent(null);
  }, []);

  const joinGroup = useCallback((groupId: string) => {
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, interestCount: g.interestCount + 1, members: [...g.members, student?.id || ''] } : g
    ));
  }, [student]);

  const createGroup = useCallback((songTitle: string, artist: string, imageUrl?: string) => {
    const newGroup: SongGroup = {
      id: crypto.randomUUID(),
      songTitle,
      artist,
      interestCount: 1,
      status: 'forming',
      members: [student?.id || ''],
      maxMembers: 6,
      imageUrl,
    };
    setGroups(prev => [...prev, newGroup]);
  }, [student]);

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

  const loginAdmin = useCallback((password: string): boolean => {
    if (password === 'korero2024') {
      setIsAdmin(true);
      return true;
    }
    return false;
  }, []);

  const logoutAdmin = useCallback(() => setIsAdmin(false), []);

  const assignSession = useCallback((groupId: string, room: 'Room A' | 'Room B', day: string, time: string) => {
    setSessions(prev => [...prev, {
      id: crypto.randomUUID(),
      groupId,
      room,
      day,
      time,
      confirmed: true,
    }]);
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

  const clearAllAvailability = useCallback(() => {
    setAvailability(prev => prev.filter(s => s.isConfirmedClass));
  }, []);

  return (
    <AppContext.Provider value={{
      student, groups, bookings, sessions, timeSlots: MOCK_TIME_SLOTS, roles, pendingGroups, isAdmin, isAuthenticated, availability,
      registerStudent, loginStudent, logoutStudent, joinGroup, createGroup, approveGroup, rejectGroup, selectRole,
      createBooking, completePayment, loginAdmin, logoutAdmin, assignSession, addAvailability, removeAvailability,
      setAvailabilityBatch, clearAllAvailability,
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
