import { ConflictException } from '@nestjs/common';

const WEEK_UNIQUE_CONSTRAINT_NAMES = [
  'uq_practitioner_availability_week',
  'uq_practitioner_availability_week_slot',
] as const;

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

export function isAvailabilityWeekUniqueConstraintError(error: unknown): boolean {
  const haystack = collectErrorText(error);

  if (haystack.includes('P2002') || haystack.includes('23505')) {
    return true;
  }

  return WEEK_UNIQUE_CONSTRAINT_NAMES.some((constraintName) =>
    haystack.includes(constraintName),
  );
}

export function toAvailabilityWeekConflictException(
  error: unknown,
): ConflictException | null {
  const haystack = collectErrorText(error);

  if (haystack.includes('uq_practitioner_availability_week_slot')) {
    return new ConflictException({
      messageKey: 'availability.errors.slotOverlap',
      errorCode: 'AVAILABILITY_SLOT_OVERLAP',
    });
  }

  if (isAvailabilityWeekUniqueConstraintError(error)) {
    return new ConflictException({
      messageKey: 'availability.errors.weekAlreadyExists',
      errorCode: 'AVAILABILITY_WEEK_ALREADY_EXISTS',
    });
  }

  return null;
}
