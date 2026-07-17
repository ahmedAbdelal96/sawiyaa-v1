import { Injectable } from '@nestjs/common';
import { NotificationCategory, UserRoleType, UserStatus } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { NotificationIntentWriterService } from '@modules/notifications/services/notification-intent-writer.service';

@Injectable()
export class AcademyProgramTargetLearnerAlertService {
  private readonly adminNotificationSlug =
    'admin.practitioner-application-approved';

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationIntentWriterService: NotificationIntentWriterService,
    private readonly i18nService: I18nService,
  ) {}

  async notifyIfTargetExceeded(input: {
    program: {
      id: string;
      slug: string;
      titleAr: string;
      titleEn: string;
      maxSeats: number | null;
    };
    previousActiveLearnerCount: number;
    currentActiveLearnerCount: number;
  }) {
    const targetLearnerCount = input.program.maxSeats;
    if (targetLearnerCount === null) {
      return;
    }

    if (
      input.previousActiveLearnerCount > targetLearnerCount ||
      input.currentActiveLearnerCount <= targetLearnerCount
    ) {
      return;
    }

    const admins = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        roles: {
          some: {
            role: {
              in: [UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN],
            },
          },
        },
      },
      select: {
        id: true,
        defaultLocale: true,
      },
    });

    if (admins.length === 0) {
      return;
    }

    const routePath = `/admin/academy/programs/${input.program.id}`;
    const idempotencyKey = `academy-program-target-exceeded:${input.program.id}:${targetLearnerCount}`;

    await Promise.all(
      admins.map((admin) =>
        this.notificationIntentWriterService.createInAppNotification({
          slug: this.adminNotificationSlug,
          userId: admin.id,
          locale: admin.defaultLocale as SupportedLocale | null,
          title: this.i18nService.t(
            'academyProgram.notifications.targetLearnerThresholdExceededTitle',
            admin.defaultLocale as SupportedLocale | undefined,
            {
              programTitle: this.resolveProgramTitle(
                input.program,
                admin.defaultLocale as SupportedLocale | undefined,
              ),
            },
          ),
          body: this.i18nService.t(
            'academyProgram.notifications.targetLearnerThresholdExceededBody',
            admin.defaultLocale as SupportedLocale | undefined,
            {
              programTitle: this.resolveProgramTitle(
                input.program,
                admin.defaultLocale as SupportedLocale | undefined,
              ),
              targetLearnerCount,
              activeLearnerCount: input.currentActiveLearnerCount,
            },
          ),
          payload: {
            programId: input.program.id,
            programSlug: input.program.slug,
            routePath,
            targetLearnerCount,
            activeLearnerCount: input.currentActiveLearnerCount,
            previousActiveLearnerCount: input.previousActiveLearnerCount,
          },
          relatedEntityType: 'AcademyProgram',
          relatedEntityId: input.program.id,
          idempotencyKey,
          category: NotificationCategory.SYSTEM,
        }),
      ),
    );
  }

  private resolveProgramTitle(
    program: {
      titleAr: string;
      titleEn: string;
      slug: string;
    },
    locale?: SupportedLocale | null,
  ) {
    const titleAr = program.titleAr.trim();
    const titleEn = program.titleEn.trim();

    if (locale === 'ar') {
      return titleAr || titleEn || program.slug;
    }

    return titleEn || titleAr || program.slug;
  }
}
