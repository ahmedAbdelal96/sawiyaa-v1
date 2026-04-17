import { Injectable, NotFoundException } from '@nestjs/common';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';
import { ListAdminTrainingScheduleEnrollmentsDto } from '../dto/list-admin-training-schedule-enrollments.dto';

@Injectable()
export class ListAdminTrainingScheduleEnrollmentsUseCase {
  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly trainingPresenter: TrainingPresenter,
  ) {}

  async execute(input: {
    courseId: string;
    scheduleId: string;
    query: ListAdminTrainingScheduleEnrollmentsDto;
  }) {
    const course = await this.trainingRepository.findCourseById(input.courseId);
    if (!course) {
      throw new NotFoundException({
        messageKey: 'training.errors.notFound',
        error: 'TRAINING_NOT_FOUND',
      });
    }

    const schedule = await this.trainingRepository.findScheduleById(input.scheduleId);
    if (!schedule || schedule.courseId !== input.courseId) {
      throw new NotFoundException({
        messageKey: 'training.errors.scheduleNotFound',
        error: 'TRAINING_SCHEDULE_NOT_FOUND',
      });
    }

    const skip = (input.query.page - 1) * input.query.limit;
    const [items, totalItems] =
      await this.trainingRepository.listEnrollmentsByScheduleForAdmin({
        courseId: input.courseId,
        scheduleId: input.scheduleId,
        status: input.query.status,
        skip,
        take: input.query.limit,
      });

    return {
      items: items.map((item) =>
        this.trainingPresenter.presentAdminScheduleEnrollmentItem(item),
      ),
      pagination: this.trainingPresenter.presentPagination({
        page: input.query.page,
        limit: input.query.limit,
        totalItems,
      }),
    };
  }
}

