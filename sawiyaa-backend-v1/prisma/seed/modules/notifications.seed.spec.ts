import {
  NotificationCategory,
  NotificationChannel,
  PrismaClient,
} from '@prisma/client';
import { notificationsSeedModule } from './notifications.seed';

type SeedWhere = {
  slug?: string;
  notificationTemplateId_locale?: {
    notificationTemplateId: string;
    locale: string;
  };
};

type SeedCall = {
  where: SeedWhere;
  create: Record<string, unknown>;
};

describe('notifications seed', () => {
  it('seeds practitioner signup email verification with both translations', async () => {
    const typeUpserts: SeedCall[] = [];
    const templateUpserts: SeedCall[] = [];
    const translationUpserts: SeedCall[] = [];

    const prisma = {
      notificationType: {
        upsert: jest.fn((args: SeedCall) => {
          typeUpserts.push(args);
          return Promise.resolve({ id: `type-${args.where.slug}` });
        }),
        findUniqueOrThrow: jest.fn(({ where }: { where: { slug: string } }) =>
          Promise.resolve({ id: `type-${where.slug}` }),
        ),
      },
      notificationTemplate: {
        upsert: jest.fn((args: SeedCall) => {
          templateUpserts.push(args);
          return Promise.resolve({ id: `template-${args.where.slug}` });
        }),
      },
      notificationTemplateTranslation: {
        upsert: jest.fn((args: SeedCall) => {
          translationUpserts.push(args);
          return Promise.resolve(args);
        }),
      },
    } as unknown as PrismaClient;

    await notificationsSeedModule.run(prisma);

    const type = typeUpserts.find(
      (args) =>
        args.where.slug === 'auth.practitioner-signup-email-verification',
    );
    expect(type).toBeDefined();
    if (!type)
      throw new Error('Practitioner signup notification type not found');
    expect(type.create).toMatchObject({
      slug: 'auth.practitioner-signup-email-verification',
      displayName: 'Practitioner Signup Email Verification',
      description: 'OTP verification during practitioner signup',
      category: NotificationCategory.SECURITY,
      supportsEmail: true,
      supportsSms: false,
      supportsPush: false,
      supportsInApp: false,
      defaultEnabled: true,
      isMandatory: false,
    });

    const template = templateUpserts.find(
      (args) =>
        args.where.slug ===
        'auth.practitioner-signup-email-verification.email.v1',
    );
    expect(template).toBeDefined();
    if (!template)
      throw new Error('Practitioner signup email template not found');
    expect(template.create).toMatchObject({
      notificationTypeId: 'type-auth.practitioner-signup-email-verification',
      channel: NotificationChannel.EMAIL,
      slug: 'auth.practitioner-signup-email-verification.email.v1',
      isActive: true,
      isSystemTemplate: true,
      version: 1,
    });

    const translations = translationUpserts.filter(
      (args) =>
        args.where.notificationTemplateId_locale?.notificationTemplateId ===
        'template-auth.practitioner-signup-email-verification.email.v1',
    );
    expect(translations.map((args) => args.create.locale).sort()).toEqual([
      'ar',
      'en',
    ]);

    const translationFor = (locale: string): Record<string, unknown> => {
      const translation = translations.find(
        (args) => args.create.locale === locale,
      );
      expect(translation).toBeDefined();
      if (!translation) throw new Error(`Translation not found: ${locale}`);
      return translation.create;
    };

    expect(translationFor('en')).toMatchObject({
      subjectTemplate: 'Verify your email',
      titleTemplate: 'Email Verification',
      bodyTemplate: 'Your verification code is {{code}}.',
    });
    expect(translationFor('ar')).toMatchObject({
      subjectTemplate: 'تأكيد البريد الإلكتروني',
      titleTemplate: 'تأكيد البريد الإلكتروني',
      bodyTemplate: 'رمز التحقق الخاص بك هو {{code}}.',
    });
  });
});
