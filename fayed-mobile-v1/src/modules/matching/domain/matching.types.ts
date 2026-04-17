export type MatchingUrgencyPreference =
  | "FLEXIBLE"
  | "EARLIEST_AVAILABLE"
  | "AVAILABLE_NOW";

export type PractitionerGenderPreference = "ANY" | "MALE" | "FEMALE";

export type MatchingSessionMode = "VIDEO" | "AUDIO";

export type MatchingCreateInput = {
  primaryConcern?: string;
  preferredSpecialtySlug?: string;
  preferredLanguage?: string;
  preferredPractitionerGender?: PractitionerGenderPreference;
  sessionMode?: MatchingSessionMode;
  urgency?: MatchingUrgencyPreference;
};

export type MatchingRecommendation = {
  practitioner: {
    id: string;
    slug: string;
    displayName: string | null;
    professionalTitle: string | null;
    languages: string[];
    gender: string | null;
    sessionPrice30: string | null;
    sessionPrice60: string | null;
    specialties: string[];
  };
  score: number;
  rank: number;
  rationale: {
    matchedSpecialty: boolean;
    matchedLanguage: boolean;
    matchedGenderPreference: boolean;
    matchedSessionMode: boolean;
    matchedBudget: boolean;
    matchedUrgency: boolean;
    matchedProviderType: boolean;
    matchedInstantBooking: boolean;
    notes: string[];
  };
};

export type MatchingSession = {
  sessionId: string;
  answers: {
    primaryConcern: string | null;
    preferredSpecialtySlug: string | null;
    preferredLanguage: string | null;
    preferredPractitionerGender: PractitionerGenderPreference;
    sessionMode: MatchingSessionMode | null;
    urgency: MatchingUrgencyPreference;
  };
  items: MatchingRecommendation[];
  recommendations?: unknown[];
};
