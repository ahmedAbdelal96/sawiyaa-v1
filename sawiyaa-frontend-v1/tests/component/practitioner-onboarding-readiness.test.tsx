import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PractitionerOnboardingWorkspace from "@/features/practitioners/components/PractitionerOnboardingWorkspace";
import PractitionerAccountSetupHub from "@/features/practitioners/components/setup/PractitionerAccountSetupHub";
import PractitionerRequirementsBanner from "@/features/practitioners/components/requirements/PractitionerRequirementsBanner";
import AdminPractitionerPublicationCard from "@/features/admin/practitioners/components/AdminPractitionerPublicationCard";

const mocks = vi.hoisted(() => ({
  applicationStatus: {
    status: "DRAFT",
    application: {
      id: "app-1",
      status: "DRAFT",
      submittedAt: null,
      reviewDecisionReason: null,
      submissionSnapshot: {},
    },
  },
  readiness: {
    canSubmitApplication: false,
    isProfileCompleted: false,
    canPublish: true,
    isApproved: true,
    isProfileComplete: true,
    hasRequiredSpecialty: true,
    hasRequiredNormalPricing: true,
    hasPayoutDestination: false, // NO payout destination!
    missingRequirements: [],
    publicationMissingRequirements: [],
    payoutCapabilities: [
      { methodType: "WALLET", semanticKey: "wallet" },
      { methodType: "BANK_ACCOUNT", semanticKey: "bank" },
      { methodType: "IBAN", semanticKey: "iban" },
    ],
  },
  profile: {
    pricing: {
      session30: { egp: 300, usd: 10 },
      session60: { egp: 550, usd: 18 },
    },
    payoutDestination: null,
    countryCode: "EG",
  },
  requirements: [] as any[],
  publication: {
    isPublished: false,
    canPublish: true,
    readiness: {
      isApproved: true,
      isProfileComplete: true,
      hasRequiredSpecialty: true,
      hasRequiredNormalPricing: true,
    },
    missingRequirements: [],
  },
  updateProfileMutation: { isPending: false, mutateAsync: vi.fn() },
  updatePubMutation: { isPending: false, mutateAsync: vi.fn() },
}));

vi.mock("next-intl", () => ({
  useLocale: () => "ar",
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/practitioner/application",
}));

vi.mock("@/features/auth/hooks/use-auth", () => ({
  useAuthMe: () => ({
    data: {
      id: "admin-1",
      roles: ["SUPER_ADMIN"],
      permissions: ["practitionerPublication.read", "practitionerPublication.write"],
    },
  }),
}));

vi.mock("@/features/practitioners/hooks/use-practitioners", () => ({
  usePractitionerApplicationStatus: () => ({
    data: mocks.applicationStatus,
    isLoading: false,
  }),
  usePractitionerReadiness: () => ({
    data: { readiness: mocks.readiness },
    isLoading: false,
    refetch: vi.fn(),
  }),
  usePractitionerProfile: () => ({
    data: { profile: mocks.profile },
    isLoading: false,
  }),
  usePractitionerRequirements: () => ({
    data: { requirements: mocks.requirements },
    isLoading: false,
    refetch: vi.fn(),
  }),
  usePractitionerCountries: () => ({
    data: [{ isoCode: "EG", name: "Egypt", nativeName: "مصر" }],
  }),
  useSaveApplicationDraft: () => ({ mutateAsync: vi.fn() }),
  useSubmitPractitionerApplication: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUpdatePractitionerProfile: () => mocks.updateProfileMutation,
  usePractitionerCredentials: () => ({ data: { credentials: [] }, isLoading: false }),
  useUploadPractitionerCredential: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useDeletePractitionerCredential: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useViewPractitionerCredential: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock("@/features/specialties/hooks/use-specialties", () => ({
  useSpecialtyCategories: () => ({ data: { categories: [] } }),
  useSpecialties: () => ({ data: { specialties: [] } }),
}));

vi.mock("@/features/admin/practitioners/hooks/use-admin-practitioners", () => ({
  useAdminPractitionerPublication: () => ({
    data: { publication: mocks.publication },
    isLoading: false,
    refetch: vi.fn(),
  }),
  useUpdateAdminPractitionerPublication: () => mocks.updatePubMutation,
}));

describe("Practitioner Lifecycle, Readiness & Publication Independence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Application Hub when application is in DRAFT state", () => {
    mocks.applicationStatus.status = "DRAFT";
    mocks.applicationStatus.application.status = "DRAFT";

    render(<PractitionerOnboardingWorkspace />);
    expect(screen.getByText("طلب انضمام ممارس")).toBeInTheDocument();
  });

  it("renders Submitted View when application is UNDER_REVIEW", () => {
    mocks.applicationStatus.status = "UNDER_REVIEW";
    mocks.applicationStatus.application.status = "UNDER_REVIEW";

    render(<PractitionerOnboardingWorkspace />);
    expect(screen.getByText("طلب الانضمام قيد المراجعة لدى فريق سويّة")).toBeInTheDocument();
    expect(screen.getByText("لا يوجد إجراء مطلوب منك حالياً")).toBeInTheDocument();
  });

  it("renders Rejected View when application is REJECTED", () => {
    mocks.applicationStatus.status = "REJECTED";
    mocks.applicationStatus.application.status = "REJECTED";
    mocks.applicationStatus.application.reviewDecisionReason = "بيانات الترخيص غير مطابقة";

    render(<PractitionerOnboardingWorkspace />);
    expect(screen.getByText("لم يتم قبول طلب الانضمام")).toBeInTheDocument();
    expect(screen.getByText("بيانات الترخيص غير مطابقة")).toBeInTheDocument();
  });

  it("proves Approved Account Setup Hub renders Ready to Publish without payout destination", () => {
    mocks.applicationStatus.status = "APPROVED";
    mocks.applicationStatus.application.status = "APPROVED";
    mocks.readiness.canPublish = true;
    mocks.readiness.hasPayoutDestination = false; // Explicitly NO payout destination

    render(<PractitionerAccountSetupHub />);
    expect(screen.getByText("حسابك جاهز تماماً للنشر للمرضى ✓")).toBeInTheDocument();
    expect(screen.getByText("جاهز للنشر")).toBeInTheDocument();
  });

  it("renders persistent requirements banner when active requirements exist", () => {
    mocks.requirements = [
      {
        id: "req-1",
        section: "DOCUMENTS",
        credentialType: "DEGREE",
        status: "OPEN",
        title: "شهادة المؤهل الدراسي",
        reason: "الصورة غير واضحة",
      },
    ];

    render(<PractitionerRequirementsBanner />);
    expect(screen.getByText("لديك (1) متطلبات وتعديلات تحتاج لاستكمالها")).toBeInTheDocument();
  });

  it("renders Admin publication card and enables publish action when canPublish is true", async () => {
    mocks.publication.isPublished = false;
    mocks.publication.canPublish = true;

    render(<AdminPractitionerPublicationCard practitionerId="prac-123" />);
    const publishButton = screen.getByText("نشر الممارس للمرضى");
    expect(publishButton).toBeInTheDocument();
    expect(publishButton).not.toBeDisabled();

    fireEvent.click(publishButton);
    await waitFor(() => {
      expect(mocks.updatePubMutation.mutateAsync).toHaveBeenCalledWith({
        practitionerId: "prac-123",
        isPublished: true,
      });
    });
  });
});
