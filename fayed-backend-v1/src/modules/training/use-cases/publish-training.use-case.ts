import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CourseStatus, CourseVisibility, Prisma } from '@prisma/client';
import { TrainingLocaleQueryDto } from '../dto/training-locale-query.dto';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';
import { ValidateTrainingStatusTransitionService } from '../services/validate-training-status-transition.service';
import { TRAINING_DEFAULT_LOCALE } from '../types/training.types';

@Injectable()
export class PublishTrainingUseCase {
  private readonly logger = new Logger(PublishTrainingUseCase.name);

  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly validateTrainingStatusTransitionService: ValidateTrainingStatusTransitionService,
    private readonly trainingPresenter: TrainingPresenter,
  ) {}

  async execute(input: { courseId: string; query: TrainingLocaleQueryDto }) {
    const existing = await this.trainingRepository.findCourseById(input.courseId);
    if (!existing) {
      throw new NotFoundException({
        messageKey: 'training.errors.notFound',
        error: 'TRAINING_NOT_FOUND',
      });
    }

    this.validateTrainingStatusTransitionService.assertCanPublish(existing.status);

    const now = new Date();
    const data: Prisma.CourseUncheckedUpdateInput = {
      status: CourseStatus.PUBLISHED,
      archivedAt: null,
      publishedAt: now,
    };

    if (existing.visibility === CourseVisibility.PRIVATE) {
      data.visibility = CourseVisibility.PUBLIC;
    }

    const updated = await this.trainingRepository.updateCourse(input.courseId, data);

    this.logger.log(`Training published (id=${input.courseId})`);

    return {
      item: this.trainingPresenter.presentAdminTrainingItem(
        updated,
        input.query.locale ?? TRAINING_DEFAULT_LOCALE,
      ),
    };
  }
}
