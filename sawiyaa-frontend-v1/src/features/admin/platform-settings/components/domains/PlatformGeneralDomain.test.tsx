import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlatformGeneralDomain from "./PlatformGeneralDomain";
import type { PlatformSetting } from "../../types/platform-settings.types";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.count !== undefined) return `${key} (${params.count})`;
    return key;
  },
  useLocale: () => "ar",
}));

vi.mock("../../hooks/use-platform-settings", () => ({
  useUpdatePlatformSetting: mocks.update,
  useResetPlatformSetting: mocks.reset,
}));

const mockGeneralSettings: PlatformSetting[] = [
  {
    key: "platform.defaultLocale",
    label: "Platform Default Locale",
    labelAr: "اللغة الافتراضية للمنصة",
    description: "Fallback locale when request locale is missing",
    descriptionAr: "اللغة الأولية لواجهة المستخدم",
    category: "LOCALE",
    domain: "platform",
    valueType: "STRING",
    value: "ar",
    defaultValue: "ar",
    source: "CATALOG_DEFAULT",
    editable: true,
    permission: "configuration.edit.system",
    enumOptions: ["ar", "en"],
    jsonSchemaId: null,
    valueId: "val-default-locale",
    expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    changedAt: "2026-08-20T10:00:00.000Z",
    effect: "IMMEDIATE",
    status: "ACTIVE",
    deprecatedReplacementKey: null,
    deprecationReason: null,
    uiMetadata: { control: "select" },
  },
  {
    key: "features.practitionerApplicationAdminReviewEnabled",
    label: "Practitioner Admin Review Feature",
    labelAr: "المراجعة الإدارية لطلبات الممارسين",
    description: "Feature flag controlling admin review operations",
    descriptionAr: "تتطلب الموافقة الإدارية الصريحة قبل تفعيل الحساب",
    category: "SYSTEM",
    domain: "practitioners",
    valueType: "BOOLEAN",
    value: true,
    defaultValue: true,
    source: "CATALOG_DEFAULT",
    editable: true,
    permission: "configuration.edit.system",
    enumOptions: null,
    jsonSchemaId: null,
    valueId: "val-practitioner-review",
    expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    changedAt: "2026-08-20T10:00:00.000Z",
    effect: "IMMEDIATE",
    status: "ACTIVE",
    deprecatedReplacementKey: null,
    deprecationReason: null,
    uiMetadata: { control: "toggle" },
  },
  {
    key: "security.jwt.accessTokenTtlMinutes",
    label: "Access Token TTL Minutes",
    labelAr: "مدة صلاحية جلسة الوصول",
    description: "JWT access token lifetime in minutes",
    descriptionAr: "المدة الزمنية بالدقائق قبل انتهاء صلاحية الجلسة",
    category: "SECURITY",
    domain: "security",
    valueType: "NUMBER",
    value: 30,
    defaultValue: 30,
    source: "CATALOG_DEFAULT",
    editable: true,
    permission: "configuration.edit.system",
    enumOptions: null,
    jsonSchemaId: null,
    valueId: "val-jwt-ttl",
    expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    changedAt: "2026-08-20T10:00:00.000Z",
    effect: "IMMEDIATE",
    status: "ACTIVE",
    deprecatedReplacementKey: null,
    deprecationReason: null,
    uiMetadata: { control: "integer" },
  },
];

describe("PlatformGeneralDomain — General & Platform Domain Editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.update.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      isError: false,
      isSuccess: false,
    });
    mocks.reset.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      isError: false,
      isSuccess: false,
    });
  });

  it("renders Platform Identity, Regional Preferences, Practitioner Governance, and Security Policies", () => {
    render(<PlatformGeneralDomain settings={mockGeneralSettings} />);

    expect(screen.getByText("generalDomain.sections.identity.title")).toBeTruthy();
    expect(screen.getByText("generalDomain.sections.localization.title")).toBeTruthy();
    expect(screen.getByText("generalDomain.sections.practitioners.title")).toBeTruthy();
    expect(screen.getByText("generalDomain.sections.security.title")).toBeTruthy();

    expect(screen.getAllByText("generalDomain.labels.arabicLocale").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("generalDomain.labels.englishLocale").length).toBeGreaterThanOrEqual(1);
  });

  it("allows switching platform default locale with two-stage confirmation modal and mandatory audit reason", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({});
    mocks.update.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      isSuccess: false,
    });

    render(<PlatformGeneralDomain settings={mockGeneralSettings} />);

    const englishBtn = screen.getByRole("button", {
      name: "generalDomain.labels.englishLocale",
    });
    await user.click(englishBtn);

    expect(screen.getByText("generalDomain.confirmModal.title")).toBeTruthy();
    expect(screen.getByText("generalDomain.confirmModal.warning")).toBeTruthy();

    const saveConfirmBtn = screen.getByRole("button", {
      name: "generalDomain.confirmModal.saveBtn",
    });
    expect((saveConfirmBtn as HTMLButtonElement).disabled).toBe(true);

    const reasonInput = screen.getByPlaceholderText(
      "generalDomain.confirmModal.reasonPlaceholder"
    );
    await user.type(reasonInput, "Updating platform default fallback locale to English for international expansion");

    expect((saveConfirmBtn as HTMLButtonElement).disabled).toBe(false);
    await user.click(saveConfirmBtn);

    expect(mutateAsync).toHaveBeenCalledWith({
      key: "platform.defaultLocale",
      value: "en",
      reason: "Updating platform default fallback locale to English for international expansion",
      expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    });
  });

  it("allows toggling practitioner admin review with confirmation dialog", async () => {
    const user = userEvent.setup();
    render(<PlatformGeneralDomain settings={mockGeneralSettings} />);

    const switches = screen.getAllByRole("switch");
    await user.click(switches[0]);

    expect(screen.getByText("generalDomain.confirmModal.title")).toBeTruthy();
    expect(
      screen.getByText("features.practitionerApplicationAdminReviewEnabled")
    ).toBeTruthy();
  });

  it("allows modifying security session duration stepper and submitting mutation", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({});
    mocks.update.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      isSuccess: false,
    });

    render(<PlatformGeneralDomain settings={mockGeneralSettings} />);

    const increaseBtn = screen.getByRole("button", {
      name: /Increase generalDomain.labels.jwtTtl/i,
    });
    await user.click(increaseBtn);

    const saveBtn = screen.getByRole("button", { name: "actions.save" });
    await user.click(saveBtn);

    expect(screen.getByText("generalDomain.confirmModal.title")).toBeTruthy();

    const reasonInput = screen.getByPlaceholderText(
      "generalDomain.confirmModal.reasonPlaceholder"
    );
    await user.type(reasonInput, "Extended session lifetime for admin users");

    const saveConfirmBtn = screen.getByRole("button", {
      name: "generalDomain.confirmModal.saveBtn",
    });
    await user.click(saveConfirmBtn);

    expect(mutateAsync).toHaveBeenCalledWith({
      key: "security.jwt.accessTokenTtlMinutes",
      value: 31,
      reason: "Extended session lifetime for admin users",
      expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    });
  });
});
