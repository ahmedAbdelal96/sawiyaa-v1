import { toAppError } from "@/lib/api/errors";

const ERROR_KEY_MAP: Record<string, string> = {
  INSTANT_BOOKING_REQUEST_NOT_FOUND: "errors.requestNotFound",
  INSTANT_BOOKING_REQUEST_ALREADY_ACCEPTED: "errors.requestAlreadyAccepted",
  INSTANT_BOOKING_REQUEST_ALREADY_REJECTED: "errors.requestAlreadyRejected",
  INSTANT_BOOKING_REQUEST_ALREADY_CANCELLED: "errors.requestAlreadyCancelled",
  INSTANT_BOOKING_PENDING_REQUEST_ALREADY_EXISTS: "errors.pendingRequestAlreadyExists",
  INSTANT_BOOKING_REQUEST_ALREADY_FINALIZED: "errors.requestAlreadyFinalized",
  INSTANT_BOOKING_PRACTITIONER_NOT_FOUND: "errors.practitionerNotFound",
  INSTANT_BOOKING_PRACTITIONER_NOT_ONLINE: "errors.practitionerNotOnline",
  INSTANT_BOOKING_PRACTITIONER_NOT_AVAILABLE_NOW: "errors.practitionerNotAvailableNow",
  INSTANT_BOOKING_PRACTITIONER_BUSY: "errors.practitionerBusy",
  INSTANT_BOOKING_PRACTITIONER_NOT_ELIGIBLE: "errors.practitionerNotEligible",
  INSTANT_BOOKING_DISABLED: "errors.instantBookingDisabled",
  INSTANT_BOOKING_INVALID_SESSION_MODE: "errors.invalidSessionMode",
  INSTANT_BOOKING_INVALID_STATUS_TRANSITION: "errors.invalidStatusTransition",
};

export function getPractitionerInstantBookingErrorKey(error: unknown): string {
  const appError = toAppError(error);

  if (appError.code && ERROR_KEY_MAP[appError.code]) {
    return ERROR_KEY_MAP[appError.code];
  }

  switch (appError.statusCode) {
    case 401:
      return "errors.unauthorized";
    case 403:
      return "errors.forbidden";
    case 404:
      return "errors.requestNotFound";
    case 409:
      return "errors.conflict";
    default:
      return "errors.generic";
  }
}
