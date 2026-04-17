import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { ListPatientTrainingEnrollmentsDto } from '../dto/list-patient-training-enrollments.dto';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';

@Injectable()
export class ListPatientTrainingEnrollmentsUseCase {
  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly trainingPresenter: TrainingPresenter,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    query: ListPatientTrainingEnrollmentsDto;
  }) {
    const patient = await this.trainingRepository.findPatientProfileByUserId(
      input.userId,
    );
    if (!patient) {
      throw new NotFoundException({
        messageKey: 'training.errors.patientNotFound',
        error: 'TRAINING_PATIENT_NOT_FOUND',
      });
    }

    const [items, totalItems] = await this.trainingRepository.listEnrollmentsByUser({
      userId: input.userId,
      status: input.query.status,
      skip: (input.query.page - 1) * input.query.limit,
      take: input.query.limit,
    });

    return {
      items: items.map((item) =>
        this.trainingPresenter.presentEnrollmentItem(item, input.locale),
      ),
      pagination: this.trainingPresenter.presentPagination({
        page: input.query.page,
        limit: input.query.limit,
        totalItems,
      }),
    };
  }
}
