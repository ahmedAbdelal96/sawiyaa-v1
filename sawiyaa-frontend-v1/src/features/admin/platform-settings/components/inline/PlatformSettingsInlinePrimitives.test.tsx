import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingControl } from "./PlatformSettingsInlinePrimitives";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const settingData = {
  key: "SESSION_REMINDER_OFFSETS_MINUTES",
  label: "Session reminders",
  labelAr: "مواعيد تذكير الجلسة",
  description: "Reminder schedule",
  descriptionAr: "جدول التذكيرات",
  uiMetadata: { control: "integer-list" as const },
  editable: true,
  capabilities: { canEdit: true },
};

describe("human platform setting controls", () => {
  it("renders reminder offsets as human phrases and uses the start wording for zero", () => {
    render(
      <SettingControl
        setting={settingData as never}
        value={[60, 15, 0]}
        isAr
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("60 دقيقة قبل الجلسة")).toBeTruthy();
    expect(screen.getByText("15 دقيقة قبل الجلسة")).toBeTruthy();
    expect(screen.getByText("عند بداية الجلسة")).toBeTruthy();
    expect(screen.queryByText(/× 60/)).toBeNull();
    expect(screen.queryByText(/× 15/)).toBeNull();
    expect(screen.queryByText(/× 0/)).toBeNull();
  });

  it("adds a new offset and prevents duplicate offsets", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SettingControl
        setting={settingData as never}
        value={[60, 15, 0]}
        isAr
        onChange={onChange}
      />,
    );

    const input = screen.getByRole("spinbutton", {
      name: "دقائق التذكير الجديد",
    });
    await user.clear(input);
    await user.type(input, "15");
    expect(screen.getByRole("button", { name: "إضافة تذكير" })).toBeDisabled();

    await user.clear(input);
    await user.type(input, "30");
    await user.click(screen.getByRole("button", { name: "إضافة تذكير" }));
    expect(onChange).toHaveBeenLastCalledWith([60, 30, 15, 0]);
  });

  it("keeps MIME chips readable in RTL and hides raw MIME values from the label", () => {
    render(
      <SettingControl
        setting={
          {
            ...settingData,
            key: "file.uploads.chat.allowedImageMimeTypes",
            uiMetadata: { control: "multi-select" as const },
          } as never
        }
        value={["image/jpeg", "image/png"]}
        isAr
        onChange={vi.fn()}
      />,
    );

    const jpegChip = screen.getByRole("button", { name: "JPEG inline.remove" });
    expect(jpegChip).toHaveAttribute("dir", "ltr");
    expect(jpegChip).toHaveTextContent("JPEG");
    expect(jpegChip).not.toHaveTextContent("image/jpeg");
  });
});
