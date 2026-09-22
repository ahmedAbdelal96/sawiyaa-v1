import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LearnerContactField } from "./AdminAcademyProgramLearnersScreen";

describe("LearnerContactField", () => {
  it("renders actionable email and copies the canonical value", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <LearnerContactField
        label="Email"
        value="registrant@example.com"
        kind="email"
        copyLabel="Copy"
        copiedLabel="Copied"
        actionLabel="Email"
      />,
    );

    expect(screen.getByRole("link", { name: /registrant@example\.com/i })).toHaveAttribute(
      "href",
      "mailto:registrant@example.com",
    );

    fireEvent.click(screen.getByRole("button", { name: "Email" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("registrant@example.com"));
  });

  it("renders a tel link and a clear empty value", () => {
    const { rerender } = render(
      <LearnerContactField
        label="Phone"
        value="+201000000000"
        kind="phone"
        copyLabel="Copy"
        copiedLabel="Copied"
        actionLabel="Call"
      />,
    );
    expect(screen.getByRole("link", { name: /\+201000000000/ })).toHaveAttribute("href", "tel:+201000000000");

    rerender(
      <LearnerContactField
        label="Phone"
        value={null}
        kind="phone"
        copyLabel="Copy"
        copiedLabel="Copied"
        actionLabel="Call"
      />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
