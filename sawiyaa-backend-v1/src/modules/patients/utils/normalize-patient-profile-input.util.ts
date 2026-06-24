import { UpdatePatientProfileInput } from '../types/patient-profile.types';

function normalizeOptionalString(
  value?: string | null,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

/**
 * Patients Module accepts user-editable text fields, so we normalize whitespace and blank values in one place.
 * This prevents empty strings from being persisted into either User preferences or PatientProfile fields.
 */
export function normalizePatientProfileInput(
  input: UpdatePatientProfileInput,
): UpdatePatientProfileInput {
  return {
    ...input,
    displayName: normalizeOptionalString(input.displayName),
    gender: normalizeOptionalString(input.gender),
    locale: normalizeOptionalString(input.locale) ?? undefined,
    countryCode: normalizeOptionalString(input.countryCode),
    timezone: normalizeOptionalString(input.timezone) ?? undefined,
  };
}
