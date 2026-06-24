import { PractitionerProfileMapper } from './practitioner-profile.mapper';

describe('PractitionerProfileMapper', () => {
  it('maps dual-currency pricing into a structured pricing object', () => {
    const mapper = new PractitionerProfileMapper();

    const result = mapper.toViewModel({
      profile: {
        id: 'profile-1',
        userId: 'user-1',
        avatarUrl: null,
        professionalTitle: 'Therapist',
        bio: 'Bio',
        yearsOfExperience: 7,
        sessionPrice30Egp: '250.00',
        sessionPrice30Usd: '8.00',
        sessionPrice60Egp: '450.00',
        sessionPrice60Usd: '15.00',
        acceptsPackages: true,
        practitionerType: 'OTHER' as never,
        practitionerGender: null,
        primarySpecialtyCategoryId: 'category-1',
        payoutDestination: null,
        status: 'APPROVED' as never,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      user: {
        displayName: 'Doctor Name',
        defaultLocale: 'en',
        timezone: 'Africa/Cairo',
      },
      languages: ['en'],
      specialties: [],
      readiness: {
        isProfileCompleted: true,
        canSubmitApplication: true,
      },
      applicationStatusSummary: {
        applicationId: null,
        status: null,
        submittedAt: null,
        reviewedAt: null,
        reviewedByUserId: null,
        reviewDecisionReason: null,
        reviewNotes: null,
      },
      credentialSummary: {
        totalCredentials: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        expiredCount: 0,
        lastUploadedAt: null,
      },
    });

    expect(result.pricing).toEqual({
      session30: { egp: 250, usd: 8 },
      session60: { egp: 450, usd: 15 },
    });
    expect(result.acceptsPackage).toBe(true);
  });
});
