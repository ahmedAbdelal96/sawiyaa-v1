import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Verification module uses the notifications tables to record OTP deliveries.
 * This is a thin repository to avoid coupling verification to auth module internals.
 */
@Injectable()
export class VerificationNotificationRepository {
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

  createNotification(data: Prisma.NotificationUncheckedCreateInput) {
    return this.prisma.notification.create({ data });
  }

  updateStatus(
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
}
