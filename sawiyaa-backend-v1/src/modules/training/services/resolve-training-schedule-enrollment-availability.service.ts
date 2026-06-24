import { Injectable } from '@nestjs/common';
import { CourseScheduleStatus } from '@prisma/client';
import { TrainingEnrollmentAvailabilityReason } from '../types/training.types';

@Injectable()
export class ResolveTrainingScheduleEnrollmentAvailabilityService {
  resolve(input: {
    status: CourseScheduleStatus;
    enrollmentOpenAt: Date | null;
    enrollmentCloseAt: Date | null;
    startsAt: Date | null;
    maxEnrollments: number | null;
    enrolledSeats: number;
    now?: Date;
  }) {
    const now = input.now ?? new Date();

    if (input.status !== CourseScheduleStatus.OPEN_FOR_ENROLLMENT) {
      return {
        isEnrollmentOpen: false,
        reason: TrainingEnrollmentAvailabilityReason.STATUS_NOT_OPEN,
      };
    }

    if (!input.enrollmentOpenAt || !input.enrollmentCloseAt) {
      return {
        isEnrollmentOpen: false,
        reason: TrainingEnrollmentAvailabilityReason.INVALID_WINDOW,
      };
    }

    if (input.enrollmentOpenAt >= input.enrollmentCloseAt) {
      return {
        isEnrollmentOpen: false,
        reason: TrainingEnrollmentAvailabilityReason.INVALID_WINDOW,
      };
    }

    if (now < input.enrollmentOpenAt) {
      return {
        isEnrollmentOpen: false,
        reason: TrainingEnrollmentAvailabilityReason.NOT_OPEN_YET,
      };
    }

    if (now > input.enrollmentCloseAt) {
      return {
        isEnrollmentOpen: false,
        reason: TrainingEnrollmentAvailabilityReason.WINDOW_CLOSED,
      };
    }

    if (input.startsAt && now >= input.startsAt) {
      return {
        isEnrollmentOpen: false,
        reason: TrainingEnrollmentAvailabilityReason.SESSION_STARTED,
      };
    }

    if (
      input.maxEnrollments !== null &&
      input.maxEnrollments !== undefined &&
      input.enrolledSeats >= input.maxEnrollments
    ) {
      return {
        isEnrollmentOpen: false,
        reason: TrainingEnrollmentAvailabilityReason.CAPACITY_REACHED,
      };
    }

    return {
      isEnrollmentOpen: true,
      reason: TrainingEnrollmentAvailabilityReason.OPEN,
    };
  }
}
