export type PatientProfile = {
  patientProfileId: string;
  userId: string;
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
};

export type PatientProfileResponse = {
  profile: PatientProfile;
};
