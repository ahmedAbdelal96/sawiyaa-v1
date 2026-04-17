import { Injectable } from '@nestjs/common';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class OperationalNotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findTypeBySlug(slug: string) {
    return this.prisma.notificationType.findUnique({
      where: { slug },
      include: {
        templates: {
          where: { isActive: true },
          orderBy: [{ channel: 'asc' }, { version: 'desc' }],
        },
      },
    });
  }

  findPatientRecipient(patientProfileId: string) {
    return this.prisma.patientProfile.findUnique({
      where: { id: patientProfileId },
      select: {
        user: {
          select: {
            id: true,
            displayName: true,
            defaultLocale: true,
            emails: {
              where: { isPrimary: true },
              take: 1,
              select: {
                email: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });
  }

  findPractitionerRecipient(practitionerProfileId: string) {
    return this.prisma.practitionerProfile.findUnique({
      where: { id: practitionerProfileId },
      select: {
        user: {
          select: {
            id: true,
            displayName: true,
            defaultLocale: true,
            emails: {
              where: { isPrimary: true },
              take: 1,
              select: {
                email: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });
  }

  findUserRecipient(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        defaultLocale: true,
        emails: {
          where: { isPrimary: true },
          take: 1,
          select: {
            email: true,
            isVerified: true,
          },
        },
      },
    });
  }

  findPreference(input: {
    userId: string;
    notificationTypeId: string;
    channel: NotificationChannel;
  }) {
    return this.prisma.notificationPreference.findUnique({
      where: {
        userId_notificationTypeId_channel: {
          userId: input.userId,
          notificationTypeId: input.notificationTypeId,
          channel: input.channel,
        },
      },
      select: {
        isEnabled: true,
      },
    });
  }

  createNotification(data: Prisma.NotificationUncheckedCreateInput) {
    return this.prisma.notification.create({ data });
  }

  updateNotificationStatus(
    notificationId: string,
    data: Pick<
      Prisma.NotificationUpdateInput,
      'status' | 'sentAt' | 'failedAt' | 'suppressedReason'
    >,
  ) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data,
    });
  }

  listDueNotificationIds(input: { now: Date; limit: number }) {
    return this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.PENDING,
        scheduledFor: {
          not: null,
          lte: input.now,
        },
      },
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
      take: input.limit,
      select: {
        id: true,
      },
    });
  }

  claimNotificationForExecution(input: { notificationId: string; now: Date }) {
    return this.prisma.notification.updateMany({
      where: {
        id: input.notificationId,
        status: NotificationStatus.PENDING,
        scheduledFor: {
          not: null,
          lte: input.now,
        },
      },
      data: {
        status: NotificationStatus.QUEUED,
      },
    });
  }

  findQueuedNotificationForExecution(notificationId: string) {
    return this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        status: NotificationStatus.QUEUED,
      },
      select: {
        id: true,
        userId: true,
        channel: true,
        status: true,
        titleSnapshot: true,
        subjectSnapshot: true,
        bodySnapshot: true,
        payloadJson: true,
        relatedEntityType: true,
        relatedEntityId: true,
        notificationType: {
          select: {
            slug: true,
            category: true,
          },
        },
      },
    });
  }

  getNextDeliveryAttemptNumber(notificationId: string) {
    return this.prisma.notificationDeliveryAttempt.count({
      where: { notificationId },
    });
  }

  createDeliveryAttempt(data: Prisma.NotificationDeliveryAttemptCreateInput) {
    return this.prisma.notificationDeliveryAttempt.create({ data });
  }

  updateDeliveryAttempt(
    attemptId: string,
    data: Prisma.NotificationDeliveryAttemptUpdateInput,
  ) {
    return this.prisma.notificationDeliveryAttempt.update({
      where: { id: attemptId },
      data,
    });
  }

  markQueuedNotificationSent(input: { notificationId: string; sentAt: Date }) {
    return this.prisma.notification.updateMany({
      where: {
        id: input.notificationId,
        status: NotificationStatus.QUEUED,
      },
      data: {
        status: NotificationStatus.SENT,
        scheduledFor: null,
        sentAt: input.sentAt,
        failedAt: null,
        suppressedReason: null,
      },
    });
  }

  rescheduleQueuedNotificationForRetry(input: {
    notificationId: string;
    retryAt: Date;
  }) {
    return this.prisma.notification.updateMany({
      where: {
        id: input.notificationId,
        status: NotificationStatus.QUEUED,
      },
      data: {
        status: NotificationStatus.PENDING,
        scheduledFor: input.retryAt,
        failedAt: null,
      },
    });
  }

  markQueuedNotificationFailed(input: {
    notificationId: string;
    failedAt: Date;
    reason: string;
  }) {
    return this.prisma.notification.updateMany({
      where: {
        id: input.notificationId,
        status: NotificationStatus.QUEUED,
      },
      data: {
        status: NotificationStatus.FAILED,
        scheduledFor: null,
        failedAt: input.failedAt,
        suppressedReason: input.reason.slice(0, 500),
      },
    });
  }

  markQueuedNotificationSuppressed(input: {
    notificationId: string;
    reason: string;
  }) {
    return this.prisma.notification.updateMany({
      where: {
        id: input.notificationId,
        status: NotificationStatus.QUEUED,
      },
      data: {
        status: NotificationStatus.SUPPRESSED,
        scheduledFor: null,
        suppressedReason: input.reason.slice(0, 500),
      },
    });
  }

  findSessionDeliveryGuardState(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        status: true,
      },
    });
  }

  findTrainingEnrollmentDeliveryGuardState(enrollmentId: string) {
    return this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        enrollmentStatus: true,
        courseSchedule: {
          select: {
            status: true,
          },
        },
      },
    });
  }

  findPaymentDeliveryGuardState(paymentId: string) {
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        status: true,
      },
    });
  }

  findRefundDeliveryGuardState(refundId: string) {
    return this.prisma.refund.findUnique({
      where: { id: refundId },
      select: {
        status: true,
      },
    });
  }

  listOperationalNotifications(input: {
    statuses: NotificationStatus[];
    channel?: NotificationChannel;
    category?: NotificationCategory;
    scheduledFrom?: Date;
    scheduledTo?: Date;
    page: number;
    limit: number;
  }) {
    const skip = (input.page - 1) * input.limit;
    const where: Prisma.NotificationWhereInput = {
      status: { in: input.statuses },
      channel: input.channel,
      notificationType: input.category
        ? {
            category: input.category,
          }
        : undefined,
      scheduledFor:
        input.scheduledFrom || input.scheduledTo
          ? {
              gte: input.scheduledFrom,
              lte: input.scheduledTo,
            }
          : undefined,
    };

    return this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ scheduledFor: 'asc' }, { updatedAt: 'desc' }],
        skip,
        take: input.limit,
        select: {
          id: true,
          status: true,
          channel: true,
          userId: true,
          relatedEntityType: true,
          relatedEntityId: true,
          scheduledFor: true,
          sentAt: true,
          failedAt: true,
          suppressedReason: true,
          createdAt: true,
          updatedAt: true,
          notificationType: {
            select: {
              category: true,
              slug: true,
            },
          },
          _count: {
            select: {
              deliveryAttempts: true,
            },
          },
          deliveryAttempts: {
            orderBy: { attemptedAt: 'desc' },
            take: 1,
            select: {
              status: true,
              errorCode: true,
              attemptedAt: true,
            },
          },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);
  }

  findOperationalNotificationById(notificationId: string) {
    return this.prisma.notification.findUnique({
      where: {
        id: notificationId,
      },
      select: {
        id: true,
        status: true,
        channel: true,
        userId: true,
        locale: true,
        titleSnapshot: true,
        subjectSnapshot: true,
        bodySnapshot: true,
        relatedEntityType: true,
        relatedEntityId: true,
        scheduledFor: true,
        sentAt: true,
        failedAt: true,
        suppressedReason: true,
        createdAt: true,
        updatedAt: true,
        notificationType: {
          select: {
            category: true,
            slug: true,
          },
        },
        deliveryAttempts: {
          orderBy: { attemptedAt: 'desc' },
          take: 20,
          select: {
            id: true,
            attemptNumber: true,
            status: true,
            provider: true,
            errorCode: true,
            errorMessage: true,
            attemptedAt: true,
          },
        },
      },
    });
  }
}
