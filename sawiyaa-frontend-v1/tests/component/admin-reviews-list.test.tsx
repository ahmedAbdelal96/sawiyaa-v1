import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminReviewsListScreen from "@/features/reviews/components/AdminReviewsListScreen";

const mockReviews = [
  {
    id: "review-1",
    sessionId: "session-1",
    overallRating: 5,
    originalRatingValue: 5,
    publicRatingValue: null,
    title: "ممتاز جداً",
    textReview: "خدمة رائعة وممتازة",
    status: "PUBLISHED",
    moderationDecision: null,
    submittedAt: "2026-07-16T08:14:00Z",
    countsInPublicAverage: true,
    practitioner: { id: "pract-1", slug: "dr-mohamed", displayName: "د. محمد محمود" },
    patient: { id: "pat-1", displayName: "أحمد محمود", label: "Patient", isAnonymous: false },
    session: { id: "session-1", scheduledStartAt: "2026-07-16T08:14:00Z" }
  },
  {
    id: "review-2",
    sessionId: "session-2",
    overallRating: 4,
    originalRatingValue: 4,
    publicRatingValue: 3,
    title: null,
    textReview: null,
    status: "PENDING_MODERATION",
    moderationDecision: "EDITED_AND_APPROVED",
    submittedAt: "2026-07-17T10:00:00Z",
    countsInPublicAverage: false,
    practitioner: { id: "pract-2", slug: "dr-ali", displayName: "د. علي حسن" },
    patient: { id: "pat-2", displayName: null, label: "Patient", isAnonymous: true },
    session: { id: "session-2", scheduledStartAt: "2026-07-17T10:00:00Z" }
  }
];

const pushMock = vi.fn();

vi.mock("next-intl", () => ({
  useLocale: () => "ar",
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/admin/reviews",
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/reviews/hooks/use-reviews", () => ({
  useAdminReviews: () => ({
    data: {
      items: mockReviews,
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 2,
        totalPages: 1
      }
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useAdminReview: () => ({ data: { item: mockReviews[0] }, isLoading: false }),
  useModerateReview: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

describe("AdminReviewsListScreen redesigned table", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders headers and columns correctly", () => {
    render(<AdminReviewsListScreen />);
    
    // Headers check
    expect(screen.getByText("admin.table.practitioner")).toBeInTheDocument();
    expect(screen.getByText("admin.table.patient")).toBeInTheDocument();
    expect(screen.getByText("admin.table.session")).toBeInTheDocument();
    expect(screen.getByText("admin.table.patientRating")).toBeInTheDocument();
    expect(screen.getByText("admin.table.publicRating")).toBeInTheDocument();
    expect(screen.getByText("admin.table.averageInclusion")).toBeInTheDocument();
    expect(screen.getByText("admin.table.comment")).toBeInTheDocument();
    expect(screen.getAllByText("admin.table.publicationStatus")[0]).toBeInTheDocument();
    expect(screen.getByText("admin.table.moderationDecision")).toBeInTheDocument();
  });

  it("splits reviews data into distinct cells without the old stacked card", () => {
    render(<AdminReviewsListScreen />);
    
    // Practitioner and Patient check
    expect(screen.getByText("د. محمد محمود")).toBeInTheDocument();
    expect(screen.getByText("أحمد محمود")).toBeInTheDocument();
    expect(screen.getByText("د. علي حسن")).toBeInTheDocument();
    
    // Anonymous patient check
    expect(screen.getByText("admin.detail.anonymousPatient")).toBeInTheDocument();
  });

  it("displays ratings compactly and separately", () => {
    render(<AdminReviewsListScreen />);
    
    // Check first row (patient rating: 5/5, public rating: 5/5)
    expect(screen.getByLabelText("5 out of 5 stars")).toBeInTheDocument();
    
    // Check second row (patient rating: 4/5, public rating: 3/5 with modified indicator)
    expect(screen.getByLabelText("4 out of 5 stars")).toBeInTheDocument();
    expect(screen.getByText("3/5")).toBeInTheDocument();
    expect(screen.getByText("معدّل")).toBeInTheDocument();
  });

  it("displays average inclusion status using compact badge terms", () => {
    render(<AdminReviewsListScreen />);
    
    // Row 1 countsInPublicAverage: true => محتسب
    expect(screen.getByText("محتسب")).toBeInTheDocument();
    
    // Row 2 countsInPublicAverage: false => غير محتسب
    expect(screen.getByText("غير محتسب")).toBeInTheDocument();
  });

  it("displays comments line-clamped and uses fallback for empty comment", () => {
    render(<AdminReviewsListScreen />);
    
    // Row 1 textReview exists
    expect(screen.getByText("خدمة رائعة وممتازة")).toBeInTheDocument();
    
    // Row 2 textReview is empty => لا يوجد تعليق
    expect(screen.getByText("لا يوجد تعليق")).toBeInTheDocument();
  });

  it("routes to the review details screen on click", () => {
    render(<AdminReviewsListScreen />);
    
    const detailButton = screen.getByText("عرض التفاصيل");
    const moderateButton = screen.getByText("مراجعة واعتماد");
    
    expect(detailButton).toBeInTheDocument();
    expect(moderateButton).toBeInTheDocument();
    
    fireEvent.click(detailButton);
    expect(pushMock).toHaveBeenCalledWith("/admin/reviews/review-1");
  });

  it("uses w-max table-auto layout without forced dimensions", () => {
    render(<AdminReviewsListScreen />);
    const table = screen.getByRole("table");
    expect(table).toHaveClass("w-max");
    expect(table).toHaveClass("table-auto");
    expect(table).not.toHaveClass("min-w-[1300px]");
    expect(table).not.toHaveClass("table-fixed");
  });
});
