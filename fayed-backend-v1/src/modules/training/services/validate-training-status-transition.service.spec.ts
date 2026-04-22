import { BadRequestException } from '@nestjs/common';
import { CourseStatus } from '@prisma/client';
import { ValidateTrainingStatusTransitionService } from './validate-training-status-transition.service';

describe('ValidateTrainingStatusTransitionService', () => {
  const service = new ValidateTrainingStatusTransitionService();

  it('allows publish from draft or already published', () => {
    expect(() => service.assertCanPublish(CourseStatus.DRAFT)).not.toThrow();
    expect(() =>
      service.assertCanPublish(CourseStatus.PUBLISHED),
    ).not.toThrow();
  });

  it('rejects publish from archived', () => {
    expect(() => service.assertCanPublish(CourseStatus.ARCHIVED)).toThrow(
      BadRequestException,
    );
  });

  it('allows archive from draft/published', () => {
    expect(() => service.assertCanArchive(CourseStatus.DRAFT)).not.toThrow();
    expect(() =>
      service.assertCanArchive(CourseStatus.PUBLISHED),
    ).not.toThrow();
  });

  it('rejects archive from disabled', () => {
    expect(() => service.assertCanArchive(CourseStatus.DISABLED)).toThrow(
      BadRequestException,
    );
  });
});
