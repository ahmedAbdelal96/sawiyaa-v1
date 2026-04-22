export enum PractitionerGenderPreference {
  ANY = "ANY",
  MALE = "MALE",
  FEMALE = "FEMALE",
}

export enum MatchingUrgencyPreference {
  FLEXIBLE = "FLEXIBLE",
  EARLIEST_AVAILABLE = "EARLIEST_AVAILABLE",
  AVAILABLE_NOW = "AVAILABLE_NOW",
}

export type SessionMode = "VIDEO" | "AUDIO";
export type PractitionerType =
  | "PSYCHOLOGIST"
  | "PSYCHIATRIST"
  | "NUTRITIONIST"
  | "WEIGHT_LOSS_SPECIALIST"
  | "COUNSELOR"
  | "OTHER";

export interface MatchingBudgetRange {
  min?: number;
  max?: number;
}

export interface CreateMatchingSessionRequest {
  primaryConcern?: string;
  preferredSpecialtySlug?: string;
  preferredLanguage?: string;
  preferredPractitionerGender?: PractitionerGenderPreference;
  sessionMode?: SessionMode;
  urgency?: MatchingUrgencyPreference;
  budgetRange?: MatchingBudgetRange;
  firstTimeInTherapy?: boolean;
  preferredProviderType?: PractitionerType;
  preferInstantBooking?: boolean;
  countryCode?: string;
  timezone?: string;
}

export interface MatchingPractitionerCard {
  id: string;
  slug: string;
  displayName: string | null;
  professionalTitle: string | null;
  languages: string[];
  gender: string | null;
  sessionPrice30: string | null;
  sessionPrice60: string | null;
  specialties: string[];
}

export interface MatchingRationale {
  matchedSpecialty: boolean;
  matchedLanguage: boolean;
  matchedGenderPreference: boolean;
  matchedSessionMode: boolean;
  matchedBudget: boolean;
  matchedUrgency: boolean;
  matchedProviderType: boolean;
  matchedInstantBooking: boolean;
  scoreBreakdown: Record<string, unknown>;
  notes: string[];
}

export interface MatchingRecommendationItem {
  practitioner: MatchingPractitionerCard;
  score: number;
  rank: number;
  rationale: MatchingRationale;
}

export interface MatchingAnswersSummary {
  primaryConcern: string | null;
  preferredSpecialtySlug: string | null;
  preferredLanguage: string | null;
  preferredPractitionerGender: PractitionerGenderPreference;
  sessionMode: SessionMode | null;
  urgency: MatchingUrgencyPreference;
}

export interface MatchingCareRecommendation {
  type: string;
  priority: number;
  reasonCode: string;
  reasonText: string;
  action: {
    type: string;
    targetType: string;
    targetId: string;
  };
  label: string;
}

export interface MatchingSessionData {
  sessionId: string;
  answers: MatchingAnswersSummary;
  items: MatchingRecommendationItem[];
  recommendations?: MatchingCareRecommendation[];
}

export interface MatchingSessionEnvelope {
  success: boolean;
  data: MatchingSessionData;
}
