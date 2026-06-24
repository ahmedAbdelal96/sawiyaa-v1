import { BadRequestException } from '@nestjs/common';
import { CourseScheduleStatus, EnrollmentStatus } from '@prisma/client';
import { TrainingAttendanceMarkStatus } from '../dto/mark-training-enrollment-attendance.dto';
import { ValidateTrainingEnrollmentAttendanceMutationService } from './validate-training-enrollment-attendance-mutation.service';

describe('ValidateTrainingEnrollmentAttendanceMutationService', () => {
  const service = new ValidateTrainingEnrollmentAttendanceMutationService();

  it('rejects attendance mark for pending payment enrollment', () => {
    expect(() =>
      service.assertCanMark({
        enrollmentStatus: EnrollmentStatus.PENDING_PAYMENT,
        scheduleStatus: CourseScheduleStatus.STARTED,
        scheduleStartsAt: new Date('2026-05-01T10:00:00.000Z'),
        targetStatus: TrainingAttendanceMarkStatus.ATTENDED,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects attendance mark before schedule start', () => {
    expect(() =>
      service.assertCanMark({
        enrollmentStatus: EnrollmentStatus.ACTIVE,
        scheduleStatus: CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
        scheduleStartsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        targetStatus: TrainingAttendanceMarkStatus.NO_SHOW,
      }),
    ).toThrow(BadRequestException);
  });
});
