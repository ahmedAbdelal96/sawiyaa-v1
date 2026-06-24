import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { AvailabilityPractitionerRepository } from '../repositories/availability-practitioner.repository';
import { AvailabilityWeekOverviewService } from './availability-week-overview.service';
import { ResolvePractitionerTimezoneService } from './resolve-practitioner-timezone.service';

const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;

@Injectable()
export class AvailabilityWeekReminderNotificationSweeperService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private intervalHandle: NodeJS.Timeout | null = null;
  private isSweeping = false;

  constructor(
    private readonly availabilityPractitionerRepository: AvailabilityPractitionerRepository,
    private readonly resolvePractitionerTimezoneService: ResolvePractitionerTimezoneService,
    private readonly availabilityWeekOverviewService: AvailabilityWeekOverviewService,
    private readonly operationalNotificationService: OperationalNotificationService,
    private readonly logger: AppLoggerService,
  ) {}

  onApplicationBootstrap(): void {
    void this.sweepOnce();

    this.intervalHandle = setInterval(() => {
      void this.sweepOnce();
    }, SWEEP_INTERVAL_MS);

    this.intervalHandle.unref?.();
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async sweepOnce(now = new Date()): Promise<number> {
    if (this.isSweeping) {
      return 0;
    }

    this.isSweeping = true;

    try {
      const candidates =
        await this.availabilityPractitionerRepository.findApprovedReminderCandidates();

      let handledPractitioners = 0;

      for (const candidate of candidates) {
        try {
          if (candidate.user.status !== UserStatus.ACTIVE) {
            continue;
          }

          const timezone = this.resolvePractitionerTimezoneService.resolve({
            requestedTimezone: candidate.user.timezone,
            fallbackTimezone: 'UTC',
          });

          const overview =
            await this.availabilityWeekOverviewService.buildForPractitioner({
              practitionerId: candidate.id,
              timezone,
              now,
            });

          if (!overview.shouldPromptForNextWeek) {
            continue;
          }

          const locale = this.resolveLocale(candidate.user.defaultLocale);
          const routePath = `/${locale}/practitioner/availability`;

          await this.operationalNotificationService.queuePractitionerAvailabilityWeekEndingReminder(
            {
              practitionerId: candidate.id,
              userId: candidate.user.id,
              locale,
              routePath,
              currentWeekStartDate: overview.currentWeek.weekStartDate,
              currentWeekEndDate: overview.currentWeek.weekEndDate,
              nextWeekStartDate: overview.nextWeek.weekStartDate,
              daysUntilCurrentWeekEnds:
                overview.daysUntilCurrentWeekEnds ?? 0,
              shouldPromptForNextWeek: overview.shouldPromptForNextWeek,
              nextWeekPublished: overview.nextWeekPublished,
              scheduledFor: now,
            },
          );

          handledPractitioners += 1;
        } catch (error) {
          this.logger.error(
            {
              message: 'Failed to process availability week reminder sweep item',
              practitionerId: candidate.id,
              error: error instanceof Error ? error : new Error(String(error)),
            },
            undefined,
            'Availability',
          );
        }
      }

      return handledPractitioners;
    } finally {
      this.isSweeping = false;
    }
  }

  private resolveLocale(raw: string | null): SupportedLocale {
    return raw === 'ar' ? 'ar' : 'en';
  }
}
