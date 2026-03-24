import type { ClassType } from '@/types';

export type CreateSongGroupPayload = {
  songTitle: string;
  artist: string;
  imageUrl?: string;
  maxMembers: number;
  slotLabels: string[];
  creatorSlotLabel: string;
  classType: ClassType;
  draftId?: string;
  itunesTrackId?: number;
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
  | { ok: false; reason: 'unauthenticated' | 'insufficient_credits' | 'error' };

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
