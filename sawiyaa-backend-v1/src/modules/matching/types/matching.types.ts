import {
  MatchingAnswerKey,
  PractitionerType,
  SessionMode,
} from '@prisma/client';

export enum MatchingUrgencyPreference {
  FLEXIBLE = 'FLEXIBLE',
  EARLIEST_AVAILABLE = 'EARLIEST_AVAILABLE',
  AVAILABLE_NOW = 'AVAILABLE_NOW',
}

export enum PractitionerGenderPreference {
  ANY = 'ANY',
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export type MatchingBudgetRange = {
  min: number | null;
  max: number | null;
};

export type NormalizedMatchingInput = {
  primaryConcern: string | null;
  preferredSpecialtySlug: string | null;
  preferredLanguage: string | null;
  preferredPractitionerGender: PractitionerGenderPreference;
  sessionMode: SessionMode | null;
  urgency: MatchingUrgencyPreference;
  budgetRange: MatchingBudgetRange;
  firstTimeInTherapy: boolean | null;
  preferredProviderType: PractitionerType | null;
  preferInstantBooking: boolean | null;
  countryCode: string | null;
  timezone: string | null;
};

export type MatchingAnswerPayload = {
  key: MatchingAnswerKey;
  valueJson: unknown;
};

export type MatchingScoreSignals = {
  matchedSpecialty: boolean;
  matchedLanguage: boolean;
  matchedGenderPreference: boolean;
  matchedSessionMode: boolean;
  matchedBudget: boolean;
  matchedUrgency: boolean;
  matchedProviderType: boolean;
  matchedInstantBooking: boolean;
  matchedFirstTimePreference: boolean;
};

export type MatchingScoreResult = {
  score: number;
  signals: MatchingScoreSignals;
  breakdown: MatchingScoreBreakdown;
};

export type MatchingScoreBreakdown = {
  specialty: { earned: number; max: number };
  language: { earned: number; max: number };
  budget: { earned: number; max: number };
  urgency: { earned: number; max: number };
  providerType: { earned: number; max: number };
  instantBooking: { earned: number; max: number };
  firstTime: { earned: number; max: number };
  sessionMode: { earned: number; max: number };
  experienceDepth: { earned: number; max: number };
  availabilityReadiness: { earned: number; max: number };
  total: number;
};
