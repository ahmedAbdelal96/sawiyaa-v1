import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AvailabilityTimeGrid from "@/features/availability/components/AvailabilityTimeGrid";

const props = {
  locale: "en",
  durationLabel: "30 minutes",
  fromLabel: "from",
  toLabel: "to",
  protectedLabel: "Protected time",
  endOfDayLabel: "A 60-minute session cannot end after midnight",
  onToggle: vi.fn(),
};

describe("AvailabilityTimeGrid", () => {
  it("renders only half-hour starts and keeps selected semantics", () => {
    render(<AvailabilityTimeGrid {...props} duration={30} selectedStarts={[600]} />);

    expect(screen.getByRole("button", { name: /30 minutes from 10:00 to 10:30/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /30 minutes from 10:30 to 11:00/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(48);
    expect(screen.queryByRole("button", { name: /10:15/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /10:45/ })).not.toBeInTheDocument();
  });

  it("allows 23:30 for 30 minutes and disables it for 60 minutes", () => {
    const { rerender } = render(<AvailabilityTimeGrid {...props} duration={30} selectedStarts={[]} />);
    expect(screen.getByRole("button", { name: "30 minutes from 23:30 to 00:00", exact: true })).toBeEnabled();

    rerender(<AvailabilityTimeGrid {...props} duration={60} durationLabel="60 minutes" selectedStarts={[]} />);
    expect(screen.queryByRole("button", { name: /60 minutes from 23:30/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "60 minutes from 23:00 to 00:00", exact: true })).toBeEnabled();
  });

  it("does not share selection state between durations", () => {
    const onToggle = vi.fn();
    const { rerender } = render(<AvailabilityTimeGrid {...props} duration={30} selectedStarts={[600]} onToggle={onToggle} />);
    expect(screen.getByRole("button", { name: "30 minutes from 10:00 to 10:30", exact: true })).toHaveAttribute("aria-pressed", "true");

    rerender(<AvailabilityTimeGrid {...props} duration={60} durationLabel="60 minutes" selectedStarts={[]} onToggle={onToggle} />);
    expect(screen.getByRole("button", { name: "60 minutes from 10:00 to 11:00", exact: true })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "60 minutes from 10:00 to 11:00", exact: true }));
    expect(onToggle).toHaveBeenCalledWith(600);
  });

  it("keeps protected time selected and non-removable", () => {
    const onToggle = vi.fn();
    render(<AvailabilityTimeGrid {...props} duration={30} selectedStarts={[600]} protectedStarts={[600]} onToggle={onToggle} />);
    const protectedButton = screen.getByRole("button", { name: /30 minutes from 10:00 to 10:30, Protected time/ });
    expect(protectedButton).toBeDisabled();
    fireEvent.click(protectedButton);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("shows complete one-hour ranges while keeping half-hour starts", () => {
    render(<AvailabilityTimeGrid {...props} duration={60} durationLabel="60 minutes" selectedStarts={[]} />);

    expect(screen.getByRole("button", { name: "60 minutes from 10:00 to 11:00", exact: true })).toBeEnabled();
    expect(screen.getByRole("button", { name: "60 minutes from 11:00 to 12:00", exact: true })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "60 minutes from 10:30 to 11:30", exact: true })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(24);
  });

  it("renders Arabic ranges as isolated from/to values instead of a bare dash", () => {
    render(<AvailabilityTimeGrid {...props} locale="ar" duration={60} durationLabel="جلسة 60 دقيقة" fromLabel="من" toLabel="إلى" selectedStarts={[60]} />);

    const selectedButton = screen.getByRole("button", { name: "جلسة 60 دقيقة من 01:00 إلى 02:00", exact: true });
    const range = selectedButton.querySelector('[dir="rtl"]');
    expect(range).toBeInTheDocument();
    expect(range?.querySelectorAll('bdi[dir="ltr"]')).toHaveLength(2);
    expect(selectedButton.textContent).toContain("من");
    expect(selectedButton.textContent).toContain("إلى");
    expect(selectedButton.textContent).not.toContain("–");
  });
});
