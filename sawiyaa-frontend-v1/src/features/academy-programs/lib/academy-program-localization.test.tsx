import { describe, expect, it, vi } from "vitest";
import { resolveAcademyProgramEnrollmentStatusLabel } from "./academy-program-localization";

describe("Academy enrollment status contract", () => {
  it("uses CONFIRMED as the canonical paid enrollment state", () => {
    const translate = vi.fn((key: string) => key);
    expect(resolveAcademyProgramEnrollmentStatusLabel("CONFIRMED", translate)).toBe(
      "statuses.enrollment.CONFIRMED",
    );
    expect(translate).not.toHaveBeenCalledWith("statuses.enrollment.UPCOMING");
  });
});
