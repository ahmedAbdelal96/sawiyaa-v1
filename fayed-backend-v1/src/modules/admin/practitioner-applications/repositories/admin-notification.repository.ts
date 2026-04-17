import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Minimal notification persistence abstraction for admin practitioner-application decisions.
 * If notification-type seeds are missing, upper layers can fail open by design.
 */
@Injectable()
export class AdminNotificationRepository {
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
}
