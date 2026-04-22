import { BadRequestException, Injectable } from '@nestjs/common';
import { CourseScheduleStatus, EnrollmentStatus } from '@prisma/client';
import { TrainingAttendanceMarkStatus } from '../dto/mark-training-enrollment-attendance.dto';

@Injectable()
export class ValidateTrainingEnrollmentAttendanceMutationService {
  assertCanMark(input: {
    enrollmentStatus: EnrollmentStatus;
    scheduleStatus: CourseScheduleStatus;
    scheduleStartsAt: Date | null;
    targetStatus: TrainingAttendanceMarkStatus;
    now?: Date;
  }) {
    const now = input.now ?? new Date();

    if (
      input.enrollmentStatus === EnrollmentStatus.PENDING_PAYMENT ||
      input.enrollmentStatus === EnrollmentStatus.CANCELLED ||
      input.enrollmentStatus === EnrollmentStatus.REFUNDED
    ) {
      throw new BadRequestException({
        messageKey:
          'training.errors.attendanceMutationNotAllowedForEnrollmentState',
        error: 'TRAINING_ATTENDANCE_MUTATION_NOT_ALLOWED_FOR_ENROLLMENT_STATE',
      });
    }

    if (
      input.scheduleStatus === CourseScheduleStatus.CANCELLED ||
      input.scheduleStatus === CourseScheduleStatus.ARCHIVED
    ) {
      throw new BadRequestException({
        messageKey:
          'training.errors.attendanceMutationNotAllowedForScheduleState',
        error: 'TRAINING_ATTENDANCE_MUTATION_NOT_ALLOWED_FOR_SCHEDULE_STATE',
      });
    }

    if (input.scheduleStartsAt && now < input.scheduleStartsAt) {
      throw new BadRequestException({
        messageKey: 'training.errors.attendanceCannotBeMarkedBeforeStart',
        error: 'TRAINING_ATTENDANCE_CANNOT_BE_MARKED_BEFORE_START',
      });
    }

    if (
      input.targetStatus === TrainingAttendanceMarkStatus.ATTENDED &&
      input.enrollmentStatus === EnrollmentStatus.NO_SHOW
    ) {
      return;
    }

    if (
      input.targetStatus === TrainingAttendanceMarkStatus.NO_SHOW &&
      input.enrollmentStatus === EnrollmentStatus.COMPLETED
    ) {
      return;
    }
  }
}
