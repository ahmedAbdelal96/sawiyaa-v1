import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PatientAcademyProgramEnrollmentPayScreen from "./PatientAcademyProgramEnrollmentPayScreen";
import type { AcademyProgramEnrollmentItem, ManualPaymentMethod } from "../types/academy-programs.types";

const mocks = vi.hoisted(() => ({
  getManualPaymentMethods: vi.fn(),
  getManualPaymentSubmissions: vi.fn(),
  submitManualPaymentProof: vi.fn(),
  usePatientAcademyProgramEnrollment: vi.fn(),
  usePublicAcademyProgramEnrollment: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "ar",
  useTranslations: () => (key: string, params?: Record<string, string | number>) =>
    params?.reason ? `${key}:${params.reason}` : key,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("../hooks/use-academy-programs", () => ({
  usePatientAcademyProgramEnrollment: mocks.usePatientAcademyProgramEnrollment,
  usePublicAcademyProgramEnrollment: mocks.usePublicAcademyProgramEnrollment,
}));

vi.mock("../api/manual-payments.api", () => ({
  getManualPaymentMethods: mocks.getManualPaymentMethods,
  getManualPaymentSubmissions: mocks.getManualPaymentSubmissions,
  submitManualPaymentProof: mocks.submitManualPaymentProof,
}));

function makeEnrollment(
  overrides: Partial<AcademyProgramEnrollmentItem> = {},
): AcademyProgramEnrollmentItem {
  return {
    id: "enr-1",
    publicAccessToken: "pub-token-1",
    userId: null,
    status: "PENDING_PAYMENT",
    paymentStatus: "PENDING",
    registeredAt: "2026-01-01T00:00:00.000Z",
    lockedAt: null,
    seatReservedAt: null,
    seatReservationExpiresAt: null,
    confirmedAt: null,
    cancelledAt: null,
    expiredAt: null,
    completedAt: null,
    certificateIssuedAt: null,
    selectedCurrencyCode: "EGP",
    selectedAmountSnapshot: "150",
    submittedCountry: "EG",
    lockedCountry: "EG",
    lockedCountrySource: "GEO",
    contactFullName: "سارة أحمد",
    contactEmail: "sara@example.com",
    contactPhone: "+201012345678",
    contactWhatsapp: null,
    contactCountry: "EG",
    contactNotes: null,
    program: {
      id: "prog-1",
      slug: "cbt-foundations",
      title: "أساسيات العلاج المعرفي السلوكي",
      titleAr: "أساسيات العلاج المعرفي السلوكي",
      titleEn: "CBT Foundations",
      description: "وصف البرنامج",
      descriptionAr: "وصف البرنامج",
      descriptionEn: "Program description",
      coverImageUrl: null,
      categoryId: null,
      startAt: "2026-02-01T00:00:00.000Z",
      endAt: "2026-03-01T00:00:00.000Z",
      registrationOpen: true,
      maxSeats: 30,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T00:00:00.000Z",
      archivedAt: null,
      createdByUserId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      category: null,
      sessions: [],
    },
    learner: {
      id: "learner-1",
      userId: null,
      fullName: "سارة أحمد",
      email: "sara@example.com",
      phoneNumber: "+201012345678",
      whatsappNumber: null,
      countryCode: "EG",
      countryCodeDeclared: "EG",
      countryCodeSource: "GEO",
      countryCodeMismatch: false,
      sourceLabel: "public-academy-program",
      city: null,
      jobTitle: null,
      employer: null,
      education: null,
      notes: null,
    },
    payment: {
      id: "pay-1",
      provider: "PAYMOB",
      status: "CREATED",
      amountTotal: "150",
      currencyCode: "EGP",
      checkoutUrl: "https://checkout.example/paymob",
      gatewayAvailable: true,
    },
    attendanceSummary: {
      totalSessions: 0,
      attendedSessions: 0,
      absentSessions: 0,
      unmarkedSessions: 0,
      attendancePercentage: 0,
    },
    certificate: {
      status: "NOT_ISSUED",
      issuedAt: null,
      uploadedAt: null,
      fileName: null,
      downloadAvailable: false,
    },
    ...overrides,
  };
}

const instapayMethod: ManualPaymentMethod = {
  id: "method-instapay",
  code: "instapay",
  type: "INSTAPAY",
  displayNameAr: "InstaPay",
  displayNameEn: "InstaPay",
  accountHolderName: "شركة سويًا للتدريب",
  accountIdentifier: "sawiyaa@instapay",
  instructionsAr: "يرجى كتابة رقم الهاتف في ملاحظات التحويل",
  instructionsEn: "Include your phone number in transfer notes",
  isEnabled: true,
  sortOrder: 1,
  availabilityMode: "ALL",
  countryIsoCodes: [],
};

const paypalMethod: ManualPaymentMethod = {
  id: "method-paypal",
  code: "paypal",
  type: "PAYPAL",
  displayNameAr: "PayPal",
  displayNameEn: "PayPal",
  accountHolderName: "Sawiyaa LLC",
  accountIdentifier: "billing@sawiyaa.com",
  instructionsAr: "أرسل المبلغ بالدولار أو ما يعادله",
  instructionsEn: "Send the equivalent amount via PayPal",
  isEnabled: true,
  sortOrder: 2,
  availabilityMode: "ALL",
  countryIsoCodes: [],
};

describe("PatientAcademyProgramEnrollmentPayScreen — Step 2 Payment Method Selection", () => {
  beforeEach(() => {
    mocks.getManualPaymentMethods.mockReset();
    mocks.getManualPaymentSubmissions.mockReset();
    mocks.submitManualPaymentProof.mockReset();
    mocks.usePatientAcademyProgramEnrollment.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.usePublicAcademyProgramEnrollment.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it("1. Gateway only: renders Card option and card payment CTA without any <select> dropdown", async () => {
    mocks.getManualPaymentMethods.mockResolvedValue([]);
    mocks.getManualPaymentSubmissions.mockResolvedValue([]);

    render(
      <PatientAcademyProgramEnrollmentPayScreen
        enrollmentId="enr-1"
        token="pub-token-1"
        initialEnrollment={makeEnrollment()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /patient\.pay\.methods\.cardTitle/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /patient\.pay\.methods\.cardCta/i })).toBeInTheDocument();
  });

  it("2. InstaPay / manual method only: hides Card when gatewayAvailable is false and displays InstaPay destination & proof upload", async () => {
    mocks.getManualPaymentMethods.mockResolvedValue([instapayMethod]);
    mocks.getManualPaymentSubmissions.mockResolvedValue([]);

    const enrollment = makeEnrollment({
      payment: {
        id: "pay-1",
        provider: "MANUAL",
        status: "CREATED",
        amountTotal: "150",
        currencyCode: "EGP",
        checkoutUrl: null,
        gatewayAvailable: false,
      },
    });

    render(
      <PatientAcademyProgramEnrollmentPayScreen
        enrollmentId="enr-1"
        token="pub-token-1"
        initialEnrollment={enrollment}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /InstaPay/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole("radio", { name: /patient\.pay\.methods\.cardTitle/i })).not.toBeInTheDocument();
    expect(screen.getByText("sawiyaa@instapay")).toBeInTheDocument();
    expect(screen.getByText("شركة سويًا للتدريب")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /patient\.pay\.manual\.submit/i })).toBeInTheDocument();
  });

  it("3. Gateway + multiple configured methods: switches detail panel immediately between Card, InstaPay, and PayPal", async () => {
    mocks.getManualPaymentMethods.mockResolvedValue([instapayMethod, paypalMethod]);
    mocks.getManualPaymentSubmissions.mockResolvedValue([]);

    render(
      <PatientAcademyProgramEnrollmentPayScreen
        enrollmentId="enr-1"
        token="pub-token-1"
        initialEnrollment={makeEnrollment()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /InstaPay/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("radio", { name: /patient\.pay\.methods\.cardTitle/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /PayPal/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /InstaPay/i }));
    expect(screen.getByText("sawiyaa@instapay")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /PayPal/i }));
    expect(screen.getByText("billing@sawiyaa.com")).toBeInTheDocument();
    expect(screen.getByText("Sawiyaa LLC")).toBeInTheDocument();
  });

  it("4. No available payment methods: renders unavailable state when both gateway and manual methods are unavailable", async () => {
    mocks.getManualPaymentMethods.mockResolvedValue([]);
    mocks.getManualPaymentSubmissions.mockResolvedValue([]);

    const enrollment = makeEnrollment({
      payment: {
        id: "pay-1",
        provider: "MANUAL",
        status: "CREATED",
        amountTotal: "150",
        currencyCode: "EGP",
        checkoutUrl: null,
        gatewayAvailable: false,
      },
    });

    render(
      <PatientAcademyProgramEnrollmentPayScreen
        enrollmentId="enr-1"
        token="pub-token-1"
        initialEnrollment={enrollment}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("patient.pay.state.unavailable.title")).toBeInTheDocument();
    });
  });

  it("5. Pending manual proof review: shows customer-friendly reviewPending banner without internal jargon", async () => {
    mocks.getManualPaymentMethods.mockResolvedValue([instapayMethod]);
    mocks.getManualPaymentSubmissions.mockResolvedValue([
      {
        id: "sub-1",
        paymentId: "pay-1",
        methodId: "method-instapay",
        attemptNumber: 1,
        status: "UNDER_REVIEW",
        senderAccountName: "سارة أحمد",
        notes: null,
        submittedAt: "2026-01-02T10:00:00.000Z",
        reviewedAt: null,
        rejectionReason: null,
        resubmitUntil: null,
        method: {
          id: "method-instapay",
          code: "instapay",
          type: "INSTAPAY",
          displayNameAr: "InstaPay",
          displayNameEn: "InstaPay",
        },
      },
    ]);

    render(
      <PatientAcademyProgramEnrollmentPayScreen
        enrollmentId="enr-1"
        token="pub-token-1"
        initialEnrollment={makeEnrollment()}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText("patient.pay.manual.reviewPending").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText("patient.pay.manual.reviewPendingNote").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /patient\.pay\.manual\.submit/i })).not.toBeInTheDocument();
  });

  it("6. Rejected proof: displays rejection reason and allows resubmitting payment proof", async () => {
    mocks.getManualPaymentMethods.mockResolvedValue([instapayMethod]);
    mocks.getManualPaymentSubmissions.mockResolvedValue([
      {
        id: "sub-1",
        paymentId: "pay-1",
        methodId: "method-instapay",
        attemptNumber: 1,
        status: "REJECTED",
        senderAccountName: "سارة أحمد",
        notes: null,
        submittedAt: "2026-01-02T10:00:00.000Z",
        reviewedAt: "2026-01-02T12:00:00.000Z",
        rejectionReason: "الصورة غير واضحة",
        resubmitUntil: null,
        method: {
          id: "method-instapay",
          code: "instapay",
          type: "INSTAPAY",
          displayNameAr: "InstaPay",
          displayNameEn: "InstaPay",
        },
      },
    ]);

    render(
      <PatientAcademyProgramEnrollmentPayScreen
        enrollmentId="enr-1"
        token="pub-token-1"
        initialEnrollment={makeEnrollment()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("patient.pay.manual.rejected:الصورة غير واضحة")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /patient\.pay\.manual\.submit/i })).toBeInTheDocument();
  });

  it("7. Submission lookup failure: shows a generic status warning instead of silently hiding the error", async () => {
    mocks.getManualPaymentMethods.mockResolvedValue([instapayMethod]);
    mocks.getManualPaymentSubmissions.mockRejectedValue(new Error("server failure"));

    render(
      <PatientAcademyProgramEnrollmentPayScreen
        enrollmentId="enr-1"
        token="pub-token-1"
        initialEnrollment={makeEnrollment()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("patient.pay.manual.submissionsLoadFailed"),
      ).toBeInTheDocument();
    });
  });
});
