"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsSeedModule = void 0;
const client_1 = require("@prisma/client");
exports.notificationsSeedModule = {
    name: 'notifications',
    async run(prisma) {
        const typeSeed = [
            {
                slug: 'auth.practitioner-login-otp',
                displayName: 'Practitioner Login OTP',
                description: 'OTP challenge for practitioner login step 2',
                category: client_1.NotificationCategory.SECURITY,
            },
            {
                slug: 'auth.password-reset',
                displayName: 'Password Reset OTP',
                description: 'Password reset challenge notification',
                category: client_1.NotificationCategory.SECURITY,
            },
            {
                slug: 'admin.practitioner-application-approved',
                displayName: 'Practitioner Application Approved',
                description: 'Admin decision notification for approved application',
                category: client_1.NotificationCategory.SYSTEM,
            },
            {
                slug: 'admin.practitioner-application-rejected',
                displayName: 'Practitioner Application Rejected',
                description: 'Admin decision notification for rejected application',
                category: client_1.NotificationCategory.SYSTEM,
            },
            {
                slug: 'payments.payment-succeeded',
                displayName: 'Payment Succeeded',
                description: 'Operational notification for successful payment capture',
                category: client_1.NotificationCategory.PAYMENT,
            },
            {
                slug: 'payments.payment-failed',
                displayName: 'Payment Failed',
                description: 'Operational notification for failed payment capture',
                category: client_1.NotificationCategory.PAYMENT,
            },
            {
                slug: 'payments.refund-requested',
                displayName: 'Refund Requested',
                description: 'Operational notification when refund is requested',
                category: client_1.NotificationCategory.PAYMENT,
            },
            {
                slug: 'payments.refund-succeeded',
                displayName: 'Refund Succeeded',
                description: 'Operational notification when refund is processed successfully',
                category: client_1.NotificationCategory.PAYMENT,
            },
            {
                slug: 'payments.refund-failed',
                displayName: 'Refund Failed',
                description: 'Operational notification when refund processing fails',
                category: client_1.NotificationCategory.PAYMENT,
            },
            {
                slug: 'sessions.session-confirmed',
                displayName: 'Session Confirmed (Patient)',
                description: 'Operational notification for patient when session is confirmed',
                category: client_1.NotificationCategory.SESSION,
            },
            {
                slug: 'sessions.session-confirmed-practitioner',
                displayName: 'Session Confirmed (Practitioner)',
                description: 'Operational notification for practitioner when session is confirmed',
                category: client_1.NotificationCategory.SESSION,
            },
            {
                slug: 'sessions.session-cancelled',
                displayName: 'Session Cancelled (Patient)',
                description: 'Operational notification for patient when session is cancelled',
                category: client_1.NotificationCategory.SESSION,
            },
            {
                slug: 'sessions.session-cancelled-practitioner',
                displayName: 'Session Cancelled (Practitioner)',
                description: 'Operational notification for practitioner when patient cancels session',
                category: client_1.NotificationCategory.SESSION,
            },
            {
                slug: 'sessions.session-join-available',
                displayName: 'Session Join Available',
                description: 'In-app notification when a paid session becomes ready to join',
                category: client_1.NotificationCategory.SESSION,
                supportsEmail: true,
                supportsSms: false,
                supportsPush: false,
                supportsInApp: true,
            },
            {
                slug: 'training.enrollment-confirmed',
                displayName: 'Training Enrollment Confirmed',
                description: 'Operational notification when a training enrollment is confirmed',
                category: client_1.NotificationCategory.TRAINING,
            },
            {
                slug: 'training.schedule-reminder',
                displayName: 'Training Schedule Reminder',
                description: 'Operational reminder before a training schedule starts',
                category: client_1.NotificationCategory.TRAINING,
            },
        ];
        for (const type of typeSeed) {
            await prisma.notificationType.upsert({
                where: { slug: type.slug },
                create: {
                    ...type,
                    defaultEnabled: true,
                    supportsEmail: type.supportsEmail ?? true,
                    supportsSms: type.supportsSms ?? true,
                    supportsPush: type.supportsPush ?? false,
                    supportsInApp: type.supportsInApp ?? true,
                    isMandatory: false,
                },
                update: {
                    displayName: type.displayName,
                    description: type.description,
                    category: type.category,
                    defaultEnabled: true,
                    supportsEmail: type.supportsEmail ?? true,
                    supportsSms: type.supportsSms ?? true,
                    supportsPush: type.supportsPush ?? false,
                    supportsInApp: type.supportsInApp ?? true,
                },
            });
        }
        const templateSeed = [
            {
                typeSlug: 'auth.practitioner-login-otp',
                channel: client_1.NotificationChannel.EMAIL,
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
                typeSlug: 'auth.password-reset',
                channel: client_1.NotificationChannel.EMAIL,
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
                        bodyTemplate: 'استخدم هذا الرمز لإعادة تعيين كلمة المرور: {{code}}.',
                    },
                },
            },
            {
                typeSlug: 'admin.practitioner-application-approved',
                channel: client_1.NotificationChannel.IN_APP,
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
                channel: client_1.NotificationChannel.IN_APP,
                slug: 'admin.practitioner-application-rejected.in-app.v1',
                translations: {
                    en: {
                        subjectTemplate: null,
                        titleTemplate: 'Application Rejected',
                        bodyTemplate: 'Your practitioner application was rejected. Reason: {{reason}}',
                    },
                    ar: {
                        subjectTemplate: null,
                        titleTemplate: 'تم رفض الطلب',
                        bodyTemplate: 'تم رفض طلب انضمامك كمعالج. السبب: {{reason}}',
                    },
                },
            },
            {
                typeSlug: 'payments.payment-succeeded',
                channel: client_1.NotificationChannel.IN_APP,
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
                channel: client_1.NotificationChannel.EMAIL,
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
                channel: client_1.NotificationChannel.IN_APP,
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
                channel: client_1.NotificationChannel.IN_APP,
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
                channel: client_1.NotificationChannel.IN_APP,
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
                channel: client_1.NotificationChannel.IN_APP,
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
                channel: client_1.NotificationChannel.IN_APP,
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
                channel: client_1.NotificationChannel.IN_APP,
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
                channel: client_1.NotificationChannel.IN_APP,
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
                channel: client_1.NotificationChannel.IN_APP,
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
                channel: client_1.NotificationChannel.IN_APP,
                slug: 'sessions.session-join-available.in-app.v1',
                translations: {
                    en: {
                        subjectTemplate: null,
                        titleTemplate: 'Session ready to join',
                        bodyTemplate: 'Your session starts soon. Open the session page to join securely.',
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
                channel: client_1.NotificationChannel.EMAIL,
                slug: 'sessions.session-join-available.email.v1',
                translations: {
                    en: {
                        subjectTemplate: 'Your Fayed session is ready to join',
                        titleTemplate: 'Your session is ready',
                        bodyTemplate: 'Your session starts soon. Open the session page to join securely.',
                        ctaLabel: 'Open session',
                        ctaUrlTemplate: '{{appUrl}}{{routePath}}',
                    },
                    ar: {
                        subjectTemplate: 'جلستك على فايد جاهزة للدخول',
                        titleTemplate: 'جلستك جاهزة للدخول',
                        bodyTemplate: 'تبدأ جلستك قريبًا. افتح صفحة الجلسة للانضمام بأمان.',
                        ctaLabel: 'افتح الجلسة',
                        ctaUrlTemplate: '{{appUrl}}{{routePath}}',
                    },
                },
            },
            {
                typeSlug: 'training.enrollment-confirmed',
                channel: client_1.NotificationChannel.IN_APP,
                slug: 'training.enrollment-confirmed.in-app.v1',
                translations: {
                    en: {
                        subjectTemplate: null,
                        titleTemplate: 'Training enrollment confirmed',
                        bodyTemplate: 'Your training enrollment has been confirmed.',
                    },
                    ar: {
                        subjectTemplate: null,
                        titleTemplate: 'Training enrollment confirmed',
                        bodyTemplate: 'Your training enrollment has been confirmed.',
                    },
                },
            },
            {
                typeSlug: 'training.schedule-reminder',
                channel: client_1.NotificationChannel.IN_APP,
                slug: 'training.schedule-reminder.in-app.v1',
                translations: {
                    en: {
                        subjectTemplate: null,
                        titleTemplate: 'Training schedule reminder',
                        bodyTemplate: 'Your training schedule starts soon.',
                    },
                    ar: {
                        subjectTemplate: null,
                        titleTemplate: 'Training schedule reminder',
                        bodyTemplate: 'Your training schedule starts soon.',
                    },
                },
            },
        ];
        for (const template of templateSeed) {
            const type = await prisma.notificationType.findUniqueOrThrow({
                where: { slug: template.typeSlug },
            });
            const templateRecord = await prisma.notificationTemplate.upsert({
                where: { slug: template.slug },
                create: {
                    notificationTypeId: type.id,
                    channel: template.channel,
                    slug: template.slug,
                    isActive: true,
                    isSystemTemplate: true,
                    version: 1,
                },
                update: {
                    notificationTypeId: type.id,
                    channel: template.channel,
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
                await prisma.notificationTemplateTranslation.upsert({
                    where: {
                        notificationTemplateId_locale: {
                            notificationTemplateId: templateRecord.id,
                            locale: translation.locale,
                        },
                    },
                    create: {
                        notificationTemplateId: templateRecord.id,
                        locale: translation.locale,
                        subjectTemplate: translation.subjectTemplate,
                        titleTemplate: translation.titleTemplate,
                        bodyTemplate: translation.bodyTemplate,
                        ctaLabel: translation.ctaLabel ?? null,
                        ctaUrlTemplate: translation.ctaUrlTemplate ?? null,
                    },
                    update: {
                        subjectTemplate: translation.subjectTemplate,
                        titleTemplate: translation.titleTemplate,
                        bodyTemplate: translation.bodyTemplate,
                        ctaLabel: translation.ctaLabel ?? null,
                        ctaUrlTemplate: translation.ctaUrlTemplate ?? null,
                    },
                });
            }
        }
    },
};
//# sourceMappingURL=notifications.seed.js.map