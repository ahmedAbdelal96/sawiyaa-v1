import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicAcademyProgramDetailScreen from "./PublicAcademyDetailScreen";

const mocks = vi.hoisted(() => ({
  getManualPaymentMethods: vi.fn(),
  usePublicAcademyProgram: vi.fn(),
  createEnrollment: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
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

vi.mock("@/features/academy-programs/api/manual-payments.api", () => ({
  getManualPaymentMethods: mocks.getManualPaymentMethods,
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
  PriceDisplay: () => <span>100 EGP</span>,
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
  getPublicAcademyProgramErrorKey: () => "errors.generic",
}));

vi.mock("@/lib/api/http-client", () => ({
  tokenManager: { isAuthenticated: () => false },
}));

vi.mock("../lib/academy-public-price", () => ({
  mapAcademyPublicPrice: () => ({ amount: "100", currencyCode: "EGP" }),
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
  priceAmount: "100",
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

function renderScreen() {
  return render(<PublicAcademyProgramDetailScreen locale="ar" slug="tdryb1dh" />);
}

function manualOption() {
  return screen.queryByRole("option", { name: "public.form.manualPayment" });
}

describe("Academy customer manual payment availability", () => {
  beforeEach(() => {
    mocks.usePublicAcademyProgram.mockReturnValue({
      data: program,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.createEnrollment.mockResolvedValue({});
    mocks.getManualPaymentMethods.mockReset();
  });

  it("fails closed while the eligibility request is loading", () => {
    mocks.getManualPaymentMethods.mockReturnValue(new Promise(() => undefined));

    renderScreen();

    expect(screen.getByRole("option", { name: "public.form.gatewayPayment" })).toBeInTheDocument();
    expect(manualOption()).not.toBeInTheDocument();
  });

  it("shows Manual when the public endpoint returns eligible methods", async () => {
    mocks.getManualPaymentMethods.mockResolvedValue([{ id: "method-1" }]);

    renderScreen();

    expect(await screen.findByRole("option", { name: "public.form.manualPayment" })).toBeInTheDocument();
  });

  it("hides Manual when the public endpoint returns no eligible methods", async () => {
    mocks.getManualPaymentMethods.mockResolvedValue([]);

    renderScreen();

    await waitFor(() => expect(manualOption()).not.toBeInTheDocument());
  });

  it("hides Manual when the backend reports that the Academy domain is disabled", async () => {
    mocks.getManualPaymentMethods.mockRejectedValue(new Error("MANUAL_PAYMENT_DOMAIN_DISABLED"));

    renderScreen();

    await waitFor(() => expect(manualOption()).not.toBeInTheDocument());
  });

  it("hides Manual when the public eligibility endpoint fails", async () => {
    mocks.getManualPaymentMethods.mockRejectedValue(new Error("network unavailable"));

    renderScreen();

    await waitFor(() => expect(manualOption()).not.toBeInTheDocument());
  });
});
