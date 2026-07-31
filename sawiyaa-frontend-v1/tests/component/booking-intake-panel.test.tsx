import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BookingIntakePanel from "@/features/booking-settings/components/BookingIntakePanel";

const mocks = vi.hoisted(() => ({
  settings: { message: "ok", acceptsNormalBookings: true, isInstantBookingEnabled: false },
  mutate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));

vi.mock("@/features/booking-settings/hooks/use-booking-settings", () => ({
  useMyBookingSettings: () => ({ data: mocks.settings, isLoading: false, isError: false }),
  useUpdateBookingSettings: () => ({ mutate: mocks.mutate, isPending: false }),
}));

vi.mock("@/components/form/switch/Switch", () => ({
  default: ({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) => (
    <button role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} />
  ),
}));

vi.mock("@/components/ui/modal", () => ({
  ConfirmModal: ({ isOpen, onClose, onConfirm }: { isOpen: boolean; onClose: () => void; onConfirm: () => void }) =>
    isOpen ? <div role="dialog"><button onClick={onClose}>cancel</button><button onClick={onConfirm}>confirm</button></div> : null,
}));

describe("BookingIntakePanel", () => {
  beforeEach(() => {
    mocks.settings = { message: "ok", acceptsNormalBookings: true, isInstantBookingEnabled: false };
    mocks.mutate.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
  });

  it("reflects Backend state and does not mutate when pause is cancelled", () => {
    render(<BookingIntakePanel />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("submits pause only after confirmation and keeps instant state independent", () => {
    render(<BookingIntakePanel />);
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("button", { name: "confirm" }));
    expect(mocks.mutate).toHaveBeenCalledWith(false, expect.any(Object));
    expect(mocks.settings.isInstantBookingEnabled).toBe(false);
  });
});
