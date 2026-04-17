import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentLocale } from '@prisma/client';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';
import { BuildTrainingScheduleSnapshotsService } from '../services/build-training-schedule-snapshots.service';

@Injectable()
export class GetPublicTrainingBySlugUseCase {
  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly trainingPresenter: TrainingPresenter,
    private readonly buildTrainingScheduleSnapshotsService: BuildTrainingScheduleSnapshotsService,
  ) {}

  async execute(input: { slug: string; locale: ContentLocale }) {
    const course = await this.trainingRepository.findPublicCourseBySlug({
      slug: input.slug,
      locale: input.locale,
    });
    if (!course) {
      throw new NotFoundException({
        messageKey: 'training.errors.notFound',
        error: 'TRAINING_NOT_FOUND',
      });
    }

    const publicSchedules = await this.trainingRepository.listPublicCourseSchedules(
      course.id,
    );
    const enrollmentCountsByScheduleId =
      await this.trainingRepository.countEnrollmentsByScheduleIds(
        publicSchedules.map((schedule) => schedule.id),
      );
    const scheduleItems = this.buildTrainingScheduleSnapshotsService.build({
      schedules: publicSchedules,
      defaultCapacity: course.maxEnrollments ?? null,
      enrollmentCountsByScheduleId,
    });

    const item = this.trainingPresenter.presentPublicTrainingDetails(course, input.locale, scheduleItems);
    if (!item) {
      throw new NotFoundException({
        messageKey: 'training.errors.notFound',
        error: 'TRAINING_NOT_FOUND',
      });
    }

    return { item };
  }
}
