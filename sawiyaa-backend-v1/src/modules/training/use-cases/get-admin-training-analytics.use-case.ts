import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CourseScheduleStatus,
  EnrollmentAttendanceStatus,
  EnrollmentStatus,
  PaymentStatus,
} from '@prisma/client';
import { TrainingRepository } from '../repositories/training.repository';
import { BuildTrainingScheduleSnapshotsService } from '../services/build-training-schedule-snapshots.service';

function roundPercent(value: number) {
  return Math.round(value * 1000) / 10;
}

function sumRecord(record: Record<string, number> | undefined) {
  if (!record) return 0;
  return Object.values(record).reduce((sum, current) => sum + current, 0);
}

@Injectable()
export class GetAdminTrainingAnalyticsUseCase {
  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly buildTrainingScheduleSnapshotsService: BuildTrainingScheduleSnapshotsService,
  ) {}

  async execute(input: { courseId: string }) {
    const course = await this.trainingRepository.findCourseById(input.courseId);
    if (!course) {
      throw new NotFoundException({
        messageKey: 'training.errors.notFound',
        error: 'TRAINING_NOT_FOUND',
      });
    }

    const scheduleIds = course.schedules.map((schedule) => schedule.id);
    const [
      allEnrollmentsByScheduleId,
      occupiedEnrollmentsByScheduleId,
      activeEnrollmentsByScheduleId,
      completedEnrollmentsByScheduleId,
      pendingPaymentEnrollmentsByScheduleId,
      paidEnrollmentsByScheduleId,
      lectureCountsByScheduleId,
      attendanceCountsByScheduleId,
      paymentAttempts,
    ] = await Promise.all([
      this.trainingRepository.countAllEnrollmentsByScheduleIds(scheduleIds),
      this.trainingRepository.countEnrollmentsByScheduleIds(scheduleIds),
      this.trainingRepository.countEnrollmentsByScheduleIds(scheduleIds, [
        EnrollmentStatus.ACTIVE,
      ]),
      this.trainingRepository.countEnrollmentsByScheduleIds(scheduleIds, [
        EnrollmentStatus.COMPLETED,
      ]),
      this.trainingRepository.countEnrollmentsByScheduleIds(scheduleIds, [
        EnrollmentStatus.PENDING_PAYMENT,
      ]),
      this.trainingRepository.countEnrollmentsByScheduleIds(scheduleIds, [
        EnrollmentStatus.ACTIVE,
        EnrollmentStatus.COMPLETED,
        EnrollmentStatus.NO_SHOW,
        EnrollmentStatus.REFUNDED,
      ]),
      this.trainingRepository.countSessionsByScheduleIds(scheduleIds),
      this.trainingRepository.countAttendanceByScheduleIds(scheduleIds),
      this.trainingRepository.listPaymentAttemptsByCourseIdForAnalytics(
        input.courseId,
      ),
    ]);

    const scheduleItems = this.buildTrainingScheduleSnapshotsService.build({
      schedules: course.schedules,
      defaultCapacity: course.maxEnrollments ?? null,
      enrollmentCountsByScheduleId: occupiedEnrollmentsByScheduleId,
      lectureCountsByScheduleId,
    });
    const endedStatuses: CourseScheduleStatus[] = [
      CourseScheduleStatus.COMPLETED,
      CourseScheduleStatus.CANCELLED,
      CourseScheduleStatus.ARCHIVED,
    ];

    const paymentAttemptsByScheduleId = paymentAttempts.reduce<
      Record<string, { failed: number; abandoned: number }>
    >((acc, current) => {
      const scheduleId = current.enrollment.courseScheduleId;
      if (!acc[scheduleId]) {
        acc[scheduleId] = { failed: 0, abandoned: 0 };
      }

      if (current.status === PaymentStatus.FAILED) {
        acc[scheduleId].failed += 1;
      }

      if (
        current.status === PaymentStatus.CREATED ||
        current.status === PaymentStatus.PENDING ||
        current.status === PaymentStatus.REQUIRES_ACTION ||
        current.status === PaymentStatus.EXPIRED
      ) {
        acc[scheduleId].abandoned += 1;
      }

      return acc;
    }, {});

    const cohorts = scheduleItems.map((schedule) => {
      const totalEnrollments = allEnrollmentsByScheduleId[schedule.id] ?? 0;
      const occupiedSeats = occupiedEnrollmentsByScheduleId[schedule.id] ?? 0;
      const paidEnrollments = paidEnrollmentsByScheduleId[schedule.id] ?? 0;
      const activeEnrollments = activeEnrollmentsByScheduleId[schedule.id] ?? 0;
      const completedEnrollments =
        completedEnrollmentsByScheduleId[schedule.id] ?? 0;
      const pendingPaymentEnrollments =
        pendingPaymentEnrollmentsByScheduleId[schedule.id] ?? 0;
      const failedPaymentAttempts =
        paymentAttemptsByScheduleId[schedule.id]?.failed ?? 0;
      const abandonedPaymentAttempts =
        paymentAttemptsByScheduleId[schedule.id]?.abandoned ?? 0;
      const attendanceCounts = attendanceCountsByScheduleId[schedule.id] ?? {};
      const attendanceCompletedEnrollments =
        (attendanceCounts[EnrollmentAttendanceStatus.ATTENDED] ?? 0) +
        (attendanceCounts[EnrollmentAttendanceStatus.PARTIALLY_ATTENDED] ?? 0);
      const totalSeats = schedule.maxEnrollments ?? 0;

      return {
        scheduleId: schedule.id,
        scheduleCode: schedule.scheduleCode,
        status: schedule.status,
        plannedDurationDays: schedule.plannedDurationDays,
        plannedLectureCount: schedule.plannedLectureCount,
        lectureCount: schedule.lectureCount,
        isLecturePlanComplete: schedule.isLecturePlanComplete,
        totalEnrollments,
        paidEnrollments,
        pendingPaymentEnrollments,
        failedPaymentAttempts,
        abandonedPaymentAttempts,
        attendanceCompletedEnrollments,
        attendanceCompletionRate: totalEnrollments
          ? roundPercent(attendanceCompletedEnrollments / totalEnrollments)
          : 0,
        paymentConversionRate: totalEnrollments
          ? roundPercent(paidEnrollments / totalEnrollments)
          : 0,
        occupancyRate: totalSeats
          ? roundPercent(occupiedSeats / totalSeats)
          : 0,
      };
    });

    const totalSchedules = scheduleItems.length;
    const openSchedules = scheduleItems.filter(
      (schedule) => schedule.isEnrollmentOpen,
    ).length;
    const endedSchedules = scheduleItems.filter((schedule) =>
      endedStatuses.includes(schedule.status),
    ).length;
    const totalLectures = scheduleItems.reduce(
      (sum, schedule) => sum + (schedule.lectureCount ?? 0),
      0,
    );
    const totalEnrollments = sumRecord(allEnrollmentsByScheduleId);
    const activeEnrollments = sumRecord(activeEnrollmentsByScheduleId);
    const completedEnrollments = sumRecord(completedEnrollmentsByScheduleId);
    const pendingPaymentEnrollments = sumRecord(
      pendingPaymentEnrollmentsByScheduleId,
    );
    const paidEnrollments = sumRecord(paidEnrollmentsByScheduleId);
    const failedPaymentAttempts = cohorts.reduce(
      (sum, cohort) => sum + cohort.failedPaymentAttempts,
      0,
    );
    const abandonedPaymentAttempts = cohorts.reduce(
      (sum, cohort) => sum + cohort.abandonedPaymentAttempts,
      0,
    );
    const attendanceCompletedEnrollments = cohorts.reduce(
      (sum, cohort) => sum + cohort.attendanceCompletedEnrollments,
      0,
    );

    return {
      totalSchedules,
      openSchedules,
      endedSchedules,
      totalLectures,
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      pendingPaymentEnrollments,
      paidEnrollments,
      failedPaymentAttempts,
      abandonedPaymentAttempts,
      attendanceCompletedEnrollments,
      attendanceCompletionRate: totalEnrollments
        ? roundPercent(attendanceCompletedEnrollments / totalEnrollments)
        : 0,
      paymentConversionRate: totalEnrollments
        ? roundPercent(paidEnrollments / totalEnrollments)
        : 0,
      cohorts,
    };
  }
}
