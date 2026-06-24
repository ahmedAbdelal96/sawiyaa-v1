import { NotFoundException } from '@nestjs/common';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';
import { ListPatientTrainingEnrollmentsUseCase } from './list-patient-training-enrollments.use-case';

describe('ListPatientTrainingEnrollmentsUseCase', () => {
  const trainingRepository = {
    findPatientProfileByUserId: jest.fn(),
    listEnrollmentsByUser: jest.fn(),
  } as unknown as TrainingRepository;
  const trainingPresenter = {
    presentEnrollmentItem: jest.fn(),
    presentPagination: jest.fn().mockReturnValue({
      page: 1,
      limit: 12,
      totalItems: 0,
      totalPages: 1,
    }),
  } as unknown as TrainingPresenter;
  const useCase = new ListPatientTrainingEnrollmentsUseCase(
    trainingRepository,
    trainingPresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires patient profile context', async () => {
    (
      trainingRepository.findPatientProfileByUserId as jest.Mock
    ).mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'user_1',
        locale: 'en',
        query: {
          page: 1,
          limit: 12,
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
