import { expect, test } from "@playwright/test";
import { resolveSignUpMode } from "../src/features/auth/utils/signup-mode";

test.describe("Signup mode contract", () => {
  test("defaults to patient unless practitioner mode is explicitly selected", () => {
    expect(resolveSignUpMode(undefined)).toBe("patient");
    expect(resolveSignUpMode("patient")).toBe("patient");
    expect(resolveSignUpMode("practitioner")).toBe("practitioner");
    expect(resolveSignUpMode("PRACTITIONER")).toBe("patient");
  });

});
