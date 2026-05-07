import { Injectable } from '@nestjs/common';
import { CourseScheduleStatus } from '@prisma/client';
import { TrainingPresenter } from '../presenters/training.presenter';
import { ResolveTrainingScheduleEnrollmentAvailabilityService } from './resolve-training-schedule-enrollment-availability.service';

type ScheduleShape = {
  id: string;
  scheduleCode: string;
  status: CourseScheduleStatus;
  enrollmentOpenAt: Date | null;
  enrollmentCloseAt: Date | null;
  startsAt: Date | null;
  endsAt: Date | null;
  timezone: string | null;
  plannedDurationDays: number | null;
  plannedLectureCount: number | null;
  maxEnrollmentsOverride: number | null;
};

@Injectable()
export class BuildTrainingScheduleSnapshotsService {
  constructor(
    private readonly trainingPresenter: TrainingPresenter,
    private readonly resolveTrainingScheduleEnrollmentAvailabilityService: ResolveTrainingScheduleEnrollmentAvailabilityService,
  ) {}

  build(input: {
    schedules: ScheduleShape[];
    defaultCapacity: number | null;
    enrollmentCountsByScheduleId: Record<string, number>;
    lectureCountsByScheduleId: Record<string, number>;
    now?: Date;
  }) {
    return input.schedules.map((schedule) => {
      const enrolledSeats =
        input.enrollmentCountsByScheduleId[schedule.id] ?? 0;
      const lectureCount = input.lectureCountsByScheduleId[schedule.id] ?? 0;
      const maxEnrollments =
        schedule.maxEnrollmentsOverride ?? input.defaultCapacity ?? null;

      const availability =
        this.resolveTrainingScheduleEnrollmentAvailabilityService.resolve({
          status: schedule.status,
          enrollmentOpenAt: schedule.enrollmentOpenAt,
          enrollmentCloseAt: schedule.enrollmentCloseAt,
          startsAt: schedule.startsAt,
          maxEnrollments,
          enrolledSeats,
          now: input.now,
        });

      return this.trainingPresenter.presentScheduleItem({
        schedule,
        defaultCapacity: input.defaultCapacity,
        enrolledSeats,
        lectureCount,
        availability,
      });
    });
  }
}
