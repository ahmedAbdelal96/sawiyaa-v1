import { NotFoundException } from '@nestjs/common';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';
import { ListAdminTrainingScheduleEnrollmentsUseCase } from './list-admin-training-schedule-enrollments.use-case';

describe('ListAdminTrainingScheduleEnrollmentsUseCase', () => {
  const trainingRepository = {
    findCourseById: jest.fn(),
    findScheduleById: jest.fn(),
    listEnrollmentsByScheduleForAdmin: jest.fn(),
  } as unknown as TrainingRepository;
  const trainingPresenter = {
    presentAdminScheduleEnrollmentItem: jest.fn(),
    presentPagination: jest.fn().mockReturnValue({
      page: 1,
      limit: 20,
      totalItems: 0,
      totalPages: 1,
    }),
  } as unknown as TrainingPresenter;

  const useCase = new ListAdminTrainingScheduleEnrollmentsUseCase(
    trainingRepository,
    trainingPresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unknown course', async () => {
    (trainingRepository.findCourseById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        courseId: 'course_1',
        scheduleId: 'schedule_1',
        query: { page: 1, limit: 20 },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists enrollments for schedule', async () => {
    (trainingRepository.findCourseById as jest.Mock).mockResolvedValue({
      id: 'course_1',
    });
    (trainingRepository.findScheduleById as jest.Mock).mockResolvedValue({
      id: 'schedule_1',
      courseId: 'course_1',
    });
    (
      trainingRepository.listEnrollmentsByScheduleForAdmin as jest.Mock
    ).mockResolvedValue([[{ id: 'en_1' }], 1]);
    (
      trainingPresenter.presentAdminScheduleEnrollmentItem as jest.Mock
    ).mockReturnValue({
      id: 'en_1',
    });

    const result = await useCase.execute({
      courseId: 'course_1',
      scheduleId: 'schedule_1',
      query: { page: 1, limit: 20 },
    });

    expect(result.items).toEqual([{ id: 'en_1' }]);
    expect(result.pagination.totalItems).toBe(0);
  });
});
