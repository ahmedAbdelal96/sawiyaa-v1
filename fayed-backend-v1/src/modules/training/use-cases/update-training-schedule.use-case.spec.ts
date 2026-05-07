import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CourseScheduleStatus } from '@prisma/client';
import { TrainingRepository } from '../repositories/training.repository';
import { BuildTrainingScheduleSnapshotsService } from '../services/build-training-schedule-snapshots.service';
import { ValidateTrainingSchedulePayloadService } from '../services/validate-training-schedule-payload.service';
import { ValidateTrainingScheduleStatusTransitionService } from '../services/validate-training-schedule-status-transition.service';
import { UpdateTrainingScheduleUseCase } from './update-training-schedule.use-case';

describe('UpdateTrainingScheduleUseCase', () => {
  const trainingRepository = {
    findCourseById: jest.fn(),
    findScheduleById: jest.fn(),
    countEnrollmentsByScheduleIds: jest.fn(),
    countSessionsByScheduleIds: jest.fn(),
    updateSchedule: jest.fn(),
  } as unknown as TrainingRepository;
  const validateTrainingSchedulePayloadService = {
    assertValid: jest.fn(),
  } as unknown as ValidateTrainingSchedulePayloadService;
  const validateTrainingScheduleStatusTransitionService = {
    assertCanTransition: jest.fn(),
  } as unknown as ValidateTrainingScheduleStatusTransitionService;
  const buildTrainingScheduleSnapshotsService = {
    build: jest.fn(),
  } as unknown as BuildTrainingScheduleSnapshotsService;

  const useCase = new UpdateTrainingScheduleUseCase(
    trainingRepository,
    validateTrainingSchedulePayloadService,
    validateTrainingScheduleStatusTransitionService,
    buildTrainingScheduleSnapshotsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unknown schedule', async () => {
    (trainingRepository.findCourseById as jest.Mock).mockResolvedValue({
      id: 'course_1',
      maxEnrollments: 10,
    });
    (trainingRepository.findScheduleById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        courseId: 'course_1',
        scheduleId: 'schedule_missing',
        payload: {},
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects capacity below occupied seats', async () => {
    (trainingRepository.findCourseById as jest.Mock).mockResolvedValue({
      id: 'course_1',
      maxEnrollments: 10,
    });
    (trainingRepository.findScheduleById as jest.Mock).mockResolvedValue({
      id: 'schedule_1',
      courseId: 'course_1',
      status: CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
      enrollmentOpenAt: new Date('2026-04-01T09:00:00.000Z'),
      enrollmentCloseAt: new Date('2026-04-02T09:00:00.000Z'),
      startsAt: new Date('2026-04-03T09:00:00.000Z'),
      endsAt: new Date('2026-04-03T10:00:00.000Z'),
      plannedDurationDays: 14,
      plannedLectureCount: 4,
      maxEnrollmentsOverride: 10,
    });
    (
      trainingRepository.countEnrollmentsByScheduleIds as jest.Mock
    ).mockResolvedValue({
      schedule_1: 8,
    });
    (
      trainingRepository.countSessionsByScheduleIds as jest.Mock
    ).mockResolvedValue({
      schedule_1: 4,
    });

    await expect(
      useCase.execute({
        courseId: 'course_1',
        scheduleId: 'schedule_1',
        payload: {
          maxEnrollmentsOverride: 5,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
