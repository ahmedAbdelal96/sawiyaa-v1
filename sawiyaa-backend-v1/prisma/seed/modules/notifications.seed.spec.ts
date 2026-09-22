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
    const typeCreates: Array<{ data: Record<string, unknown> }> = [];
    const templateCreates: Array<{ data: Record<string, unknown> }> = [];
    const translationCreates: Array<{ data: Record<string, unknown> }> = [];

    const prisma = {
      notificationType: {
        findUnique: jest.fn(() => Promise.resolve(null)),
        create: jest.fn((args: { data: Record<string, unknown> }) => {
          typeCreates.push(args);
          return Promise.resolve({ id: `type-${args.data.slug}` });
        }),
        findUniqueOrThrow: jest.fn(({ where }: { where: { slug: string } }) =>
          Promise.resolve({ id: `type-${where.slug}` }),
        ),
      },
      notificationTemplate: {
        findUnique: jest.fn(() => Promise.resolve(null)),
        create: jest.fn((args: { data: Record<string, unknown> }) => {
          templateCreates.push(args);
          return Promise.resolve({ id: `template-${args.data.slug}` });
        }),
      },
      notificationTemplateTranslation: {
        findUnique: jest.fn(() => Promise.resolve(null)),
        create: jest.fn((args: { data: Record<string, unknown> }) => {
          translationCreates.push(args);
          return Promise.resolve(args);
        }),
      },
    } as unknown as PrismaClient;

    await notificationsSeedModule.run(prisma);

    const type = typeCreates.find(
      (args) => args.data.slug === 'auth.practitioner-signup-email-verification',
    );
    expect(type).toBeDefined();
    if (!type)
      throw new Error('Practitioner signup notification type not found');
    expect(type.data).toMatchObject({
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

    const template = templateCreates.find(
      (args) => args.data.slug ===
        'auth.practitioner-signup-email-verification.email.v1',
    );
    expect(template).toBeDefined();
    if (!template)
      throw new Error('Practitioner signup email template not found');
    expect(template.data).toMatchObject({
      notificationTypeId: 'type-auth.practitioner-signup-email-verification',
      channel: NotificationChannel.EMAIL,
      slug: 'auth.practitioner-signup-email-verification.email.v1',
      isActive: true,
      isSystemTemplate: true,
      version: 1,
    });

    const translations = translationCreates.filter(
      (args) => args.data.notificationTemplateId ===
        'template-auth.practitioner-signup-email-verification.email.v1',
    );
    expect(translations.map((args) => args.data.locale).sort()).toEqual([
      'ar',
      'en',
    ]);

    const translationFor = (locale: string): Record<string, unknown> => {
      const translation = translations.find(
        (args) => args.data.locale === locale,
      );
      expect(translation).toBeDefined();
      if (!translation) throw new Error(`Translation not found: ${locale}`);
      return translation.data;
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

  it('does not overwrite existing notification definitions or create user notifications', async () => {
    const create = jest.fn();
    const prisma = {
      notificationType: {
        findUnique: jest.fn(() => Promise.resolve({ id: 'existing-type' })),
        findUniqueOrThrow: jest.fn(() => Promise.resolve({ id: 'existing-type' })),
        create,
      },
      notificationTemplate: {
        findUnique: jest.fn(() => Promise.resolve({ id: 'existing-template' })),
        create,
      },
      notificationTemplateTranslation: {
        findUnique: jest.fn(() => Promise.resolve({ id: 'existing-translation' })),
        create,
      },
    } as unknown as PrismaClient;

    await notificationsSeedModule.run(prisma);

    expect(create).not.toHaveBeenCalled();
    expect((prisma as unknown as { notification: unknown }).notification).toBeUndefined();
  });
});
