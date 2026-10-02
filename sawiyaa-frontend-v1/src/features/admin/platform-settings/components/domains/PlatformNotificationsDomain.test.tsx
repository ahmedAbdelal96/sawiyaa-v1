import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlatformNotificationsDomain from "./PlatformNotificationsDomain";
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

const mockNotificationSettings: PlatformSetting[] = [
  {
    key: "SESSION_IN_APP_REMINDERS_ENABLED",
    label: "In-App Session Reminders Enabled",
    labelAr: "تفعيل تذكيرات الجلسات داخل التطبيق",
    description: "Controls in-app reminder delivery",
    descriptionAr: "التحكم في إشعارات التطبيق للتذكير بالجلسات",
    category: "NOTIFICATION",
    domain: "sessions",
    valueType: "BOOLEAN",
    value: true,
    defaultValue: true,
    source: "CATALOG_DEFAULT",
    editable: true,
    permission: "configuration.edit.operational",
    enumOptions: null,
    jsonSchemaId: null,
    valueId: "val-inapp",
    expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    changedAt: "2026-08-20T10:00:00.000Z",
    effect: "IMMEDIATE",
    status: "ACTIVE",
    deprecatedReplacementKey: null,
    deprecationReason: null,
    uiMetadata: { control: "toggle" },
  },
  {
    key: "SESSION_EMAIL_REMINDERS_ENABLED",
    label: "Email Session Reminders Enabled",
    labelAr: "تفعيل تذكيرات الجلسات عبر البريد الإلكتروني",
    description: "Controls email reminder delivery",
    descriptionAr: "التحكم في رسائل البريد الإلكتروني للتذكير بالجلسات",
    category: "NOTIFICATION",
    domain: "sessions",
    valueType: "BOOLEAN",
    value: true,
    defaultValue: true,
    source: "CATALOG_DEFAULT",
    editable: true,
    permission: "configuration.edit.operational",
    enumOptions: null,
    jsonSchemaId: null,
    valueId: "val-email",
    expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    changedAt: "2026-08-20T10:00:00.000Z",
    effect: "IMMEDIATE",
    status: "ACTIVE",
    deprecatedReplacementKey: null,
    deprecationReason: null,
    uiMetadata: { control: "toggle" },
  },
  {
    key: "SESSION_REMINDER_OFFSETS_MINUTES",
    label: "Session Reminder Offsets (Minutes)",
    labelAr: "مواعيد تذكيرات الجلسة بالدقائق",
    description: "Pre-start reminder intervals",
    descriptionAr: "الفواصل الزمنية للتذكير قبل الجلسة",
    category: "NOTIFICATION",
    domain: "sessions",
    valueType: "JSON",
    value: [60, 15, 0],
    defaultValue: [60, 15, 0],
    source: "CATALOG_DEFAULT",
    editable: true,
    permission: "configuration.edit.operational",
    enumOptions: null,
    jsonSchemaId: "sessions.reminderOffsetsMinutes.v1",
    valueId: "val-offsets",
    expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    changedAt: "2026-08-20T10:00:00.000Z",
    effect: "NEW_SESSIONS_ONLY",
    status: "ACTIVE",
    deprecatedReplacementKey: null,
    deprecationReason: null,
    uiMetadata: { control: "integer-list" },
  },
  {
    key: "SESSION_LATE_REMINDER_ENABLED",
    label: "Late Session Reminder Enabled",
    labelAr: "تفعيل تذكير التأخر عن الجلسة",
    description: "Enable late attendance reminders",
    descriptionAr: "تفعيل التنبيه عند عدم انضمام المشارك",
    category: "NOTIFICATION",
    domain: "sessions",
    valueType: "BOOLEAN",
    value: true,
    defaultValue: true,
    source: "CATALOG_DEFAULT",
    editable: true,
    permission: "configuration.edit.operational",
    enumOptions: null,
    jsonSchemaId: null,
    valueId: "val-late-enabled",
    expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    changedAt: "2026-08-20T10:00:00.000Z",
    effect: "IMMEDIATE",
    status: "ACTIVE",
    deprecatedReplacementKey: null,
    deprecationReason: null,
    uiMetadata: { control: "toggle" },
  },
  {
    key: "SESSION_LATE_REMINDER_MINUTES_AFTER_START",
    label: "Late Session Reminder Delay",
    labelAr: "مهلة إرسال تنبيه التأخر بعد بدء الجلسة",
    description: "Minutes after start before sending reminder",
    descriptionAr: "الدقائق بعد البداية لإرسال التنبيه",
    category: "NOTIFICATION",
    domain: "sessions",
    valueType: "INTEGER",
    value: 5,
    defaultValue: 5,
    source: "CATALOG_DEFAULT",
    minimum: 1,
    maximum: 60,
    editable: true,
    permission: "configuration.edit.operational",
    enumOptions: null,
    jsonSchemaId: null,
    valueId: "val-late-delay",
    expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    changedAt: "2026-08-20T10:00:00.000Z",
    effect: "IMMEDIATE",
    status: "ACTIVE",
    deprecatedReplacementKey: null,
    deprecationReason: null,
    uiMetadata: { control: "integer" },
  },
];

describe("PlatformNotificationsDomain — Notifications & Alerts Domain Editor", () => {
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

  it("renders Delivery Channels Matrix, Schedule Offsets, and Late Attendance Alert sections", () => {
    render(<PlatformNotificationsDomain settings={mockNotificationSettings} />);

    expect(screen.getByText("notificationsDomain.sections.channels.title")).toBeTruthy();
    expect(screen.getByText("notificationsDomain.sections.schedule.title")).toBeTruthy();
    expect(screen.getByText("notificationsDomain.sections.lateAlerts.title")).toBeTruthy();

    // Check intervals
    expect(screen.getByText("60m")).toBeTruthy();
    expect(screen.getByText("15m")).toBeTruthy();
    expect(screen.getByText("0m")).toBeTruthy();
  });

  it("calls onOpenScheduleEditor when clicking schedule configuration CTA", async () => {
    const user = userEvent.setup();
    const onOpenScheduleEditor = vi.fn();

    render(
      <PlatformNotificationsDomain
        settings={mockNotificationSettings}
        onOpenScheduleEditor={onOpenScheduleEditor}
      />
    );

    const configureScheduleBtn = screen.getByRole("button", {
      name: /تعديل جدول التذكيرات المتقدم|Configure Reminder Schedule/i,
    });
    await user.click(configureScheduleBtn);

    expect(onOpenScheduleEditor).toHaveBeenCalledWith(
      expect.objectContaining({ key: "SESSION_REMINDER_OFFSETS_MINUTES" })
    );
  });

  it("allows increasing late reminder delay and opens confirmation dialog with mandatory reason", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({});
    mocks.update.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      isSuccess: false,
    });

    render(<PlatformNotificationsDomain settings={mockNotificationSettings} />);

    const increaseBtn = screen.getByRole("button", { name: "Increase Late Reminder Delay" });
    await user.click(increaseBtn);

    // Save CTA appears
    const saveBtn = screen.getByRole("button", { name: "actions.save" });
    await user.click(saveBtn);

    // Modal opens
    expect(screen.getByText("notificationsDomain.confirmModal.title")).toBeTruthy();
    expect(screen.getByText("notificationsDomain.confirmModal.warning")).toBeTruthy();

    const saveConfirmBtn = screen.getByRole("button", {
      name: "notificationsDomain.confirmModal.saveBtn",
    });
    expect((saveConfirmBtn as HTMLButtonElement).disabled).toBe(true);

    // Type mandatory reason
    const reasonInput = screen.getByPlaceholderText(
      "notificationsDomain.confirmModal.reasonPlaceholder"
    );
    await user.type(reasonInput, "Extended late participant grace buffer per operations request");

    expect((saveConfirmBtn as HTMLButtonElement).disabled).toBe(false);
    await user.click(saveConfirmBtn);

    expect(mutateAsync).toHaveBeenCalledWith({
      key: "SESSION_LATE_REMINDER_MINUTES_AFTER_START",
      value: 6,
      reason: "Extended late participant grace buffer per operations request",
      expectedUpdatedAt: "2026-08-20T10:00:00.000Z",
    });
  });

  it("toggles in-app and email delivery channels with confirmation dialog", async () => {
    const user = userEvent.setup();
    render(<PlatformNotificationsDomain settings={mockNotificationSettings} />);

    const switches = screen.getAllByRole("switch");
    // Switch 0: in-app push
    await user.click(switches[0]);

    expect(screen.getByText("notificationsDomain.confirmModal.title")).toBeTruthy();
    expect(screen.getByText("SESSION_IN_APP_REMINDERS_ENABLED")).toBeTruthy();
  });
});
