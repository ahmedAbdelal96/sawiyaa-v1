import { BadRequestException, Injectable } from '@nestjs/common';
import { CourseScheduleStatus } from '@prisma/client';
import { TRAINING_EXTERNAL_ROOM_PROVIDER_ZOOM } from '../types/training.types';

type ScheduleValidationInput = {
  enrollmentOpenAt: Date | null;
  enrollmentCloseAt: Date | null;
  startsAt: Date | null;
  endsAt: Date | null;
  maxEnrollmentsOverride: number | null;
  status: CourseScheduleStatus;
  externalRoomProvider?: string | null;
  externalRoomJoinUrl?: string | null;
};

@Injectable()
export class ValidateTrainingSchedulePayloadService {
  assertValid(input: ScheduleValidationInput): void {
    if (!input.enrollmentOpenAt || !input.enrollmentCloseAt) {
      throw new BadRequestException({
        messageKey: 'training.errors.enrollmentWindowRequired',
        error: 'TRAINING_ENROLLMENT_WINDOW_REQUIRED',
      });
    }

    if (!input.startsAt || !input.endsAt) {
      throw new BadRequestException({
        messageKey: 'training.errors.sessionWindowRequired',
        error: 'TRAINING_SESSION_WINDOW_REQUIRED',
      });
    }

    if (input.enrollmentOpenAt >= input.enrollmentCloseAt) {
      throw new BadRequestException({
        messageKey: 'training.errors.invalidEnrollmentWindow',
        error: 'TRAINING_INVALID_ENROLLMENT_WINDOW',
      });
    }

    if (input.startsAt >= input.endsAt) {
      throw new BadRequestException({
        messageKey: 'training.errors.invalidSessionWindow',
        error: 'TRAINING_INVALID_SESSION_WINDOW',
      });
    }

    if (input.enrollmentCloseAt > input.startsAt) {
      throw new BadRequestException({
        messageKey: 'training.errors.enrollmentMustCloseBeforeStart',
        error: 'TRAINING_ENROLLMENT_MUST_CLOSE_BEFORE_START',
      });
    }

    if (
      input.maxEnrollmentsOverride !== null &&
      input.maxEnrollmentsOverride !== undefined &&
      input.maxEnrollmentsOverride <= 0
    ) {
      throw new BadRequestException({
        messageKey: 'training.errors.invalidCapacity',
        error: 'TRAINING_INVALID_CAPACITY',
      });
    }

    if (
      (input.status === CourseScheduleStatus.OPEN_FOR_ENROLLMENT ||
        input.status === CourseScheduleStatus.FULL) &&
      input.startsAt <= new Date()
    ) {
      throw new BadRequestException({
        messageKey: 'training.errors.cannotOpenPastSchedule',
        error: 'TRAINING_CANNOT_OPEN_PAST_SCHEDULE',
      });
    }

    if (
      input.externalRoomProvider !== null &&
      input.externalRoomProvider !== undefined &&
      input.externalRoomProvider !== TRAINING_EXTERNAL_ROOM_PROVIDER_ZOOM
    ) {
      throw new BadRequestException({
        messageKey: 'training.errors.invalidExternalRoomProvider',
        error: 'TRAINING_INVALID_EXTERNAL_ROOM_PROVIDER',
      });
    }

    if (input.externalRoomProvider && !input.externalRoomJoinUrl) {
      throw new BadRequestException({
        messageKey: 'training.errors.externalJoinUrlRequired',
        error: 'TRAINING_EXTERNAL_JOIN_URL_REQUIRED',
      });
    }

    if (!input.externalRoomProvider && input.externalRoomJoinUrl) {
      throw new BadRequestException({
        messageKey: 'training.errors.externalRoomProviderRequired',
        error: 'TRAINING_EXTERNAL_ROOM_PROVIDER_REQUIRED',
      });
    }
  }
}
