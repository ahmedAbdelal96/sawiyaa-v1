import { Injectable, Logger } from '@nestjs/common';
import {
  ConversationParticipantRole,
  NotificationCategory,
  NotificationChannel,
  NotificationStatus,
  Prisma,
  SessionReminderType,
  SessionStatus,
  UserRoleType,
} from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import {
  SessionReminderQueueItem,
  SessionReminderQueueCreateInput,
  SessionReminderQueueRepository,
} from '../repositories/session-reminder-queue.repository';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';
import { SessionSchedulePolicyService } from '@modules/config/services/session-schedule-policy.service';

type Recipient = {
  userId: string;
  displayName: string | null;
  locale: SupportedLocale;
  email: string | null;
  timezone: string | null;
};

type SessionPackageContext = {
  packagePurchaseId: string;
  packagePlanCode: string;
  packagePlanTitle?: string | null;
  packageSessionIndex: number;
  packageSessionCount: number;
  packageDiscountPercent?: string | number | null;
};

type SessionReminderRecipientRole = 'PATIENT' | 'PRACTITIONER';

type CareChatRecipientRole = 'patient' | 'practitioner';

type MessageLane = 'SESSION_CHAT' | 'SUPPORT' | 'CARE_CHAT';

type SessionReminderNotificationInput = {
  patientProfileId: string;
  practitionerProfileId: string;
  sessionId: string;
  scheduledStartAt: Date | null;
  scheduledEndAt?: Date | null;
  scheduleRevision?: number;
  schedulePolicySnapshot?: unknown;
};

type InstantBookingRequestNotificationInput = {
  patientProfileId: string;
  requestId: string;
  createdSessionId?: string | null;
};

type CareChatDecisionNotificationInput = {
  patientProfileId: string;
  practitionerProfileId: string;
  requestId: string;
  conversationId?: string | null;
};

type ScheduledSessionReminderDispatch = {
  reminder: SessionReminderQueueItem;
};

@Injectable()
export class OperationalNotificationService {
  private readonly logger = new Logger(OperationalNotificationService.name);

  constructor(
    private readonly repository: OperationalNotificationRepository,
    private readonly sessionReminderQueueRepository: SessionReminderQueueRepository,
    private readonly i18nService: I18nService,
    private readonly sessionSchedulePolicyService: SessionSchedulePolicyService,
  ) {}

  async notifyPaymentSucceeded(input: {
    patientProfileId: string;
    paymentId: string;
    amount: string;
    currencyCode: string;
  }): Promise<void> {
    await this.notifyPatientBySlug({
      patientProfileId: input.patientProfileId,
      slug: 'payments.payment-succeeded',
      titleKey: 'payments.notifications.paymentSucceededTitle',
      bodyKey: 'payments.notifications.paymentSucceededBody',
      params: {
        amount: input.amount,
        currencyCode: input.currencyCode,
      },
      relatedEntityType: 'PAYMENT',
      relatedEntityId: input.paymentId,
      category: NotificationCategory.PAYMENT,
    });
  }

  async notifyPaymentFailed(input: {
    patientProfileId: string;
    paymentId: string;
  }): Promise<void> {
    await this.notifyPatientBySlug({
      patientProfileId: input.patientProfileId,
      slug: 'payments.payment-failed',
      titleKey: 'payments.notifications.paymentFailedTitle',
      bodyKey: 'payments.notifications.paymentFailedBody',
      relatedEntityType: 'PAYMENT',
      relatedEntityId: input.paymentId,
      category: NotificationCategory.PAYMENT,
    });
  }

  async notifyRefundRequested(input: {
    patientProfileId: string;
    refundId: string;
    amount: string;
    currencyCode: string;
  }): Promise<void> {
    await this.notifyPatientBySlug({
      patientProfileId: input.patientProfileId,
      slug: 'payments.refund-requested',
      titleKey: 'payments.notifications.refundRequestedTitle',
      bodyKey: 'payments.notifications.refundRequestedBody',
      params: {
        amount: input.amount,
        currencyCode: input.currencyCode,
      },
      relatedEntityType: 'REFUND',
      relatedEntityId: input.refundId,
      category: NotificationCategory.PAYMENT,
    });
  }

  async notifyRefundSucceeded(input: {
    patientProfileId: string;
    refundId: string;
    amount: string;
    currencyCode: string;
  }): Promise<void> {
    await this.notifyPatientBySlug({
      patientProfileId: input.patientProfileId,
      slug: 'payments.refund-succeeded',
      titleKey: 'payments.notifications.refundSucceededTitle',
      bodyKey: 'payments.notifications.refundSucceededBody',
      params: {
        amount: input.amount,
        currencyCode: input.currencyCode,
      },
      relatedEntityType: 'REFUND',
      relatedEntityId: input.refundId,
      category: NotificationCategory.PAYMENT,
    });
  }

  async notifyRefundFailed(input: {
    patientProfileId: string;
    refundId: string;
  }): Promise<void> {
    await this.notifyPatientBySlug({
      patientProfileId: input.patientProfileId,
      slug: 'payments.refund-failed',
      titleKey: 'payments.notifications.refundFailedTitle',
      bodyKey: 'payments.notifications.refundFailedBody',
      relatedEntityType: 'REFUND',
      relatedEntityId: input.refundId,
      category: NotificationCategory.PAYMENT,
    });
  }

  async notifyCareChatRequestApproved(
    input: CareChatDecisionNotificationInput,
  ): Promise<void> {
    const [patient, practitioner] = await Promise.all([
      this.resolvePatientRecipient(input.patientProfileId),
      this.resolvePractitionerRecipient(input.practitionerProfileId),
    ]);

    const conversationId = input.conversationId ?? null;
    if (!conversationId) {
      return;
    }

    await Promise.all([
      this.sendBySlug({
        recipient: patient,
        slug: 'care-chat.request-approved',
        titleKey: 'careChat.notifications.requestApprovedTitle',
        bodyKey: 'careChat.notifications.requestApprovedBody',
        relatedEntityType: 'CARE_CHAT_REQUEST',
        relatedEntityId: input.requestId,
        category: NotificationCategory.CHAT,
        routePath: this.buildCareChatConversationRoutePath(
          patient?.locale ?? null,
          'patient',
          conversationId,
        ),
        idempotencyKey: this.buildCareChatDecisionNotificationIdempotencyKey(
          'care-chat.request-approved',
          input.requestId,
          patient?.userId ?? null,
        ),
        targetRole: 'PATIENT',
        payload: {
          careRequestId: input.requestId,
          conversationId,
          decision: 'APPROVE',
        },
      }),
      this.sendBySlug({
        recipient: practitioner,
        slug: 'care-chat.request-approved',
        titleKey: 'careChat.notifications.requestApprovedTitle',
        bodyKey: 'careChat.notifications.requestApprovedBody',
        relatedEntityType: 'CARE_CHAT_REQUEST',
        relatedEntityId: input.requestId,
        category: NotificationCategory.CHAT,
        routePath: this.buildCareChatConversationRoutePath(
          practitioner?.locale ?? null,
          'practitioner',
          conversationId,
        ),
        idempotencyKey: this.buildCareChatDecisionNotificationIdempotencyKey(
          'care-chat.request-approved',
          input.requestId,
          practitioner?.userId ?? null,
        ),
        targetRole: 'PRACTITIONER',
        payload: {
          careRequestId: input.requestId,
          conversationId,
          decision: 'APPROVE',
        },
      }),
    ]);
  }

  async notifyCareChatRequestRejected(input: {
    patientProfileId: string;
    requestId: string;
  }): Promise<void> {
    const patient = await this.resolvePatientRecipient(input.patientProfileId);

    await this.sendBySlug({
      recipient: patient,
      slug: 'care-chat.request-rejected',
      titleKey: 'careChat.notifications.requestRejectedTitle',
      bodyKey: 'careChat.notifications.requestRejectedBody',
      relatedEntityType: 'CARE_CHAT_REQUEST',
      relatedEntityId: input.requestId,
      category: NotificationCategory.CHAT,
      routePath: this.buildCareChatRequestRoutePath(
        patient?.locale ?? null,
        'patient',
        input.requestId,
      ),
      idempotencyKey: this.buildCareChatDecisionNotificationIdempotencyKey(
        'care-chat.request-rejected',
        input.requestId,
        patient?.userId ?? null,
      ),
      targetRole: 'PATIENT',
      payload: {
        careRequestId: input.requestId,
        decision: 'REJECT',
      },
    });
  }

  async notifyCareChatRequestRevoked(
    input: CareChatDecisionNotificationInput,
  ): Promise<void> {
    const [patient, practitioner] = await Promise.all([
      this.resolvePatientRecipient(input.patientProfileId),
      this.resolvePractitionerRecipient(input.practitionerProfileId),
    ]);

    const conversationId = input.conversationId ?? null;

    await Promise.all([
      this.sendBySlug({
        recipient: patient,
        slug: 'care-chat.request-revoked',
        titleKey: 'careChat.notifications.requestRevokedTitle',
        bodyKey: 'careChat.notifications.requestRevokedBody',
        relatedEntityType: 'CARE_CHAT_REQUEST',
        relatedEntityId: input.requestId,
        category: NotificationCategory.CHAT,
        routePath: conversationId
          ? this.buildCareChatConversationRoutePath(
              patient?.locale ?? null,
              'patient',
              conversationId,
            )
          : this.buildCareChatRequestRoutePath(
              patient?.locale ?? null,
              'patient',
              input.requestId,
            ),
        idempotencyKey: this.buildCareChatDecisionNotificationIdempotencyKey(
          'care-chat.request-revoked',
          input.requestId,
          patient?.userId ?? null,
        ),
        targetRole: 'PATIENT',
        payload: {
          careRequestId: input.requestId,
          ...(conversationId ? { conversationId } : {}),
          decision: 'REVOKE',
        },
      }),
      this.sendBySlug({
        recipient: practitioner,
        slug: 'care-chat.request-revoked',
        titleKey: 'careChat.notifications.requestRevokedTitle',
        bodyKey: 'careChat.notifications.requestRevokedBody',
        relatedEntityType: 'CARE_CHAT_REQUEST',
        relatedEntityId: input.requestId,
        category: NotificationCategory.CHAT,
        routePath: conversationId
          ? this.buildCareChatConversationRoutePath(
              practitioner?.locale ?? null,
              'practitioner',
              conversationId,
            )
          : this.buildCareChatRequestRoutePath(
              practitioner?.locale ?? null,
              'practitioner',
              input.requestId,
            ),
        idempotencyKey: this.buildCareChatDecisionNotificationIdempotencyKey(
          'care-chat.request-revoked',
          input.requestId,
          practitioner?.userId ?? null,
        ),
        targetRole: 'PRACTITIONER',
        payload: {
          careRequestId: input.requestId,
          ...(conversationId ? { conversationId } : {}),
          decision: 'REVOKE',
        },
      }),
    ]);
  }

  async notifyInstantBookingAccepted(
    input: InstantBookingRequestNotificationInput,
  ): Promise<void> {
    const recipient = await this.resolvePatientRecipient(input.patientProfileId);
    const paymentPath = input.createdSessionId
      ? this.buildPatientInstantBookingPaymentRoutePath(
          recipient?.locale ?? null,
          input.createdSessionId,
        )
      : null;
    const routePath =
      paymentPath ??
      this.buildInstantBookingRoutePath(
        recipient?.locale ?? null,
        input.requestId,
      );

    await this.sendBySlug({
      recipient,
      slug: 'instant-booking.request-accepted',
      titleKey: 'instantBooking.notifications.requestAcceptedTitle',
      bodyKey: 'instantBooking.notifications.requestAcceptedBody',
      relatedEntityType: 'INSTANT_BOOKING_REQUEST',
      relatedEntityId: input.requestId,
      category: NotificationCategory.SESSION,
      routePath,
      idempotencyKey: this.buildInstantBookingNotificationIdempotencyKey(
        'instant-booking.request-accepted',
        input.requestId,
        recipient?.userId ?? null,
      ),
      targetRole: 'PATIENT',
      payload: {
        requestId: input.requestId,
        ...(input.createdSessionId
          ? { createdSessionId: input.createdSessionId }
          : {}),
      },
    });
  }

  async notifyInstantBookingCreated(input: {
    practitionerProfileId: string;
    requestId: string;
  }): Promise<void> {
    const recipient = await this.resolvePractitionerRecipient(
      input.practitionerProfileId,
    );
    const routePath = this.buildPractitionerInstantBookingRoutePath(
      recipient?.locale ?? null,
    );

    await this.sendBySlug({
      recipient,
      slug: 'instant-booking.request-created',
      titleKey: 'instantBooking.notifications.requestCreatedTitle',
      bodyKey: 'instantBooking.notifications.requestCreatedBody',
      relatedEntityType: 'INSTANT_BOOKING_REQUEST',
      relatedEntityId: input.requestId,
      category: NotificationCategory.SESSION,
      routePath,
      idempotencyKey: this.buildInstantBookingNotificationIdempotencyKey(
        'instant-booking.request-created',
        input.requestId,
        recipient?.userId ?? null,
      ),
      targetRole: 'PRACTITIONER',
      payload: { requestId: input.requestId },
    });
  }

  async notifyInstantBookingRejected(
    input: InstantBookingRequestNotificationInput,
  ): Promise<void> {
    const recipient = await this.resolvePatientRecipient(input.patientProfileId);

    await this.sendBySlug({
      recipient,
      slug: 'instant-booking.request-rejected',
      titleKey: 'instantBooking.notifications.requestRejectedTitle',
      bodyKey: 'instantBooking.notifications.requestRejectedBody',
      relatedEntityType: 'INSTANT_BOOKING_REQUEST',
      relatedEntityId: input.requestId,
      category: NotificationCategory.SESSION,
      routePath: this.buildInstantBookingRoutePath(
        recipient?.locale ?? null,
        input.requestId,
      ),
      idempotencyKey: this.buildInstantBookingNotificationIdempotencyKey(
        'instant-booking.request-rejected',
        input.requestId,
        recipient?.userId ?? null,
      ),
      targetRole: 'PATIENT',
    });
  }

  async notifyInstantBookingExpired(
    input: InstantBookingRequestNotificationInput,
  ): Promise<void> {
    const recipient = await this.resolvePatientRecipient(input.patientProfileId);

    await this.sendBySlug({
      recipient,
      slug: 'instant-booking.request-expired',
      titleKey: 'instantBooking.notifications.requestExpiredTitle',
      bodyKey: 'instantBooking.notifications.requestExpiredBody',
      relatedEntityType: 'INSTANT_BOOKING_REQUEST',
      relatedEntityId: input.requestId,
      category: NotificationCategory.SESSION,
      routePath: this.buildInstantBookingRoutePath(
        recipient?.locale ?? null,
        input.requestId,
      ),
      idempotencyKey: this.buildInstantBookingNotificationIdempotencyKey(
        'instant-booking.request-expired',
        input.requestId,
        recipient?.userId ?? null,
      ),
      targetRole: 'PATIENT',
    });
  }

  async notifySessionConfirmed(input: {
    patientProfileId: string;
    practitionerProfileId: string;
    sessionId: string;
    scheduledStartAt: Date | null;
    scheduledEndAt?: Date | null;
    packageContext?: SessionPackageContext | null;
    scheduleRevision?: number;
    schedulePolicySnapshot?: unknown;
  }): Promise<void> {
    const sessionAt = input.scheduledStartAt?.toISOString() ?? '-';
    const packageContextPayload = input.packageContext
      ? {
          packagePurchaseId: input.packageContext.packagePurchaseId,
          packagePlanCode: input.packageContext.packagePlanCode,
          packageSessionIndex: input.packageContext.packageSessionIndex,
          packageSessionCount: input.packageContext.packageSessionCount,
          packageDiscountPercent:
            input.packageContext.packageDiscountPercent ?? null,
        }
      : null;

    const [patient, practitioner] = await Promise.all([
      this.resolvePatientRecipient(input.patientProfileId),
      this.resolvePractitionerRecipient(input.practitionerProfileId),
    ]);
    const patientPackageContextText = this.buildPackageContextText(
      patient?.locale ?? null,
      input.packageContext,
    );
    const practitionerPackageContextText = this.buildPackageContextText(
      practitioner?.locale ?? null,
      input.packageContext,
    );

    await Promise.all([
      this.sendBySlug({
        recipient: patient,
        slug: 'sessions.session-confirmed',
        titleKey: 'sessions.notifications.sessionConfirmedTitle',
        bodyKey: 'sessions.notifications.sessionConfirmedBody',
        pushBodyKey: 'sessions.notifications.sessionConfirmedPushBody',
        params: { sessionAt, packageContext: patientPackageContextText },
        relatedEntityType: 'SESSION',
        relatedEntityId: input.sessionId,
        category: NotificationCategory.SESSION,
        routePath: this.buildSessionRoutePath(
          patient?.locale ?? null,
          'PATIENT',
          input.sessionId,
        ),
        idempotencyKey: this.buildSessionNotificationIdempotencyKey(
          'sessions.session-confirmed',
          input.sessionId,
          patient?.userId ?? null,
        ),
        targetRole: 'PATIENT',
        payload: {
          ...(packageContextPayload ?? {}),
          sessionId: input.sessionId,
          recipientRole: 'PATIENT',
          startsAtUtc: input.scheduledStartAt?.toISOString() ?? null,
          timezoneSnapshot: patient?.timezone ?? 'UTC',
          actionType: 'DETAILS',
          action: {
            type: 'INTERNAL_LINK',
            href: this.buildSessionRoutePath(patient?.locale ?? null, 'PATIENT', input.sessionId),
            semanticType: 'OPEN_SESSION_DETAILS',
          },
        },
      }),
      this.sendBySlug({
        recipient: practitioner,
        slug: 'sessions.session-confirmed-practitioner',
        titleKey: 'sessions.notifications.sessionConfirmedPractitionerTitle',
        bodyKey: 'sessions.notifications.sessionConfirmedPractitionerBody',
        pushBodyKey: 'sessions.notifications.sessionConfirmedPractitionerPushBody',
        params: {
          sessionAt,
          packageContext: practitionerPackageContextText,
        },
        relatedEntityType: 'SESSION',
        relatedEntityId: input.sessionId,
        category: NotificationCategory.SESSION,
        routePath: this.buildSessionRoutePath(
          practitioner?.locale ?? null,
          'PRACTITIONER',
          input.sessionId,
        ),
        idempotencyKey: this.buildSessionNotificationIdempotencyKey(
          'sessions.session-confirmed-practitioner',
          input.sessionId,
          practitioner?.userId ?? null,
        ),
        targetRole: 'PRACTITIONER',
        payload: {
          ...(packageContextPayload ?? {}),
          sessionId: input.sessionId,
          recipientRole: 'PRACTITIONER',
          startsAtUtc: input.scheduledStartAt?.toISOString() ?? null,
          timezoneSnapshot: practitioner?.timezone ?? 'UTC',
          actionType: 'DETAILS',
          action: {
            type: 'INTERNAL_LINK',
            href: this.buildSessionRoutePath(practitioner?.locale ?? null, 'PRACTITIONER', input.sessionId),
            semanticType: 'OPEN_SESSION_DETAILS',
          },
        },
      }),
    ]);

    await this.queueSessionReminders({
      patientProfileId: input.patientProfileId,
      practitionerProfileId: input.practitionerProfileId,
      sessionId: input.sessionId,
      scheduledStartAt: input.scheduledStartAt,
      scheduledEndAt: input.scheduledEndAt,
      scheduleRevision: input.scheduleRevision,
      schedulePolicySnapshot: input.schedulePolicySnapshot,
    });
  }

  async notifySessionCancelledByPatient(input: {
    patientProfileId: string;
    practitionerProfileId: string;
    sessionId: string;
    scheduledStartAt: Date | null;
    scheduleRevision?: number;
  }): Promise<void> {
    const sessionAt = input.scheduledStartAt?.toISOString() ?? '-';

    const [patient, practitioner] = await Promise.all([
      this.resolvePatientRecipient(input.patientProfileId),
      this.resolvePractitionerRecipient(input.practitionerProfileId),
    ]);

    await Promise.all([
      this.sendBySlug({
        recipient: patient,
        slug: 'sessions.session-cancelled',
        titleKey: 'sessions.notifications.sessionCancelledTitle',
        bodyKey: 'sessions.notifications.sessionCancelledBody',
        pushBodyKey: 'sessions.notifications.sessionCancelledPushBody',
        params: { sessionAt },
        relatedEntityType: 'SESSION',
        relatedEntityId: input.sessionId,
        category: NotificationCategory.SESSION,
        routePath: this.buildSessionRoutePath(
          patient?.locale ?? null,
          'PATIENT',
          input.sessionId,
        ),
        idempotencyKey: this.buildSessionNotificationIdempotencyKey(
          'sessions.session-cancelled',
          input.sessionId,
          patient?.userId ?? null,
        ),
        targetRole: 'PATIENT',
        payload: {
          sessionId: input.sessionId,
          startsAtUtc: input.scheduledStartAt?.toISOString() ?? null,
          timezoneSnapshot: patient?.timezone ?? 'UTC',
          recipientRole: 'PATIENT',
          actionType: 'CANCELLATION_DETAILS',
          action: {
            type: 'INTERNAL_LINK',
            href: this.buildSessionRoutePath(patient?.locale ?? null, 'PATIENT', input.sessionId),
            label: this.i18nService.t('sessions.notifications.sessionCancelledDetailsCta', patient?.locale ?? 'en'),
            semanticType: 'OPEN_SESSION_CANCELLATION',
          },
        },
      }),
      this.sendBySlug({
        recipient: practitioner,
        slug: 'sessions.session-cancelled-practitioner',
        titleKey: 'sessions.notifications.sessionCancelledPractitionerTitle',
        bodyKey: 'sessions.notifications.sessionCancelledPractitionerBody',
        pushBodyKey: 'sessions.notifications.sessionCancelledPractitionerPushBody',
        params: { sessionAt },
        relatedEntityType: 'SESSION',
        relatedEntityId: input.sessionId,
        category: NotificationCategory.SESSION,
        routePath: this.buildSessionRoutePath(
          practitioner?.locale ?? null,
          'PRACTITIONER',
          input.sessionId,
        ),
        idempotencyKey: this.buildSessionNotificationIdempotencyKey(
          'sessions.session-cancelled-practitioner',
          input.sessionId,
          practitioner?.userId ?? null,
        ),
        targetRole: 'PRACTITIONER',
        payload: {
          sessionId: input.sessionId,
          startsAtUtc: input.scheduledStartAt?.toISOString() ?? null,
          timezoneSnapshot: practitioner?.timezone ?? 'UTC',
          recipientRole: 'PRACTITIONER',
          actionType: 'CANCELLATION_DETAILS',
          action: {
            type: 'INTERNAL_LINK',
            href: this.buildSessionRoutePath(practitioner?.locale ?? null, 'PRACTITIONER', input.sessionId),
            label: this.i18nService.t('sessions.notifications.sessionCancelledDetailsCta', practitioner?.locale ?? 'en'),
            semanticType: 'OPEN_SESSION_CANCELLATION',
          },
        },
      }),
    ]);

    await this.cancelSessionReminders({ sessionId: input.sessionId });
  }

  async queuePractitionerAvailabilityWeekEndingReminder(input: {
    practitionerId: string;
    userId: string;
    locale: SupportedLocale;
    routePath: string;
    currentWeekStartDate: string;
    currentWeekEndDate: string;
    nextWeekStartDate: string;
    daysUntilCurrentWeekEnds: number;
    shouldPromptForNextWeek: boolean;
    nextWeekPublished: boolean;
    scheduledFor: Date;
  }): Promise<void> {
    const recipient = {
      userId: input.userId,
      displayName: null,
      locale: input.locale,
      email: null,
      timezone: null,
    };

    await this.queueBySlug({
      recipient,
      slug: 'availability.week-ending-reminder',
      titleKey: 'availability.notifications.weekEndingReminderTitle',
      bodyKey: 'availability.notifications.weekEndingReminderBody',
      pushBodyKey: 'availability.notifications.weekEndingReminderPushBody',
      params: {
        daysUntilCurrentWeekEnds: input.daysUntilCurrentWeekEnds,
      },
      relatedEntityType: 'PRACTITIONER_AVAILABILITY_WEEK',
      relatedEntityId: input.practitionerId,
      category: NotificationCategory.SESSION,
      scheduledFor: input.scheduledFor,
      routePath: input.routePath,
      idempotencyKey: `availability.week-ending-reminder:${input.practitionerId}:${input.currentWeekStartDate}`,
      targetRole: 'PRACTITIONER',
      payload: {
        practitionerId: input.practitionerId,
        currentWeekStartDate: input.currentWeekStartDate,
        currentWeekEndDate: input.currentWeekEndDate,
        nextWeekStartDate: input.nextWeekStartDate,
        daysUntilCurrentWeekEnds: input.daysUntilCurrentWeekEnds,
        shouldPromptForNextWeek: input.shouldPromptForNextWeek,
        nextWeekPublished: input.nextWeekPublished,
        routePath: input.routePath,
      },
    });
  }

  async queueSessionReminders(
    input: SessionReminderNotificationInput,
  ): Promise<void> {
    if (!input.scheduledStartAt) {
      return;
    }

    const [patient, practitioner] = await Promise.all([
      this.resolvePatientRecipient(input.patientProfileId),
      this.resolvePractitionerRecipient(input.practitionerProfileId),
    ]);

    const now = new Date();
    const scheduleRevision = input.scheduleRevision ?? 1;
    const policy = this.sessionSchedulePolicyService.withScheduleRevision(
      input.schedulePolicySnapshot
        ? (this.sessionSchedulePolicyService.parseSnapshot(
            input.schedulePolicySnapshot,
          ) ?? (await this.sessionSchedulePolicyService.resolve()))
        : await this.sessionSchedulePolicyService.resolve(),
      scheduleRevision,
    );
    const candidates: SessionReminderQueueCreateInput[] = [];
    const recipients: Array<{
      recipient: Recipient | null;
      role: SessionReminderRecipientRole;
    }> = [
      { recipient: patient, role: 'PATIENT' },
      { recipient: practitioner, role: 'PRACTITIONER' },
    ];
    const start = input.scheduledStartAt;
    const schedule = this.sessionSchedulePolicyService.buildReminderPlan({
      policy,
      scheduledStartAt: start,
    });

    for (const { recipient, role } of recipients) {
      if (!recipient) continue;
      for (const item of schedule) {
        // A plan is created from exact UTC instants. Already elapsed stages
        // are intentionally not inserted retroactively.
        if (item.dueAt.getTime() < now.getTime()) continue;
        const slug = this.resolveSessionReminderSlug(item.type);
        candidates.push({
          sessionId: input.sessionId,
          recipientUserId: recipient.userId,
          recipientRole: role as UserRoleType,
          reminderType: item.type,
          scheduleRevision,
          offsetMinutesSnapshot: item.offsetMinutes,
          dueAt: item.dueAt,
          recipientTimezoneSnapshot: recipient.timezone ?? 'UTC',
          recipientLocaleSnapshot: recipient.locale,
          idempotencyKey: `${slug}:${input.sessionId}:${recipient.userId}:r${scheduleRevision}`,
        });
      }
    }
    const replacePlan = this.sessionReminderQueueRepository.replaceSessionPlan;
    if (typeof replacePlan === 'function') {
      await replacePlan.call(this.sessionReminderQueueRepository, {
        sessionId: input.sessionId,
        reminders: candidates,
        cancelledAt: now,
        schedulePolicySnapshot: policy as unknown as Prisma.InputJsonValue,
        joinOpenAt: new Date(
          start.getTime() - policy.join.joinEarlyMinutes * 60_000,
        ),
        joinCloseAt: input.scheduledEndAt
          ? new Date(
              input.scheduledEndAt.getTime() +
                policy.join.joinAfterEndGraceMinutes * 60_000,
            )
          : null,
      });
    } else {
      // Compatibility fallback for older test doubles/rolling deployments.
      // The real repository always takes the atomic path above.
      await this.cancelSessionReminders({ sessionId: input.sessionId });
      await this.sessionReminderQueueRepository.scheduleMany(candidates);
    }
  }

  async cancelSessionReminders(input: {
    sessionId: string;
    cancelledAt?: Date;
  }): Promise<void> {
    await this.sessionReminderQueueRepository.cancelFutureBySessionId({
      sessionId: input.sessionId,
      cancelledAt: input.cancelledAt ?? new Date(),
    });
  }

  async dispatchScheduledSessionReminder(
    input: ScheduledSessionReminderDispatch,
  ): Promise<{
    delivered: boolean;
    skipReason?: string;
  }> {
    const reminder = input.reminder;
    const session = reminder.session;

    if (!session) {
      return {
        delivered: false,
        skipReason: 'SESSION_NOT_FOUND',
      };
    }

    if (!session.scheduledStartAt) {
      return {
        delivered: false,
        skipReason: 'SESSION_SCHEDULED_START_MISSING',
      };
    }

    if (!this.isDispatchableSessionStatus(session.status)) {
      return {
        delivered: false,
        skipReason: `SESSION_STATUS_${session.status}`,
      };
    }

    if (reminder.scheduleRevision !== session.scheduleRevision) {
      return {
        delivered: false,
        skipReason: 'SESSION_SCHEDULE_REVISION_STALE',
      };
    }

    const policy = this.sessionSchedulePolicyService.parseSnapshot(
      session.schedulePolicySnapshotJson,
    );
    if (!policy || policy.scheduleRevision !== session.scheduleRevision) {
      return {
        delivered: false,
        skipReason: 'SESSION_SCHEDULE_POLICY_SNAPSHOT_MISSING',
      };
    }

    if (
      reminder.reminderType === SessionReminderType.STARTING_NOW ||
      reminder.reminderType === SessionReminderType.LATE_JOIN
    ) {
      const joined = await this.sessionReminderQueueRepository.hasParticipantJoined({
        sessionId: reminder.sessionId,
        recipientUserId: reminder.recipientUserId,
      });
      if (joined) {
        return { delivered: false, skipReason: 'PARTICIPANT_ALREADY_JOINED' };
      }
    }

    const recipientProfileId =
      reminder.recipientRole === 'PATIENT'
        ? session.patient?.id ?? null
        : session.practitioner?.id ?? null;

    if (!recipientProfileId) {
      return {
        delivered: false,
        skipReason: 'SESSION_RECIPIENT_PROFILE_MISSING',
      };
    }

    const recipient =
      reminder.recipientRole === 'PATIENT'
        ? await this.resolvePatientRecipient(recipientProfileId)
        : await this.resolvePractitionerRecipient(recipientProfileId);

    if (!recipient || recipient.userId !== reminder.recipientUserId) {
      return {
        delivered: false,
        skipReason: 'SESSION_RECIPIENT_NOT_FOUND',
      };
    }

    const slug = this.resolveSessionReminderSlug(reminder.reminderType);
    const titleKey = this.resolveSessionReminderTitleKey(
      reminder.reminderType,
      reminder.recipientRole as SessionReminderRecipientRole,
    );
    const bodyKey = this.resolveSessionReminderBodyKey(
      reminder.reminderType,
      reminder.recipientRole as SessionReminderRecipientRole,
    );
    const routePath = this.buildSessionRoutePath(
      recipient.locale,
      reminder.recipientRole as SessionReminderRecipientRole,
      reminder.sessionId,
    );
    const ctaLabel = this.i18nService.t(
      this.resolveSessionReminderCtaKey(reminder.reminderType),
      recipient.locale,
    );

    await this.queueBySlug({
      recipient,
      slug,
      titleKey,
      bodyKey,
      relatedEntityType: 'SESSION',
      relatedEntityId: reminder.sessionId,
      category: NotificationCategory.SESSION,
      scheduledFor: reminder.dueAt,
      params: {
        offsetMinutes: this.resolveReminderOffsetMinutes(reminder),
      },
      routePath,
      idempotencyKey: reminder.idempotencyKey,
      targetRole: reminder.recipientRole as SessionReminderRecipientRole,
      channels: {
        inApp: policy.reminder.inAppRemindersEnabled,
        email: policy.reminder.emailRemindersEnabled,
      },
      payload: {
        sessionId: reminder.sessionId,
        routePath,
        ctaLabel,
        // The existing notification convention uses an internal relative href.
        // It is intentionally not a provider URL or participant credential.
        ...(routePath
          ? {
              action: {
                type: 'INTERNAL_LINK',
                href: routePath,
                label: ctaLabel,
                semanticType: 'OPEN_SESSION_JOIN',
              },
            }
          : {}),
        reminderOffsetMinutes: this.resolveReminderOffsetMinutes(reminder),
        recipientRole: reminder.recipientRole,
        targetRole: reminder.recipientRole,
        reminderType: reminder.reminderType,
        actionType:
          reminder.reminderType === SessionReminderType.STARTING_NOW
            ? 'JOIN_NOW'
            : reminder.reminderType === SessionReminderType.LATE_JOIN
              ? 'LATE_JOIN'
              : reminder.reminderType === SessionReminderType.REMINDER_15
                ? 'JOIN_SESSION'
                : 'DETAILS',
        scheduleRevision: reminder.scheduleRevision,
        startsAtUtc: session.scheduledStartAt.toISOString(),
        timezoneSnapshot:
          reminder.recipientTimezoneSnapshot ?? recipient.timezone ?? 'UTC',
      },
    });

    return {
      delivered: true,
    };
  }

  async notifyConversationMessage(input: {
    lane: MessageLane;
    threadId: string;
    messageId: string;
    senderUserId: string;
    participants: Array<{
      userId: string;
      participantRole: ConversationParticipantRole;
    }>;
  }): Promise<void> {
    const recipients = Array.from(
      new Map(
        input.participants
          .filter(
            (participant) =>
              participant.userId !== input.senderUserId &&
              (participant.participantRole ===
                ConversationParticipantRole.PATIENT ||
                participant.participantRole ===
                  ConversationParticipantRole.PRACTITIONER),
          )
          .map((participant) => [participant.userId, participant]),
      ).values(),
    );

    if (recipients.length === 0) {
      return;
    }

    const slug = this.resolveMessageSlug(input.lane);
    const category = this.resolveMessageCategory(input.lane);
    const relatedEntityType = this.resolveMessageRelatedEntityType(input.lane);

    await Promise.all(
      recipients.map(async (recipient) => {
        const recipientRecord = await this.resolveUserRecipient(
          recipient.userId,
        );
        if (!recipientRecord) {
          return;
        }

        const bodyKey = this.resolveMessageBodyKey(
          input.lane,
          recipient.participantRole as SessionReminderRecipientRole,
        );
        const routePath = this.buildMessageRoutePath(
          recipientRecord.locale,
          recipient.participantRole as SessionReminderRecipientRole,
          input.lane,
          input.threadId,
        );

        await this.sendBySlug({
          recipient: recipientRecord,
          slug,
          titleKey: 'messages.notifications.title',
          bodyKey,
          relatedEntityType,
          relatedEntityId: input.messageId,
          category,
          routePath,
          idempotencyKey: this.buildMessageNotificationIdempotencyKey(
            input.lane,
            input.messageId,
            recipient.userId,
          ),
          targetRole: recipient.participantRole as SessionReminderRecipientRole,
          payload: {
            routePath,
            targetRole: recipient.participantRole,
          },
        });
      }),
    );
  }

  private async notifyPatientBySlug(input: {
    patientProfileId: string;
    slug: string;
    titleKey: string;
    bodyKey: string;
    params?: Record<string, string | number>;
    relatedEntityType: string;
    relatedEntityId: string;
    category: NotificationCategory;
    routePath?: string | null;
    idempotencyKey?: string | null;
  }): Promise<void> {
    const recipient = await this.resolvePatientRecipient(
      input.patientProfileId,
    );
    await this.sendBySlug({
      recipient,
      slug: input.slug,
      titleKey: input.titleKey,
      bodyKey: input.bodyKey,
      params: input.params,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      category: input.category,
      routePath: input.routePath ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
    });
  }

  private async resolvePatientRecipient(
    patientProfileId: string,
  ): Promise<Recipient | null> {
    const record = await this.repository.findPatientRecipient(patientProfileId);
    const email = record?.user.emails[0];
    return record?.user
      ? {
          userId: record.user.id,
          displayName: record.user.displayName,
          locale: this.resolveLocale(record.user.defaultLocale),
          email: email?.isVerified ? email.email : null,
          timezone: record.user.timezone,
        }
      : null;
  }

  private async resolvePractitionerRecipient(
    practitionerProfileId: string,
  ): Promise<Recipient | null> {
    const record = await this.repository.findPractitionerRecipient(
      practitionerProfileId,
    );
    const email = record?.user.emails[0];
    return record?.user
      ? {
          userId: record.user.id,
          displayName: record.user.displayName,
          locale: this.resolveLocale(record.user.defaultLocale),
          email: email?.isVerified ? email.email : null,
          timezone: record.user.timezone,
        }
      : null;
  }

  private async resolveUserRecipient(
    userId: string,
  ): Promise<Recipient | null> {
    const record = await this.repository.findUserRecipient(userId);
    const email = record?.emails[0];
    return record
      ? {
          userId: record.id,
          displayName: record.displayName,
          locale: this.resolveLocale(record.defaultLocale),
          email: email?.isVerified ? email.email : null,
          timezone: record.timezone,
        }
      : null;
  }

  private resolveLocale(raw: string | null): SupportedLocale {
    return raw === 'ar' ? 'ar' : 'en';
  }

  private buildPackageContextText(
    locale: SupportedLocale | null,
    packageContext?: SessionPackageContext | null,
  ): string {
    if (!locale || !packageContext) {
      return '';
    }

    return this.i18nService.t(
      'sessions.notifications.packageSessionContext',
      locale,
      {
        packageSessionIndex: packageContext.packageSessionIndex,
        packageSessionCount: packageContext.packageSessionCount,
      },
    );
  }

  private buildSessionRoutePath(
    locale: SupportedLocale | null,
    role: SessionReminderRecipientRole,
    sessionId: string,
  ): string | null {
    if (!locale) {
      return null;
    }

    return `/${locale}/${role.toLowerCase()}/sessions/${sessionId}/join`;
  }

  private buildInstantBookingRoutePath(
    locale: SupportedLocale | null,
    requestId: string,
  ): string | null {
    if (!locale) {
      return null;
    }

    return `/${locale}/patient/instant-booking?requestId=${encodeURIComponent(
      requestId,
    )}`;
  }

  private buildCareChatConversationRoutePath(
    locale: SupportedLocale | null,
    role: CareChatRecipientRole,
    conversationId: string,
  ): string | null {
    if (!locale) {
      return null;
    }

    return `/${locale}/${role.toLowerCase()}/care-chat/conversations/${encodeURIComponent(
      conversationId,
    )}`;
  }

  private buildCareChatRequestRoutePath(
    locale: SupportedLocale | null,
    role: CareChatRecipientRole,
    requestId: string,
  ): string | null {
    if (!locale) {
      return null;
    }

    return `/${locale}/${role.toLowerCase()}/care-chat/requests/${encodeURIComponent(
      requestId,
    )}`;
  }

  private buildMessageRoutePath(
    locale: SupportedLocale | null,
    role: SessionReminderRecipientRole,
    lane: MessageLane,
    threadId: string,
  ): string | null {
    if (!locale) {
      return null;
    }

    return `/${locale}/${role.toLowerCase()}/${this.resolveMessageRouteSegment(
      lane,
    )}/${threadId}`;
  }

  private buildSessionNotificationIdempotencyKey(
    slug: string,
    sessionId: string,
    userId: string | null,
  ): string | null {
    if (!userId) {
      return null;
    }

    return `${slug}:${sessionId}:${userId}`;
  }

  private buildInstantBookingNotificationIdempotencyKey(
    slug: string,
    requestId: string,
    userId: string | null,
  ): string | null {
    if (!userId) {
      return null;
    }

    return `${slug}:${requestId}:${userId}`;
  }

  private buildCareChatDecisionNotificationIdempotencyKey(
    slug: string,
    requestId: string,
    userId: string | null,
  ): string | null {
    if (!userId) {
      return null;
    }

    return `${slug}:${requestId}:${userId}`;
  }

  private resolveSessionReminderSlug(
    reminderType: SessionReminderType,
  ): string {
    switch (reminderType) {
      case SessionReminderType.REMINDER_60:
        return 'sessions.session-reminder-60';
      case SessionReminderType.REMINDER_15:
        return 'sessions.session-reminder-15';
      case SessionReminderType.PRE_START:
        return 'sessions.session-reminder-before-start';
      case SessionReminderType.STARTING_NOW:
        return 'sessions.session-starting-now';
      case SessionReminderType.LATE_JOIN:
        return 'sessions.session-late-join';
    }
  }

  private buildPatientInstantBookingPaymentRoutePath(
    locale: SupportedLocale | null,
    sessionId: string,
  ): string | null {
    if (!locale) {
      return null;
    }

    return `/${locale}/patient/sessions/${encodeURIComponent(sessionId)}/pay`;
  }

  private buildPractitionerInstantBookingRoutePath(
    locale: SupportedLocale | null,
  ): string | null {
    return locale ? `/${locale}/practitioner/instant-booking` : null;
  }

  private resolveSessionReminderCtaKey(
    type: SessionReminderType,
  ): string {
    switch (type) {
      case SessionReminderType.REMINDER_60:
      case SessionReminderType.PRE_START:
        return 'sessions.notifications.sessionReminderViewDetailsCta';
      case SessionReminderType.STARTING_NOW:
        return 'sessions.notifications.sessionStartingNowCta';
      case SessionReminderType.LATE_JOIN:
        return 'sessions.notifications.sessionLateJoinCta';
      case SessionReminderType.REMINDER_15:
      default:
        return 'sessions.notifications.sessionReminderJoinCta';
    }
  }

  private resolveSessionReminderTitleKey(
    reminderType: SessionReminderType,
    role: SessionReminderRecipientRole,
  ): string {
    if (reminderType === SessionReminderType.REMINDER_60) {
      return role === 'PATIENT'
        ? 'sessions.notifications.sessionReminder60Title'
        : 'sessions.notifications.sessionReminder60PractitionerTitle';
    }

    if (reminderType === SessionReminderType.REMINDER_15) {
      return role === 'PATIENT'
        ? 'sessions.notifications.sessionReminder15Title'
        : 'sessions.notifications.sessionReminder15PractitionerTitle';
    }
    if (reminderType === SessionReminderType.PRE_START) {
      return role === 'PATIENT'
        ? 'sessions.notifications.sessionReminderBeforeStartTitle'
        : 'sessions.notifications.sessionReminderBeforeStartPractitionerTitle';
    }
    if (reminderType === SessionReminderType.STARTING_NOW) {
      return role === 'PATIENT'
        ? 'sessions.notifications.sessionStartingNowTitle'
        : 'sessions.notifications.sessionStartingNowPractitionerTitle';
    }
    return role === 'PATIENT'
      ? 'sessions.notifications.sessionLateJoinTitle'
      : 'sessions.notifications.sessionLateJoinPractitionerTitle';
  }

  private resolveSessionReminderBodyKey(
    reminderType: SessionReminderType,
    role: SessionReminderRecipientRole,
  ): string {
    if (reminderType === SessionReminderType.REMINDER_60) {
      return role === 'PATIENT'
        ? 'sessions.notifications.sessionReminder60Body'
        : 'sessions.notifications.sessionReminder60PractitionerBody';
    }

    if (reminderType === SessionReminderType.REMINDER_15) {
      return role === 'PATIENT'
        ? 'sessions.notifications.sessionReminder15Body'
        : 'sessions.notifications.sessionReminder15PractitionerBody';
    }
    if (reminderType === SessionReminderType.PRE_START) {
      return role === 'PATIENT'
        ? 'sessions.notifications.sessionReminderBeforeStartBody'
        : 'sessions.notifications.sessionReminderBeforeStartPractitionerBody';
    }
    if (reminderType === SessionReminderType.STARTING_NOW) {
      return role === 'PATIENT'
        ? 'sessions.notifications.sessionStartingNowBody'
        : 'sessions.notifications.sessionStartingNowPractitionerBody';
    }
    return role === 'PATIENT'
      ? 'sessions.notifications.sessionLateJoinBody'
      : 'sessions.notifications.sessionLateJoinPractitionerBody';
  }

  private resolveReminderOffsetMinutes(reminder: SessionReminderQueueItem): number {
    return reminder.offsetMinutesSnapshot ?? 0;
  }

  private buildMessageNotificationIdempotencyKey(
    lane: MessageLane,
    messageId: string,
    userId: string,
  ): string {
    return `${this.resolveMessageIdempotencyBase(lane)}:${messageId}:${userId}`;
  }

  private buildChannelIdempotencyKey(
    baseKey: string | null,
    channel: 'in-app' | 'email' | 'push',
  ): string | null {
    if (!baseKey) {
      return null;
    }

    return `${baseKey}:${channel}`;
  }

  private async sendBySlug(input: {
    recipient: Recipient | null;
    slug: string;
    titleKey: string;
    bodyKey: string;
    params?: Record<string, string | number>;
    relatedEntityType: string;
    relatedEntityId: string;
    category: NotificationCategory;
    routePath?: string | null;
    idempotencyKey?: string | null;
    targetRole?: SessionReminderRecipientRole | null;
    channels?: {
      inApp?: boolean;
      email?: boolean;
    };
    payload?: Record<string, unknown> | null;
    /** Optional push-specific body key to use instead of bodyKey when rendering push notification body.
     *  Use when the default body contains PHI (e.g. {{sessionAt}} timestamps) that should not appear on lock screen.
     */
    pushBodyKey?: string;
  }): Promise<void> {
    if (!input.recipient) {
      return;
    }

    try {
      const notificationType = await this.repository.findTypeBySlug(input.slug);
      if (!notificationType) {
        this.logger.warn(
          `Notification type "${input.slug}" is missing; event was skipped`,
        );
        return;
      }

      const title = this.i18nService.t(
        input.titleKey,
        input.recipient.locale,
        input.params,
      );
      const body = this.i18nService.t(
        input.bodyKey,
        input.recipient.locale,
        input.params,
      );
      // Push-specific body: use pushBodyKey i18n string if provided, otherwise same as body
      // This prevents PHI (e.g. {{sessionAt}} ISO timestamps) from appearing on lock screen
      const pushBody = input.pushBodyKey
        ? this.i18nService.t(input.pushBodyKey, input.recipient.locale, input.params)
        : body;

      if (notificationType.supportsInApp && (input.channels?.inApp ?? true)) {
        await this.queueInApp({
          userId: input.recipient.userId,
          notificationTypeId: notificationType.id,
          templateId:
            notificationType.templates.find(
              (template) => template.channel === NotificationChannel.IN_APP,
            )?.id ?? null,
          locale: input.recipient.locale,
          title,
          body,
          payload: {
            ...(input.payload ?? {}),
            ...(input.routePath ? { routePath: input.routePath } : {}),
            ...(input.targetRole ? { targetRole: input.targetRole } : {}),
          },
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          idempotencyKey: this.buildChannelIdempotencyKey(
            input.idempotencyKey ?? null,
            'in-app',
          ),
        });
      }

      if (
        notificationType.supportsEmail &&
        (input.channels?.email ?? true) &&
        input.recipient.email
      ) {
        await this.queueEmail({
          userId: input.recipient.userId,
          notificationTypeId: notificationType.id,
          templateId:
            notificationType.templates.find(
              (template) => template.channel === NotificationChannel.EMAIL,
            )?.id ?? null,
          locale: input.recipient.locale,
          title,
          body,
          email: input.recipient.email,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          payload: input.payload ?? undefined,
          routePath: input.routePath ?? null,
          idempotencyKey: this.buildChannelIdempotencyKey(
            input.idempotencyKey ?? null,
            'email',
          ),
        });
      }

      if (notificationType.supportsPush) {
        await this.queuePush({
          userId: input.recipient.userId,
          notificationTypeId: notificationType.id,
          templateId:
            notificationType.templates.find(
              (template) => template.channel === NotificationChannel.PUSH,
            )?.id ?? null,
          locale: input.recipient.locale,
          title,
          body: pushBody,
          payload: {
            ...(input.payload ?? {}),
            ...(input.routePath ? { routePath: input.routePath } : {}),
            ...(input.targetRole ? { targetRole: input.targetRole } : {}),
          },
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          scheduledFor: new Date(),
          routePath: input.routePath ?? null,
          idempotencyKey: this.buildChannelIdempotencyKey(
            input.idempotencyKey ?? null,
            'push',
          ),
        });
      }
    } catch (error) {
      this.logger.warn(
        `Best-effort operational notification failed for "${input.slug}": ${(error as Error).message}`,
      );
    }
  }

  private resolveMessageSlug(lane: MessageLane): string {
    switch (lane) {
      case 'SESSION_CHAT':
        return 'messages.session-message-received';
      case 'SUPPORT':
        return 'messages.support-message-received';
      case 'CARE_CHAT':
        return 'messages.follow-up-message-received';
      default:
        return 'messages.session-message-received';
    }
  }

  private resolveMessageCategory(lane: MessageLane): NotificationCategory {
    switch (lane) {
      case 'SUPPORT':
        return NotificationCategory.SUPPORT;
      default:
        return NotificationCategory.CHAT;
    }
  }

  private resolveMessageRelatedEntityType(lane: MessageLane): string {
    switch (lane) {
      case 'SESSION_CHAT':
        return 'GENERAL_CHAT_MESSAGE';
      case 'SUPPORT':
        return 'SUPPORT_MESSAGE';
      case 'CARE_CHAT':
        return 'CARE_CHAT_MESSAGE';
      default:
        return 'GENERAL_CHAT_MESSAGE';
    }
  }

  private resolveMessageBodyKey(
    lane: MessageLane,
    recipientRole: SessionReminderRecipientRole,
  ): string {
    switch (lane) {
      case 'SESSION_CHAT':
        return recipientRole === 'PATIENT'
          ? 'messages.notifications.sessionBodyPatient'
          : 'messages.notifications.sessionBodyPractitioner';
      case 'SUPPORT':
        return 'messages.notifications.supportBody';
      case 'CARE_CHAT':
        return recipientRole === 'PATIENT'
          ? 'messages.notifications.followUpBodyPatient'
          : 'messages.notifications.followUpBodyPractitioner';
      default:
        return 'messages.notifications.title';
    }
  }

  private resolveMessageRouteSegment(lane: MessageLane): string {
    switch (lane) {
      case 'SESSION_CHAT':
        return 'messages';
      case 'SUPPORT':
        return 'support';
      case 'CARE_CHAT':
        return 'care-chat';
      default:
        return 'messages';
    }
  }

  private resolveMessageIdempotencyBase(lane: MessageLane): string {
    switch (lane) {
      case 'SESSION_CHAT':
        return 'messages.session-message';
      case 'SUPPORT':
        return 'messages.support-message';
      case 'CARE_CHAT':
        return 'messages.follow-up-message';
      default:
        return 'messages.session-message';
    }
  }

  private async queueInApp(input: {
    userId: string;
    notificationTypeId: string;
    templateId: string | null;
    locale: SupportedLocale;
    title: string;
    body: string;
    payload: Prisma.InputJsonValue;
    relatedEntityType: string;
    relatedEntityId: string;
    idempotencyKey?: string | null;
  }) {
    const pref = await this.repository.findPreference({
      userId: input.userId,
      notificationTypeId: input.notificationTypeId,
      channel: NotificationChannel.IN_APP,
    });

    if (pref && !pref.isEnabled) {
      await this.repository.createNotification({
        userId: input.userId,
        notificationTypeId: input.notificationTypeId,
        templateId: input.templateId,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SUPPRESSED,
        locale: input.locale,
        titleSnapshot: input.title,
        bodySnapshot: input.body,
        payloadJson: input.payload,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        idempotencyKey: input.idempotencyKey ?? null,
        suppressedReason: 'USER_PREF_DISABLED',
      });
      return;
    }

    await this.repository.createNotification({
      userId: input.userId,
      notificationTypeId: input.notificationTypeId,
      templateId: input.templateId,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.SENT,
      sentAt: new Date(),
      locale: input.locale,
      titleSnapshot: input.title,
      bodySnapshot: input.body,
      payloadJson: input.payload,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      idempotencyKey: input.idempotencyKey ?? null,
    });
  }

  private async queuePush(input: {
    userId: string;
    notificationTypeId: string;
    templateId: string | null;
    locale: SupportedLocale;
    title: string;
    body: string;
    payload: Prisma.InputJsonValue;
    relatedEntityType: string;
    relatedEntityId: string;
    scheduledFor: Date;
    routePath?: string | null;
    idempotencyKey?: string | null;
  }) {
    const pref = await this.repository.findPreference({
      userId: input.userId,
      notificationTypeId: input.notificationTypeId,
      channel: NotificationChannel.PUSH,
    });

    if (pref && !pref.isEnabled) {
      await this.repository.createNotification({
        userId: input.userId,
        notificationTypeId: input.notificationTypeId,
        templateId: input.templateId,
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.SUPPRESSED,
        locale: input.locale,
        titleSnapshot: input.title,
        bodySnapshot: input.body,
        payloadJson: input.payload,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        scheduledFor: input.scheduledFor,
        idempotencyKey: input.idempotencyKey ?? null,
        suppressedReason: 'USER_PREF_DISABLED',
      });
      return;
    }

    await this.repository.createNotification({
      userId: input.userId,
      notificationTypeId: input.notificationTypeId,
      templateId: input.templateId,
      channel: NotificationChannel.PUSH,
      status: NotificationStatus.PENDING,
      locale: input.locale,
      titleSnapshot: input.title,
      bodySnapshot: input.body,
      payloadJson: input.payload,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      scheduledFor: input.scheduledFor,
      idempotencyKey: input.idempotencyKey ?? null,
    });
  }

  private async queueEmail(input: {
    userId: string;
    notificationTypeId: string;
    templateId: string | null;
    locale: SupportedLocale;
    title: string;
    body: string;
    email: string;
    relatedEntityType: string;
    relatedEntityId: string;
    payload?: Record<string, unknown>;
    routePath?: string | null;
    idempotencyKey?: string | null;
  }) {
    const pref = await this.repository.findPreference({
      userId: input.userId,
      notificationTypeId: input.notificationTypeId,
      channel: NotificationChannel.EMAIL,
    });

    if (pref && !pref.isEnabled) {
      await this.repository.createNotification({
        userId: input.userId,
        notificationTypeId: input.notificationTypeId,
        templateId: input.templateId,
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.SUPPRESSED,
        locale: input.locale,
        titleSnapshot: input.title,
        subjectSnapshot: input.title,
        bodySnapshot: input.body,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        idempotencyKey: input.idempotencyKey ?? null,
        suppressedReason: 'USER_PREF_DISABLED',
      });
      return;
    }

    await this.repository.createNotification({
      userId: input.userId,
      notificationTypeId: input.notificationTypeId,
      templateId: input.templateId,
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.PENDING,
      locale: input.locale,
      titleSnapshot: input.title,
      subjectSnapshot: input.title,
      bodySnapshot: input.body,
      payloadJson: {
        target: input.email,
        ...(input.payload ?? {}),
        ...(input.routePath ? { routePath: input.routePath } : {}),
      },
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      scheduledFor: new Date(),
      idempotencyKey: input.idempotencyKey ?? null,
    });
  }

  private isDispatchableSessionStatus(status: SessionStatus): boolean {
    return (
      status === SessionStatus.UPCOMING ||
      status === SessionStatus.READY_TO_JOIN ||
      status === SessionStatus.IN_PROGRESS
    );
  }

  private async queueBySlug(input: {
    recipient: Recipient | null;
    slug: string;
    titleKey: string;
    bodyKey: string;
    params?: Record<string, string | number>;
    relatedEntityType: string;
    relatedEntityId: string;
    category: NotificationCategory;
    scheduledFor: Date;
    routePath?: string | null;
    idempotencyKey?: string | null;
    targetRole?: SessionReminderRecipientRole | null;
    channels?: {
      inApp?: boolean;
      email?: boolean;
    };
    payload?: Record<string, unknown> | null;
    /** Optional push-specific body key to use instead of bodyKey for push notifications.
     *  Use when the default body contains PHI (e.g. {{sessionAt}} timestamps).
     */
    pushBodyKey?: string;
  }): Promise<void> {
    if (!input.recipient) {
      return;
    }

    try {
      const notificationType = await this.repository.findTypeBySlug(input.slug);
      if (!notificationType) {
        this.logger.warn(
          `Notification type "${input.slug}" is missing; scheduled hook was skipped`,
        );
        return;
      }

      const title = this.i18nService.t(
        input.titleKey,
        input.recipient.locale,
        input.params,
      );
      const body = this.i18nService.t(
        input.bodyKey,
        input.recipient.locale,
        input.params,
      );
      // Push-specific body: use pushBodyKey i18n string if provided, otherwise same as body
      // This prevents PHI (e.g. {{sessionAt}} ISO timestamps) from appearing on lock screen
      const pushBody = input.pushBodyKey
        ? this.i18nService.t(input.pushBodyKey, input.recipient.locale, input.params)
        : body;

      if (notificationType.supportsInApp && (input.channels?.inApp ?? true)) {
        const inAppPref = await this.repository.findPreference({
          userId: input.recipient.userId,
          notificationTypeId: notificationType.id,
          channel: NotificationChannel.IN_APP,
        });
        await this.repository.createNotification({
          userId: input.recipient.userId,
          notificationTypeId: notificationType.id,
          templateId:
            notificationType.templates.find(
              (template) => template.channel === NotificationChannel.IN_APP,
            )?.id ?? null,
          channel: NotificationChannel.IN_APP,
          status:
            inAppPref?.isEnabled === false
              ? NotificationStatus.SUPPRESSED
              : NotificationStatus.PENDING,
          locale: input.recipient.locale,
          titleSnapshot: title,
          bodySnapshot: body,
          payloadJson: {
            ...(input.payload ?? {}),
            ...(input.routePath ? { routePath: input.routePath } : {}),
            ...(input.targetRole ? { targetRole: input.targetRole } : {}),
            relatedEntityType: input.relatedEntityType,
            relatedEntityId: input.relatedEntityId,
            category: input.category,
          },
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          scheduledFor: input.scheduledFor,
          idempotencyKey: this.buildChannelIdempotencyKey(
            input.idempotencyKey ?? null,
            'in-app',
          ),
          suppressedReason:
            inAppPref?.isEnabled === false ? 'USER_PREF_DISABLED' : null,
        });
      }

      if (
        notificationType.supportsEmail &&
        (input.channels?.email ?? true) &&
        input.recipient.email
      ) {
        const emailPref = await this.repository.findPreference({
          userId: input.recipient.userId,
          notificationTypeId: notificationType.id,
          channel: NotificationChannel.EMAIL,
        });
        await this.repository.createNotification({
          userId: input.recipient.userId,
          notificationTypeId: notificationType.id,
          templateId:
            notificationType.templates.find(
              (template) => template.channel === NotificationChannel.EMAIL,
            )?.id ?? null,
          channel: NotificationChannel.EMAIL,
          status:
            emailPref?.isEnabled === false
              ? NotificationStatus.SUPPRESSED
              : NotificationStatus.PENDING,
          locale: input.recipient.locale,
          titleSnapshot: title,
          subjectSnapshot: title,
          bodySnapshot: body,
          payloadJson: {
            target: input.recipient.email,
            ...(input.payload ?? {}),
            ...(input.routePath ? { routePath: input.routePath } : {}),
            ...(input.targetRole ? { targetRole: input.targetRole } : {}),
            relatedEntityType: input.relatedEntityType,
            relatedEntityId: input.relatedEntityId,
            category: input.category,
          },
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          scheduledFor: input.scheduledFor,
          idempotencyKey: this.buildChannelIdempotencyKey(
            input.idempotencyKey ?? null,
            'email',
          ),
          suppressedReason:
            emailPref?.isEnabled === false ? 'USER_PREF_DISABLED' : null,
        });
      }

      if (notificationType.supportsPush) {
        const pushPref = await this.repository.findPreference({
          userId: input.recipient.userId,
          notificationTypeId: notificationType.id,
          channel: NotificationChannel.PUSH,
        });
        await this.repository.createNotification({
          userId: input.recipient.userId,
          notificationTypeId: notificationType.id,
          templateId:
            notificationType.templates.find(
              (template) => template.channel === NotificationChannel.PUSH,
            )?.id ?? null,
          channel: NotificationChannel.PUSH,
          status:
            pushPref?.isEnabled === false
              ? NotificationStatus.SUPPRESSED
              : NotificationStatus.PENDING,
          locale: input.recipient.locale,
          titleSnapshot: title,
          bodySnapshot: pushBody,
          payloadJson: {
            ...(input.payload ?? {}),
            ...(input.routePath ? { routePath: input.routePath } : {}),
            ...(input.targetRole ? { targetRole: input.targetRole } : {}),
            relatedEntityType: input.relatedEntityType,
            relatedEntityId: input.relatedEntityId,
            category: input.category,
          },
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          scheduledFor: input.scheduledFor,
          idempotencyKey: this.buildChannelIdempotencyKey(
            input.idempotencyKey ?? null,
            'push',
          ),
          suppressedReason:
            pushPref?.isEnabled === false ? 'USER_PREF_DISABLED' : null,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Best-effort scheduled operational notification failed for "${input.slug}": ${(error as Error).message}`,
      );
    }
  }
}
