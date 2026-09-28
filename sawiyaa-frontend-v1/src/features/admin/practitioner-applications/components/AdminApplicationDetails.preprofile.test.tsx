import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdminApplicationDetails from './AdminApplicationDetails';

const detailsData = {
  details: {
    applicant: {
      userId: 'user-1',
      practitionerProfileId: null,
      displayName: 'Submitted name',
      avatarUrl: null,
      accountStatus: 'ACTIVE',
      email: { address: 'applicant@example.com', isVerified: true },
      phone: { number: '+201001234567', isVerified: true },
      locale: 'ar',
      timezone: 'Africa/Cairo',
      countryCode: 'EG',
    },
    liveApplicant: {
      userId: 'user-1',
      practitionerProfileId: null,
      displayName: 'Account name',
      avatarUrl: null,
      accountStatus: 'ACTIVE',
      email: { address: 'applicant@example.com', isVerified: true },
      phone: { number: '+201001234567', isVerified: true },
      locale: 'en',
      timezone: 'UTC',
      countryCode: null,
    },
    profile: {
      practitionerType: 'PSYCHOLOGIST',
      practitionerGender: 'FEMALE',
      profileStatus: 'DRAFT',
      avatarUrl: null,
      professionalTitle: 'Clinical psychologist',
      bio: 'Submitted bio',
      yearsOfExperience: 8,
      primarySpecialtyCategoryId: 'category-1',
      primarySpecialtyCategory: null,
      pricing: { session30: { egp: null, usd: null }, session60: { egp: null, usd: null } },
      instantBookingPrice30Egp: null,
      instantBookingPrice30Usd: null,
      instantBookingPrice60Egp: null,
      instantBookingPrice60Usd: null,
      languages: ['ar', 'en'],
      specialties: [{ specialtyId: 'specialty-1', slug: 'clinical', title: 'Clinical', category: null, isPrimary: true }],
    },
    liveProfile: null,
    credentials: [],
    payoutDestination: null,
    livePayoutDestination: null,
    application: {
      applicationId: 'application-1',
      status: 'SUBMITTED',
      submittedAt: null,
      reviewedAt: null,
      reviewedByUserId: null,
      reviewDecisionReason: null,
      reviewNotes: null,
    },
    readinessSnapshot: {
      isProfileCompleted: true,
      hasRequiredSpecialties: true,
      hasRequiredCredentials: true,
      hasPayoutDestination: false,
      canBeReviewed: true,
      canBeApproved: false,
      canRequestChanges: true,
    },
    completion: { overallPercent: 100, canSubmit: false, blockers: [], warnings: [], steps: [] },
    professionalContentReadiness: null,
    professionalContentReview: null,
  },
  reviewCase: null,
};

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('../hooks/use-practitioner-applications', () => ({
  useAdminPractitionerApplicationDetails: () => ({ data: detailsData, isLoading: false, isError: false, refetch: vi.fn() }),
  useApprovePractitionerApplication: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectPractitionerApplication: () => ({ mutate: vi.fn(), isPending: false }),
  useRequestPractitionerApplicationChanges: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateAdminPractitionerApplicationCredential: () => ({ mutate: vi.fn(), isPending: false }),
  useViewAdminPractitionerApplicationCredentialFile: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/features/admin/practitioners/hooks/use-admin-practitioners', () => ({
  useAdminPractitioners: () => ({ data: { items: [] } }),
}));

vi.mock('@/features/specialties/hooks/use-specialties', () => ({
  useAdminSpecialties: () => ({ data: { specialties: [] } }),
  useAdminSpecialtyCategories: () => ({ data: { categories: [] } }),
}));

vi.mock('../utils/admin-review-decision', () => ({
  deriveAdminReviewDecision: () => ({
    canApprove: false,
    approveDisabledReasons: [],
    statusDescription: '',
    missingFromPractitioner: [],
    needsAdminReview: [],
    rejectedOrNeedsCorrection: [],
    readyChecks: [],
    internalInconsistencies: [],
  }),
}));

vi.mock('./AdminApplicationReviewHeader', () => ({
  default: (props: { email: string; phone: string }) => (
    <div data-testid="review-header">{props.email}|{props.phone}</div>
  ),
}));

vi.mock('./AdminApplicationReviewWizard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('./AdminApplicationStepIdentity', () => ({
  default: (props: { name: string; email: string; phone: string }) => (
    <div data-testid="identity-step">{props.name}|{props.email}|{props.phone}</div>
  ),
}));

vi.mock('./AdminApplicationStepProfessional', () => ({ default: () => <div /> }));
vi.mock('./AdminApplicationStepDocumentsPayout', () => ({ default: () => <div /> }));
vi.mock('./AdminApplicationStepDecision', () => ({ default: () => <div /> }));
vi.mock('./AdminApplicationDecisionSummary', () => ({ default: () => <div /> }));

describe('AdminApplicationDetails pre-profile contract', () => {
  it('renders authoritative identity before a PractitionerProfile exists', () => {
    render(<AdminApplicationDetails applicationId="application-1" />);

    expect(screen.getByTestId('review-header')).toHaveTextContent(
      'applicant@example.com|+201001234567',
    );
    expect(screen.getByTestId('identity-step')).toHaveTextContent(
      'Submitted name|applicant@example.com|+201001234567',
    );
  });
});
