import { Injectable } from '@nestjs/common';
import { NotificationCategory, UserRoleType } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { NotificationIntentWriterService } from '@modules/notifications/services/notification-intent-writer.service';

@Injectable()
export class ModerationNotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationWriter: NotificationIntentWriterService,
  ) {}

  async notifyReportCreated(input: {
    reportId: string;
    reporterUserId: string;
  }) {
    const reviewers = await this.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              in: [
                UserRoleType.ADMIN,
                UserRoleType.SUPER_ADMIN,
                UserRoleType.SUPPORT,
                UserRoleType.CONTENT_REVIEWER,
              ],
            },
          },
        },
      },
      select: { id: true, defaultLocale: true },
    });
    await Promise.all(
      reviewers.map((reviewer) =>
        this.notificationWriter.createInAppNotification({
          slug: 'moderation.report-created',
          userId: reviewer.id,
          locale: reviewer.defaultLocale === 'ar' ? 'ar' : 'en',
          title:
            reviewer.defaultLocale === 'ar'
              ? 'بلاغ إشراف جديد'
              : 'New moderation report',
          body:
            reviewer.defaultLocale === 'ar'
              ? 'يوجد بلاغ جديد يحتاج إلى مراجعة.'
              : 'A new report is ready for review.',
          payload: { reportId: input.reportId },
          relatedEntityType: 'MODERATION_REPORT',
          relatedEntityId: input.reportId,
          idempotencyKey: `moderation.report-created:${input.reportId}:${reviewer.id}`,
          category: NotificationCategory.SECURITY,
        }),
      ),
    );
  }

  async notifyReportReviewed(input: {
    reportId: string;
    reporterUserId: string;
  }) {
    const reporter = await this.prisma.user.findUnique({
      where: { id: input.reporterUserId },
      select: { id: true, defaultLocale: true },
    });
    if (!reporter) return;
    await this.notificationWriter.createInAppNotification({
      slug: 'moderation.report-reviewed',
      userId: reporter.id,
      locale: reporter.defaultLocale === 'ar' ? 'ar' : 'en',
      title:
        reporter.defaultLocale === 'ar'
          ? 'تمت مراجعة البلاغ'
          : 'Report reviewed',
      body:
        reporter.defaultLocale === 'ar'
          ? 'تمت مراجعة البلاغ من فريق الإشراف.'
          : 'Your report has been reviewed by the moderation team.',
      payload: { reportId: input.reportId },
      relatedEntityType: 'MODERATION_REPORT',
      relatedEntityId: input.reportId,
      idempotencyKey: `moderation.report-reviewed:${input.reportId}`,
      category: NotificationCategory.SECURITY,
    });
  }
}
