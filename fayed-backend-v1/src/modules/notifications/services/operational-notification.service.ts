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
  SessionReminderQueueRepository,
} from '../repositories/session-reminder-queue.repository';
import { OperationalNotificationRepository } from '../repositories/operational-notification.repository';

type Recipient = {
  userId: string;
  displayName: string | null;
  locale: SupportedLocale;
  email: string | null;
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

type MessageLane = 'SESSION_CHAT' | 'SUPPORT' | 'CARE_CHAT';

type SessionReminderNotificationInput = {
  patientProfileId: string;
  practitionerProfileId: string;
  sessionId: string;
  scheduledStartAt: Date | null;
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

  async notifySessionConfirmed(input: {
    patientProfileId: string;
    practitionerProfileId: string;
    sessionId: string;
    scheduledStartAt: Date | null;
    packageContext?: SessionPackageContext | null;
  }): Promise<void> {
    const sessionAt = input.scheduledStartAt?.toISOString() ?? '-';
    const packageContextPayload = input.packageContext
      ? {
          packagePurchaseId: input.packageContext.packagePurchaseId,
          packagePlanCode: input.packageContext.packagePlanCode,
          packagePlanTitle: input.packageContext.packagePlanTitle ?? null,
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
        payload: packageContextPayload,
      }),
      this.sendBySlug({
        recipient: practitioner,
        slug: 'sessions.session-confirmed-practitioner',
        titleKey: 'sessions.notifications.sessionConfirmedPractitionerTitle',
        bodyKey: 'sessions.notifications.sessionConfirmedPractitionerBody',
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
        payload: packageContextPayload,
      }),
    ]);

    await this.queueSessionReminders({
      patientProfileId: input.patientProfileId,
      practitionerProfileId: input.practitionerProfileId,
      sessionId: input.sessionId,
      scheduledStartAt: input.scheduledStartAt,
    });
  }

  async notifySessionCancelledByPatient(input: {
    patientProfileId: string;
    practitionerProfileId: string;
    sessionId: string;
    scheduledStartAt: Date | null;
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
      }),
      this.sendBySlug({
        recipient: practitioner,
        slug: 'sessions.session-cancelled-practitioner',
        titleKey: 'sessions.notifications.sessionCancelledPractitionerTitle',
        bodyKey: 'sessions.notifications.sessionCancelledPractitionerBody',
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
      }),
    ]);

    await this.cancelSessionReminders({ sessionId: input.sessionId });
  }

  async notifyTrainingEnrollmentConfirmed(input: {
    userId: string;
    enrollmentId: string;
    scheduleId: string;
    scheduledStartAt: Date | null;
  }): Promise<void> {
    const recipient = await this.resolveUserRecipient(input.userId);
    const sessionAt = input.scheduledStartAt?.toISOString() ?? '-';

    await this.sendBySlug({
      recipient,
      slug: 'training.enrollment-confirmed',
      titleKey: 'training.notifications.enrollmentConfirmedTitle',
      bodyKey: 'training.notifications.enrollmentConfirmedBody',
      params: { sessionAt },
      relatedEntityType: 'TRAINING_ENROLLMENT',
      relatedEntityId: input.enrollmentId,
      category: NotificationCategory.TRAINING,
    });
  }

  async queueTrainingScheduleReminder(input: {
    userId: string;
    enrollmentId: string;
    scheduleId: string;
    scheduledFor: Date;
    scheduledStartAt: Date | null;
  }): Promise<void> {
    const recipient = await this.resolveUserRecipient(input.userId);
    const sessionAt = input.scheduledStartAt?.toISOString() ?? '-';

    await this.queueBySlug({
      recipient,
      slug: 'training.schedule-reminder',
      titleKey: 'training.notifications.scheduleReminderTitle',
      bodyKey: 'training.notifications.scheduleReminderBody',
      params: { sessionAt },
      relatedEntityType: 'TRAINING_ENROLLMENT',
      relatedEntityId: input.enrollmentId,
      category: NotificationCategory.TRAINING,
      scheduledFor: input.scheduledFor,
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

    await Promise.all([
      this.scheduleSessionReminderForRecipient({
        recipient: patient,
        role: 'PATIENT',
        sessionId: input.sessionId,
        scheduledStartAt: input.scheduledStartAt,
        offsetMinutes: 60,
      }),
      this.scheduleSessionReminderForRecipient({
        recipient: patient,
        role: 'PATIENT',
        sessionId: input.sessionId,
        scheduledStartAt: input.scheduledStartAt,
        offsetMinutes: 15,
      }),
      this.scheduleSessionReminderForRecipient({
        recipient: practitioner,
        role: 'PRACTITIONER',
        sessionId: input.sessionId,
        scheduledStartAt: input.scheduledStartAt,
        offsetMinutes: 60,
      }),
      this.scheduleSessionReminderForRecipient({
        recipient: practitioner,
        role: 'PRACTITIONER',
        sessionId: input.sessionId,
        scheduledStartAt: input.scheduledStartAt,
        offsetMinutes: 15,
      }),
    ]);

    await this.cancelSessionReminders({ sessionId: input.sessionId });
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

    await this.queueBySlug({
      recipient,
      slug,
      titleKey,
      bodyKey,
      relatedEntityType: 'SESSION',
      relatedEntityId: reminder.sessionId,
      category: NotificationCategory.SESSION,
      scheduledFor: reminder.dueAt,
      routePath: this.buildSessionRoutePath(
        recipient.locale,
        reminder.recipientRole as SessionReminderRecipientRole,
        reminder.sessionId,
      ),
      idempotencyKey: reminder.idempotencyKey,
      targetRole: reminder.recipientRole as SessionReminderRecipientRole,
      payload: {
        routePath: this.buildSessionRoutePath(
          recipient.locale,
          reminder.recipientRole as SessionReminderRecipientRole,
          reminder.sessionId,
        ),
        reminderOffsetMinutes:
          reminder.reminderType === SessionReminderType.REMINDER_60 ? 60 : 15,
        recipientRole: reminder.recipientRole,
        targetRole: reminder.recipientRole,
        scheduledStartAt: session.scheduledStartAt.toISOString(),
        reminderType: reminder.reminderType,
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
            threadId: input.threadId,
            routePath,
            targetRole: recipient.participantRole,
            relatedEntityType,
            relatedEntityId: input.messageId,
            category,
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

    return `/${locale}/${role.toLowerCase()}/sessions/${sessionId}`;
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

  private resolveSessionReminderSlug(
    reminderType: SessionReminderType,
  ): string {
    return reminderType === SessionReminderType.REMINDER_60
      ? 'sessions.session-reminder-60'
      : 'sessions.session-reminder-15';
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

    return role === 'PATIENT'
      ? 'sessions.notifications.sessionReminder15Title'
      : 'sessions.notifications.sessionReminder15PractitionerTitle';
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

    return role === 'PATIENT'
      ? 'sessions.notifications.sessionReminder15Body'
      : 'sessions.notifications.sessionReminder15PractitionerBody';
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
    payload?: Record<string, unknown> | null;
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

      if (notificationType.supportsInApp) {
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
            relatedEntityType: input.relatedEntityType,
            relatedEntityId: input.relatedEntityId,
            category: input.category,
          },
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          idempotencyKey: this.buildChannelIdempotencyKey(
            input.idempotencyKey ?? null,
            'in-app',
          ),
        });
      }

      if (notificationType.supportsEmail && input.recipient.email) {
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
          body,
          payload: {
            ...(input.payload ?? {}),
            ...(input.routePath ? { routePath: input.routePath } : {}),
            ...(input.targetRole ? { targetRole: input.targetRole } : {}),
            relatedEntityType: input.relatedEntityType,
            relatedEntityId: input.relatedEntityId,
            category: input.category,
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

  private async scheduleSessionReminderForRecipient(input: {
    recipient: Recipient | null;
    role: SessionReminderRecipientRole;
    sessionId: string;
    scheduledStartAt: Date;
    offsetMinutes: 60 | 15;
  }): Promise<void> {
    if (!input.recipient) {
      return;
    }

    const dueAt = new Date(
      input.scheduledStartAt.getTime() - input.offsetMinutes * 60_000,
    );
    const now = new Date();
    if (dueAt.getTime() < now.getTime()) {
      return;
    }

    const slug =
      input.offsetMinutes === 60
        ? 'sessions.session-reminder-60'
        : 'sessions.session-reminder-15';
    const idempotencyKey = this.buildSessionNotificationIdempotencyKey(
      slug,
      input.sessionId,
      input.recipient.userId,
    );

    if (!idempotencyKey) {
      return;
    }

    await this.sessionReminderQueueRepository.scheduleMany([
      {
        sessionId: input.sessionId,
        recipientUserId: input.recipient.userId,
        recipientRole: input.role as UserRoleType,
        reminderType:
          input.offsetMinutes === 60
            ? SessionReminderType.REMINDER_60
            : SessionReminderType.REMINDER_15,
        dueAt,
        idempotencyKey,
      },
    ]);
  }

  private isDispatchableSessionStatus(status: SessionStatus): boolean {
    return (
      status === SessionStatus.CONFIRMED ||
      status === SessionStatus.UPCOMING ||
      status === SessionStatus.READY_TO_JOIN
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
    payload?: Record<string, unknown> | null;
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

      if (notificationType.supportsInApp) {
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

      if (notificationType.supportsEmail && input.recipient.email) {
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
