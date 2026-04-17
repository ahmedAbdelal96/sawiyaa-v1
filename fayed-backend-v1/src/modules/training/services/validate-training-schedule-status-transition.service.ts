import { BadRequestException, Injectable } from '@nestjs/common';
import { CourseScheduleStatus } from '@prisma/client';

const ALLOWED_SCHEDULE_TRANSITIONS: Record<
  CourseScheduleStatus,
  CourseScheduleStatus[]
> = {
  [CourseScheduleStatus.DRAFT]: [
    CourseScheduleStatus.DRAFT,
    CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
    CourseScheduleStatus.CANCELLED,
    CourseScheduleStatus.ARCHIVED,
  ],
  [CourseScheduleStatus.OPEN_FOR_ENROLLMENT]: [
    CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
    CourseScheduleStatus.FULL,
    CourseScheduleStatus.STARTED,
    CourseScheduleStatus.CANCELLED,
    CourseScheduleStatus.ARCHIVED,
  ],
  [CourseScheduleStatus.FULL]: [
    CourseScheduleStatus.FULL,
    CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
    CourseScheduleStatus.STARTED,
    CourseScheduleStatus.CANCELLED,
    CourseScheduleStatus.ARCHIVED,
  ],
  [CourseScheduleStatus.STARTED]: [
    CourseScheduleStatus.STARTED,
    CourseScheduleStatus.COMPLETED,
    CourseScheduleStatus.CANCELLED,
  ],
  [CourseScheduleStatus.COMPLETED]: [
    CourseScheduleStatus.COMPLETED,
    CourseScheduleStatus.ARCHIVED,
  ],
  [CourseScheduleStatus.CANCELLED]: [
    CourseScheduleStatus.CANCELLED,
    CourseScheduleStatus.ARCHIVED,
  ],
  [CourseScheduleStatus.ARCHIVED]: [CourseScheduleStatus.ARCHIVED],
};

@Injectable()
export class ValidateTrainingScheduleStatusTransitionService {
  assertCanTransition(
    currentStatus: CourseScheduleStatus,
    nextStatus: CourseScheduleStatus,
  ): void {
    const allowed = ALLOWED_SCHEDULE_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException({
        messageKey: 'training.errors.invalidScheduleStatusTransition',
        error: 'TRAINING_INVALID_SCHEDULE_STATUS_TRANSITION',
      });
    }
  }
}
