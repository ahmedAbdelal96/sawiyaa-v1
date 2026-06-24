export type Role = 'patient' | 'practitioner' | 'admin' | null;

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  role: Role;
}

export interface PatientProfile {
  id: string;
  userId: string;
  onboardingStatus: string;
  preferredLanguage: string;
}

export interface MatchingSession {
  id: string;
  patientId: string;
  status: 'PENDING' | 'COMPLETED' | 'ABANDONED';
  startedAt: string;
  completedAt?: string;
}

export interface MatchingQuestion {
  id: string;
  textAr: string;
  textEn: string;
  options: MatchingOption[];
}

export interface MatchingOption {
  id: string;
  textAr: string;
  textEn: string;
  weight: number;
}

export interface PractitionerSummary {
  id: string;
  firstName: string;
  lastName: string;
  titleAr: string;
  titleEn: string;
  avatarUrl?: string;
  sessionPrice: number;
  currency: string;
  rating: number;
  reviewCount: number;
  nextAvailableSlot?: string;
}
