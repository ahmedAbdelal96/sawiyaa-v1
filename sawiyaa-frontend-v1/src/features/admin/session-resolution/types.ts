export type ResolutionFinding = "PATIENT_NO_SHOW" | "PRACTITIONER_NO_SHOW" | "BOTH_NO_SHOW" | "SESSION_COMPLETED_AFTER_REVIEW" | "TECHNICAL_ISSUE" | "INSUFFICIENT_EVIDENCE" | "OTHER";
export type ResolutionOutcome = "PATIENT_NO_SHOW" | "PRACTITIONER_NO_SHOW" | "BOTH_NO_SHOW";
export type PatientRemedy = "KEEP_ORIGINAL" | "RESTORE_PACKAGE" | "CREDIT_WALLET" | "CREATE_REPLACEMENT_SESSION";
export type PractitionerRemedy = "NO_EARNING" | "CREATE_EARNING_REVIEW";
export type ResolutionCase = {
  id: string; sessionId: string; status: "OPEN" | "EXECUTED" | "CANCELLED";
  suggestedOutcome: ResolutionOutcome; suggestedPatientRemedy: PatientRemedy;
  suggestedPractitionerRemedy: PractitionerRemedy; evidenceSnapshotJson: unknown;
  session: { id: string; sessionCode: string; status: string; scheduledStartAt: string | null; scheduledEndAt: string | null; durationMinutes: number; patientId: string; practitionerId: string; paymentCoverageType?: "DIRECT_PAYMENT" | "PACKAGE" | string; fundingSource?: string | null; packagePurchaseId?: string | null; packageSessionIndex?: number | null; packageSessionCount?: number | null; originalSessionId?: string | null; patient?: { user?: { displayName?: string | null } }; practitioner?: { user?: { displayName?: string | null } } };
};

export type ResolutionPreview = {
  planHash: string;
  findingCode: ResolutionFinding;
  resultingStatus: string;
  patient: { remedy: PatientRemedy; walletCredit: { amount: string; currency: string; source: string } | null };
  practitioner: { entitlement: PractitionerRemedy; accountingReviewWillBeCreated: boolean };
  replacement: { willCreate: boolean; startAt: string | null };
  warnings: string[];
};
