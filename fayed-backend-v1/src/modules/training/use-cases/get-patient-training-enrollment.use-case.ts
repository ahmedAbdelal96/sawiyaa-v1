import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';

@Injectable()
export class GetPatientTrainingEnrollmentUseCase {
  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly trainingPresenter: TrainingPresenter,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    enrollmentId: string;
  }) {
    const enrollment = await this.trainingRepository.findEnrollmentByIdForUser(
      input.enrollmentId,
      input.userId,
    );
    if (!enrollment) {
      throw new NotFoundException({
        messageKey: 'training.errors.enrollmentNotFound',
        error: 'TRAINING_ENROLLMENT_NOT_FOUND',
      });
    }

    return {
      item: this.trainingPresenter.presentEnrollmentItem(enrollment, input.locale),
    };
  }
}
