import { BadRequestException } from '@nestjs/common';
import { CourseScheduleStatus } from '@prisma/client';
import { ValidateTrainingScheduleStatusTransitionService } from './validate-training-schedule-status-transition.service';

describe('ValidateTrainingScheduleStatusTransitionService', () => {
  const service = new ValidateTrainingScheduleStatusTransitionService();

  it('allows draft to open for enrollment', () => {
    expect(() =>
      service.assertCanTransition(
        CourseScheduleStatus.DRAFT,
        CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
      ),
    ).not.toThrow();
  });

  it('rejects archived to open for enrollment', () => {
    expect(() =>
      service.assertCanTransition(
        CourseScheduleStatus.ARCHIVED,
        CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
      ),
    ).toThrow(BadRequestException);
  });
});
