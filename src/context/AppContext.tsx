import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Student, SongGroup, Booking, ClassSession, TimeSlot, RoleName, Role, AvailabilitySlot } from '@/types';

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

// Mock registered users store
const REGISTERED_USERS: Array<{ email: string; password: string; student: Student }> = [];

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
  createGroup: (songTitle: string, artist: string) => void;
  approveGroup: (groupId: string) => void;
  rejectGroup: (groupId: string) => void;
  selectRole: (role: RoleName) => void;
  createBooking: (groupId: string, role: RoleName, timeSlot: TimeSlot) => Booking;
  completePayment: (bookingId: string) => void;
  loginAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
  assignSession: (groupId: string, room: 'Room A' | 'Room B', day: string, time: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [groups, setGroups] = useState<SongGroup[]>(MOCK_GROUPS);
  const [pendingGroups, setPendingGroups] = useState<SongGroup[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>(MOCK_SESSIONS);
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const registerStudent = useCallback((s: Omit<Student, 'id'> & { password: string }): boolean => {
    // Check if email already exists
    const exists = REGISTERED_USERS.some(u => u.email.toLowerCase() === s.email.toLowerCase());
    if (exists) return false;

    const newStudent: Student = {
      id: crypto.randomUUID(),
      name: s.name,
      whatsapp: s.whatsapp,
      email: s.email,
    };

    REGISTERED_USERS.push({ email: s.email.toLowerCase(), password: s.password, student: newStudent });
    setStudent(newStudent);
    setIsAuthenticated(true);
    return true;
  }, []);

  const loginStudent = useCallback((email: string, password: string): boolean => {
    const user = REGISTERED_USERS.find(
      u => u.email === email.toLowerCase() && u.password === password
    );
    if (user) {
      setStudent(user.student);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logoutStudent = useCallback(() => {
    setStudent(null);
    setIsAuthenticated(false);
  }, []);

  const joinGroup = useCallback((groupId: string) => {
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, interestCount: g.interestCount + 1, members: [...g.members, student?.id || ''] } : g
    ));
  }, [student]);

  const createGroup = useCallback((songTitle: string, artist: string) => {
    const newGroup: SongGroup = {
      id: crypto.randomUUID(),
      songTitle,
      artist,
      interestCount: 1,
      status: 'pending',
      members: [student?.id || ''],
      maxMembers: 6,
    };
    setPendingGroups(prev => [...prev, newGroup]);
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
    setRoles(prev => prev.map(r =>
      r.name === roleName ? { ...r, available: false, heldBy: student?.id, holdExpiry: Date.now() + 30 * 60 * 1000 } : r
    ));
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

  return (
    <AppContext.Provider value={{
      student, groups, bookings, sessions, timeSlots: MOCK_TIME_SLOTS, roles, pendingGroups, isAdmin, isAuthenticated,
      registerStudent, loginStudent, logoutStudent, joinGroup, createGroup, approveGroup, rejectGroup, selectRole,
      createBooking, completePayment, loginAdmin, logoutAdmin, assignSession,
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
