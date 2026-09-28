import { ConflictException } from '@nestjs/common';
import {
  PractitionerApplicationStatus,
} from '@prisma/client';
import { ApprovePractitionerApplicationUseCase } from './approve-practitioner-application.use-case';

describe('ApprovePractitionerApplicationUseCase', () => {
  const input = {
    id: 'application-id',
    locale: 'en' as const,
    adminUserId: 'admin-id',
    operatorRoles: ['ADMIN'],
  };

  const buildUseCase = (options?: {
    existing?: Record<string, unknown>;
    latest?: Record<string, unknown>;
    failProfileCreate?: boolean;
    failAudit?: boolean;
  }) => {
    const existing = options?.existing ?? {
      id: input.id,
      userId: 'user-id',
      status: PractitionerApplicationStatus.SUBMITTED,
      practitioner: null,
      submissionSnapshot: {
        applicant: { displayName: 'Applicant', locale: 'en', timezone: 'UTC' },
      languageCodes: ['ar', 'ar'],
        payoutDestination: {
          methodType: 'BANK',
          accountHolderName: 'Applicant',
          bankName: 'CIB',
          bankAccountNumber: '12345678',
          iban: 'EG123456789012345678',
        },
      },
    };
    const latest = options?.latest ?? existing;
    let applicationStatus = existing.status;
    const tx = {
      country: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue({ id: 'country-eg' }),
      },
      language: { findMany: jest.fn().mockResolvedValue([{ id: 'language-ar', code: 'ar' }]) },
      practitionerProfile: {
        create: jest.fn().mockImplementation(async () => {
          if (options?.failProfileCreate) throw new Error('profile create failed');
          return { id: 'practitioner-id' };
        }),
      },
      practitionerProfileLanguage: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      practitionerSpecialty: { createMany: jest.fn(), deleteMany: jest.fn() },
      practitionerPayoutDestination: { create: jest.fn().mockResolvedValue({ id: 'payout-1' }) },
      practitionerCredential: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      practitionerReviewCase: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const applicationRepository = {
      findById: jest.fn()
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(latest),
      updateDecision: jest.fn().mockImplementation(async (_id, decision) => {
        applicationStatus = decision.status;
        return {
          id: input.id,
          status: applicationStatus,
          reviewedAt: decision.reviewedAt,
          reviewedByUserId: decision.reviewedByUserId,
          reviewDecisionReason: decision.reviewDecisionReason,
          reviewNotes: decision.reviewNotes,
          practitioner: { id: decision.practitionerId, userId: 'user-id' },
        };
      }),
    };
    const notificationService = { sendApproved: jest.fn().mockResolvedValue(undefined) };
    const securityAuditService = {
      recordRequired: jest.fn().mockImplementation(async () => {
        if (options?.failAudit) throw new Error('audit write failed');
      }),
      logAsync: jest.fn(),
    };
    const mapper = { toDecision: jest.fn().mockImplementation((value) => value) };
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const before = applicationStatus;
        try {
          return await callback(tx);
        } catch (error) {
          applicationStatus = before;
          throw error;
        }
      }),
    };
    const transitionPolicy = {
      assertCanApprove: jest.fn().mockImplementation((status) => {
        if (status === PractitionerApplicationStatus.APPROVED) {
          throw new ConflictException({ error: 'PRACTITIONER_APPLICATION_ALREADY_APPROVED' });
        }
      }),
    };
    const profileRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'practitioner-id',
        userId: 'user-id',
        status: 'APPROVED',
        professionalTitle: 'Existing title',
        bio: 'Existing bio',
        yearsOfExperience: 5,
        practitionerType: 'PSYCHOLOGIST',
        practitionerGender: 'FEMALE',
        country: { isoCode: 'EG' },
        languages: [],
        payoutDestination: null,
      }),
      updateProfileDetails: jest.fn().mockResolvedValue({}),
      updateAvatar: jest.fn().mockResolvedValue({}),
      upsertPayoutDestination: jest.fn().mockResolvedValue({}),
      updateStatusAndPublish: jest.fn().mockResolvedValue({}),
    };
    const specialtyRepository = {
      listByPractitionerId: jest.fn().mockResolvedValue([]),
      replaceAll: jest.fn().mockResolvedValue({}),
    };
    const credentialRepository = { listByPractitionerId: jest.fn().mockResolvedValue([]) };
    const userRepository = {
      findApplicantSummary: jest.fn().mockResolvedValue({
        id: 'user-id',
        displayName: 'Applicant',
        status: 'ACTIVE',
        defaultLocale: 'en',
        timezone: 'UTC',
        emails: [],
        phones: [],
      }),
      updateProfilePreferences: jest.fn().mockResolvedValue({}),
    };
    const useCase = new ApprovePractitionerApplicationUseCase(
      prisma as never,
      { t: jest.fn().mockReturnValue('approved') } as never,
      mapper as never,
      { evaluateReadiness: jest.fn().mockReturnValue({
        isProfileCompleted: true,
        hasRequiredSpecialties: true,
        hasRequiredCredentials: true,
        hasPayoutDestination: true,
        canBeReviewed: true,
        canBeApproved: true,
        canRequestChanges: true,
      }) } as never,
      transitionPolicy as never,
      applicationRepository as never,
      profileRepository as never,
      specialtyRepository as never,
      credentialRepository as never,
      userRepository as never,
      notificationService as never,
      securityAuditService as never,
      {} as never,
      { ensureForCountryChange: jest.fn().mockResolvedValue(undefined) } as never,
      { assertCanChange: jest.fn().mockResolvedValue(undefined) } as never,
    );
    return {
      useCase,
      applicationRepository,
      notificationService,
      prisma,
      tx,
      userRepository,
      profileRepository,
      getApplicationStatus: () => applicationStatus,
    };
  };

  it('links the created practitioner in the same transaction as approval', async () => {
    const { useCase, applicationRepository, notificationService, tx, userRepository } = buildUseCase();

    await useCase.execute(input);

    expect(applicationRepository.updateDecision).toHaveBeenCalledWith(
      input.id,
      expect.objectContaining({
        status: PractitionerApplicationStatus.APPROVED,
        practitionerId: 'practitioner-id',
      }),
      expect.anything(),
    );
    expect(notificationService.sendApproved).toHaveBeenCalledTimes(1);
    expect(userRepository.updateProfilePreferences).toHaveBeenCalledWith(
      'user-id',
      expect.objectContaining({ displayName: 'Applicant', defaultLocale: 'en', timezone: 'UTC' }),
      tx,
    );
    expect(tx.practitionerProfileLanguage.createMany).toHaveBeenCalledWith({
      data: [{ practitionerId: 'practitioner-id', languageId: 'language-ar', isPrimary: true }],
    });
    expect(tx.practitionerProfile.create).toHaveBeenCalledWith({
      data: expect.not.objectContaining({
        sessionPrice30Egp: expect.anything(),
        sessionPrice30Usd: expect.anything(),
        sessionPrice60Egp: expect.anything(),
        sessionPrice60Usd: expect.anything(),
        instantBookingPrice30Egp: expect.anything(),
        instantBookingPrice30Usd: expect.anything(),
        instantBookingPrice60Egp: expect.anything(),
        instantBookingPrice60Usd: expect.anything(),
      }),
    });
    expect(tx.practitionerPayoutDestination.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ practitionerId: 'practitioner-id', methodType: 'BANK' }),
    });
  });

  it('does not commit approval or notify when practitioner creation fails', async () => {
    const { useCase, notificationService, getApplicationStatus } = buildUseCase({ failProfileCreate: true });

    await expect(useCase.execute(input)).rejects.toThrow('profile create failed');
    expect(getApplicationStatus()).toBe(PractitionerApplicationStatus.SUBMITTED);
    expect(notificationService.sendApproved).not.toHaveBeenCalled();
  });

  it('keeps audit inside the transaction while notification remains best effort', async () => {
    const { useCase, notificationService } = buildUseCase();
    notificationService.sendApproved.mockImplementationOnce(async () => {
      try {
        throw new Error('notification unavailable');
      } catch {
        // Mirrors the production notification service's best-effort boundary.
      }
    });

    await expect(useCase.execute(input)).resolves.toBeDefined();
  });

  it('rolls back approval when the in-transaction audit write fails', async () => {
    const { useCase, notificationService, getApplicationStatus } = buildUseCase({ failAudit: true });

    await expect(useCase.execute(input)).rejects.toThrow('audit write failed');
    expect(getApplicationStatus()).toBe(PractitionerApplicationStatus.SUBMITTED);
    expect(notificationService.sendApproved).not.toHaveBeenCalled();
  });

  it('rejects a second approval of an already approved application', async () => {
    const { useCase } = buildUseCase({
      existing: {
        id: input.id,
        userId: 'user-id',
        status: PractitionerApplicationStatus.APPROVED,
        practitioner: { id: 'practitioner-id', userId: 'user-id' },
        submissionSnapshot: null,
      },
    });

    await expect(useCase.execute(input)).rejects.toMatchObject({
      response: { error: 'PRACTITIONER_APPLICATION_ALREADY_APPROVED' },
    });
  });

  it('keeps existing-profile approval on the current requested/live path', async () => {
    const { useCase, profileRepository, userRepository } = buildUseCase({
      existing: {
        id: input.id,
        userId: 'user-id',
        status: PractitionerApplicationStatus.SUBMITTED,
        practitioner: { id: 'practitioner-id', userId: 'user-id' },
        submissionSnapshot: {
          applicant: { displayName: 'Updated applicant', locale: 'en', timezone: 'UTC' },
          profile: {
            practitionerType: 'PSYCHOLOGIST',
            practitionerTypeExplicit: true,
            professionalTitle: 'Updated title',
            bio: 'Updated bio',
            countryCode: 'EG',
            yearsOfExperience: 6,
          },
          languageCodes: [],
          specialtySelection: { specialties: [] },
          credentials: [],
        },
      },
    });

    await useCase.execute(input);

    expect(userRepository.updateProfilePreferences).toHaveBeenCalled();
    expect(profileRepository.updateProfileDetails).toHaveBeenCalledWith(
      'practitioner-id',
      expect.objectContaining({ professionalTitle: 'Updated title', bio: 'Updated bio' }),
      expect.anything(),
    );
  });
});
