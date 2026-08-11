import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import PractitionerSessionDetailPanel from "./PractitionerSessionDetailPanel";
import { formatMoney } from "@/lib/finance-format";

// Mock next-intl
vi.mock("next-intl", () => ({
  useLocale: () => "ar",
  useTranslations: () => (key: string) => {
    if (key.includes("presentation")) return "جلسة جاهزة للانضمام";
    return key;
  },
}));

// Mock navigation Link
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock hooks
vi.mock("../hooks/use-sessions", () => ({
  usePractitionerSession: vi.fn(),
  useClosePractitionerSessionRuntime: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useMarkPractitionerSessionNoShow: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  usePreparePractitionerSessionRuntime: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useResolvePractitionerSessionJoinContract: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock("@/features/practitioners/hooks/use-practitioners", () => ({
  usePractitionerProfile: vi.fn(() => ({ data: { profile: { timezone: "Asia/Riyadh" } } })),
}));

// Import the mocked hook so we can control mock values
import { usePractitionerSession } from "../hooks/use-sessions";

describe("PractitionerSessionDetailPanel Web UI", () => {
  const mockSessionItem = {
    id: "session-1",
    sessionCode: "SES-2026-000123",
    status: "READY_TO_JOIN",
    presentationStatus: "READY_TO_JOIN",
    createdAt: "2026-07-26T10:00:00.000Z",
    scheduledStartAt: "2026-07-26T12:00:00.000Z",
    scheduledEndAt: "2026-07-26T13:00:00.000Z",
    durationMinutes: 60,
    sessionMode: "VIDEO",
    timezone: "Asia/Riyadh",
    patient: {
      id: "patient-1",
      displayName: "Sarah Ahmed",
    },
    practitioner: {
      id: "prac-1",
      slug: "dr-ahmed",
      displayName: "Dr. Ahmed",
    },
    joinAvailability: {
      canJoin: true,
      blockedReason: null,
      availableAt: null,
      expiresAt: null,
    },
    actions: {
      canCancel: false,
      canPrepareRoom: true,
      canJoin: true,
      canPay: false,
      canReview: false,
    },
    chatAvailability: {
      canRead: true,
      canSend: true,
      readOnly: false,
      reason: "ALLOWED",
    },
    sessionChat: { available: true },
    flowType: "SCHEDULED",
    expiresAt: null,
    cancelledAt: null,
    cancellationReason: null,
    completedAt: null,
    expiredAt: null,
    videoRoomClosedAt: null,
    videoRoomCloseReason: null,
    videoRoomCloseNote: null,
    notesInternal: "Internal session notes text",
    paymentCoverageType: "DIRECT_PAYMENT",
    packagePurchase: null,
    conversationId: "conv-123",
    patientDetails: {
      dateOfBirth: "1995-05-15",
      gender: "FEMALE",
      preferredLanguage: "ar",
      country: {
        isoCode: "SA",
        name: "Saudi Arabia",
        nativeName: "المملكة العربية السعودية",
      },
    },
    paymentDetails: {
      id: "pay-1",
      paymentPurpose: "SESSION_BOOKING",
      status: "CAPTURED",
      amountTotal: 300,
      currencyCode: "EGP",
      provider: "PAYMOB",
      initiatedAt: "2026-07-26T10:01:00.000Z",
    },
    corporateSponsorshipDetails: null,
    reviewDetails: null,
    timeline: [
      {
        eventType: "SESSION_CREATED",
        occurredAt: "2026-07-26T10:00:00.000Z",
        actorType: "PATIENT",
        reason: null,
      },
    ],
  };

  it("renders PractitionerSessionDetailPanel layout with all key sections successfully", () => {
    (usePractitionerSession as any).mockReturnValue({
      data: mockSessionItem,
      isLoading: false,
      isError: false,
    });

    render(<PractitionerSessionDetailPanel sessionId="session-1" />);

    // Verify session code is present
    expect(screen.getByText("SES-2026-000123")).toBeDefined();

    // Verify patient profile displays correctly
    expect(screen.getAllByText("Sarah Ahmed").length).toBeGreaterThan(0);
    expect(screen.getByText("المملكة العربية السعودية")).toBeDefined();
    expect(screen.getByText("أنثى")).toBeDefined();

    // Verify billing displays correctly
    expect(screen.getByText("دفع مباشر")).toBeDefined();
    
    // Currency snapshot remains authoritative
    expect(formatMoney("ar", 300, "EGP")).toBe("300 جنيه");

    // Internal notes display correctly
    expect(screen.getByText("Internal session notes text")).toBeDefined();

    // Localized timeline displays correctly
    expect(screen.getAllByText("تم إنشاء الجلسة").length).toBeGreaterThan(0);
  });

  it("hides Chat CTAs when the embedded Chat projection denies access", () => {
    (usePractitionerSession as any).mockReturnValue({
      data: { ...mockSessionItem, sessionChat: { available: false } },
      isLoading: false,
      isError: false,
    });

    render(<PractitionerSessionDetailPanel sessionId="session-1" />);

    expect(document.querySelector('a[href="/practitioner/sessions/session-1/chat"]')).toBeNull();
  });
});
