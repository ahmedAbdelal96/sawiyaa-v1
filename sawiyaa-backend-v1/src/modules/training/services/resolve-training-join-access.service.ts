import { Injectable } from '@nestjs/common';
import { CourseScheduleStatus, EnrollmentStatus } from '@prisma/client';
import { TrainingJoinBlockedReason } from '../types/training.types';

@Injectable()
export class ResolveTrainingJoinAccessService {
  private readonly joinAllowedEnrollmentStatuses = new Set<EnrollmentStatus>([
    EnrollmentStatus.ACTIVE,
  ]);

  private readonly joinAllowedScheduleStatuses = new Set<CourseScheduleStatus>([
    CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
    CourseScheduleStatus.FULL,
    CourseScheduleStatus.STARTED,
  ]);

  private readonly joinLeadMinutes = 15;
  private readonly joinLagMinutes = 180;

  resolve(input: {
    enrollmentStatus: EnrollmentStatus;
    scheduleStatus: CourseScheduleStatus;
    startsAt: Date | null;
    endsAt: Date | null;
    externalRoomProvider: string | null;
    externalRoomJoinUrl: string | null;
    now?: Date;
  }) {
    const now = input.now ?? new Date();

    if (!this.joinAllowedEnrollmentStatuses.has(input.enrollmentStatus)) {
      return {
        canJoin: false,
        blockedReason: TrainingJoinBlockedReason.ENROLLMENT_NOT_ACTIVE,
      };
    }

    if (!this.joinAllowedScheduleStatuses.has(input.scheduleStatus)) {
      return {
        canJoin: false,
        blockedReason: TrainingJoinBlockedReason.SCHEDULE_NOT_JOINABLE,
      };
    }

    if (!input.startsAt || !input.endsAt || input.startsAt >= input.endsAt) {
      return {
        canJoin: false,
        blockedReason: TrainingJoinBlockedReason.SCHEDULE_TIME_UNAVAILABLE,
      };
    }

    const joinOpensAt = new Date(
      input.startsAt.getTime() - this.joinLeadMinutes * 60_000,
    );
    const joinClosesAt = new Date(
      input.endsAt.getTime() + this.joinLagMinutes * 60_000,
    );
    if (now < joinOpensAt || now > joinClosesAt) {
      return {
        canJoin: false,
        blockedReason: TrainingJoinBlockedReason.JOIN_WINDOW_NOT_OPEN,
      };
    }

    if (!input.externalRoomProvider || !input.externalRoomJoinUrl) {
      return {
        canJoin: false,
        blockedReason: TrainingJoinBlockedReason.JOIN_ACCESS_NOT_CONFIGURED,
      };
    }

    return {
      canJoin: true,
      blockedReason: null,
    };
  }
}
