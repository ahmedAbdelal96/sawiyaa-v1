import { Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentAttendanceStatus, EnrollmentStatus } from '@prisma/client';
import { MarkTrainingEnrollmentAttendanceDto, TrainingAttendanceMarkStatus } from '../dto/mark-training-enrollment-attendance.dto';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';
import { ValidateTrainingEnrollmentAttendanceMutationService } from '../services/validate-training-enrollment-attendance-mutation.service';

@Injectable()
export class MarkTrainingEnrollmentAttendanceUseCase {
  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly validateTrainingEnrollmentAttendanceMutationService: ValidateTrainingEnrollmentAttendanceMutationService,
    private readonly trainingPresenter: TrainingPresenter,
  ) {}

  async execute(input: {
    courseId: string;
    enrollmentId: string;
    payload: MarkTrainingEnrollmentAttendanceDto;
  }) {
    const enrollment = await this.trainingRepository.findEnrollmentByIdForAdmin(
      input.enrollmentId,
    );
    if (!enrollment || enrollment.courseId !== input.courseId) {
      throw new NotFoundException({
        messageKey: 'training.errors.enrollmentNotFound',
        error: 'TRAINING_ENROLLMENT_NOT_FOUND',
      });
    }

    this.validateTrainingEnrollmentAttendanceMutationService.assertCanMark({
      enrollmentStatus: enrollment.enrollmentStatus,
      scheduleStatus: enrollment.courseSchedule.status,
      scheduleStartsAt: enrollment.courseSchedule.startsAt,
      targetStatus: input.payload.status,
    });

    const isAttended = input.payload.status === TrainingAttendanceMarkStatus.ATTENDED;
    await this.trainingRepository.updateEnrollment(enrollment.id, {
      attendanceStatus: isAttended
        ? EnrollmentAttendanceStatus.ATTENDED
        : EnrollmentAttendanceStatus.MISSED,
      enrollmentStatus: isAttended
        ? EnrollmentStatus.COMPLETED
        : EnrollmentStatus.NO_SHOW,
      completedAt: isAttended ? new Date() : null,
    });

    const refreshed = await this.trainingRepository.findEnrollmentByIdForAdmin(
      enrollment.id,
    );
    if (!refreshed) {
      throw new NotFoundException({
        messageKey: 'training.errors.enrollmentNotFound',
        error: 'TRAINING_ENROLLMENT_NOT_FOUND',
      });
    }

    return {
      item: this.trainingPresenter.presentAdminScheduleEnrollmentItem(refreshed),
    };
  }
}
