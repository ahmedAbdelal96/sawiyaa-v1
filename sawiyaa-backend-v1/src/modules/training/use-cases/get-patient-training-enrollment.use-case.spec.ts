import { NotFoundException } from '@nestjs/common';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';
import { GetPatientTrainingEnrollmentUseCase } from './get-patient-training-enrollment.use-case';

describe('GetPatientTrainingEnrollmentUseCase', () => {
  const trainingRepository = {
    findEnrollmentByIdForUser: jest.fn(),
  } as unknown as TrainingRepository;
  const trainingPresenter = {
    presentEnrollmentItem: jest.fn(),
  } as unknown as TrainingPresenter;
  const useCase = new GetPatientTrainingEnrollmentUseCase(
    trainingRepository,
    trainingPresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enforces ownership by user id', async () => {
    (
      trainingRepository.findEnrollmentByIdForUser as jest.Mock
    ).mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'user_1',
        locale: 'en',
        enrollmentId: 'enr_1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
