import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CourseScheduleStatus,
  EnrollmentAttendanceStatus,
  EnrollmentStatus,
} from '@prisma/client';
import { TrainingAttendanceMarkStatus } from '../dto/mark-training-enrollment-attendance.dto';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';
import { ValidateTrainingEnrollmentAttendanceMutationService } from '../services/validate-training-enrollment-attendance-mutation.service';
import { MarkTrainingEnrollmentAttendanceUseCase } from './mark-training-enrollment-attendance.use-case';

describe('MarkTrainingEnrollmentAttendanceUseCase', () => {
  const trainingRepository = {
    findEnrollmentByIdForAdmin: jest.fn(),
    updateEnrollment: jest.fn(),
  } as unknown as TrainingRepository;
  const validateTrainingEnrollmentAttendanceMutationService = {
    assertCanMark: jest.fn(),
  } as unknown as ValidateTrainingEnrollmentAttendanceMutationService;
  const trainingPresenter = {
    presentAdminScheduleEnrollmentItem: jest.fn(),
  } as unknown as TrainingPresenter;

  const useCase = new MarkTrainingEnrollmentAttendanceUseCase(
    trainingRepository,
    validateTrainingEnrollmentAttendanceMutationService,
    trainingPresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unknown enrollment', async () => {
    (trainingRepository.findEnrollmentByIdForAdmin as jest.Mock).mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute({
        courseId: 'course_1',
        enrollmentId: 'en_missing',
        payload: { status: TrainingAttendanceMarkStatus.ATTENDED },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marks attended and maps to completed enrollment state', async () => {
    (trainingRepository.findEnrollmentByIdForAdmin as jest.Mock)
      .mockResolvedValueOnce({
        id: 'en_1',
        courseId: 'course_1',
        enrollmentStatus: EnrollmentStatus.ACTIVE,
        courseSchedule: {
          status: CourseScheduleStatus.STARTED,
          startsAt: new Date('2026-05-01T10:00:00.000Z'),
        },
      })
      .mockResolvedValueOnce({
        id: 'en_1',
        userId: 'user_1',
        enrollmentStatus: EnrollmentStatus.COMPLETED,
        attendanceStatus: EnrollmentAttendanceStatus.ATTENDED,
        paymentStatus: 'CAPTURED',
        enrolledAt: new Date('2026-04-25T10:00:00.000Z'),
        user: { displayName: 'Patient One' },
        courseSchedule: {
          id: 'schedule_1',
          scheduleCode: 'SCH-1',
          startsAt: new Date('2026-05-01T10:00:00.000Z'),
          endsAt: new Date('2026-05-01T11:00:00.000Z'),
        },
      });
    (trainingPresenter.presentAdminScheduleEnrollmentItem as jest.Mock).mockReturnValue(
      {
        id: 'en_1',
        attendanceStatus: EnrollmentAttendanceStatus.ATTENDED,
      },
    );

    const result = await useCase.execute({
      courseId: 'course_1',
      enrollmentId: 'en_1',
      payload: { status: TrainingAttendanceMarkStatus.ATTENDED },
    });

    expect(trainingRepository.updateEnrollment).toHaveBeenCalledWith(
      'en_1',
      expect.objectContaining({
        enrollmentStatus: EnrollmentStatus.COMPLETED,
        attendanceStatus: EnrollmentAttendanceStatus.ATTENDED,
      }),
    );
    expect(result.item).toEqual({
      id: 'en_1',
      attendanceStatus: EnrollmentAttendanceStatus.ATTENDED,
    });
  });

  it('propagates invalid mutation validation failures', async () => {
    (trainingRepository.findEnrollmentByIdForAdmin as jest.Mock).mockResolvedValue({
      id: 'en_1',
      courseId: 'course_1',
      enrollmentStatus: EnrollmentStatus.CANCELLED,
      courseSchedule: {
        status: CourseScheduleStatus.CANCELLED,
        startsAt: new Date('2026-05-01T10:00:00.000Z'),
      },
    });
    (
      validateTrainingEnrollmentAttendanceMutationService.assertCanMark as jest.Mock
    ).mockImplementation(() => {
      throw new BadRequestException();
    });

    await expect(
      useCase.execute({
        courseId: 'course_1',
        enrollmentId: 'en_1',
        payload: { status: TrainingAttendanceMarkStatus.NO_SHOW },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
