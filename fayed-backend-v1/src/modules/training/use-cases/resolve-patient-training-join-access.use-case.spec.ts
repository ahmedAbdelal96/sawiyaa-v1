import { NotFoundException } from '@nestjs/common';
import { CourseScheduleStatus, EnrollmentStatus } from '@prisma/client';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';
import { ResolveTrainingJoinAccessService } from '../services/resolve-training-join-access.service';
import { ResolvePatientTrainingJoinAccessUseCase } from './resolve-patient-training-join-access.use-case';

describe('ResolvePatientTrainingJoinAccessUseCase', () => {
  const trainingRepository = {
    findEnrollmentByIdForUser: jest.fn(),
  } as unknown as TrainingRepository;
  const resolveTrainingJoinAccessService = {
    resolve: jest.fn(),
  } as unknown as ResolveTrainingJoinAccessService;
  const trainingPresenter = {
    presentJoinAccessItem: jest.fn(),
  } as unknown as TrainingPresenter;

  const useCase = new ResolvePatientTrainingJoinAccessUseCase(
    trainingRepository,
    resolveTrainingJoinAccessService,
    trainingPresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unknown enrollment or wrong owner', async () => {
    (trainingRepository.findEnrollmentByIdForUser as jest.Mock).mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute({
        userId: 'patient_user_1',
        locale: 'en',
        enrollmentId: 'en_missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns patient-safe join contract without host URL leakage', async () => {
    (trainingRepository.findEnrollmentByIdForUser as jest.Mock).mockResolvedValue({
      id: 'en_1',
      courseId: 'course_1',
      courseScheduleId: 'schedule_1',
      enrollmentStatus: EnrollmentStatus.ACTIVE,
      courseSchedule: {
        status: CourseScheduleStatus.STARTED,
        startsAt: new Date('2026-05-01T10:00:00.000Z'),
        endsAt: new Date('2026-05-01T11:00:00.000Z'),
        externalRoomProvider: 'ZOOM',
        externalRoomJoinUrl: 'https://zoom.us/j/abc',
        externalRoomHostUrl: 'https://zoom.us/s/secret-host',
      },
    });
    (resolveTrainingJoinAccessService.resolve as jest.Mock).mockReturnValue({
      canJoin: true,
      blockedReason: null,
    });
    (trainingPresenter.presentJoinAccessItem as jest.Mock).mockReturnValue({
      enrollmentId: 'en_1',
      canJoin: true,
      provider: 'ZOOM',
      joinUrl: 'https://zoom.us/j/abc',
      blockedReason: null,
    });

    const result = await useCase.execute({
      userId: 'patient_user_1',
      locale: 'en',
      enrollmentId: 'en_1',
    });

    expect(result.item).toEqual({
      enrollmentId: 'en_1',
      canJoin: true,
      provider: 'ZOOM',
      joinUrl: 'https://zoom.us/j/abc',
      blockedReason: null,
    });
    expect((result.item as Record<string, unknown>).hostUrl).toBeUndefined();
    expect(trainingPresenter.presentJoinAccessItem).toHaveBeenCalledWith(
      expect.not.objectContaining({
        hostUrl: expect.anything(),
      }),
    );
  });
});

