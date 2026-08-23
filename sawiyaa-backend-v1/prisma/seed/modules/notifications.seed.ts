import {
  NotificationCategory,
  NotificationChannel,
  PrismaClient,
} from '@prisma/client';
import { SeedModule } from '../shared/seed.types';

/**
 * Notifications seed module provides baseline notification types/templates
 * required by auth and admin decision flows.
 */
export const notificationsSeedModule: SeedModule = {
  name: 'notifications',
  async run(prisma: PrismaClient): Promise<void> {
    const typeSeed: Array<{
      slug: string;
      displayName: string;
      description: string;
      category: NotificationCategory;
      supportsEmail?: boolean;
      supportsSms?: boolean;
      supportsPush?: boolean;
      supportsInApp?: boolean;
    }> = [
      {
        slug: 'auth.practitioner-login-otp',
        displayName: 'Practitioner Login OTP',
        description: 'OTP challenge for practitioner login step 2',
        category: NotificationCategory.SECURITY,
      },
      {
        slug: 'auth.practitioner-signup-email-verification',
        displayName: 'Practitioner Signup Email Verification',
        description: 'OTP verification during practitioner signup',
        category: NotificationCategory.SECURITY,
        supportsEmail: true,
        supportsSms: false,
        supportsPush: false,
        supportsInApp: false,
      },
      {
        slug: 'auth.password-reset',
        displayName: 'Password Reset OTP',
        description: 'Password reset challenge notification',
        category: NotificationCategory.SECURITY,
      },
      {
        slug: 'admin.practitioner-application-approved',
        displayName: 'Practitioner Application Approved',
        description: 'Admin decision notification for approved application',
        category: NotificationCategory.SYSTEM,
      },
      {
        slug: 'admin.practitioner-application-rejected',
        displayName: 'Practitioner Application Rejected',
        description: 'Admin decision notification for rejected application',
        category: NotificationCategory.SYSTEM,
      },
      {
        slug: 'admin.practitioner-application-changes-requested',
        displayName: 'Practitioner Application Changes Requested',
        description: 'Admin review requirements sent back to the practitioner',
        category: NotificationCategory.SYSTEM,
      },
      {
        slug: 'payments.payment-succeeded',
        displayName: 'Payment Succeeded',
        description: 'Operational notification for successful payment capture',
        category: NotificationCategory.PAYMENT,
      },
      {
        slug: 'payments.payment-failed',
        displayName: 'Payment Failed',
        description: 'Operational notification for failed payment capture',
        category: NotificationCategory.PAYMENT,
      },
      {
        slug: 'payments.refund-requested',
        displayName: 'Refund Requested',
        description: 'Operational notification when refund is requested',
        category: NotificationCategory.PAYMENT,
      },
      {
        slug: 'payments.refund-succeeded',
        displayName: 'Refund Succeeded',
        description:
          'Operational notification when refund is processed successfully',
        category: NotificationCategory.PAYMENT,
      },
      {
        slug: 'payments.refund-failed',
        displayName: 'Refund Failed',
        description: 'Operational notification when refund processing fails',
        category: NotificationCategory.PAYMENT,
      },
      {
        slug: 'sessions.session-confirmed',
        displayName: 'Session Confirmed (Patient)',
        description:
          'Operational notification for patient when session is confirmed',
        category: NotificationCategory.SESSION,
        supportsPush: true,
      },
      {
        slug: 'sessions.session-confirmed-practitioner',
        displayName: 'Session Confirmed (Practitioner)',
        description:
          'Operational notification for practitioner when session is confirmed',
        category: NotificationCategory.SESSION,
        supportsPush: true,
      },
      {
        slug: 'sessions.session-cancelled',
        displayName: 'Session Cancelled (Patient)',
        description:
          'Operational notification for patient when session is cancelled',
        category: NotificationCategory.SESSION,
        supportsPush: true,
      },
      {
        slug: 'sessions.session-cancelled-practitioner',
        displayName: 'Session Cancelled (Practitioner)',
        description:
          'Operational notification for practitioner when patient cancels session',
        category: NotificationCategory.SESSION,
        supportsPush: true,
      },
      {
        slug: 'sessions.session-join-available',
        displayName: 'Session Join Available',
        description:
          'In-app notification when a paid session becomes ready to join',
        category: NotificationCategory.SESSION,
        supportsEmail: true,
        supportsSms: false,
        supportsPush: true,
        supportsInApp: true,
      },
      {
        slug: 'messages.session-message-received',
        displayName: 'Session Chat Message Received',
        description:
          'Operational notification when a session chat message is received',
        category: NotificationCategory.CHAT,
        supportsEmail: false,
        supportsSms: false,
        supportsPush: true,
        supportsInApp: true,
      },
      {
        slug: 'messages.support-message-received',
        displayName: 'Support Message Received',
        description:
          'Operational notification when a support message is received',
        category: NotificationCategory.SUPPORT,
        supportsEmail: false,
        supportsSms: false,
        supportsPush: true,
        supportsInApp: true,
      },
      {
        slug: 'messages.follow-up-message-received',
        displayName: 'Follow-up Message Received',
        description:
          'Operational notification when a follow-up chat message is received',
        category: NotificationCategory.CHAT,
        supportsEmail: false,
        supportsSms: false,
        supportsPush: true,
        supportsInApp: true,
      },
      {
        slug: 'care-chat.request-approved',
        displayName: 'Care Chat Request Approved',
        description:
          'Operational notification when a care-chat request is approved',
        category: NotificationCategory.CHAT,
        supportsEmail: false,
        supportsSms: false,
        supportsPush: true,
        supportsInApp: true,
      },
      {
        slug: 'care-chat.request-rejected',
        displayName: 'Care Chat Request Rejected',
        description:
          'Operational notification when a care-chat request is rejected',
        category: NotificationCategory.CHAT,
        supportsEmail: false,
        supportsSms: false,
        supportsPush: true,
        supportsInApp: true,
      },
      {
        slug: 'care-chat.request-revoked',
        displayName: 'Care Chat Request Revoked',
        description:
          'Operational notification when a care-chat request is revoked',
        category: NotificationCategory.CHAT,
        supportsEmail: false,
        supportsSms: false,
        supportsPush: true,
        supportsInApp: true,
      },
      {
        slug: 'sessions.session-reminder-60',
        displayName: 'Session Reminder 60 Minutes',
        description: 'Operational reminder sent one hour before a session',
        category: NotificationCategory.SESSION,
        supportsEmail: true,
        supportsSms: false,
        supportsPush: true,
        supportsInApp: true,
      },
      {
        slug: 'sessions.session-reminder-15',
        displayName: 'Session Reminder 15 Minutes',
        description:
          'Operational reminder sent fifteen minutes before a session',
        category: NotificationCategory.SESSION,
        supportsEmail: true,
        supportsSms: false,
        supportsPush: true,
        supportsInApp: true,
      },
      {
        slug: 'sessions.session-starting-now',
        displayName: 'Session Starting Now',
        description: 'Reminder sent when a session starts.',
        category: NotificationCategory.SESSION,
        supportsEmail: true,
        supportsSms: false,
        supportsPush: true,
        supportsInApp: true,
      },
      {
        slug: 'sessions.session-late-join',
        displayName: 'Session Late Join Reminder',
        description: 'Targeted reminder for a participant who has not joined.',
        category: NotificationCategory.SESSION,
        supportsEmail: true,
        supportsSms: false,
        supportsPush: true,
        supportsInApp: true,
      },
      {
        slug: 'sessions.session-reminder-before-start',
        displayName: 'Session Reminder Before Start',
        description: 'Configurable pre-start session reminder.',
        category: NotificationCategory.SESSION,
        supportsEmail: true,
        supportsSms: false,
        supportsPush: true,
        supportsInApp: true,
      },
      {
        slug: 'instant-booking.request-created',
        displayName: 'Instant Booking Request Created',
        description:
          'Practitioner notification when a patient creates an instant booking request',
        category: NotificationCategory.SESSION,
        supportsEmail: true,
        supportsSms: false,
        supportsPush: true,
        supportsInApp: true,
      },
      {
        slug: 'instant-booking.request-accepted',
        displayName: 'Instant Booking Request Accepted',
        description:
          'Patient notification when an instant booking request is accepted',
        category: NotificationCategory.SESSION,
        supportsEmail: true,
        supportsSms: false,
        supportsPush: true,
        supportsInApp: true,
      },
      {
        slug: 'instant-booking.request-rejected',
        displayName: 'Instant Booking Request Rejected',
        description:
          'Patient notification when an instant booking request is rejected',
        category: NotificationCategory.SESSION,
        supportsEmail: true,
        supportsSms: false,
        supportsPush: true,
        supportsInApp: true,
      },
      {
        slug: 'instant-booking.request-expired',
        displayName: 'Instant Booking Request Expired',
        description:
          'Patient notification when an instant booking request expires',
        category: NotificationCategory.SESSION,
        supportsEmail: true,
        supportsSms: false,
        supportsPush: true,
        supportsInApp: true,
      },
      {
        slug: 'availability.week-ending-reminder',
        displayName: 'Availability Week Ending Reminder',
        description:
          'Operational reminder for practitioners to publish the next availability week',
        category: NotificationCategory.SESSION,
        supportsEmail: true,
        supportsSms: false,
        supportsPush: true,
        supportsInApp: true,
      },
      {
        slug: 'dev.push-test',
        displayName: 'Dev Push Test',
        description: 'Developer-only Expo push test notification type',
        category: NotificationCategory.SYSTEM,
        supportsEmail: false,
        supportsSms: false,
        supportsPush: true,
        supportsInApp: false,
      },
      {
        slug: 'moderation.report-created',
        displayName: 'Moderation Report Created',
        description: 'Notification for authorized moderation reviewers',
        category: NotificationCategory.SECURITY,
        supportsEmail: false,
        supportsSms: false,
        supportsPush: false,
        supportsInApp: true,
      },
      {
        slug: 'moderation.report-reviewed',
        displayName: 'Moderation Report Reviewed',
        description: 'Safe notification to the report creator after review',
        category: NotificationCategory.SECURITY,
        supportsEmail: false,
        supportsSms: false,
        supportsPush: false,
        supportsInApp: true,
      },
    ];

    for (const type of typeSeed) {
      const existing = await prisma.notificationType.findUnique({
        where: { slug: type.slug },
        select: { id: true },
      });
      if (!existing) {
        await prisma.notificationType.create({
          data: {
            ...type,
            defaultEnabled: true,
            supportsEmail: type.supportsEmail ?? true,
            supportsSms: type.supportsSms ?? true,
            supportsPush: type.supportsPush ?? false,
            supportsInApp: type.supportsInApp ?? true,
            isMandatory: false,
          },
        });
      }
    }

    const templateSeed = [
      {
        typeSlug: 'instant-booking.request-created',
        channel: NotificationChannel.EMAIL,
        slug: 'instant-booking.request-created.email.v1',
        translations: {
          en: { subjectTemplate: 'New instant booking request', titleTemplate: 'New instant booking request', bodyTemplate: 'A patient sent you a new instant booking request. Open Sawiyaa to respond.', ctaLabel: 'Open request', ctaUrlTemplate: '{{appUrl}}{{routePath}}' },
          ar: { subjectTemplate: 'طلب حجز فوري جديد', titleTemplate: 'طلب حجز فوري جديد', bodyTemplate: 'أرسل أحد المرضى طلب حجز فوري جديدًا. افتح سويّا للرد.', ctaLabel: 'افتح الطلب', ctaUrlTemplate: '{{appUrl}}{{routePath}}' },
        },
      },
      {
        typeSlug: 'instant-booking.request-accepted',
        channel: NotificationChannel.EMAIL,
        slug: 'instant-booking.request-accepted.email.v1',
        translations: {
          en: { subjectTemplate: 'Your instant booking was accepted', titleTemplate: 'Instant booking accepted', bodyTemplate: 'Your instant booking request was accepted. Continue to payment in Sawiyaa.', ctaLabel: 'Continue to payment', ctaUrlTemplate: '{{appUrl}}{{routePath}}' },
          ar: { subjectTemplate: 'تم قبول الحجز الفوري', titleTemplate: 'تم قبول الحجز الفوري', bodyTemplate: 'تم قبول طلب الحجز الفوري. تابع إلى الدفع من سويّا.', ctaLabel: 'تابع إلى الدفع', ctaUrlTemplate: '{{appUrl}}{{routePath}}' },
        },
      },
      {
        typeSlug: 'instant-booking.request-rejected',
        channel: NotificationChannel.EMAIL,
        slug: 'instant-booking.request-rejected.email.v1',
        translations: {
          en: { subjectTemplate: 'Your instant booking was declined', titleTemplate: 'Instant booking declined', bodyTemplate: 'Your instant booking request was declined. Open Sawiyaa for the next step.', ctaLabel: 'Open request', ctaUrlTemplate: '{{appUrl}}{{routePath}}' },
          ar: { subjectTemplate: 'تم رفض الحجز الفوري', titleTemplate: 'تم رفض الحجز الفوري', bodyTemplate: 'تم رفض طلب الحجز الفوري. افتح سويّا لمعرفة الخطوة التالية.', ctaLabel: 'افتح الطلب', ctaUrlTemplate: '{{appUrl}}{{routePath}}' },
        },
      },
      {
        typeSlug: 'instant-booking.request-expired',
        channel: NotificationChannel.EMAIL,
        slug: 'instant-booking.request-expired.email.v1',
        translations: {
          en: { subjectTemplate: 'Your instant booking request expired', titleTemplate: 'Instant booking expired', bodyTemplate: 'Your instant booking request expired before a response. Open Sawiyaa to try again.', ctaLabel: 'Open instant booking', ctaUrlTemplate: '{{appUrl}}{{routePath}}' },
          ar: { subjectTemplate: 'انتهت صلاحية طلب الحجز الفوري', titleTemplate: 'انتهت صلاحية الحجز الفوري', bodyTemplate: 'انتهت صلاحية طلب الحجز الفوري قبل وصول رد. افتح سويّا للمحاولة مرة أخرى.', ctaLabel: 'افتح الحجز الفوري', ctaUrlTemplate: '{{appUrl}}{{routePath}}' },
        },
      },
      {
        typeSlug: 'auth.practitioner-login-otp',
        channel: NotificationChannel.EMAIL,
        slug: 'auth.practitioner-login-otp.email.v1',
        translations: {
          en: {
            subjectTemplate: 'Your login OTP code',
            titleTemplate: 'Practitioner Login OTP',
            bodyTemplate: 'Your verification code is {{code}}.',
          },
          ar: {
            subjectTemplate: 'رمز التحقق لتسجيل الدخول',
            titleTemplate: 'رمز تحقق دخول المعالج',
            bodyTemplate: 'رمز التحقق الخاص بك هو {{code}}.',
          },
        },
      },
      {
        typeSlug: 'auth.practitioner-signup-email-verification',
        channel: NotificationChannel.EMAIL,
        slug: 'auth.practitioner-signup-email-verification.email.v1',
        translations: {
          en: {
            subjectTemplate: 'Verify your email',
            titleTemplate: 'Email Verification',
            bodyTemplate: 'Your verification code is {{code}}.',
          },
          ar: {
            subjectTemplate:
              '\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a',
            titleTemplate:
              '\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a',
            bodyTemplate:
              '\u0631\u0645\u0632 \u0627\u0644\u062a\u062d\u0642\u0642 \u0627\u0644\u062e\u0627\u0635 \u0628\u0643 \u0647\u0648 {{code}}.',
          },
        },
      },
      {
        typeSlug: 'auth.password-reset',
        channel: NotificationChannel.EMAIL,
        slug: 'auth.password-reset.email.v1',
        translations: {
          en: {
            subjectTemplate: 'Your password reset code',
            titleTemplate: 'Password Reset OTP',
            bodyTemplate: 'Use this code to reset your password: {{code}}.',
          },
          ar: {
            subjectTemplate: 'رمز إعادة تعيين كلمة المرور',
            titleTemplate: 'رمز إعادة التعيين',
            bodyTemplate:
              'استخدم هذا الرمز لإعادة تعيين كلمة المرور: {{code}}.',
          },
        },
      },
      {
        typeSlug: 'admin.practitioner-application-approved',
        channel: NotificationChannel.IN_APP,
        slug: 'admin.practitioner-application-approved.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Application Approved',
            bodyTemplate: 'Your practitioner application has been approved.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'تمت الموافقة على الطلب',
            bodyTemplate: 'تمت الموافقة على طلب انضمامك كمعالج.',
          },
        },
      },
      {
        typeSlug: 'admin.practitioner-application-rejected',
        channel: NotificationChannel.IN_APP,
        slug: 'admin.practitioner-application-rejected.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Application Rejected',
            bodyTemplate:
              'Your practitioner application was rejected. Reason: {{reason}}',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'تم رفض الطلب',
            bodyTemplate: 'تم رفض طلب انضمامك كمعالج. السبب: {{reason}}',
          },
        },
      },
      {
        typeSlug: 'admin.practitioner-application-changes-requested',
        channel: NotificationChannel.IN_APP,
        slug: 'admin.practitioner-application-changes-requested.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Changes requested',
            bodyTemplate:
              'Please review and complete the requested changes: {{reason}}',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'مطلوب تعديلات',
            bodyTemplate: 'يرجى مراجعة واستكمال التعديلات المطلوبة: {{reason}}',
          },
        },
      },
      {
        typeSlug: 'payments.payment-succeeded',
        channel: NotificationChannel.IN_APP,
        slug: 'payments.payment-succeeded.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Payment completed',
            bodyTemplate: 'Your payment has been completed successfully.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'Payment completed',
            bodyTemplate: 'Your payment has been completed successfully.',
          },
        },
      },
      {
        typeSlug: 'payments.payment-succeeded',
        channel: NotificationChannel.EMAIL,
        slug: 'payments.payment-succeeded.email.v1',
        translations: {
          en: {
            subjectTemplate: 'Payment completed',
            titleTemplate: 'Payment completed',
            bodyTemplate: 'Your payment has been completed successfully.',
          },
          ar: {
            subjectTemplate: 'Payment completed',
            titleTemplate: 'Payment completed',
            bodyTemplate: 'Your payment has been completed successfully.',
          },
        },
      },
      {
        typeSlug: 'payments.payment-failed',
        channel: NotificationChannel.IN_APP,
        slug: 'payments.payment-failed.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Payment failed',
            bodyTemplate: 'Your payment attempt failed.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'Payment failed',
            bodyTemplate: 'Your payment attempt failed.',
          },
        },
      },
      {
        typeSlug: 'payments.refund-requested',
        channel: NotificationChannel.IN_APP,
        slug: 'payments.refund-requested.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Refund requested',
            bodyTemplate: 'Your refund request has been received.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'Refund requested',
            bodyTemplate: 'Your refund request has been received.',
          },
        },
      },
      {
        typeSlug: 'payments.refund-succeeded',
        channel: NotificationChannel.IN_APP,
        slug: 'payments.refund-succeeded.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Refund completed',
            bodyTemplate: 'Your refund has been processed successfully.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'Refund completed',
            bodyTemplate: 'Your refund has been processed successfully.',
          },
        },
      },
      {
        typeSlug: 'payments.refund-failed',
        channel: NotificationChannel.IN_APP,
        slug: 'payments.refund-failed.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Refund failed',
            bodyTemplate: 'Your refund could not be processed right now.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'Refund failed',
            bodyTemplate: 'Your refund could not be processed right now.',
          },
        },
      },
      {
        typeSlug: 'sessions.session-confirmed',
        channel: NotificationChannel.IN_APP,
        slug: 'sessions.session-confirmed.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Session confirmed',
            bodyTemplate: 'Your session is confirmed.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'Session confirmed',
            bodyTemplate: 'Your session is confirmed.',
          },
        },
      },
      {
        typeSlug: 'sessions.session-confirmed-practitioner',
        channel: NotificationChannel.IN_APP,
        slug: 'sessions.session-confirmed-practitioner.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'New confirmed session',
            bodyTemplate: 'A session has been confirmed.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'New confirmed session',
            bodyTemplate: 'A session has been confirmed.',
          },
        },
      },
      {
        typeSlug: 'sessions.session-cancelled',
        channel: NotificationChannel.IN_APP,
        slug: 'sessions.session-cancelled.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Session cancelled',
            bodyTemplate: 'Your session was cancelled.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'Session cancelled',
            bodyTemplate: 'Your session was cancelled.',
          },
        },
      },
      {
        typeSlug: 'sessions.session-cancelled-practitioner',
        channel: NotificationChannel.IN_APP,
        slug: 'sessions.session-cancelled-practitioner.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Session cancelled by patient',
            bodyTemplate: 'A patient cancelled a session.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'Session cancelled by patient',
            bodyTemplate: 'A patient cancelled a session.',
          },
        },
      },
      {
        typeSlug: 'sessions.session-join-available',
        channel: NotificationChannel.IN_APP,
        slug: 'sessions.session-join-available.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Session ready to join',
            bodyTemplate:
              'Your session starts soon. Open the session page to join securely.',
            ctaLabel: 'Open session',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'جلستك جاهزة للدخول',
            bodyTemplate: 'تبدأ جلستك قريبًا. افتح صفحة الجلسة للانضمام بأمان.',
            ctaLabel: 'افتح الجلسة',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
        },
      },
      {
        typeSlug: 'sessions.session-join-available',
        channel: NotificationChannel.EMAIL,
        slug: 'sessions.session-join-available.email.v1',
        translations: {
          en: {
            subjectTemplate: 'Your Sawiyaa session is ready to join',
            titleTemplate: 'Your session is ready',
            bodyTemplate:
              'Your session starts soon. Open the session page to join securely.',
            ctaLabel: 'Open session',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
          ar: {
            subjectTemplate: 'جلستك على سويّة جاهزة للدخول',
            titleTemplate: 'جلستك جاهزة للدخول',
            bodyTemplate: 'تبدأ جلستك قريبًا. افتح صفحة الجلسة للانضمام بأمان.',
            ctaLabel: 'افتح الجلسة',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
        },
      },
      {
        typeSlug: 'messages.session-message-received',
        channel: NotificationChannel.IN_APP,
        slug: 'messages.session-message-received.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'New message',
            bodyTemplate: 'You have a new message.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'رسالة جديدة',
            bodyTemplate: 'لديك رسالة جديدة.',
          },
        },
      },
      {
        typeSlug: 'messages.session-message-received',
        channel: NotificationChannel.PUSH,
        slug: 'messages.session-message-received.push.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'New message',
            bodyTemplate: 'You have a new message.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'رسالة جديدة',
            bodyTemplate: 'لديك رسالة جديدة.',
          },
        },
      },
      {
        typeSlug: 'messages.support-message-received',
        channel: NotificationChannel.IN_APP,
        slug: 'messages.support-message-received.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'New message',
            bodyTemplate: 'You have a new message from support.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'رسالة جديدة',
            bodyTemplate: 'لديك رسالة جديدة من الدعم.',
          },
        },
      },
      {
        typeSlug: 'messages.support-message-received',
        channel: NotificationChannel.PUSH,
        slug: 'messages.support-message-received.push.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'New message',
            bodyTemplate: 'You have a new message from support.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'رسالة جديدة',
            bodyTemplate: 'لديك رسالة جديدة من الدعم.',
          },
        },
      },
      {
        typeSlug: 'messages.follow-up-message-received',
        channel: NotificationChannel.IN_APP,
        slug: 'messages.follow-up-message-received.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'New message',
            bodyTemplate: 'You have a new follow-up message.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'رسالة جديدة',
            bodyTemplate: 'لديك رسالة جديدة في محادثة المتابعة.',
          },
        },
      },
      {
        typeSlug: 'messages.follow-up-message-received',
        channel: NotificationChannel.PUSH,
        slug: 'messages.follow-up-message-received.push.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'New message',
            bodyTemplate: 'You have a new follow-up message.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'رسالة جديدة',
            bodyTemplate: 'لديك رسالة جديدة في محادثة المتابعة.',
          },
        },
      },
      {
        typeSlug: 'care-chat.request-approved',
        channel: NotificationChannel.IN_APP,
        slug: 'care-chat.request-approved.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Care chat approved',
            bodyTemplate:
              'Your care-chat request was approved. Open the conversation to continue.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'تمت الموافقة على محادثة الرعاية',
            bodyTemplate:
              'تمت الموافقة على طلب محادثة الرعاية. افتح المحادثة للمتابعة.',
          },
        },
      },
      {
        typeSlug: 'care-chat.request-approved',
        channel: NotificationChannel.PUSH,
        slug: 'care-chat.request-approved.push.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Care chat approved',
            bodyTemplate:
              'Your care-chat request was approved. Open the conversation to continue.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'تمت الموافقة على محادثة الرعاية',
            bodyTemplate:
              'تمت الموافقة على طلب محادثة الرعاية. افتح المحادثة للمتابعة.',
          },
        },
      },
      {
        typeSlug: 'care-chat.request-rejected',
        channel: NotificationChannel.IN_APP,
        slug: 'care-chat.request-rejected.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Care chat not approved',
            bodyTemplate:
              'Your care-chat request was not approved. Review the request details for the next step.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'لم تتم الموافقة على محادثة الرعاية',
            bodyTemplate:
              'لم تتم الموافقة على طلب محادثة الرعاية. راجع تفاصيل الطلب لمعرفة الخطوة التالية.',
          },
        },
      },
      {
        typeSlug: 'care-chat.request-rejected',
        channel: NotificationChannel.PUSH,
        slug: 'care-chat.request-rejected.push.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Care chat not approved',
            bodyTemplate:
              'Your care-chat request was not approved. Review the request details for the next step.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'لم تتم الموافقة على محادثة الرعاية',
            bodyTemplate:
              'لم تتم الموافقة على طلب محادثة الرعاية. راجع تفاصيل الطلب لمعرفة الخطوة التالية.',
          },
        },
      },
      {
        typeSlug: 'care-chat.request-revoked',
        channel: NotificationChannel.IN_APP,
        slug: 'care-chat.request-revoked.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Care chat updated',
            bodyTemplate:
              'Your care-chat access was updated. Open the conversation or request details to review the latest state.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'تم تحديث محادثة الرعاية',
            bodyTemplate:
              'تم تحديث وصول محادثة الرعاية. افتح المحادثة أو تفاصيل الطلب لمراجعة الحالة الحالية.',
          },
        },
      },
      {
        typeSlug: 'care-chat.request-revoked',
        channel: NotificationChannel.PUSH,
        slug: 'care-chat.request-revoked.push.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Care chat updated',
            bodyTemplate:
              'Your care-chat access was updated. Open the conversation or request details to review the latest state.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'تم تحديث محادثة الرعاية',
            bodyTemplate:
              'تم تحديث وصول محادثة الرعاية. افتح المحادثة أو تفاصيل الطلب لمراجعة الحالة الحالية.',
          },
        },
      },
      {
        typeSlug: 'sessions.session-reminder-60',
        channel: NotificationChannel.IN_APP,
        slug: 'sessions.session-reminder-60.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Session reminder',
            bodyTemplate: 'Your session starts in an hour.',
            ctaLabel: 'Open session',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'تذكير بموعد جلستك',
            bodyTemplate: 'جلستك تبدأ بعد ساعة.',
            ctaLabel: 'افتح الجلسة',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
        },
      },
      {
        typeSlug: 'sessions.session-reminder-60',
        channel: NotificationChannel.EMAIL,
        slug: 'sessions.session-reminder-60.email.v1',
        translations: {
          en: {
            subjectTemplate: 'Session reminder',
            titleTemplate: 'Session reminder',
            bodyTemplate: 'Your session starts in an hour.',
            ctaLabel: 'Open session',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
          ar: {
            subjectTemplate: 'تذكير بموعد جلستك',
            titleTemplate: 'تذكير بموعد جلستك',
            bodyTemplate: 'جلستك تبدأ بعد ساعة.',
            ctaLabel: 'افتح الجلسة',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
        },
      },
      {
        typeSlug: 'sessions.session-reminder-15',
        channel: NotificationChannel.IN_APP,
        slug: 'sessions.session-reminder-15.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Your session starts soon',
            bodyTemplate: 'Your session starts in 15 minutes.',
            ctaLabel: 'Open session',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'جلستك ستبدأ قريبًا',
            bodyTemplate: 'جلستك تبدأ بعد 15 دقيقة.',
            ctaLabel: 'افتح الجلسة',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
        },
      },
      {
        typeSlug: 'sessions.session-reminder-15',
        channel: NotificationChannel.EMAIL,
        slug: 'sessions.session-reminder-15.email.v1',
        translations: {
          en: {
            subjectTemplate: 'Your session starts soon',
            titleTemplate: 'Your session starts soon',
            bodyTemplate: 'Your session starts in 15 minutes.',
            ctaLabel: 'Open session',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
          ar: {
            subjectTemplate: 'جلستك ستبدأ قريبًا',
            titleTemplate: 'جلستك ستبدأ قريبًا',
            bodyTemplate: 'جلستك تبدأ بعد 15 دقيقة.',
            ctaLabel: 'افتح الجلسة',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
        },
      },
      {
        typeSlug: 'sessions.session-starting-now',
        channel: NotificationChannel.IN_APP,
        slug: 'sessions.session-starting-now.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Your session is starting now',
            bodyTemplate: 'Your session is starting now. Open Sawiyaa to join securely.',
            ctaLabel: 'Join session',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'جلستك تبدأ الآن',
            bodyTemplate: 'جلستك تبدأ الآن. افتح سوايا للانضمام بشكل آمن.',
            ctaLabel: 'انضم للجلسة',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
        },
      },
      {
        typeSlug: 'sessions.session-starting-now',
        channel: NotificationChannel.EMAIL,
        slug: 'sessions.session-starting-now.email.v1',
        translations: {
          en: {
            subjectTemplate: 'Your Sawiyaa session is starting now',
            titleTemplate: 'Your session is starting now',
            bodyTemplate: 'Your session is starting now. Open Sawiyaa to join securely.',
            ctaLabel: 'Join session',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
          ar: {
            subjectTemplate: 'جلستك على سوايا تبدأ الآن',
            titleTemplate: 'جلستك تبدأ الآن',
            bodyTemplate: 'جلستك تبدأ الآن. افتح سوايا للانضمام بشكل آمن.',
            ctaLabel: 'انضم للجلسة',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
        },
      },
      {
        typeSlug: 'sessions.session-late-join',
        channel: NotificationChannel.IN_APP,
        slug: 'sessions.session-late-join.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Your session is waiting for you',
            bodyTemplate: 'Your session started a few minutes ago. Open Sawiyaa to join securely.',
            ctaLabel: 'Join session',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'جلستك في انتظارك',
            bodyTemplate: 'بدأت جلستك منذ دقائق قليلة. افتح سوايا للانضمام بشكل آمن.',
            ctaLabel: 'انضم للجلسة',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
        },
      },
      {
        typeSlug: 'sessions.session-late-join',
        channel: NotificationChannel.EMAIL,
        slug: 'sessions.session-late-join.email.v1',
        translations: {
          en: {
            subjectTemplate: 'Your Sawiyaa session is waiting for you',
            titleTemplate: 'Your session is waiting for you',
            bodyTemplate: 'Your session started a few minutes ago. Open Sawiyaa to join securely.',
            ctaLabel: 'Join session',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
          ar: {
            subjectTemplate: 'جلستك على سوايا في انتظارك',
            titleTemplate: 'جلستك في انتظارك',
            bodyTemplate: 'بدأت جلستك منذ دقائق قليلة. افتح سوايا للانضمام بشكل آمن.',
            ctaLabel: 'انضم للجلسة',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
        },
      },
      {
        typeSlug: 'sessions.session-reminder-before-start',
        channel: NotificationChannel.IN_APP,
        slug: 'sessions.session-reminder-before-start.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Session reminder',
            bodyTemplate: 'Your session starts in {{offsetMinutes}} minutes.',
            ctaLabel: 'Open session',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'ØªØ°ÙƒÙŠØ± Ø¨Ù…ÙˆØ¹Ø¯ Ø§Ù„Ø¬Ù„Ø³Ø©',
            bodyTemplate: 'Ø³ØªØ¨Ø¯Ø£ Ø¬Ù„Ø³ØªÙƒ Ø®Ù„Ø§Ù„ {{offsetMinutes}} Ø¯Ù‚ÙŠÙ‚Ø©.',
            ctaLabel: 'Ø§ÙØªØ­ Ø§Ù„Ø¬Ù„Ø³Ø©',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
        },
      },
      {
        typeSlug: 'sessions.session-reminder-before-start',
        channel: NotificationChannel.EMAIL,
        slug: 'sessions.session-reminder-before-start.email.v1',
        translations: {
          en: {
            subjectTemplate: 'Session reminder',
            titleTemplate: 'Session reminder',
            bodyTemplate: 'Your session starts in {{offsetMinutes}} minutes.',
            ctaLabel: 'Open session',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
          ar: {
            subjectTemplate: 'ØªØ°ÙƒÙŠØ± Ø¨Ù…ÙˆØ¹Ø¯ Ø§Ù„Ø¬Ù„Ø³Ø©',
            titleTemplate: 'ØªØ°ÙƒÙŠØ± Ø¨Ù…ÙˆØ¹Ø¯ Ø§Ù„Ø¬Ù„Ø³Ø©',
            bodyTemplate: 'Ø³ØªØ¨Ø¯Ø£ Ø¬Ù„Ø³ØªÙƒ Ø®Ù„Ø§Ù„ {{offsetMinutes}} Ø¯Ù‚ÙŠÙ‚Ø©.',
            ctaLabel: 'Ø§ÙØªØ­ Ø§Ù„Ø¬Ù„Ø³Ø©',
            ctaUrlTemplate: '{{appUrl}}{{routePath}}',
          },
        },
      },
      {
        typeSlug: 'availability.week-ending-reminder',
        channel: NotificationChannel.IN_APP,
        slug: 'availability.week-ending-reminder.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Publish next week availability',
            bodyTemplate:
              'This schedule applies only to this week. Publish next week to keep patient bookings available. Patients can only book published weeks.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'انشر إتاحة الأسبوع القادم',
            bodyTemplate:
              'هذا الجدول ينطبق فقط على هذا الأسبوع. انشر الأسبوع القادم للحفاظ على توفر الحجز. يمكن للمرضى الحجز فقط في الأسابيع المنشورة.',
          },
        },
      },
      {
        typeSlug: 'availability.week-ending-reminder',
        channel: NotificationChannel.EMAIL,
        slug: 'availability.week-ending-reminder.email.v1',
        translations: {
          en: {
            subjectTemplate: 'Publish next week availability',
            titleTemplate: 'Publish next week availability',
            bodyTemplate:
              'This schedule applies only to this week. Publish next week to keep patient bookings available. Patients can only book published weeks.',
          },
          ar: {
            subjectTemplate: 'انشر إتاحة الأسبوع القادم',
            titleTemplate: 'انشر إتاحة الأسبوع القادم',
            bodyTemplate:
              'هذا الجدول ينطبق فقط على هذا الأسبوع. انشر الأسبوع القادم للحفاظ على توفر الحجز. يمكن للمرضى الحجز فقط في الأسابيع المنشورة.',
          },
        },
      },
      {
        typeSlug: 'availability.week-ending-reminder',
        channel: NotificationChannel.PUSH,
        slug: 'availability.week-ending-reminder.push.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Publish next week availability',
            bodyTemplate:
              'Publish next week so patients can keep booking available times.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'انشر إتاحة الأسبوع القادم',
            bodyTemplate: 'انشر إتاحة الأسبوع القادم ليستمر المرضى في الحجز.',
          },
        },
      },
      {
        typeSlug: 'moderation.report-created',
        channel: NotificationChannel.IN_APP,
        slug: 'moderation.report-created.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'New moderation report',
            bodyTemplate: 'A new report is ready for authorized review.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'بلاغ إشراف جديد',
            bodyTemplate: 'يوجد بلاغ جديد يحتاج إلى مراجعة من الفريق المختص.',
          },
        },
      },
      {
        typeSlug: 'moderation.report-reviewed',
        channel: NotificationChannel.IN_APP,
        slug: 'moderation.report-reviewed.in-app.v1',
        translations: {
          en: {
            subjectTemplate: null,
            titleTemplate: 'Report reviewed',
            bodyTemplate:
              'Your report has been reviewed by the moderation team.',
          },
          ar: {
            subjectTemplate: null,
            titleTemplate: 'تمت مراجعة البلاغ',
            bodyTemplate: 'تمت مراجعة البلاغ من فريق الإشراف.',
          },
        },
      },
    ];

    for (const template of templateSeed) {
      const type = await prisma.notificationType.findUniqueOrThrow({
        where: { slug: template.typeSlug },
      });

      const existingTemplate = await prisma.notificationTemplate.findUnique({
        where: { slug: template.slug },
        select: { id: true },
      });
      const templateRecord = existingTemplate
        ? existingTemplate
        : await prisma.notificationTemplate.create({
            data: {
              notificationTypeId: type.id,
              channel: template.channel,
              slug: template.slug,
              isActive: true,
              isSystemTemplate: true,
              version: 1,
            },
          });

      const translations = [
        {
          locale: 'en',
          ...template.translations.en,
        },
        {
          locale: 'ar',
          ...template.translations.ar,
        },
      ];

      for (const translation of translations) {
        const existingTranslation =
          await prisma.notificationTemplateTranslation.findUnique({
            where: {
              notificationTemplateId_locale: {
                notificationTemplateId: templateRecord.id,
                locale: translation.locale,
              },
            },
            select: { id: true },
          });
        if (!existingTranslation) {
          await prisma.notificationTemplateTranslation.create({
            data: {
              notificationTemplateId: templateRecord.id,
              locale: translation.locale,
              subjectTemplate: translation.subjectTemplate,
              titleTemplate: translation.titleTemplate,
              bodyTemplate: translation.bodyTemplate,
              ctaLabel: translation.ctaLabel ?? null,
              ctaUrlTemplate: translation.ctaUrlTemplate ?? null,
            },
          });
        }
      }
    }
  },
};
