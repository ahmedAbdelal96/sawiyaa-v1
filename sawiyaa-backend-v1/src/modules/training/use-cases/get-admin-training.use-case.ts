import { Injectable, NotFoundException } from '@nestjs/common';
import { TrainingLocaleQueryDto } from '../dto/training-locale-query.dto';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';
import { BuildTrainingScheduleSnapshotsService } from '../services/build-training-schedule-snapshots.service';

@Injectable()
export class GetAdminTrainingUseCase {
  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly trainingPresenter: TrainingPresenter,
    private readonly buildTrainingScheduleSnapshotsService: BuildTrainingScheduleSnapshotsService,
  ) {}

  async execute(input: { courseId: string; query: TrainingLocaleQueryDto }) {
    const course = await this.trainingRepository.findCourseById(input.courseId);
    if (!course) {
      throw new NotFoundException({
        messageKey: 'training.errors.notFound',
        error: 'TRAINING_NOT_FOUND',
      });
    }

    const enrollmentCountsByScheduleId =
      await this.trainingRepository.countEnrollmentsByScheduleIds(
        course.schedules.map((schedule) => schedule.id),
      );
    const lectureCountsByScheduleId =
      await this.trainingRepository.countSessionsByScheduleIds(
        course.schedules.map((schedule) => schedule.id),
      );
    const scheduleItems = this.buildTrainingScheduleSnapshotsService.build({
      schedules: course.schedules,
      defaultCapacity: course.maxEnrollments ?? null,
      enrollmentCountsByScheduleId,
      lectureCountsByScheduleId,
    });

    const item = this.trainingPresenter.presentAdminTrainingItem(
      course,
      input.query.locale,
      scheduleItems,
    );
    if (!item) {
      throw new NotFoundException({
        messageKey: 'training.errors.notFound',
        error: 'TRAINING_NOT_FOUND',
      });
    }

    return { item };
  }
}
