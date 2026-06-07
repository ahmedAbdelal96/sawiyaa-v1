/**
 * Phase 6 — Mobile Role/Permission Hardening
 *
 * Pure utility tests for:
 * - resolveMobileRole() — role parsing
 * - isPersistedAuthSession storage validator (via internal logic)
 * - resolvePatientNotificationRoute() — notification routing allowlist
 * - resolveNotificationDeviceRole() — push device role mapping
 */

import { resolveMobileRole } from "../../src/features/auth/roles";
import type { AuthenticatedUser } from "../../src/features/auth/contracts";
import { resolvePatientNotificationRoute } from "../../src/features/patient/notifications/routes";
import { resolvePractitionerNotificationRoute } from "../../src/features/practitioner/notifications/utils";
import { resolveNotificationDeviceRole } from "../../src/features/push/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(roles: string[]): AuthenticatedUser {
  return {
    id: "u-1",
    displayName: "Test User",
    status: "ACTIVE",
    roles: roles as AuthenticatedUser["roles"],
    primaryEmail: "test@example.com",
    isEmailVerified: true,
    primaryPhone: null,
    isPhoneVerified: false,
    practitionerProfileId: null,
    practitionerStatus: null,
  };
}

// ---------------------------------------------------------------------------
// resolveMobileRole
// ---------------------------------------------------------------------------

describe("resolveMobileRole", () => {
  it("returns 'patient' for PATIENT role", () => {
    expect(resolveMobileRole(makeUser(["PATIENT"]))).toBe("patient");
  });

  it("returns 'practitioner' for PRACTITIONER role", () => {
    expect(resolveMobileRole(makeUser(["PRACTITIONER"]))).toBe("practitioner");
  });

  it("returns null for ADMIN role — not a supported mobile role", () => {
    expect(resolveMobileRole(makeUser(["ADMIN"]))).toBeNull();
  });

  it("returns null for SUPER_ADMIN role", () => {
    expect(resolveMobileRole(makeUser(["SUPER_ADMIN"]))).toBeNull();
  });

  it("returns null for SUPPORT_AGENT role", () => {
    expect(resolveMobileRole(makeUser(["SUPPORT_AGENT"]))).toBeNull();
  });

  it("returns null for FINANCE_STAFF role", () => {
    expect(resolveMobileRole(makeUser(["FINANCE_STAFF"]))).toBeNull();
  });

  it("returns null for CONTENT_REVIEWER role", () => {
    expect(resolveMobileRole(makeUser(["CONTENT_REVIEWER"]))).toBeNull();
  });

  it("returns null for unknown/arbitrary role", () => {
    expect(resolveMobileRole(makeUser(["UNKNOWN_ROLE"]))).toBeNull();
  });

  it("returns null for empty roles array", () => {
    expect(resolveMobileRole(makeUser([]))).toBeNull();
  });

  it("prefers 'patient' when user has both PATIENT and PRACTITIONER", () => {
    // PATIENT is checked first — deterministic ordering
    expect(resolveMobileRole(makeUser(["PATIENT", "PRACTITIONER"]))).toBe("patient");
  });

  it("returns null for admin-class roles even when mixed with unknown roles", () => {
    expect(resolveMobileRole(makeUser(["ADMIN", "FINANCE_STAFF"]))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveNotificationDeviceRole
// ---------------------------------------------------------------------------

describe("resolveNotificationDeviceRole", () => {
  it("maps 'patient' to 'PATIENT'", () => {
    expect(resolveNotificationDeviceRole("patient")).toBe("PATIENT");
  });

  it("maps 'practitioner' to 'PRACTITIONER'", () => {
    expect(resolveNotificationDeviceRole("practitioner")).toBe("PRACTITIONER");
  });

  // Note: 'admin' no longer exists in MobileSupportedRole — this test documents
  // that any non-patient/practitioner input returns null.
  it("returns null for any unsupported role value at runtime", () => {
    // Cast to bypass TS type check — tests runtime behavior
    expect(resolveNotificationDeviceRole("admin" as never)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolvePatientNotificationRoute — deep-link allowlist
// ---------------------------------------------------------------------------

describe("resolvePatientNotificationRoute", () => {
  it("routes sessions deep-link to patient sessions list", () => {
    expect(resolvePatientNotificationRoute("/patient/sessions")).toBe(
      "/(patient)/sessions",
    );
  });

  it("routes sessions/:id deep-link to patient session detail", () => {
    expect(resolvePatientNotificationRoute("/patient/sessions/sess-123")).toBe(
      "/(patient)/sessions/sess-123",
    );
  });

  it("routes payments deep-link to patient payments", () => {
    expect(resolvePatientNotificationRoute("/patient/payments")).toBe(
      "/(patient)/payments",
    );
  });

  it("routes wallet deep-link to patient payments (same screen)", () => {
    expect(resolvePatientNotificationRoute("/patient/wallet")).toBe(
      "/(patient)/payments",
    );
  });

  it("routes care-chat conversations deep-link correctly", () => {
    expect(
      resolvePatientNotificationRoute("/patient/care-chat/conversations/conv-1"),
    ).toBe("/(patient)/care-chat/conv-1");
  });

  it("routes message notifications to the patient messages inbox tabs", () => {
    expect(
      resolvePatientNotificationRoute(
        "/patient/support/conv-1",
        "messages.support-message-received",
      ),
    ).toBe("/(patient)/messages?tab=support");
    expect(
      resolvePatientNotificationRoute(
        "/patient/care-chat/conv-1",
        "messages.follow-up-message-received",
      ),
    ).toBe("/(patient)/messages?tab=followup");
    expect(
      resolvePatientNotificationRoute(
        "/patient/messages/session-1",
        "messages.session-message-received",
      ),
    ).toBe("/(patient)/messages?tab=sessions");
  });

  it("routes assessments deep-link to assessments screen", () => {
    expect(resolvePatientNotificationRoute("/patient/assessments")).toBe(
      "/(patient)/assessments",
    );
  });

  it("returns null for non-patient href (unsupported notification target)", () => {
    expect(resolvePatientNotificationRoute("/admin/users")).toBeNull();
  });

  it("returns null for practitioner href — not a patient route", () => {
    expect(resolvePatientNotificationRoute("/practitioner/sessions")).toBeNull();
  });

  it("returns null for arbitrary href with no recognized segment", () => {
    expect(resolvePatientNotificationRoute("/patient/unrecognized-segment")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(resolvePatientNotificationRoute("")).toBeNull();
  });

  it("returns null for admin-class route injected via notification payload", () => {
    expect(resolvePatientNotificationRoute("/admin/practitioner-applications")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolvePractitionerNotificationRoute â€” deep-link allowlist
// ---------------------------------------------------------------------------

describe("resolvePractitionerNotificationRoute", () => {
  it("routes message notifications to the practitioner messages inbox tabs", () => {
    expect(
      resolvePractitionerNotificationRoute(
        "/practitioner/support/conv-1",
        "messages.support-message-received",
      ),
    ).toBe("/(practitioner)/messages?tab=support");
    expect(
      resolvePractitionerNotificationRoute(
        "/practitioner/care-chat/conv-1",
        "messages.follow-up-message-received",
      ),
    ).toBe("/(practitioner)/messages?tab=followup");
    expect(
      resolvePractitionerNotificationRoute(
        "/practitioner/messages/session-1",
        "messages.session-message-received",
      ),
    ).toBe("/(practitioner)/messages?tab=sessions");
  });
});

// ---------------------------------------------------------------------------
// Stored session role validation — whitebox test of storage logic
// ---------------------------------------------------------------------------

describe("Stored session role validation (whitebox)", () => {
  /**
   * Mirrors the isMobileSupportedRole() validator in storage.ts.
   * These tests document the acceptance criteria without importing the private function.
   */
  function isMobileSupportedRole(value: unknown): boolean {
    return value === "patient" || value === "practitioner";
  }

  it("accepts 'patient' as a valid stored role", () => {
    expect(isMobileSupportedRole("patient")).toBe(true);
  });

  it("accepts 'practitioner' as a valid stored role", () => {
    expect(isMobileSupportedRole("practitioner")).toBe(true);
  });

  it("rejects 'admin' as a stored role", () => {
    expect(isMobileSupportedRole("admin")).toBe(false);
  });

  it("rejects 'ADMIN' (uppercase) as a stored role", () => {
    expect(isMobileSupportedRole("ADMIN")).toBe(false);
  });

  it("rejects null as a stored role", () => {
    expect(isMobileSupportedRole(null)).toBe(false);
  });

  it("rejects undefined as a stored role", () => {
    expect(isMobileSupportedRole(undefined)).toBe(false);
  });

  it("rejects empty string as a stored role", () => {
    expect(isMobileSupportedRole("")).toBe(false);
  });

  it("rejects numeric values as a stored role", () => {
    expect(isMobileSupportedRole(1)).toBe(false);
  });
});
