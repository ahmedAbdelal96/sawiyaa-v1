import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import PatientJourneyScreen from "./components/PatientJourneyScreen";
import type { PatientJourney } from "./types/patient-journey.types";

// Mock next-intl hooks
vi.mock("next-intl", () => ({
  useLocale: () => "ar",
  useTranslations: (ns: string) => {
    return (key: string, params?: Record<string, unknown>) => {
      if (params) {
        let text = `${ns}.${key}`;
        Object.entries(params).forEach(([k, v]) => {
          text += ` [${k}=${v}]`;
        });
        return text;
      }
      return `${ns}.${key}`;
    };
  },
}));

// Mock navigation
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: any) => (
    <a href={typeof href === "string" ? href : href.pathname || ""} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock hooks
const mockJourneyData: { data: PatientJourney | null; isLoading: boolean; isError: boolean; refetch: any } = {
  data: null,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

vi.mock("./hooks/use-patient-journey", () => ({
  usePatientJourney: () => mockJourneyData,
}));

vi.mock("@/features/patients/hooks/use-patients", () => ({
  usePatientProfile: () => ({
    data: {
      profile: {
        patientProfileId: "prof-1",
        userId: "user-1",
        avatarUrl: null,
        avatarDataUrl: null,
        displayName: "أحمد عبد العال",
        dateOfBirth: null,
        gender: null,
        locale: "ar",
        countryCode: "EG",
        timezone: "Africa/Cairo",
        isOnboardingCompleted: true,
        onboardingCompletedAt: null,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    },
  }),
}));

vi.mock("@/features/payments/hooks/use-payments", () => ({
  usePatientWalletSummary: () => ({
    data: {
      item: {
        availableBalance: "150.00",
        currencyCode: "EGP",
      },
    },
  }),
}));

vi.mock("@/features/messages-shell/hooks/use-unified-unread-badge", () => ({
  useUnifiedUnreadBadge: () => 3,
}));

describe("Customer Home / Journey Hub (PatientJourneyScreen)", () => {
  it("renders personal greeting and Customer 360 quick access with wallet balance and unread messages", () => {
    mockJourneyData.data = {
      summary: {
        hasUpcomingSession: false,
        nextSessionAt: null,
        hasPendingPayment: false,
        hasOpenSupportTicket: false,
        lastAssessmentTakenAt: null,
        lastMatchingAt: null,
        suggestedNextAction: "BOOK_NEXT_SESSION",
      },
      upcoming: {
        session: null,
        pendingPayment: null,
        instantBookingRequest: null,
      },
      recentHistory: {
        sessions: [],
        assessments: [],
        matching: [],
        payments: [],
      },
      support: {
        hasOpenTicket: false,
        latestOpenTicket: null,
      },
      nextSteps: [
        { type: "BOOK_NEXT_SESSION", label: "احجز جلسة" },
      ],
    };

    render(<PatientJourneyScreen />);

    // Personal Greeting
    expect(screen.getByText("أهلاً بك، أحمد عبد العال")).toBeInTheDocument();

    // 4 Core Human Pathways
    expect(screen.getByText("patient-journey.quickLinks.practitioners")).toBeInTheDocument();
    expect(screen.getByText("patient-journey.quickLinks.sessions")).toBeInTheDocument();
    expect(screen.getByText("الرسائل والمحادثات")).toBeInTheDocument();
    expect(screen.getByText("المدفوعات والمحفظة")).toBeInTheDocument();

    // Real Unread Badge (3)
    expect(screen.getByText("3")).toBeInTheDocument();

    // Real Wallet balance
    expect(screen.getByText(/150/)).toBeInTheDocument();
  });

  it("renders live Join Session CTA when session is ready to join", () => {
    mockJourneyData.data = {
      summary: {
        hasUpcomingSession: true,
        nextSessionAt: "2026-08-28T18:00:00Z",
        hasPendingPayment: false,
        hasOpenSupportTicket: false,
        lastAssessmentTakenAt: null,
        lastMatchingAt: null,
        suggestedNextAction: "JOIN_UPCOMING_SESSION",
      },
      upcoming: {
        session: {
          id: "sess-123",
          status: "READY_TO_JOIN",
          operational: {
            state: "READY_TO_JOIN",
            status: "READY_TO_JOIN",
            actions: {
              canJoin: true,
              canPay: false,
              canCancel: false,
              canReschedule: false,
              canReview: false,
              canPrepareRoom: true,
            },
          } as any,
          scheduledStartAt: "2026-08-28T18:00:00Z",
          scheduledEndAt: "2026-08-28T18:45:00Z",
          practitioner: {
            slug: "dr-youssef",
            displayName: "د. يوسف عبد الله",
          },
        },
        pendingPayment: null,
        instantBookingRequest: null,
      },
      recentHistory: {
        sessions: [],
        assessments: [],
        matching: [],
        payments: [],
      },
      support: {
        hasOpenTicket: false,
        latestOpenTicket: null,
      },
      nextSteps: [
        { type: "JOIN_UPCOMING_SESSION", label: "انضم للجلسة" },
      ],
    };

    render(<PatientJourneyScreen />);

    // Live join button
    const joinButton = screen.getByRole("link", { name: /ادخل الجلسة الآن/ });
    expect(joinButton).toBeInTheDocument();
    expect(joinButton).toHaveAttribute("href", "/patient/sessions/sess-123");
  });

  it("renders Pending Payment hero when a payment is awaiting confirmation", () => {
    mockJourneyData.data = {
      summary: {
        hasUpcomingSession: false,
        nextSessionAt: null,
        hasPendingPayment: true,
        hasOpenSupportTicket: false,
        lastAssessmentTakenAt: null,
        lastMatchingAt: null,
        suggestedNextAction: "COMPLETE_PAYMENT",
      },
      upcoming: {
        session: null,
        pendingPayment: {
          id: "pay-999",
          sessionId: "sess-999",
          amount: "350.00",
          currency: "EGP",
          status: "PENDING",
          createdAt: "2026-08-26T17:00:00Z",
          expiredAt: "2099-08-26T18:30:00Z",
        },
        instantBookingRequest: null,
      },
      recentHistory: {
        sessions: [],
        assessments: [],
        matching: [],
        payments: [],
      },
      support: {
        hasOpenTicket: false,
        latestOpenTicket: null,
      },
      nextSteps: [
        {
          type: "COMPLETE_PAYMENT",
          label: "أكمل الدفع",
          action: {
            type: "OPEN_PENDING_PAYMENT",
            targetType: "SESSION",
            targetId: "sess-999",
          },
          entityRefs: [
            { entityType: "PAYMENT", entityId: "pay-999" },
            { entityType: "SESSION", entityId: "sess-999" },
          ],
          expiresAt: "2099-08-26T18:30:00Z",
        },
      ],
    };

    render(<PatientJourneyScreen />);

    // Pending payment CTA
    const payButton = screen.getByRole("link", { name: /patient-journey.upcoming.pendingPayment.cta/ });
    expect(payButton).toBeInTheDocument();
    expect(payButton).toHaveAttribute("href", "/patient/sessions/sess-999/pay");
  });
});
