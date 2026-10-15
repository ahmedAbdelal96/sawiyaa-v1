import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicAcademyProgramDetailScreen from "./PublicAcademyDetailScreen";

const mocks = vi.hoisted(() => ({
  usePublicAcademyProgram: vi.fn(),
  createEnrollment: vi.fn(),
  getPublicAcademyProgramErrorKey: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.routerPush,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: () => ({ user: null, isInitialized: true }),
}));

vi.mock("@/features/users/hooks/use-users", () => ({
  useCurrentUser: () => ({ data: undefined }),
}));

vi.mock("@/features/academy-programs/hooks/use-academy-programs", () => ({
  usePublicAcademyProgram: mocks.usePublicAcademyProgram,
  useCreatePublicAcademyProgramEnrollment: () => ({
    mutateAsync: mocks.createEnrollment,
    isPending: false,
  }),
}));

vi.mock("@/components/form/input/InputField", () => ({
  default: ({ error: _error, ...props }: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/button/Button", () => ({
  default: (props: Record<string, unknown>) => <button {...props} />,
}));

vi.mock("@/components/shared/ContentStates", () => ({
  StateCard: ({ title, note }: { title: string; note?: string }) => (
    <div>
      {title}
      {note}
    </div>
  ),
}));

vi.mock("@/components/ui/data-table", () => ({
  DataTable: () => <div />,
}));

vi.mock("@/components/money/PriceDisplay", () => ({
  PriceDisplay: () => <span>150 EGP</span>,
}));

vi.mock("@/features/academy-programs/lib/academy-program-localization", () => ({
  resolveAcademyProgramDeliveryMethodLabel: (value: string) => value,
  resolveAcademyProgramEnrollmentStatusLabel: (value: string) => value,
  resolveAcademyProgramLocalizedValue: ({ fallback }: { fallback: string | null }) => fallback,
  resolveAcademyProgramPaymentStatusLabel: (value: string) => value,
  resolveAcademyProgramRegistrationStateLabel: (value: boolean) => String(value),
  resolveAcademyProgramSessionTitle: ({ titleAr }: { titleAr: string }) => titleAr,
}));

vi.mock("@/features/academy-programs/lib/academy-program-errors", () => ({
  getPublicAcademyProgramErrorKey: mocks.getPublicAcademyProgramErrorKey,
}));

vi.mock("@/lib/api/http-client", () => ({
  tokenManager: { isAuthenticated: () => false },
}));

vi.mock("../lib/academy-public-price", () => ({
  mapAcademyPublicPrice: () => ({ amount: "150", currencyCode: "EGP" }),
}));

const program = {
  id: "program-1",
  slug: "tdryb1dh",
  titleAr: "برنامج تجريبي",
  titleEn: "Test program",
  descriptionAr: "وصف",
  descriptionEn: "Description",
  coverImageUrl: null,
  categoryId: null,
  priceStatus: "PAID",
  priceAmount: "150",
  currencyCode: "EGP",
  registrationOpen: true,
  maxSeats: null,
  startAt: null,
  endAt: null,
  status: "PUBLISHED",
  publishedAt: "2026-01-01T00:00:00.000Z",
  archivedAt: null,
  createdByUserId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  sessions: [],
};

describe("PublicAcademyProgramDetailScreen — Step 1 Registration", () => {
  beforeEach(() => {
    mocks.usePublicAcademyProgram.mockReturnValue({
      data: program,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.createEnrollment.mockReset();
    mocks.getPublicAcademyProgramErrorKey.mockReturnValue("errors.generic");
    mocks.routerPush.mockReset();
  });

  it("renders registration fields and price without any payment method dropdown or internal payment terms", () => {
    render(<PublicAcademyProgramDetailScreen locale="ar" slug="tdryb1dh" />);

    expect(screen.getByPlaceholderText("public.form.fullName")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("public.form.phoneNumber")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("public.form.whatsappNumber")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("public.form.email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "public.form.submit" })).toBeInTheDocument();

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "public.form.gatewayPayment" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "public.form.manualPayment" })).not.toBeInTheDocument();
  });

  it("submits registration without paymentMethod and routes to the dedicated payment step without exposing publicAccessToken", async () => {
    mocks.createEnrollment.mockResolvedValue({
      id: "enr-123",
      publicAccessToken: "secret-token-uuid-999",
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      program: {
        id: "program-1",
        slug: "tdryb1dh",
        title: "برنامج تجريبي",
        titleAr: "برنامج تجريبي",
        titleEn: "Test program",
      },
      payment: {
        id: "pay-1",
        provider: "PAYMOB",
        status: "CREATED",
        amountTotal: "150",
        currencyCode: "EGP",
        checkoutUrl: "https://checkout.example/pay",
        gatewayAvailable: true,
      },
    });

    render(<PublicAcademyProgramDetailScreen locale="ar" slug="tdryb1dh" />);

    fireEvent.change(screen.getByPlaceholderText("public.form.fullName"), {
      target: { value: "سارة أحمد" },
    });
    fireEvent.change(screen.getByPlaceholderText("public.form.phoneNumber"), {
      target: { value: "+201012345678" },
    });
    fireEvent.change(screen.getByPlaceholderText("public.form.email"), {
      target: { value: "sara@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: "public.form.submit" }));

    await waitFor(() => {
      expect(mocks.createEnrollment).toHaveBeenCalledWith({
        slug: "tdryb1dh",
        input: {
          idempotencyKey: expect.any(String),
          fullName: "سارة أحمد",
          phoneNumber: "+201012345678",
          whatsappNumber: undefined,
          email: "sara@example.com",
          sourceLabel: "public-academy-program",
        },
      });
    });

    expect(mocks.routerPush).toHaveBeenCalledWith(
      "/ar/academy/program-enrollments/enr-123/pay?token=secret-token-uuid-999",
    );
    expect(screen.getByText("public.form.success")).toBeInTheDocument();
    expect(screen.queryByText("secret-token-uuid-999")).not.toBeInTheDocument();
    expect(screen.queryByText("PENDING_PAYMENT")).not.toBeInTheDocument();
  });

  it("explains that an existing email requires sign-in and preserves the course callback", async () => {
    mocks.getPublicAcademyProgramErrorKey.mockReturnValue(
      "public.errors.learnerEmailAlreadyExists",
    );
    mocks.createEnrollment.mockRejectedValue(new Error("EMAIL_ALREADY_EXISTS"));

    render(<PublicAcademyProgramDetailScreen locale="ar" slug="tdryb1dh" />);

    fireEvent.change(screen.getByPlaceholderText("public.form.fullName"), {
      target: { value: "سارة أحمد" },
    });
    fireEvent.change(screen.getByPlaceholderText("public.form.phoneNumber"), {
      target: { value: "+201012345678" },
    });
    fireEvent.change(screen.getByPlaceholderText("public.form.email"), {
      target: { value: "existing@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "public.form.submit" }));

    await waitFor(() => {
      expect(screen.getByText("public.errors.learnerEmailAlreadyExists")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: "public.errors.loginToContinue" }),
    ).toHaveAttribute(
      "href",
      "/ar/signin/patient?callbackUrl=%2Far%2Facademy%2Ftdryb1dh",
    );
  });

  it("renders lecture schedule details in a readable mobile card layout", () => {
    mocks.usePublicAcademyProgram.mockReturnValue({
      data: {
        ...program,
        sessions: [
          {
            id: "session-1",
            programId: "program-1",
            titleAr: "المحاضرة القادمة",
            titleEn: "Next lecture",
            descriptionAr: null,
            descriptionEn: null,
            startsAt: "2026-10-30T12:19:00.000Z",
            endsAt: "2026-10-30T13:49:00.000Z",
            deliveryMethod: "IN_PERSON",
            internalDeliveryNote: null,
            internalDeliveryLink: null,
            sortOrder: 1,
            isPublished: true,
            publishedAt: "2026-10-01T00:00:00.000Z",
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<PublicAcademyProgramDetailScreen locale="ar" slug="tdryb1dh" />);

    expect(screen.getByRole("heading", { name: "المحاضرة القادمة" })).toBeInTheDocument();
    expect(screen.getByText("public.detail.schedule.columns.date")).toBeInTheDocument();
    expect(screen.getByText("public.detail.schedule.columns.time")).toBeInTheDocument();
    expect(screen.getByText("public.detail.schedule.columns.deliveryMethod")).toBeInTheDocument();
    expect(screen.getByText("public.detail.schedule.columns.duration")).toBeInTheDocument();
    expect(screen.getAllByText("IN_PERSON")).toHaveLength(2);
    expect(screen.getByText("٩٠ دقيقة")).toBeInTheDocument();
  });
});
