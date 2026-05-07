import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContentLocale, CourseStatus } from '@prisma/client';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';
import { ValidateTrainingStatusTransitionService } from '../services/validate-training-status-transition.service';
import { PublishTrainingUseCase } from './publish-training.use-case';

describe('PublishTrainingUseCase', () => {
  const trainingRepository = {
    findCourseById: jest.fn(),
    countSchedulesByCourseId: jest.fn(),
    countSessionsByScheduleIds: jest.fn(),
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

  it('rejects publish when no schedules exist', async () => {
    (trainingRepository.findCourseById as jest.Mock).mockResolvedValue({
      id: 'course_1',
      status: CourseStatus.DRAFT,
      visibility: 'PUBLIC',
    });
    (trainingRepository.countSchedulesByCourseId as jest.Mock).mockResolvedValue(
      0,
    );

    await expect(
      useCase.execute({
        courseId: 'course_1',
        query: { locale: ContentLocale.ar },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(trainingRepository.updateCourse).not.toHaveBeenCalled();
  });

  it('rejects publish when schedule lecture plan is incomplete', async () => {
    (trainingRepository.findCourseById as jest.Mock).mockResolvedValue({
      id: 'course_1',
      status: CourseStatus.DRAFT,
      visibility: 'PUBLIC',
      schedules: [
        {
          id: 'schedule_1',
          scheduleCode: 'SCH1',
          plannedDurationDays: 14,
          plannedLectureCount: 4,
        },
      ],
    });
    (trainingRepository.countSchedulesByCourseId as jest.Mock).mockResolvedValue(
      1,
    );
    (
      trainingRepository.countSessionsByScheduleIds as jest.Mock
    ).mockResolvedValue({
      schedule_1: 3,
    });

    await expect(
      useCase.execute({
        courseId: 'course_1',
        query: { locale: ContentLocale.ar },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(trainingRepository.updateCourse).not.toHaveBeenCalled();
  });
});
