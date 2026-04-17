import { NotFoundException } from '@nestjs/common';
import { ContentLocale } from '@prisma/client';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';
import { BuildTrainingScheduleSnapshotsService } from '../services/build-training-schedule-snapshots.service';
import { GetPublicTrainingBySlugUseCase } from './get-public-training-by-slug.use-case';

describe('GetPublicTrainingBySlugUseCase', () => {
  const trainingRepository = {
    findPublicCourseBySlug: jest.fn(),
    listPublicCourseSchedules: jest.fn(),
    countEnrollmentsByScheduleIds: jest.fn(),
  } as unknown as TrainingRepository;
  const trainingPresenter = {
    presentPublicTrainingDetails: jest.fn(),
  } as unknown as TrainingPresenter;
  const buildTrainingScheduleSnapshotsService = {
    build: jest.fn(),
  } as unknown as BuildTrainingScheduleSnapshotsService;

  const useCase = new GetPublicTrainingBySlugUseCase(
    trainingRepository,
    trainingPresenter,
    buildTrainingScheduleSnapshotsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects missing public course', async () => {
    (trainingRepository.findPublicCourseBySlug as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        slug: 'missing-training',
        locale: ContentLocale.ar,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('uses public schedules only for exposure', async () => {
    (trainingRepository.findPublicCourseBySlug as jest.Mock).mockResolvedValue({
      id: 'course_1',
      maxEnrollments: 20,
      translations: [{ locale: 'ar', title: 'x', slug: 'x' }],
    });
    (trainingRepository.listPublicCourseSchedules as jest.Mock).mockResolvedValue([
      { id: 'schedule_1' },
    ]);
    (trainingRepository.countEnrollmentsByScheduleIds as jest.Mock).mockResolvedValue({
      schedule_1: 2,
    });
    (buildTrainingScheduleSnapshotsService.build as jest.Mock).mockReturnValue([
      { id: 'schedule_1' },
    ]);
    (trainingPresenter.presentPublicTrainingDetails as jest.Mock).mockReturnValue({
      id: 'course_1',
      schedules: [{ id: 'schedule_1' }],
    });

    const result = await useCase.execute({
      slug: 'course-slug',
      locale: ContentLocale.ar,
    });

    expect(trainingRepository.listPublicCourseSchedules).toHaveBeenCalledWith(
      'course_1',
    );
    expect(result.item).toEqual({
      id: 'course_1',
      schedules: [{ id: 'schedule_1' }],
    });
  });
});
