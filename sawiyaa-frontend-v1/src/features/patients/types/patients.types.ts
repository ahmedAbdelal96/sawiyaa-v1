/**
 * Patients feature contracts for current-patient self profile endpoints.
 */

export interface PatientProfile {
  patientProfileId: string;
  userId: string;
  avatarUrl: string | null;
  avatarDataUrl: string | null;
  displayName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  locale: string | null;
  countryCode: string | null;
  timezone: string | null;
  isOnboardingCompleted: boolean;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientProfileSuccessResponse {
  message: string;
  profile: PatientProfile;
}

export interface UpdatePatientProfileRequest {
  displayName?: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  locale?: "ar" | "en";
  countryCode?: string | null;
  timezone?: string;
  completeOnboarding?: boolean;
}

export interface PatientAvatarResponse {
  patientProfileId: string;
  avatarUrl: string | null;
}

export interface PatientAvatarSuccessResponse {
  message: string;
  avatar: PatientAvatarResponse;
}
