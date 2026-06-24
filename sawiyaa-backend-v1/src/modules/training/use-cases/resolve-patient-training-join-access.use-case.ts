import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';
import { ResolveTrainingJoinAccessService } from '../services/resolve-training-join-access.service';

@Injectable()
export class ResolvePatientTrainingJoinAccessUseCase {
  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly resolveTrainingJoinAccessService: ResolveTrainingJoinAccessService,
    private readonly trainingPresenter: TrainingPresenter,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    enrollmentId: string;
  }) {
    const enrollment = await this.trainingRepository.findEnrollmentByIdForUser(
      input.enrollmentId,
      input.userId,
    );
    if (!enrollment) {
      throw new NotFoundException({
        messageKey: 'training.errors.enrollmentNotFound',
        error: 'TRAINING_ENROLLMENT_NOT_FOUND',
      });
    }

    const access = this.resolveTrainingJoinAccessService.resolve({
      enrollmentStatus: enrollment.enrollmentStatus,
      scheduleStatus: enrollment.courseSchedule.status,
      startsAt: enrollment.courseSchedule.startsAt,
      endsAt: enrollment.courseSchedule.endsAt,
      externalRoomProvider: enrollment.courseSchedule.externalRoomProvider,
      externalRoomJoinUrl: enrollment.courseSchedule.externalRoomJoinUrl,
    });

    return {
      item: this.trainingPresenter.presentJoinAccessItem({
        enrollmentId: enrollment.id,
        courseId: enrollment.courseId,
        scheduleId: enrollment.courseScheduleId,
        enrollmentStatus: enrollment.enrollmentStatus,
        scheduleStatus: enrollment.courseSchedule.status,
        canJoin: access.canJoin,
        blockedReason: access.blockedReason,
        provider: enrollment.courseSchedule.externalRoomProvider,
        joinUrl: enrollment.courseSchedule.externalRoomJoinUrl,
        startsAt: enrollment.courseSchedule.startsAt,
        endsAt: enrollment.courseSchedule.endsAt,
      }),
    };
  }
}
