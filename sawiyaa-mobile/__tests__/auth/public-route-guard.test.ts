import { resolveMobileRole } from "../../src/features/auth/roles";
import type { AuthenticatedUser } from "../../src/features/auth/contracts";

const mockBaseUser: AuthenticatedUser = {
  id: "u_123",
  displayName: "Test User",
  status: "ACTIVE",
  roles: [],
  primaryEmail: "test@example.com",
  isEmailVerified: true,
  primaryPhone: null,
  isPhoneVerified: false,
  practitionerProfileId: null,
  practitionerStatus: null,
};

describe("resolveMobileRole unit tests", () => {
  it("resolves PATIENT role to patient", () => {
    const user = { ...mockBaseUser, roles: ["PATIENT"] as any[] };
    expect(resolveMobileRole(user)).toBe("patient");
  });

  it("resolves PRACTITIONER role to practitioner", () => {
    const user = { ...mockBaseUser, roles: ["PRACTITIONER"] as any[] };
    expect(resolveMobileRole(user)).toBe("practitioner");
  });

  it("rejects admin and other staff roles by returning null", () => {
    const userAdmin = { ...mockBaseUser, roles: ["ADMIN"] as any[] };
    expect(resolveMobileRole(userAdmin)).toBeNull();

    const userFinance = { ...mockBaseUser, roles: ["FINANCE_STAFF"] as any[] };
    expect(resolveMobileRole(userFinance)).toBeNull();
  });

  it("resolves priority deterministically to patient when both patient and practitioner are present", () => {
    const mixedUser = { ...mockBaseUser, roles: ["PATIENT", "PRACTITIONER"] as any[] };
    expect(resolveMobileRole(mixedUser)).toBe("patient");
  });
});
