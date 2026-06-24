import { ConflictException } from '@nestjs/common';

export type SessionOverlapConflictScope = 'practitioner' | 'patient';

export const SESSION_OVERLAP_CONSTRAINT_NAMES = {
  practitioner: 'Session_practitioner_time_no_overlap_excl',
  patient: 'Session_patient_time_no_overlap_excl',
} as const;

const SESSION_OVERLAP_SQLSTATE = '23P01';

export function getSessionOverlapConflictScope(
  error: unknown,
): SessionOverlapConflictScope | null {
  const haystack = collectErrorText(error);

  const hasOverlapSignal =
    haystack.includes(SESSION_OVERLAP_SQLSTATE) ||
    haystack.includes(SESSION_OVERLAP_CONSTRAINT_NAMES.practitioner) ||
    haystack.includes(SESSION_OVERLAP_CONSTRAINT_NAMES.patient);

  if (!hasOverlapSignal) {
    return null;
  }

  if (haystack.includes(SESSION_OVERLAP_CONSTRAINT_NAMES.practitioner)) {
    return 'practitioner';
  }

  if (haystack.includes(SESSION_OVERLAP_CONSTRAINT_NAMES.patient)) {
    return 'patient';
  }

  return null;
}

export function toSessionOverlapConflictException(
  error: unknown,
): ConflictException | null {
  const scope = getSessionOverlapConflictScope(error);

  if (!scope) {
    return null;
  }

  if (scope === 'practitioner') {
    return new ConflictException({
      messageKey: 'sessions.errors.practitionerTimeConflict',
      error: 'SESSION_PRACTITIONER_TIME_CONFLICT',
    });
  }

  return new ConflictException({
    messageKey: 'sessions.errors.patientTimeConflict',
    error: 'SESSION_PATIENT_TIME_CONFLICT',
  });
}

function collectErrorText(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return '';
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    stack?: unknown;
    meta?: unknown;
  };

  const parts = [
    candidate.code,
    candidate.message,
    candidate.stack,
    serializeUnknownValue(candidate.meta),
  ]
    .map((value) => (typeof value === 'string' ? value : ''))
    .filter(Boolean);

  return parts.join(' | ');
}

function serializeUnknownValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
