import { describe, expect, it } from "vitest";
import { getChangePasswordRedirectPath } from "./change-password-redirect";

describe("change-password redirect", () => {
  it("uses the canonical patient sign-in route", () => {
    expect(getChangePasswordRedirectPath("patient")).toBe("/signin/patient");
  });

  it("uses the canonical practitioner sign-in route", () => {
    expect(getChangePasswordRedirectPath("practitioner")).toBe(
      "/signin/practitioner",
    );
  });
});
