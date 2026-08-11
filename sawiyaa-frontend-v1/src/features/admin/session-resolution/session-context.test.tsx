import { describe, expect, it } from "vitest";
import { getAvailablePatientRemedies, isPackageSession, isReplacementSession } from "./session-context";

describe("admin session context", () => {
  it("classifies direct sessions and hides package restore", () => {
    const facts = { paymentCoverageType: "DIRECT_PAYMENT" };
    expect(isPackageSession(facts)).toBe(false);
    expect(getAvailablePatientRemedies(facts)).not.toContain("RESTORE_PACKAGE");
  });
  it("exposes package remedies only for package sessions", () => {
    const facts = { paymentCoverageType: "PACKAGE", packagePurchaseId: "pkg-1" };
    expect(isPackageSession(facts)).toBe(true);
    expect(getAvailablePatientRemedies(facts)).toContain("RESTORE_PACKAGE");
  });
  it("recognizes admin replacements and preserves original relation", () => {
    expect(isReplacementSession({ fundingSource: "ADMIN_REPLACEMENT", originalSessionId: "original-1" })).toBe(true);
  });
});
