import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NewSupportMessageAction from "@/features/messages-shell/components/NewSupportMessageAction";

describe("NewSupportMessageAction", () => {
  it.each([
    ["patient", "New support message"],
    ["practitioner", "New support message"],
  ] as const)("shows for %s with the existing support action label", (role, label) => {
    render(<NewSupportMessageAction role={role} locale="en" onClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: label })).toBeVisible();
  });

  it("shows for an empty support lane and reuses the active conversation callback", () => {
    const onClick = vi.fn();
    render(<NewSupportMessageAction role="patient" locale="ar" onClick={onClick} />);

    const button = screen.getByRole("button", { name: "رسالة جديدة للدعم" });
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is hidden for Admin and disabled while pending", () => {
    const { rerender } = render(
      <NewSupportMessageAction role="admin" locale="en" onClick={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: "New support message" })).not.toBeInTheDocument();

    rerender(
      <NewSupportMessageAction
        role="practitioner"
        locale="en"
        disabled
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "New support message" })).toBeDisabled();
  });
});
