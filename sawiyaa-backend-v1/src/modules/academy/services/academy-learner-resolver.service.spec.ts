import { ForbiddenException } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { PrismaService } from '@common/prisma/prisma.service';
import { PaymentGeoContextService } from '@modules/payments/services/payment-geo-context.service';
import { AcademyRepository } from '../repositories/academy.repository';
import { AcademyLearnerResolverService } from './academy-learner-resolver.service';

describe('AcademyLearnerResolverService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    academyLearner: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  const academyRepository = {
    findLearnerByPhoneNumber: jest.fn(),
    upsertLearner: jest.fn(),
  } as unknown as AcademyRepository;

  const paymentGeoContextService = {
    resolveCountryResolution: jest.fn(),
  } as unknown as PaymentGeoContextService;

  const service = new AcademyLearnerResolverService(
    prisma,
    academyRepository,
    paymentGeoContextService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps guest enrollments phone-keyed and without a user link', async () => {
    (academyRepository.findLearnerByPhoneNumber as jest.Mock).mockResolvedValue(
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
    (academyRepository.upsertLearner as jest.Mock).mockResolvedValue({
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
    expect(academyRepository.upsertLearner).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Guest Learner',
        phoneNumber: '+201111111111',
        sourceLabel: 'public-academy',
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
    (academyRepository.findLearnerByPhoneNumber as jest.Mock).mockResolvedValue(
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
