import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContentLocale, CourseStatus } from '@prisma/client';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';
import { ValidateTrainingStatusTransitionService } from '../services/validate-training-status-transition.service';
import { PublishTrainingUseCase } from './publish-training.use-case';

describe('PublishTrainingUseCase', () => {
  const trainingRepository = {
    findCourseById: jest.fn(),
    updateCourse: jest.fn(),
  } as unknown as TrainingRepository;

  const validateTrainingStatusTransitionService = {
    assertCanPublish: jest.fn(),
  } as unknown as ValidateTrainingStatusTransitionService;

  const trainingPresenter = {
    presentAdminTrainingItem: jest.fn(),
  } as unknown as TrainingPresenter;

  const useCase = new PublishTrainingUseCase(
    trainingRepository,
    validateTrainingStatusTransitionService,
    trainingPresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects missing course', async () => {
    (trainingRepository.findCourseById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        courseId: 'course_1',
        query: { locale: ContentLocale.ar },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('propagates invalid transition errors', async () => {
    (trainingRepository.findCourseById as jest.Mock).mockResolvedValue({
      id: 'course_1',
      status: CourseStatus.ARCHIVED,
      visibility: 'PUBLIC',
    });
    (
      validateTrainingStatusTransitionService.assertCanPublish as jest.Mock
    ).mockImplementation(() => {
      throw new BadRequestException();
    });

    await expect(
      useCase.execute({
        courseId: 'course_1',
        query: { locale: ContentLocale.ar },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
