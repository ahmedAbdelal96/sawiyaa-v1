export type ResolutionOutcome = "PATIENT_NO_SHOW" | "PRACTITIONER_NO_SHOW" | "BOTH_NO_SHOW";
export type PatientRemedy = "KEEP_ORIGINAL" | "RESTORE_PACKAGE" | "CREDIT_WALLET" | "CREATE_REPLACEMENT_SESSION";
export type PractitionerRemedy = "NO_EARNING" | "CREATE_EARNING_REVIEW";
export type ResolutionCase = {
  id: string; sessionId: string; status: "OPEN" | "EXECUTED" | "CANCELLED";
  suggestedOutcome: ResolutionOutcome; suggestedPatientRemedy: PatientRemedy;
  suggestedPractitionerRemedy: PractitionerRemedy; evidenceSnapshotJson: unknown;
  session: { id: string; sessionCode: string; status: string; scheduledStartAt: string | null; scheduledEndAt: string | null; durationMinutes: number; patientId: string; practitionerId: string; patient?: { user?: { displayName?: string | null } }; practitioner?: { user?: { displayName?: string | null } } };
};
