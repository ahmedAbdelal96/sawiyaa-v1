import { toAppError } from "@/lib/api/errors";

const PATIENT_REVIEW_ERROR_KEYS: Record<string, string> = {
  REVIEW_PATIENT_PROFILE_NOT_FOUND: "patient.states.errors.profileNotFound",
  REVIEW_NOT_FOUND: "patient.states.errors.notFound",
  REVIEW_SESSION_NOT_FOUND_FOR_PATIENT: "patient.states.errors.sessionNotFound",
  REVIEW_SESSION_NOT_COMPLETED: "patient.states.errors.sessionNotCompleted",
  REVIEW_SESSION_NOT_PAID: "patient.states.errors.sessionNotPaid",
  REVIEW_ALREADY_EXISTS_FOR_SESSION: "patient.states.errors.alreadyReviewed",
};

export function getPatientReviewErrorKey(error: unknown): string {
  const appError = toAppError(error);

  if (appError.code && PATIENT_REVIEW_ERROR_KEYS[appError.code]) {
    return PATIENT_REVIEW_ERROR_KEYS[appError.code];
  }

  if (appError.statusCode === 404) {
    return "patient.states.errors.notFound";
  }

  return "patient.states.errors.generic";
}
