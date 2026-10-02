import { GetPractitionerApplicationDetailsUseCase } from './get-practitioner-application-details.use-case';

describe('GetPractitionerApplicationDetailsUseCase - pre-profile applications', () => {
  function buildUseCase() {
    const applicationRepository = { findById: jest.fn() };
    const profileRepository = { findById: jest.fn() };
    const practitionerSpecialtyRepository = { listByPractitionerId: jest.fn() };
    const specialtyRepository = { listByIds: jest.fn() };
    const credentialRepository = { listByPractitionerId: jest.fn() };
    const userRepository = { findApplicantSummary: jest.fn() };
    const reviewPolicy = {
      evaluateReadiness: jest.fn().mockReturnValue({
        isProfileCompleted: true,
        hasRequiredSpecialties: true,
        hasRequiredCredentials: true,
        hasPayoutDestination: true,
        canBeReviewed: true,
        canBeApproved: true,
        canRequestChanges: true,
      }),
    };
    const completionService = {
      build: jest.fn().mockReturnValue({ overallPercent: 100 }),
    };
    const prisma = {
      practitionerReviewCase: { findFirst: jest.fn().mockResolvedValue(null) },
      practitionerCredential: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const useCase = new GetPractitionerApplicationDetailsUseCase(
      { t: jest.fn().mockReturnValue('application fetched') } as any,
      { toDetails: jest.fn((value) => value) } as any,
      reviewPolicy as any,
      applicationRepository as any,
      profileRepository as any,
      practitionerSpecialtyRepository as any,
      specialtyRepository as any,
      credentialRepository as any,
      userRepository as any,
      completionService as any,
      { getAvatarFile: jest.fn() } as any,
      prisma as any,
      {
        fromSnapshot: jest.fn(),
        fromLive: jest.fn(),
        buildReview: jest.fn(),
      } as any,
    );

    return {
      useCase,
      applicationRepository,
      specialtyRepository,
      userRepository,
      reviewPolicy,
      completionService,
    };
  }

  it('projects authoritative identity and submitted snapshot data before approval', async () => {
    const {
      useCase,
      applicationRepository,
      specialtyRepository,
      userRepository,
      reviewPolicy,
      completionService,
    } = buildUseCase();

    applicationRepository.findById.mockResolvedValue({
      id: 'application-1',
      userId: 'user-1',
      status: 'SUBMITTED',
      practitioner: null,
      user: { id: 'user-1', displayName: 'Account name' },
      submissionSnapshot: {
        applicant: {
          displayName: 'Submitted name',
          locale: 'ar',
          timezone: 'Africa/Cairo',
        },
        profile: {
          practitionerType: 'PSYCHOLOGIST',
          practitionerTypeExplicit: true,
          practitionerGender: 'FEMALE',
          professionalTitle: 'Clinical psychologist',
          bio: 'Submitted bio',
          yearsOfExperience: 8,
          countryCode: 'EG',
        },
        languageCodes: ['ar', 'en'],
        specialtySelection: {
          primarySpecialtyCategoryId: 'category-1',
          specialties: [
            { specialtyId: 'specialty-1', slug: 'clinical', title: 'Clinical', isPrimary: true },
          ],
        },
        payoutDestination: {
          methodType: 'BANK',
          accountHolderName: 'Submitted name',
          bankName: 'CIB',
          bankAccountNumber: '12345678',
          iban: 'EG123456789012345678',
        },
      },
    });
    userRepository.findApplicantSummary.mockResolvedValue({
      id: 'user-1',
      displayName: 'Account name',
      status: 'ACTIVE',
      defaultLocale: 'en',
      timezone: 'UTC',
      emails: [{ email: 'applicant@example.com', isVerified: true }],
      phones: [{ phone: '+201001234567', isVerified: true }],
    });
    specialtyRepository.listByIds.mockResolvedValue([]);

    const result = await useCase.execute({ id: 'application-1', locale: 'en' });

    expect(userRepository.findApplicantSummary).toHaveBeenCalledWith('user-1');
    expect(result.details.liveApplicant.email).toEqual({
      address: 'applicant@example.com',
      isVerified: true,
    });
    expect(result.details.liveApplicant.phone).toEqual({
      number: '+201001234567',
      isVerified: true,
    });
    expect(result.details.applicant.displayName).toBe('Submitted name');
    expect(result.details.profile.languages).toEqual(['ar', 'en']);
    expect(result.details.profile.specialties).toEqual([
      expect.objectContaining({ specialtyId: 'specialty-1' }),
    ]);
    expect(result.details.payoutDestination).toEqual(
      expect.objectContaining({ methodType: 'BANK' }),
    );
    expect(result.details.readinessSnapshot.canBeApproved).toBe(true);
    expect(completionService.build).toHaveBeenCalledWith(
      expect.objectContaining({ languageCount: 2, specialtyCount: 1 }),
    );
    expect(reviewPolicy.evaluateReadiness).toHaveBeenCalledWith(
      expect.objectContaining({
        hasLanguage: true,
        hasRequiredSpecialties: true,
        hasPayoutDestination: true,
      }),
    );
  });
});
