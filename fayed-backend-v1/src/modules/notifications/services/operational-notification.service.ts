import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
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

@Injectable()
export class OperationalNotificationService {
  private readonly logger = new Logger(OperationalNotificationService.name);

  constructor(
    private readonly repository: OperationalNotificationRepository,
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
        payload: packageContextPayload,
      }),
    ]);
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
      }),
    ]);
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

  private async notifyPatientBySlug(input: {
    patientProfileId: string;
    slug: string;
    titleKey: string;
    bodyKey: string;
    params?: Record<string, string | number>;
    relatedEntityType: string;
    relatedEntityId: string;
    category: NotificationCategory;
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

  private async sendBySlug(input: {
    recipient: Recipient | null;
    slug: string;
    titleKey: string;
    bodyKey: string;
    params?: Record<string, string | number>;
    relatedEntityType: string;
    relatedEntityId: string;
    category: NotificationCategory;
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
            relatedEntityType: input.relatedEntityType,
            relatedEntityId: input.relatedEntityId,
            category: input.category,
          },
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
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
        });
      }
    } catch (error) {
      this.logger.warn(
        `Best-effort operational notification failed for "${input.slug}": ${(error as Error).message}`,
      );
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
        },
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      scheduledFor: new Date(),
    });
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
            relatedEntityType: input.relatedEntityType,
            relatedEntityId: input.relatedEntityId,
            category: input.category,
          },
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          scheduledFor: input.scheduledFor,
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
            relatedEntityType: input.relatedEntityType,
            relatedEntityId: input.relatedEntityId,
            category: input.category,
          },
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          scheduledFor: input.scheduledFor,
          suppressedReason:
            emailPref?.isEnabled === false ? 'USER_PREF_DISABLED' : null,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Best-effort scheduled operational notification failed for "${input.slug}": ${(error as Error).message}`,
      );
    }
  }
}
