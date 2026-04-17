/**
 * Patients Module read/write types stay centered on Phase 1 profile concerns only.
 * They intentionally avoid auth/session, booking, or medical-record responsibilities.
 */
export interface PatientProfileViewModel {
  patientProfileId: string;
  userId: string;
  avatarUrl: string | null;
  avatarDataUrl: string | null;
  displayName: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  locale: string | null;
  countryCode: string | null;
  timezone: string | null;
  isOnboardingCompleted: boolean;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdatePatientProfileInput {
  displayName?: string | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  locale?: string | null;
  countryCode?: string | null;
  timezone?: string | null;
  completeOnboarding?: boolean;
}
