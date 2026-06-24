import { CourseScheduleStatus } from '@prisma/client';
import { TrainingEnrollmentAvailabilityReason } from '../types/training.types';
import { ResolveTrainingScheduleEnrollmentAvailabilityService } from './resolve-training-schedule-enrollment-availability.service';

describe('ResolveTrainingScheduleEnrollmentAvailabilityService', () => {
  const service = new ResolveTrainingScheduleEnrollmentAvailabilityService();

  it('returns OPEN when schedule is enrollable', () => {
    const now = new Date('2026-04-01T10:00:00.000Z');
    const result = service.resolve({
      status: CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
      enrollmentOpenAt: new Date('2026-04-01T09:00:00.000Z'),
      enrollmentCloseAt: new Date('2026-04-02T09:00:00.000Z'),
      startsAt: new Date('2026-04-03T09:00:00.000Z'),
      maxEnrollments: 10,
      enrolledSeats: 3,
      now,
    });

    expect(result).toEqual({
      isEnrollmentOpen: true,
      reason: TrainingEnrollmentAvailabilityReason.OPEN,
    });
  });

  it('returns WINDOW_CLOSED when enrollment close passed', () => {
    const now = new Date('2026-04-02T10:00:00.000Z');
    const result = service.resolve({
      status: CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
      enrollmentOpenAt: new Date('2026-04-01T09:00:00.000Z'),
      enrollmentCloseAt: new Date('2026-04-02T09:00:00.000Z'),
      startsAt: new Date('2026-04-03T09:00:00.000Z'),
      maxEnrollments: 10,
      enrolledSeats: 3,
      now,
    });

    expect(result).toEqual({
      isEnrollmentOpen: false,
      reason: TrainingEnrollmentAvailabilityReason.WINDOW_CLOSED,
    });
  });
});
