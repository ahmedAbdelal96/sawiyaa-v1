import {
  ConflictException,
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  NotificationCategory,
  SessionEventType,
  SessionStatus,
} from '@prisma/client';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { I18nService } from '@common/i18n/services/i18n.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { NotificationIntentWriterService } from '@modules/notifications/services/notification-intent-writer.service';
import { ResolveSessionJoinReadinessService } from './resolve-session-join-readiness.service';
import { SESSION_JOIN_LAG_MINUTES } from '../utils/session-join-policy.util';
import {
  SessionRepository,
  type SessionJoinNotificationCandidate,
} from '../repositories/session.repository';
import { SessionVideoProviderRegistryService } from './session-video-provider-registry.service';
import { SessionVideoProviderResolverService } from './session-video-provider-resolver.service';
import { ValidateSessionStatusTransitionService } from './validate-session-status-transition.service';

const SWEEP_INTERVAL_MS = 60_000;
const SWEEP_BATCH_SIZE = 50;

@Injectable()
export class SessionJoinAvailableNotificationSweeperService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private intervalHandle: NodeJS.Timeout | null = null;
  private isSweeping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
    private readonly resolveSessionJoinReadinessService: ResolveSessionJoinReadinessService,
    private readonly sessionVideoProviderRegistryService: SessionVideoProviderRegistryService,
    private readonly sessionVideoProviderResolverService: SessionVideoProviderResolverService,
    private readonly validateSessionStatusTransitionService: ValidateSessionStatusTransitionService,
    private readonly notificationIntentWriterService: NotificationIntentWriterService,
    private readonly i18nService: I18nService,
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
      const windowStart = new Date(
        now.getTime() - SESSION_JOIN_LAG_MINUTES * 60_000,
      );

      const candidates =
        await this.sessionRepository.listJoinNotificationCandidates({
          now,
          windowStart,
          take: SWEEP_BATCH_SIZE,
        });

      let handledSessions = 0;

      for (const candidate of candidates) {
        try {
          const handled = await this.handleCandidate(candidate, now);
          if (handled) {
            handledSessions += 1;
          }
        } catch (error) {
          this.logger.error(
            {
              message: 'Failed to process join-available session sweep item',
              sessionId: candidate.id,
              error: error instanceof Error ? error : new Error(String(error)),
            },
            undefined,
            'Sessions',
          );
        }
      }

      if (handledSessions > 0) {
        this.logger.info(
          {
            message: 'Join-available session sweep completed',
            handledSessions,
          },
          undefined,
          'Sessions',
        );
      }

      return handledSessions;
    } finally {
      this.isSweeping = false;
    }
  }

  private async handleCandidate(
    candidate: SessionJoinNotificationCandidate,
    now: Date,
  ): Promise<boolean> {
    const currentSession = await this.ensureRuntimePreparedIfNeeded(
      candidate,
      now,
    );
    const readiness = this.resolveSessionJoinReadinessService.resolve({
      status: currentSession.status,
      sessionMode: currentSession.sessionMode,
      scheduledStartAt: currentSession.scheduledStartAt,
      scheduledEndAt: currentSession.scheduledEndAt,
      provider: currentSession.provider,
      providerRoomId: currentSession.providerRoomId,
      providerSessionRef: currentSession.providerSessionRef,
      now,
    });

    if (!readiness.canJoin) {
      return false;
    }

    const session =
      currentSession.status === SessionStatus.CONFIRMED ||
      currentSession.status === SessionStatus.UPCOMING
        ? await this.promoteSessionToReadyToJoin(currentSession)
        : currentSession;

    const localePatient = this.resolveLocale(
      candidate.patient.user.defaultLocale,
    );
    const localePractitioner = this.resolveLocale(
      candidate.practitioner.user.defaultLocale,
    );
    const patientEmail = this.resolveVerifiedPrimaryEmail(
      candidate.patient.user.emails,
    );
    const practitionerEmail = this.resolveVerifiedPrimaryEmail(
      candidate.practitioner.user.emails,
    );
    const packageContext = candidate.packagePurchase
      ? {
          packagePurchaseId: candidate.packagePurchase.id,
          packagePlanCode: candidate.packagePurchase.packagePlan?.code ?? '',
          packagePlanTitle:
            candidate.packagePurchase.packagePlan?.title ?? null,
          packageSessionIndex: session.packageSessionIndex ?? null,
          packageSessionCount: session.packageSessionCount ?? null,
          packageDiscountPercent:
            candidate.packagePurchase.packagePlan?.discountPercent == null
              ? null
              : Number(candidate.packagePurchase.packagePlan.discountPercent),
        }
      : null;

    await Promise.all([
      this.createJoinAvailableNotification({
        sessionId: session.id,
        userId: candidate.patient.user.id,
        locale: localePatient,
        recipientRole: 'PATIENT',
        routePath: `/${localePatient}/patient/sessions/${session.id}`,
        scheduledStartAt: session.scheduledStartAt,
        joinOpenAt: session.joinOpenAt,
        packageContext,
      }),
      this.createJoinAvailablePushNotification({
        sessionId: session.id,
        userId: candidate.patient.user.id,
        locale: localePatient,
        recipientRole: 'PATIENT',
        routePath: `/${localePatient}/patient/sessions/${session.id}`,
        scheduledStartAt: session.scheduledStartAt,
        joinOpenAt: session.joinOpenAt,
        packageContext,
      }),
      this.createJoinAvailableNotification({
        sessionId: session.id,
        userId: candidate.practitioner.user.id,
        locale: localePractitioner,
        recipientRole: 'PRACTITIONER',
        routePath: `/${localePractitioner}/practitioner/sessions/${session.id}`,
        scheduledStartAt: session.scheduledStartAt,
        joinOpenAt: session.joinOpenAt,
        packageContext,
      }),
      this.createJoinAvailablePushNotification({
        sessionId: session.id,
        userId: candidate.practitioner.user.id,
        locale: localePractitioner,
        recipientRole: 'PRACTITIONER',
        routePath: `/${localePractitioner}/practitioner/sessions/${session.id}`,
        scheduledStartAt: session.scheduledStartAt,
        joinOpenAt: session.joinOpenAt,
        packageContext,
      }),
      this.createJoinAvailableEmailNotification({
        sessionId: session.id,
        userId: candidate.patient.user.id,
        email: patientEmail,
        locale: localePatient,
        recipientRole: 'PATIENT',
        routePath: `/${localePatient}/patient/sessions/${session.id}`,
        scheduledStartAt: session.scheduledStartAt,
        joinOpenAt: session.joinOpenAt,
        packageContext,
      }),
      this.createJoinAvailableEmailNotification({
        sessionId: session.id,
        userId: candidate.practitioner.user.id,
        email: practitionerEmail,
        locale: localePractitioner,
        recipientRole: 'PRACTITIONER',
        routePath: `/${localePractitioner}/practitioner/sessions/${session.id}`,
        scheduledStartAt: session.scheduledStartAt,
        joinOpenAt: session.joinOpenAt,
        packageContext,
      }),
    ]);

    return true;
  }

  private async ensureRuntimePreparedIfNeeded(
    candidate: SessionJoinNotificationCandidate,
    now: Date,
  ): Promise<SessionJoinNotificationCandidate> {
    const readiness = this.resolveSessionJoinReadinessService.resolve({
      status: candidate.status,
      sessionMode: candidate.sessionMode,
      scheduledStartAt: candidate.scheduledStartAt,
      scheduledEndAt: candidate.scheduledEndAt,
      provider: candidate.provider,
      providerRoomId: candidate.providerRoomId,
      providerSessionRef: candidate.providerSessionRef,
      now,
    });

    if (candidate.providerRoomId && candidate.providerSessionRef) {
      return candidate;
    }

    if (readiness.blockedReason !== 'SESSION_RUNTIME_NOT_PREPARED') {
      return candidate;
    }

    if (!candidate.scheduledStartAt || !candidate.scheduledEndAt) {
      throw new ConflictException({
        messageKey: 'sessions.errors.sessionScheduleMissing',
        error: 'SESSION_SCHEDULE_MISSING',
      });
    }

    const resolvedProvider =
      this.sessionVideoProviderResolverService.resolvePreparedProviderForSession(
        candidate,
      );
    const adapter =
      this.sessionVideoProviderRegistryService.get(resolvedProvider);
    const room = await adapter.createRoom({
      sessionId: candidate.id,
      startsAt: candidate.scheduledStartAt,
      endsAt: candidate.scheduledEndAt,
    });
    const roomId = room.roomId || room.roomName;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updateResult = await this.sessionRepository.updateRuntimeIfMissing(
        candidate.id,
        {
          provider: resolvedProvider,
          providerRoomId: roomId,
          providerSessionRef: room.roomUrl,
        },
        tx,
      );

      const persisted = await this.sessionRepository.findById(candidate.id, tx);
      if (!persisted) {
        throw new ConflictException({
          messageKey: 'sessions.errors.sessionNotFound',
          error: 'SESSION_NOT_FOUND',
        });
      }

      if (updateResult.count > 0) {
        await this.sessionRepository.createEvent(
          {
            sessionId: candidate.id,
            eventType: SessionEventType.PROVIDER_ROOM_CREATED,
            actorUserId: null,
            metadataJson: {
              provider: resolvedProvider,
              providerRoomId: roomId,
              providerRoomUrl: room.roomUrl,
              roomName: room.roomName ?? roomId,
            },
          },
          tx,
        );
      }

      return persisted;
    });

    return {
      ...candidate,
      provider: updated.provider,
      providerRoomId: updated.providerRoomId,
      providerSessionRef: updated.providerSessionRef,
    };
  }

  private async promoteSessionToReadyToJoin(
    session: SessionJoinNotificationCandidate,
  ): Promise<SessionJoinNotificationCandidate> {
    this.validateSessionStatusTransitionService.assertCanTransition(
      session.status,
      SessionStatus.READY_TO_JOIN,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const persisted = await this.sessionRepository.updateStatus(
        session.id,
        {
          status: SessionStatus.READY_TO_JOIN,
        },
        tx,
      );

      await this.sessionRepository.createEvent(
        {
          sessionId: session.id,
          eventType: SessionEventType.SESSION_READY_TO_JOIN,
          actorUserId: null,
        },
        tx,
      );

      return persisted;
    });

    return {
      ...session,
      status: updated.status,
    };
  }

  private async createJoinAvailableNotification(input: {
    sessionId: string;
    userId: string;
    locale: 'en' | 'ar';
    recipientRole: 'PATIENT' | 'PRACTITIONER';
    routePath: string;
    scheduledStartAt: Date | null;
    joinOpenAt: Date | null;
    packageContext?: {
      packagePurchaseId: string;
      packagePlanCode: string;
      packagePlanTitle?: string | null;
      packageSessionIndex: number | null;
      packageSessionCount: number | null;
      packageDiscountPercent?: number | null;
    } | null;
  }): Promise<void> {
    const packageContextText = this.buildPackageContextText(
      input.locale,
      input.packageContext,
    );
    const title = this.i18nService.t(
      'sessions.notifications.sessionJoinAvailableTitle',
      input.locale,
    );
    const body = this.i18nService.t(
      'sessions.notifications.sessionJoinAvailableBody',
      input.locale,
      {
        packageContext: packageContextText,
      },
    );

    await this.notificationIntentWriterService.createInAppNotification({
      slug: 'sessions.session-join-available',
      userId: input.userId,
      locale: input.locale,
      title,
      body,
      payload: {
        sessionId: input.sessionId,
        recipientRole: input.recipientRole,
        targetRole: input.recipientRole,
        routePath: input.routePath,
        scheduledStartAt: input.scheduledStartAt?.toISOString() ?? null,
        joinOpenAt: input.joinOpenAt?.toISOString() ?? null,
        ...(input.packageContext
          ? {
              packagePurchaseId: input.packageContext.packagePurchaseId,
              packagePlanCode: input.packageContext.packagePlanCode,
              packagePlanTitle: input.packageContext.packagePlanTitle ?? null,
              packageSessionIndex:
                input.packageContext.packageSessionIndex ?? null,
              packageSessionCount:
                input.packageContext.packageSessionCount ?? null,
              packageDiscountPercent:
                input.packageContext.packageDiscountPercent ?? null,
            }
          : {}),
      },
      relatedEntityType: 'SESSION',
      relatedEntityId: input.sessionId,
      idempotencyKey: `sessions.session-join-available:${input.sessionId}:${input.userId}`,
      category: NotificationCategory.SESSION,
    });
  }

  private async createJoinAvailablePushNotification(input: {
    sessionId: string;
    userId: string;
    locale: 'en' | 'ar';
    recipientRole: 'PATIENT' | 'PRACTITIONER';
    routePath: string;
    scheduledStartAt: Date | null;
    joinOpenAt: Date | null;
    packageContext?: {
      packagePurchaseId: string;
      packagePlanCode: string;
      packagePlanTitle?: string | null;
      packageSessionIndex: number | null;
      packageSessionCount: number | null;
      packageDiscountPercent?: number | null;
    } | null;
  }): Promise<void> {
    const packageContextText = this.buildPackageContextText(
      input.locale,
      input.packageContext,
    );
    const title = this.i18nService.t(
      'sessions.notifications.sessionJoinAvailableTitle',
      input.locale,
    );
    const body = this.i18nService.t(
      'sessions.notifications.sessionJoinAvailableBody',
      input.locale,
      {
        packageContext: packageContextText,
      },
    );

    await this.notificationIntentWriterService.createPushNotification({
      slug: 'sessions.session-join-available',
      userId: input.userId,
      locale: input.locale,
      title,
      body,
      payload: {
        sessionId: input.sessionId,
        recipientRole: input.recipientRole,
        targetRole: input.recipientRole,
        routePath: input.routePath,
        scheduledStartAt: input.scheduledStartAt?.toISOString() ?? null,
        joinOpenAt: input.joinOpenAt?.toISOString() ?? null,
        ...(input.packageContext
          ? {
              packagePurchaseId: input.packageContext.packagePurchaseId,
              packagePlanCode: input.packageContext.packagePlanCode,
              packagePlanTitle: input.packageContext.packagePlanTitle ?? null,
              packageSessionIndex:
                input.packageContext.packageSessionIndex ?? null,
              packageSessionCount:
                input.packageContext.packageSessionCount ?? null,
              packageDiscountPercent:
                input.packageContext.packageDiscountPercent ?? null,
            }
          : {}),
      },
      relatedEntityType: 'SESSION',
      relatedEntityId: input.sessionId,
      idempotencyKey: `sessions.session-join-available:push:${input.sessionId}:${input.userId}`,
      scheduledFor: input.joinOpenAt ?? new Date(),
      category: NotificationCategory.SESSION,
    });
  }

  private async createJoinAvailableEmailNotification(input: {
    sessionId: string;
    userId: string;
    email: string | null;
    locale: 'en' | 'ar';
    recipientRole: 'PATIENT' | 'PRACTITIONER';
    routePath: string;
    scheduledStartAt: Date | null;
    joinOpenAt: Date | null;
    packageContext?: {
      packagePurchaseId: string;
      packagePlanCode: string;
      packagePlanTitle?: string | null;
      packageSessionIndex: number | null;
      packageSessionCount: number | null;
      packageDiscountPercent?: number | null;
    } | null;
  }): Promise<void> {
    if (!input.email) {
      this.logger.warn(
        {
          message:
            'Skipped join-available email notification because no usable recipient email was available',
          sessionId: input.sessionId,
          userId: input.userId,
          recipientRole: input.recipientRole,
        },
        'Sessions',
      );
      return;
    }

    const appUrl = this.resolveAppUrl();
    const sessionUrl = `${appUrl}${input.routePath}`;
    const subject = this.i18nService.t(
      'sessions.notifications.sessionJoinAvailableEmailSubject',
      input.locale,
    );
    const title = this.i18nService.t(
      'sessions.notifications.sessionJoinAvailableEmailTitle',
      input.locale,
    );
    const body = this.i18nService.t(
      'sessions.notifications.sessionJoinAvailableEmailBody',
      input.locale,
      {
        sessionUrl,
        packageContext: this.buildPackageContextText(
          input.locale,
          input.packageContext,
        ),
      },
    );

    await this.notificationIntentWriterService.createEmailNotification({
      slug: 'sessions.session-join-available',
      userId: input.userId,
      email: input.email,
      locale: input.locale,
      subject,
      title,
      body,
      payload: {
        sessionId: input.sessionId,
        recipientRole: input.recipientRole,
        targetRole: input.recipientRole,
        routePath: input.routePath,
        scheduledStartAt: input.scheduledStartAt?.toISOString() ?? null,
        joinOpenAt: input.joinOpenAt?.toISOString() ?? null,
        ...(input.packageContext
          ? {
              packagePurchaseId: input.packageContext.packagePurchaseId,
              packagePlanCode: input.packageContext.packagePlanCode,
              packagePlanTitle: input.packageContext.packagePlanTitle ?? null,
              packageSessionIndex:
                input.packageContext.packageSessionIndex ?? null,
              packageSessionCount:
                input.packageContext.packageSessionCount ?? null,
              packageDiscountPercent:
                input.packageContext.packageDiscountPercent ?? null,
            }
          : {}),
      },
      relatedEntityType: 'SESSION',
      relatedEntityId: input.sessionId,
      idempotencyKey: `sessions.session-join-available:email:${input.sessionId}:${input.userId}`,
      scheduledFor: input.joinOpenAt ?? new Date(),
      category: NotificationCategory.SESSION,
    });
  }

  private resolveLocale(raw: string | null | undefined): 'en' | 'ar' {
    return raw === 'ar' ? 'ar' : 'en';
  }

  private buildPackageContextText(
    locale: 'en' | 'ar',
    packageContext?: {
      packagePurchaseId: string;
      packagePlanCode: string;
      packagePlanTitle?: string | null;
      packageSessionIndex: number | null;
      packageSessionCount: number | null;
      packageDiscountPercent?: number | null;
    } | null,
  ): string {
    if (!packageContext) {
      return '';
    }

    return this.i18nService.t(
      'sessions.notifications.packageSessionContext',
      locale,
      {
        packageSessionIndex: packageContext.packageSessionIndex ?? 0,
        packageSessionCount: packageContext.packageSessionCount ?? 0,
      },
    );
  }

  private resolveVerifiedPrimaryEmail(
    emails:
      | Array<{
          email: string;
          isVerified: boolean;
        }>
      | undefined,
  ): string | null {
    const email = emails?.find((entry) => entry.isVerified)?.email?.trim();
    return email || null;
  }

  private resolveAppUrl(): string {
    const rawAppUrl = process.env.APP_URL ?? 'http://localhost:3000';
    return rawAppUrl.endsWith('/') ? rawAppUrl.slice(0, -1) : rawAppUrl;
  }
}
