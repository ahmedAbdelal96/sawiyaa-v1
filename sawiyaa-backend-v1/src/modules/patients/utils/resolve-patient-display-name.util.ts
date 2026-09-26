export type PatientNameSource =
  | { displayName?: string | null }
  | null
  | undefined;

export function resolvePatientDisplayName(
  patientProfile: PatientNameSource,
  user: PatientNameSource,
  fallback: string | null = null,
): string | null {
  const profileName = patientProfile?.displayName?.trim();
  if (profileName) return profileName;

  const userName = user?.displayName?.trim();
  return userName || fallback;
}
