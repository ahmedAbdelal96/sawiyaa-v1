import { Injectable, NotFoundException } from '@nestjs/common';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';

@Injectable()
export class ListAdminTrainingScheduleLecturesUseCase {
  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly trainingPresenter: TrainingPresenter,
  ) {}

  async execute(input: {
    courseId: string;
    scheduleId: string;
  }) {
    const course = await this.trainingRepository.findCourseById(input.courseId);
    if (!course) {
      throw new NotFoundException({
        messageKey: 'training.errors.notFound',
        error: 'TRAINING_NOT_FOUND',
      });
    }

    const schedule = await this.trainingRepository.findScheduleById(
      input.scheduleId,
    );
    if (!schedule || schedule.courseId !== input.courseId) {
      throw new NotFoundException({
        messageKey: 'training.errors.scheduleNotFound',
        error: 'TRAINING_SCHEDULE_NOT_FOUND',
      });
    }

    const items = await this.trainingRepository.listSessionsByScheduleForAdmin(
      input.scheduleId,
    );

    return {
      items: items.map((item) =>
        this.trainingPresenter.presentAdminScheduleLectureItem(item),
      ),
    };
  }
}
