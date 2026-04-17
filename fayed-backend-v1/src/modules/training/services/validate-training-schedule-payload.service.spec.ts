import { BadRequestException } from '@nestjs/common';
import { CourseScheduleStatus } from '@prisma/client';
import { ValidateTrainingSchedulePayloadService } from './validate-training-schedule-payload.service';

describe('ValidateTrainingSchedulePayloadService', () => {
  const service = new ValidateTrainingSchedulePayloadService();

  it('accepts valid schedule windows and capacity', () => {
    expect(() =>
      service.assertValid({
        enrollmentOpenAt: new Date('2026-04-01T08:00:00.000Z'),
        enrollmentCloseAt: new Date('2026-04-02T08:00:00.000Z'),
        startsAt: new Date('2026-04-03T08:00:00.000Z'),
        endsAt: new Date('2026-04-03T10:00:00.000Z'),
        maxEnrollmentsOverride: 20,
        status: CourseScheduleStatus.DRAFT,
      }),
    ).not.toThrow();
  });

  it('rejects invalid time windows', () => {
    expect(() =>
      service.assertValid({
        enrollmentOpenAt: new Date('2026-04-02T08:00:00.000Z'),
        enrollmentCloseAt: new Date('2026-04-01T08:00:00.000Z'),
        startsAt: new Date('2026-04-03T08:00:00.000Z'),
        endsAt: new Date('2026-04-03T10:00:00.000Z'),
        maxEnrollmentsOverride: 20,
        status: CourseScheduleStatus.DRAFT,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects invalid capacity', () => {
    expect(() =>
      service.assertValid({
        enrollmentOpenAt: new Date('2026-04-01T08:00:00.000Z'),
        enrollmentCloseAt: new Date('2026-04-02T08:00:00.000Z'),
        startsAt: new Date('2026-04-03T08:00:00.000Z'),
        endsAt: new Date('2026-04-03T10:00:00.000Z'),
        maxEnrollmentsOverride: 0,
        status: CourseScheduleStatus.DRAFT,
      }),
    ).toThrow(BadRequestException);
  });
});
