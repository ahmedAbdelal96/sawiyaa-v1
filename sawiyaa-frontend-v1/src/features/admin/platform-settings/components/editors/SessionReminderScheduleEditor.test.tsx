import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PlatformSetting } from "../../types/platform-settings.types";
import {
  SessionReminderScheduleEditor,
  formatMinutesToHuman,
  formatTimelineStep,
} from "./SessionReminderScheduleEditor";

vi.mock("next-intl", () => ({
  useLocale: () => "ar",
  useTranslations: () => (key: string) => key,
}));

const mockSetting = {
  key: "SESSION_REMINDER_OFFSETS_MINUTES",
  label: "مواعيد تذكير الجلسة بالدقائق",
  description: "جدولة التذكيرات بالدقائق قبل بداية الجلسة",
  category: "NOTIFICATION",
  domain: "sessions",
  valueType: "JSON" as const,
  value: [60, 15, 0],
  defaultValue: [60, 15, 0],
  source: "CATALOG_DEFAULT" as const,
  editable: true,
  permission: "configuration.edit.operational",
  enumOptions: null,
  jsonSchemaId: null,
  maximum: 10080,
  minimum: 0,
  unit: "minutes",
  valueId: "val-1",
  expectedUpdatedAt: "2026-08-03T10:00:00.000Z",
  changedAt: "2026-08-03T10:00:00.000Z",
  effect: "IMMEDIATE" as const,
  status: "ACTIVE" as const,
  owner: "DATABASE_CONFIG" as const,
  required: true,
} as unknown as PlatformSetting;

describe("SessionReminderScheduleEditor UX Requirements", () => {
  it("formatMinutesToHuman formats minutes into human readable Arabic and English phrases", () => {
    expect(formatMinutesToHuman(0, true)).toBe("عند بدء الجلسة");
    expect(formatMinutesToHuman(0, false)).toBe("At session start");

    expect(formatMinutesToHuman(60, true)).toBe("قبل الجلسة بساعة");
    expect(formatMinutesToHuman(60, false)).toBe("1 hour before session");

    expect(formatMinutesToHuman(15, true)).toBe("قبل الجلسة بـ 15 دقيقة");
    expect(formatMinutesToHuman(15, false)).toBe("15 minutes before session");

    expect(formatMinutesToHuman(1440, true)).toBe("قبل الجلسة بيوم");
    expect(formatMinutesToHuman(1440, false)).toBe("1 day before session");
  });

  it("formatTimelineStep formats initial and relative timeline steps", () => {
    expect(formatTimelineStep(60, 0, true)).toBe("قبل الجلسة بساعة");
    expect(formatTimelineStep(15, 1, true)).toBe("قبلها بـ 15 دقيقة");
    expect(formatTimelineStep(0, 2, true)).toBe("عند بدء الجلسة");
  });

  it("proves raw key is not visible as primary content (only in collapsed technical details)", () => {
    render(
      <SessionReminderScheduleEditor
        setting={mockSetting}
        value={[60, 15, 0]}
        onChange={vi.fn()}
        reason="تحديث السياسة"
        onReasonChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onReset={vi.fn()}
        isPending={false}
        isResetPending={false}
        isError={false}
        onReloadLatest={vi.fn()}
        isFetching={false}
      />
    );

    // Primary title must be business title in Arabic
    expect(screen.getByText("مواعيد تذكير الجلسة")).toBeTruthy();
    expect(screen.getByText("حدد متى يتلقى المريض والمختص تذكيرات قبل موعد الجلسة وعند بدايتها.")).toBeTruthy();

    // Raw key should NOT be primary content (not open by default)
    expect(screen.queryByText("Config Key: SESSION_REMINDER_OFFSETS_MINUTES")).toBeNull();

    // Clicking technical details toggle reveals it
    fireEvent.click(screen.getByText("التفاصيل التقنية"));
    expect(screen.getByText("SESSION_REMINDER_OFFSETS_MINUTES")).toBeTruthy();
  });

  it("proves positive offsets render as full labeled rows with explicit units and text delete buttons", () => {
    render(
      <SessionReminderScheduleEditor
        setting={mockSetting}
        value={[60, 15, 0]}
        onChange={vi.fn()}
        reason=""
        onReasonChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onReset={vi.fn()}
        isPending={false}
        isResetPending={false}
        isError={false}
        onReloadLatest={vi.fn()}
        isFetching={false}
      />
    );

    // Explicit units
    const units = screen.getAllByText("دقيقة قبل الجلسة");
    expect(units.length).toBe(2);

    // Delete buttons with visible text
    const deleteButtons = screen.getAllByRole("button", { name: /حذف/ });
    expect(deleteButtons.length).toBe(2);
    expect(deleteButtons[0].textContent).toContain("حذف");
  });

  it("proves raw 0 is never displayed as a numeric row or chip and maps to start-time toggle", () => {
    render(
      <SessionReminderScheduleEditor
        setting={mockSetting}
        value={[60, 15, 0]}
        onChange={vi.fn()}
        reason=""
        onReasonChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onReset={vi.fn()}
        isPending={false}
        isResetPending={false}
        isError={false}
        onReloadLatest={vi.fn()}
        isFetching={false}
      />
    );

    // 0 should not be inside any numeric input
    const numberInputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    expect(numberInputs.map((i) => i.value)).toEqual(["60", "15"]);

    // Start-time toggle
    const toggle = screen.getByRole("switch");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("إرسال تذكير عند بدء الجلسة")).toBeTruthy();
  });

  it("proves the add action has visible text (not icon-only)", () => {
    render(
      <SessionReminderScheduleEditor
        setting={mockSetting}
        value={[60, 15, 0]}
        onChange={vi.fn()}
        reason=""
        onReasonChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onReset={vi.fn()}
        isPending={false}
        isResetPending={false}
        isError={false}
        onReloadLatest={vi.fn()}
        isFetching={false}
      />
    );

    const addButton = screen.getByRole("button", { name: /\+ إضافة تذكير قبل الجلسة/ });
    expect(addButton).toBeTruthy();
    expect(addButton.textContent).toContain("+ إضافة تذكير قبل الجلسة");
  });

  it("serializes schedule to [60, 15, 0] for backend", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SessionReminderScheduleEditor
        setting={mockSetting}
        value={[15, 60]}
        onChange={onChange}
        reason=""
        onReasonChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onReset={vi.fn()}
        isPending={false}
        isResetPending={false}
        isError={false}
        onReloadLatest={vi.fn()}
        isFetching={false}
      />
    );

    // Toggle start reminder ON -> output should be [60, 15, 0]
    const toggle = screen.getByRole("switch");
    await user.click(toggle);

    expect(onChange).toHaveBeenCalledWith([60, 15, 0]);
  });

  it("blocks duplicate offsets and displays inline error message", async () => {
    const onValidationChange = vi.fn();
    render(
      <SessionReminderScheduleEditor
        setting={mockSetting}
        value={[60, 60, 0]}
        onChange={vi.fn()}
        onValidationChange={onValidationChange}
        reason=""
        onReasonChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onReset={vi.fn()}
        isPending={false}
        isResetPending={false}
        isError={false}
        onReloadLatest={vi.fn()}
        isFetching={false}
      />
    );

    expect(screen.getByRole("alert").textContent).toContain("مكررة");
    expect(onValidationChange).toHaveBeenCalledWith(false);
  });

  it("shows timeline preview with human-readable Arabic labels", () => {
    render(
      <SessionReminderScheduleEditor
        setting={mockSetting}
        value={[60, 15, 0]}
        onChange={vi.fn()}
        reason=""
        onReasonChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onReset={vi.fn()}
        isPending={false}
        isResetPending={false}
        isError={false}
        onReloadLatest={vi.fn()}
        isFetching={false}
      />
    );

    expect(screen.getByText("المعاينة الحية للجدول الزمني")).toBeTruthy();
    expect(screen.getByText("قبل الجلسة بساعة")).toBeTruthy();
    expect(screen.getByText("قبلها بـ 15 دقيقة")).toBeTruthy();
    expect(screen.getByText("عند بدء الجلسة")).toBeTruthy();
  });

  it("provides human-readable inline confirmation when restoring default schedule", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(
      <SessionReminderScheduleEditor
        setting={mockSetting}
        value={[120, 0]}
        onChange={vi.fn()}
        reason=""
        onReasonChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onReset={onReset}
        isPending={false}
        isResetPending={false}
        isError={false}
        onReloadLatest={vi.fn()}
        isFetching={false}
      />
    );

    // Quiet restore link
    const restoreBtn = screen.getByRole("button", { name: "إعادة الضبط للافتراضي" });
    await user.click(restoreBtn);

    // Inline confirmation appears showing human-readable phrases (NOT raw arrays [60,15,0])
    expect(screen.getByText("تأكيد إعادة الضبط للافتراضي")).toBeTruthy();
    expect(screen.getByText(/الجدول الافتراضي:/)).toBeTruthy();
    expect(screen.getByText(/قبل الجلسة بساعة ، قبل الجلسة بـ 15 دقيقة ، عند بدء الجلسة/)).toBeTruthy();
    expect(screen.queryByText("[60,15,0]")).toBeNull();

    await user.click(screen.getByRole("button", { name: "تأكيد الاستعادة" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
