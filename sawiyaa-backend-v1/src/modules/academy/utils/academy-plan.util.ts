import { BadRequestException } from '@nestjs/common';

type AcademyCoursePlanInput = {
  startsAt: Date | null;
  plannedDurationDays: number | null;
  plannedLectureCount: number | null;
};

export function normalizeAcademyPlanValue(
  value: number | string | null | undefined,
) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  const rounded = Math.trunc(numeric);
  return rounded > 0 ? rounded : null;
}

export function assertAcademyCoursePlanCompleteness(
  input: AcademyCoursePlanInput,
) {
  const missingFields: string[] = [];

  if (!input.startsAt) {
    missingFields.push('startsAt');
  }

  if (
    input.plannedDurationDays === null ||
    input.plannedDurationDays === undefined
  ) {
    missingFields.push('plannedDurationDays');
  }

  if (
    input.plannedLectureCount === null ||
    input.plannedLectureCount === undefined
  ) {
    missingFields.push('plannedLectureCount');
  }

  if (missingFields.length > 0) {
    throw new BadRequestException({
      messageKey: 'academy.errors.missingPlan',
      error: 'ACADEMY_MISSING_PLAN',
      details: { missingFields },
    });
  }

  if ((input.plannedDurationDays ?? 0) < 1) {
    throw new BadRequestException({
      messageKey: 'academy.errors.invalidDuration',
      error: 'ACADEMY_INVALID_DURATION',
    });
  }

  if ((input.plannedLectureCount ?? 0) < 1) {
    throw new BadRequestException({
      messageKey: 'academy.errors.invalidLectureCount',
      error: 'ACADEMY_INVALID_LECTURE_COUNT',
    });
  }
}

export function resolveAcademyCoursePlan(input: AcademyCoursePlanInput) {
  assertAcademyCoursePlanCompleteness(input);

  const durationDays = input.plannedDurationDays ?? 0;
  const endsAt = new Date(
    input.startsAt!.getTime() + durationDays * 24 * 60 * 60 * 1000,
  );

  return {
    endsAt,
  };
}
