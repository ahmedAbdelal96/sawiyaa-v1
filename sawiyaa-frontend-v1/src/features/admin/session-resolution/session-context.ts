import type { PatientRemedy } from "./types";

export type SessionContextFacts = {
  paymentCoverageType?: string | null;
  fundingSource?: string | null;
  packagePurchaseId?: string | null;
  originalSessionId?: string | null;
};

export function isPackageSession(facts: SessionContextFacts) {
  return facts.paymentCoverageType === "PACKAGE" && Boolean(facts.packagePurchaseId);
}

export function isReplacementSession(facts: SessionContextFacts) {
  return Boolean(facts.originalSessionId) || facts.fundingSource === "ADMIN_REPLACEMENT";
}

export function getAvailablePatientRemedies(facts: SessionContextFacts): PatientRemedy[] {
  return isPackageSession(facts)
    ? ["KEEP_ORIGINAL", "RESTORE_PACKAGE", "CREDIT_WALLET", "CREATE_REPLACEMENT_SESSION"]
    : ["KEEP_ORIGINAL", "CREDIT_WALLET", "CREATE_REPLACEMENT_SESSION"];
}
