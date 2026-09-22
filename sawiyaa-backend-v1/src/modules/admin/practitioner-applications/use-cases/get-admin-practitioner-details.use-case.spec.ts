import { NotFoundException } from '@nestjs/common';
import { GetAdminPractitionerDetailsUseCase } from './get-admin-practitioner-details.use-case';
import { PractitionerProfessionalContentAuthoringService } from '@modules/practitioners/services/practitioner-professional-content-authoring.service';
import { PractitionerProfessionalContentResolver } from '@modules/practitioners/services/practitioner-professional-content-resolver.service';
import { AdminPractitionerProfessionalContentReadinessService } from '../services/admin-practitioner-professional-content-readiness.service';

describe('GetAdminPractitionerDetailsUseCase', () => {
  const prismaMock = {
    practitionerProfile: {
      findUnique: jest.fn(),
    },
    session: {
      count: jest.fn(),
    },
    patientPackagePurchase: {
      count: jest.fn(),
    },
    auditEvent: {
      findMany: jest.fn(),
    },
  };

  const i18nServiceMock = {
    t: jest.fn((key: string) => key),
  };

  const useCase = new GetAdminPractitionerDetailsUseCase(
    prismaMock as any,
    i18nServiceMock as any,
    new AdminPractitionerProfessionalContentReadinessService(
      new PractitionerProfessionalContentResolver(),
      new PractitionerProfessionalContentAuthoringService(),
    ),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches aggregated admin practitioner details correctly', async () => {
    const mockProfile: any = {
      id: 'prac-1',
      userId: 'user-1',
      publicSlug: 'dr-john',
      practitionerType: 'PSYCHOLOGIST',
      practitionerGender: 'MALE',
      status: 'APPROVED',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        displayName: 'John Doe',
        status: 'ACTIVE',
        emails: [{ email: 'john@example.com' }],
        phones: [{ phone: '12345678' }],
        timezone: 'UTC',
        defaultLocale: 'en',
      },
      country: { isoCode: 'EG', name: 'Egypt' },
      primarySpecialtyCategory: { id: 'cat-1', name: 'Mental Health' },
      languages: [{ language: { code: 'ar' } }],
      payoutDestination: {
        methodType: 'BANK',
        accountHolderName: 'John Doe',
        bankName: 'CIB',
        bankAccountNumber: '12345678',
        iban: 'EG123456789012345678',
      },
      specialties: [
        {
          specialtyId: 'spec-1',
          isPrimary: true,
          specialty: {
            slug: 'clinical',
            translations: [
              { locale: 'en', title: 'Clinical Psychology' },
              { locale: 'ar', title: 'علم النفس العيادي' },
            ],
            category: { id: 'cat-1', slug: 'mental-health', name: 'Mental Health' },
          },
        },
      ],
      credentials: [
        {
          id: 'cred-1',
          credentialType: 'LICENSE',
          fileUrl: 's3://path',
          reviewStatus: 'APPROVED',
          expiresAt: new Date(),
          createdAt: new Date(),
          reviewNotes: 'Looks good',
        },
      ],
      applications: [
        {
          id: 'app-1',
          status: 'APPROVED',
          submittedAt: new Date(),
          reviewedAt: new Date(),
          reviewedByUserId: 'admin-1',
          reviewDecisionReason: 'Qualified',
          reviewNotes: 'Perfect',
        },
      ],
    };

    prismaMock.practitionerProfile.findUnique.mockResolvedValue(mockProfile);
    prismaMock.session.count.mockResolvedValue(10);
    prismaMock.auditEvent.findMany.mockResolvedValue([]);

    const result = await useCase.execute({
      id: 'prac-1',
      locale: 'en',
    });

    expect(result.details.displayName).toBe('John Doe');
    expect(result.details.email).toBe('john@example.com');
    expect(result.details.countryCode).toBe('EG');
    expect(result.details.operations.totalSessions).toBe(10);
    expect(result.details.payoutDestination?.bankAccountNumber).toBe('1234****');
    expect(result.details.payoutDestination?.iban).toBe('EG1234******5678');
    expect(result.details.professionalContentReadiness.bilingualComplete).toBe(false);
  });

  it('throws NotFoundException when practitioner profile does not exist', async () => {
    prismaMock.practitionerProfile.findUnique.mockResolvedValue(null);

    await expect(
      useCase.execute({
        id: 'missing-prac',
        locale: 'en',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
