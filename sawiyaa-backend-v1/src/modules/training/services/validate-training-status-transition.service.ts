import { BadRequestException, Injectable } from '@nestjs/common';
import { CourseStatus } from '@prisma/client';

@Injectable()
export class ValidateTrainingStatusTransitionService {
  assertCanPublish(currentStatus: CourseStatus): void {
    if (currentStatus === CourseStatus.PUBLISHED) {
      return;
    }

    if (currentStatus !== CourseStatus.DRAFT) {
      throw new BadRequestException({
        messageKey: 'training.errors.invalidPublishTransition',
        error: 'TRAINING_INVALID_PUBLISH_TRANSITION',
      });
    }
  }

  assertCanArchive(currentStatus: CourseStatus): void {
    if (
      currentStatus !== CourseStatus.DRAFT &&
      currentStatus !== CourseStatus.PUBLISHED
    ) {
      throw new BadRequestException({
        messageKey: 'training.errors.invalidArchiveTransition',
        error: 'TRAINING_INVALID_ARCHIVE_TRANSITION',
      });
    }
  }
}
