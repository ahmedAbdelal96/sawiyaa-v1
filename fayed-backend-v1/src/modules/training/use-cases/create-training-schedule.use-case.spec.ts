import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CourseScheduleStatus } from '@prisma/client';
import { CreateTrainingScheduleDto } from '../dto/create-training-schedule.dto';
import { TRAINING_DEFAULT_TIMEZONE } from '../types/training.types';
import { TrainingRepository } from '../repositories/training.repository';
import { BuildTrainingScheduleSnapshotsService } from '../services/build-training-schedule-snapshots.service';
import { ValidateTrainingSchedulePayloadService } from '../services/validate-training-schedule-payload.service';
import { ValidateTrainingScheduleStatusTransitionService } from '../services/validate-training-schedule-status-transition.service';
import { CreateTrainingScheduleUseCase } from './create-training-schedule.use-case';

describe('CreateTrainingScheduleUseCase', () => {
  const trainingRepository = {
    findCourseById: jest.fn(),
    createSchedule: jest.fn(),
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

  const useCase = new CreateTrainingScheduleUseCase(
    trainingRepository,
    validateTrainingSchedulePayloadService,
    validateTrainingScheduleStatusTransitionService,
    buildTrainingScheduleSnapshotsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unknown course', async () => {
    (trainingRepository.findCourseById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        courseId: 'course_missing',
        payload: {
          enrollmentOpenAt: '2026-04-01T09:00:00.000Z',
          enrollmentCloseAt: '2026-04-02T09:00:00.000Z',
          startsAt: '2026-04-03T09:00:00.000Z',
          endsAt: '2026-04-03T10:00:00.000Z',
        } as CreateTrainingScheduleDto,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates schedule linked to course', async () => {
    (trainingRepository.findCourseById as jest.Mock).mockResolvedValue({
      id: 'course_1',
      maxEnrollments: 10,
    });
    (trainingRepository.createSchedule as jest.Mock).mockResolvedValue({
      id: 'schedule_1',
      scheduleCode: 'sch_1',
      status: CourseScheduleStatus.DRAFT,
      enrollmentOpenAt: new Date('2026-04-01T09:00:00.000Z'),
      enrollmentCloseAt: new Date('2026-04-02T09:00:00.000Z'),
      startsAt: new Date('2026-04-03T09:00:00.000Z'),
      endsAt: new Date('2026-04-03T10:00:00.000Z'),
      timezone: 'Africa/Cairo',
      maxEnrollmentsOverride: null,
    });
    (buildTrainingScheduleSnapshotsService.build as jest.Mock).mockReturnValue([
      { id: 'schedule_1' },
    ]);

    const result = await useCase.execute({
      courseId: 'course_1',
      payload: {
        enrollmentOpenAt: '2026-04-01T09:00:00.000Z',
        enrollmentCloseAt: '2026-04-02T09:00:00.000Z',
        startsAt: '2026-04-03T09:00:00.000Z',
        endsAt: '2026-04-03T10:00:00.000Z',
      },
    });

    expect(trainingRepository.createSchedule).toHaveBeenCalledWith(
      'course_1',
      expect.any(Object),
    );
    expect(result.item).toEqual(
      expect.objectContaining({
        id: 'schedule_1',
        externalRoomProvider: null,
        externalRoomJoinUrl: null,
        externalRoomHostUrl: null,
      }),
    );
  });

  it('accepts a valid IANA timezone when creating a schedule', async () => {
    (trainingRepository.findCourseById as jest.Mock).mockResolvedValue({
      id: 'course_1',
      maxEnrollments: 10,
    });
    (trainingRepository.createSchedule as jest.Mock).mockResolvedValue({
      id: 'schedule_2',
      scheduleCode: 'sch_2',
      status: CourseScheduleStatus.DRAFT,
      enrollmentOpenAt: new Date('2026-04-01T09:00:00.000Z'),
      enrollmentCloseAt: new Date('2026-04-02T09:00:00.000Z'),
      startsAt: new Date('2026-04-03T09:00:00.000Z'),
      endsAt: new Date('2026-04-03T10:00:00.000Z'),
      timezone: 'Europe/Berlin',
      maxEnrollmentsOverride: null,
    });
    (buildTrainingScheduleSnapshotsService.build as jest.Mock).mockReturnValue([
      { id: 'schedule_2' },
    ]);

    await useCase.execute({
      courseId: 'course_1',
      payload: {
        enrollmentOpenAt: '2026-04-01T09:00:00.000Z',
        enrollmentCloseAt: '2026-04-02T09:00:00.000Z',
        startsAt: '2026-04-03T09:00:00.000Z',
        endsAt: '2026-04-03T10:00:00.000Z',
        timezone: 'Europe/Berlin',
      },
    });

    expect(trainingRepository.createSchedule).toHaveBeenCalledWith(
      'course_1',
      expect.objectContaining({
        timezone: 'Europe/Berlin',
      }),
    );
  });

  it('falls back to the default training timezone when timezone is omitted', async () => {
    (trainingRepository.findCourseById as jest.Mock).mockResolvedValue({
      id: 'course_1',
      maxEnrollments: 10,
    });
    (trainingRepository.createSchedule as jest.Mock).mockResolvedValue({
      id: 'schedule_3',
      scheduleCode: 'sch_3',
      status: CourseScheduleStatus.DRAFT,
      enrollmentOpenAt: new Date('2026-04-01T09:00:00.000Z'),
      enrollmentCloseAt: new Date('2026-04-02T09:00:00.000Z'),
      startsAt: new Date('2026-04-03T09:00:00.000Z'),
      endsAt: new Date('2026-04-03T10:00:00.000Z'),
      timezone: TRAINING_DEFAULT_TIMEZONE,
      maxEnrollmentsOverride: null,
    });
    (buildTrainingScheduleSnapshotsService.build as jest.Mock).mockReturnValue([
      { id: 'schedule_3' },
    ]);

    await useCase.execute({
      courseId: 'course_1',
      payload: {
        enrollmentOpenAt: '2026-04-01T09:00:00.000Z',
        enrollmentCloseAt: '2026-04-02T09:00:00.000Z',
        startsAt: '2026-04-03T09:00:00.000Z',
        endsAt: '2026-04-03T10:00:00.000Z',
      },
    });

    expect(trainingRepository.createSchedule).toHaveBeenCalledWith(
      'course_1',
      expect.objectContaining({
        timezone: TRAINING_DEFAULT_TIMEZONE,
      }),
    );
  });

  it.each(['+02:00', 'UTC+2', 'Invalid/Timezone'])(
    'rejects invalid timezone value %s before persistence',
    async (timezone) => {
      (trainingRepository.findCourseById as jest.Mock).mockResolvedValue({
        id: 'course_1',
        maxEnrollments: 10,
      });

      await expect(
        useCase.execute({
          courseId: 'course_1',
          payload: {
            enrollmentOpenAt: '2026-04-01T09:00:00.000Z',
            enrollmentCloseAt: '2026-04-02T09:00:00.000Z',
            startsAt: '2026-04-03T09:00:00.000Z',
            endsAt: '2026-04-03T10:00:00.000Z',
            timezone,
          },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(trainingRepository.createSchedule).not.toHaveBeenCalled();
    },
  );
});
