export interface Student {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
}

export type GroupStatus = 'forming' | 'confirmed' | 'pending';

export interface SongGroup {
  id: string;
  songTitle: string;
  artist: string;
  interestCount: number;
  status: GroupStatus;
  members: string[]; // student IDs
  maxMembers: number;
  imageUrl?: string;
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

export type PaymentMethod = 'stripe' | 'paynow';

export interface ClassSession {
  id: string;
  groupId: string;
  room: 'Room A' | 'Room B';
  day: string;
  time: string;
  confirmed: boolean;
}
