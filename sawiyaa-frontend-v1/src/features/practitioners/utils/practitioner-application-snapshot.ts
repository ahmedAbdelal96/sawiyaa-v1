type SnapshotRecord = Record<string, unknown>;

function asRecord(value: unknown): SnapshotRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as SnapshotRecord
    : {};
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function normalizePractitionerApplicationSnapshot(value: unknown) {
  const snapshot = asRecord(value);
  const applicant = asRecord(snapshot.applicant);
  const profile = asRecord(snapshot.profile);
  const specialtySelection = asRecord(snapshot.specialtySelection);
  const specialties = Array.isArray(specialtySelection.specialties)
    ? specialtySelection.specialties
    : [];
  const specialtyIds = Array.isArray(specialtySelection.specialtyIds)
    ? specialtySelection.specialtyIds.filter((id): id is string => typeof id === 'string')
    : specialties
        .map((item) => nullableString(asRecord(item).specialtyId))
        .filter((id): id is string => id !== null);
  const languageCodes = Array.isArray(snapshot.languageCodes)
    ? snapshot.languageCodes.filter((code): code is string => typeof code === 'string')
    : [];

  return {
    displayName: nullableString(applicant.displayName),
    locale: nullableString(applicant.locale),
    timezone: nullableString(applicant.timezone),
    practitionerType: nullableString(profile.practitionerType),
    practitionerTypeExplicit: profile.practitionerTypeExplicit === true,
    practitionerGender: nullableString(profile.practitionerGender),
    countryCode: nullableString(profile.countryCode),
    professionalTitle: nullableString(profile.professionalTitle),
    bio: nullableString(profile.bio),
    yearsOfExperience:
      typeof profile.yearsOfExperience === 'number'
        ? profile.yearsOfExperience
        : null,
    languageCodes,
    primarySpecialtyCategoryId: nullableString(
      specialtySelection.primarySpecialtyCategoryId,
    ),
    specialtyIds,
    specialtySelection: {
      primarySpecialtyCategoryId: nullableString(
        specialtySelection.primarySpecialtyCategoryId,
      ),
      specialties,
    },
  };
}
