import { ConflictException, ForbiddenException } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { PrismaService } from '@common/prisma/prisma.service';
import { PaymentGeoContextService } from '@modules/payments/services/payment-geo-context.service';
import { AcademyLearnerResolverService } from './academy-learner-resolver.service';

describe('AcademyLearnerResolverService', () => {
  const prisma = {
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn(),
    },
    userEmail: {
      findUnique: jest.fn(),
    },
    academyLearner: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    academyProgramEnrollment: {
      updateMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const paymentGeoContextService = {
    resolveCountryResolution: jest.fn(),
  } as unknown as PaymentGeoContextService;

  const service = new AcademyLearnerResolverService(
    prisma,
    paymentGeoContextService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (transaction: PrismaService) => unknown) => callback(prisma),
    );
  });

  it('keeps guest enrollments phone-keyed and without a user link', async () => {
    (prisma.academyLearner.findUnique as jest.Mock).mockResolvedValue(
      null,
    );
    (paymentGeoContextService.resolveCountryResolution as jest.Mock).mockResolvedValue(
      {
        resolvedCountryCode: 'EG',
        declaredCountryCode: 'EG',
        countrySource: 'PHONE',
        countryMismatch: false,
        phoneCountryCode: 'EG',
      },
    );
    (prisma.academyLearner.upsert as jest.Mock).mockResolvedValue({
      id: 'learner_1',
      userId: null,
      fullName: 'Guest Learner',
      phoneNumber: '+201111111111',
      whatsappNumber: '+201111111111',
      email: 'guest@example.com',
      countryCode: 'EG',
      countryCodeDeclared: null,
      countryCodeSource: 'PHONE',
      countryCodeMismatch: false,
      sourceLabel: 'public-academy',
      createdAt: new Date('2026-06-08T10:00:00.000Z'),
      updatedAt: new Date('2026-06-08T10:00:00.000Z'),
    });

    const result = await service.resolve({
      currentUser: null,
      payload: {
        fullName: 'Guest Learner',
        phoneNumber: '+201111111111',
        whatsappNumber: '+201111111111',
        email: 'guest@example.com',
        sourceLabel: 'public-academy',
      },
    });

    expect(result.learner.userId).toBeNull();
    expect(prisma.academyLearner.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phoneNumber: '+201111111111' },
        create: expect.objectContaining({
          fullName: 'Guest Learner',
          phoneNumber: '+201111111111',
          sourceLabel: 'public-academy',
        }),
      }),
    );
  });

  it('links authenticated patient enrollments to the current user', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user_1',
      displayName: 'Patient User',
      emails: [{ email: 'patient@example.com' }],
      phones: [{ phone: '+201222222222' }],
      patientProfile: { displayName: 'Patient Profile' },
    });
    (prisma.academyLearner.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.academyLearner.findUnique as jest.Mock).mockResolvedValue(null);
    (paymentGeoContextService.resolveCountryResolution as jest.Mock).mockResolvedValue(
      {
        resolvedCountryCode: 'EG',
        declaredCountryCode: 'EG',
        countrySource: 'PHONE',
        countryMismatch: false,
        phoneCountryCode: 'EG',
      },
    );
    (prisma.academyLearner.create as jest.Mock).mockResolvedValue({
      id: 'learner_2',
      userId: 'user_1',
      fullName: 'Patient User',
      phoneNumber: '+201222222222',
      whatsappNumber: '+201222222222',
      email: 'patient@example.com',
      countryCode: 'EG',
      countryCodeDeclared: null,
      countryCodeSource: 'PHONE',
      countryCodeMismatch: false,
      sourceLabel: 'public-academy',
      createdAt: new Date('2026-06-08T10:00:00.000Z'),
      updatedAt: new Date('2026-06-08T10:00:00.000Z'),
    });

    const result = await service.resolve({
      currentUser: {
        id: 'user_1',
        roles: [AppRole.PATIENT],
      } as never,
      payload: {
        fullName: 'Ignored',
        phoneNumber: '+201111111111',
        whatsappNumber: '+201111111111',
        email: 'guest@example.com',
        sourceLabel: 'public-academy',
      },
    });

    expect(result.learner.userId).toBe('user_1');
    expect(prisma.academyLearner.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user_1',
          phoneNumber: '+201222222222',
        }),
      }),
    );
  });

  it('asks a guest to sign in when the submitted email belongs to another learner', async () => {
    (prisma.academyLearner.findUnique as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'learner_with_account',
        userId: 'user_1',
        countryCode: 'EG',
      });

    await expect(
      service.resolve({
        currentUser: null,
        payload: {
          fullName: 'Returning Learner',
          phoneNumber: '+201444444444',
          whatsappNumber: '+201444444444',
          email: 'Existing@Example.com',
          sourceLabel: 'public-academy',
        },
      }),
    ).rejects.toMatchObject<Partial<ConflictException>>({
      response: expect.objectContaining({
        error: 'ACADEMY_LEARNER_EMAIL_ALREADY_EXISTS',
      }),
    });

    expect(paymentGeoContextService.resolveCountryResolution).not.toHaveBeenCalled();
    expect(prisma.academyLearner.upsert).not.toHaveBeenCalled();
  });

  it('keeps the existing phone-keyed learner when phone and email identify the same learner', async () => {
    (prisma.academyLearner.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'learner_1',
        countryCode: 'EG',
      })
      .mockResolvedValueOnce({
        id: 'learner_1',
        userId: null,
        countryCode: 'EG',
      });
    (paymentGeoContextService.resolveCountryResolution as jest.Mock).mockResolvedValue({
      resolvedCountryCode: 'EG',
      declaredCountryCode: 'EG',
      countrySource: 'PHONE',
      countryMismatch: false,
      phoneCountryCode: 'EG',
    });
    (prisma.academyLearner.upsert as jest.Mock).mockResolvedValue({
      id: 'learner_1',
      userId: null,
      fullName: 'Returning Learner',
      phoneNumber: '+201111111111',
      whatsappNumber: '+201111111111',
      email: 'existing@example.com',
      countryCode: 'EG',
      countryCodeDeclared: null,
      countryCodeSource: 'PHONE',
      countryCodeMismatch: false,
      sourceLabel: 'public-academy',
      createdAt: new Date('2026-06-08T10:00:00.000Z'),
      updatedAt: new Date('2026-06-08T10:00:00.000Z'),
    });

    await expect(
      service.resolve({
        currentUser: null,
        payload: {
          fullName: 'Returning Learner',
          phoneNumber: '+201111111111',
          whatsappNumber: '+201111111111',
          email: 'Existing@Example.com',
          sourceLabel: 'public-academy',
        },
      }),
    ).resolves.toMatchObject({ learner: { id: 'learner_1' } });

    expect(prisma.academyLearner.upsert).toHaveBeenCalled();
  });

  it('asks a guest to sign in before reusing a learner already linked to an account', async () => {
    (prisma.academyLearner.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'learner_1',
        userId: 'user_1',
        countryCode: 'EG',
      })
      .mockResolvedValueOnce({
        id: 'learner_1',
        userId: 'user_1',
        countryCode: 'EG',
      });

    await expect(
      service.resolve({
        currentUser: null,
        payload: {
          fullName: 'Returning Learner',
          phoneNumber: '+201111111111',
          whatsappNumber: '+201111111111',
          email: 'existing@example.com',
          sourceLabel: 'public-academy',
        },
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'ACADEMY_LEARNER_EMAIL_ALREADY_EXISTS',
      }),
    });
  });

  it('detects an existing account email before creating a guest learner', async () => {
    (prisma.academyLearner.findUnique as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    (prisma.userEmail.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user_2',
    });

    await expect(
      service.resolve({
        currentUser: null,
        payload: {
          fullName: 'Returning Account Holder',
          phoneNumber: '+201555555555',
          whatsappNumber: '+201555555555',
          email: 'Existing@Example.com',
          sourceLabel: 'public-academy',
        },
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'ACADEMY_ACCOUNT_EMAIL_REQUIRES_LOGIN',
      }),
    });

    expect(prisma.userEmail.findUnique).toHaveBeenCalledWith({
      where: { email: 'existing@example.com' },
      select: { userId: true },
    });
    expect(prisma.academyLearner.upsert).not.toHaveBeenCalled();
  });

  it('rejects admin and staff users from learner enrollment', async () => {
    await expect(
      service.resolve({
        currentUser: {
          id: 'admin_1',
          roles: [AppRole.ADMIN],
        } as never,
        payload: {
          fullName: 'Admin User',
          phoneNumber: '+201333333333',
          whatsappNumber: '+201333333333',
          email: 'admin@example.com',
          sourceLabel: 'public-academy',
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
