import { Injectable } from '@nestjs/common';
import { EnrollmentStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';

@Injectable()
export class OrchestrateTrainingEnrollmentPaymentStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operationalNotificationService: OperationalNotificationService,
  ) {}

  async markEnrollmentActiveFromPayment(paymentId: string): Promise<void> {
    const updated = await this.prisma.enrollment.updateMany({
      where: {
        paymentId,
        enrollmentStatus: EnrollmentStatus.PENDING_PAYMENT,
      },
      data: {
        enrollmentStatus: EnrollmentStatus.ACTIVE,
        paymentStatus: PaymentStatus.CAPTURED,
      },
    });

    if (updated.count <= 0) {
      return;
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        paymentId,
        enrollmentStatus: EnrollmentStatus.ACTIVE,
      },
      select: {
        id: true,
        userId: true,
        courseScheduleId: true,
        courseSchedule: {
          select: {
            startsAt: true,
          },
        },
      },
    });

    if (!enrollment) {
      return;
    }

    await this.operationalNotificationService.notifyTrainingEnrollmentConfirmed({
      userId: enrollment.userId,
      enrollmentId: enrollment.id,
      scheduleId: enrollment.courseScheduleId,
      scheduledStartAt: enrollment.courseSchedule.startsAt,
    });

    if (enrollment.courseSchedule.startsAt) {
      const scheduledFor = new Date(
        enrollment.courseSchedule.startsAt.getTime() - 24 * 60 * 60 * 1000,
      );
      if (scheduledFor > new Date()) {
        await this.operationalNotificationService.queueTrainingScheduleReminder({
          userId: enrollment.userId,
          enrollmentId: enrollment.id,
          scheduleId: enrollment.courseScheduleId,
          scheduledFor,
          scheduledStartAt: enrollment.courseSchedule.startsAt,
        });
      }
    }
  }

  async markEnrollmentPaymentFailed(paymentId: string): Promise<void> {
    await this.prisma.enrollment.updateMany({
      where: {
        paymentId,
        enrollmentStatus: EnrollmentStatus.PENDING_PAYMENT,
      },
      data: {
        paymentStatus: PaymentStatus.FAILED,
      },
    });
  }

  async markEnrollmentPaymentExpired(paymentId: string): Promise<void> {
    await this.prisma.enrollment.updateMany({
      where: {
        paymentId,
        enrollmentStatus: EnrollmentStatus.PENDING_PAYMENT,
      },
      data: {
        paymentStatus: PaymentStatus.EXPIRED,
      },
    });
  }
}
