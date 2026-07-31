import { getSignInRouteForRole } from "../../src/features/auth/routes";

describe("role-specific mobile sign-in routes", () => {
  it("keeps known roles on their canonical journey", () => {
    expect(getSignInRouteForRole("patient")).toBe("/(auth)/signin/patient");
    expect(getSignInRouteForRole("practitioner")).toBe("/(auth)/signin/practitioner");
  });

  it("uses the role chooser when no supported role is known", () => {
    expect(getSignInRouteForRole(null)).toBe("/(auth)");
    expect(getSignInRouteForRole(undefined)).toBe("/(auth)");
  });
});
