import { Injectable, NotFoundException } from '@nestjs/common';
import { ListAdminTrainingPaymentAttemptsDto } from '../dto/list-admin-training-payment-attempts.dto';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';

@Injectable()
export class ListAdminTrainingPaymentAttemptsUseCase {
  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly trainingPresenter: TrainingPresenter,
  ) {}

  async execute(input: {
    courseId: string;
    query: ListAdminTrainingPaymentAttemptsDto;
  }) {
    const course = await this.trainingRepository.findCourseById(input.courseId);
    if (!course) {
      throw new NotFoundException({
        messageKey: 'training.errors.notFound',
        error: 'TRAINING_NOT_FOUND',
      });
    }

    const skip = (input.query.page - 1) * input.query.limit;
    const [items, totalItems] =
      await this.trainingRepository.listPaymentAttemptsByCourseForAdmin({
        courseId: input.courseId,
        status: input.query.status,
        skip,
        take: input.query.limit,
      });

    return {
      items: items.map((item) =>
        this.trainingPresenter.presentAdminPaymentAttemptItem(item),
      ),
      pagination: this.trainingPresenter.presentPagination({
        page: input.query.page,
        limit: input.query.limit,
        totalItems,
      }),
    };
  }
}
