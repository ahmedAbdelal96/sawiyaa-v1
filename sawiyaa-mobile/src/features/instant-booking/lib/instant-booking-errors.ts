import { isAxiosError } from "axios";

type MaybeErrorPayload = {
  error?: string;
  message?: string | string[];
  data?: {
    message?: string;
  };
};

export function readInstantBookingErrorCode(error: unknown): string {
  if (isAxiosError(error)) {
    const payload = error.response?.data as MaybeErrorPayload | undefined;

    if (typeof payload?.error === "string" && payload.error.trim()) {
      return payload.error.trim();
    }

    if (typeof payload?.data?.message === "string" && payload.data.message.trim()) {
      return payload.data.message.trim();
    }

    if (typeof payload?.message === "string" && payload.message.trim()) {
      return payload.message.trim();
    }

    if (Array.isArray(payload?.message) && payload.message[0]) {
      return String(payload.message[0]);
    }

    if (error.code === "ECONNABORTED") {
      return "REQUEST_TIMEOUT";
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "";
}

const PATIENT_ERROR_KEY_MAP: Record<string, string> = {
  INSTANT_BOOKING_REQUEST_ALREADY_EXISTS: "instantBooking.patient.errors.pendingRequestAlreadyExists",
  INSTANT_BOOKING_PENDING_REQUEST_ALREADY_EXISTS: "instantBooking.patient.errors.pendingRequestAlreadyExists",
  INSTANT_BOOKING_PRACTITIONER_NOT_FOUND: "instantBooking.patient.errors.practitionerNotFound",
  INSTANT_BOOKING_PRACTITIONER_NOT_ONLINE: "instantBooking.patient.errors.practitionerNotOnline",
  INSTANT_BOOKING_PRACTITIONER_NOT_AVAILABLE_NOW: "instantBooking.patient.errors.practitionerNotAvailableNow",
  INSTANT_BOOKING_PRACTITIONER_BUSY: "instantBooking.patient.errors.practitionerBusy",
  INSTANT_BOOKING_PRACTITIONER_NOT_ELIGIBLE: "instantBooking.patient.errors.practitionerNotEligible",
  INSTANT_BOOKING_DISABLED: "instantBooking.patient.errors.instantBookingDisabled",
  INSTANT_BOOKING_INVALID_SESSION_MODE: "instantBooking.patient.errors.invalidSessionMode",
  INSTANT_BOOKING_INVALID_DURATION: "instantBooking.patient.errors.invalidDuration",
};

const PRACTITIONER_ERROR_KEY_MAP: Record<string, string> = {
  INSTANT_BOOKING_REQUEST_NOT_FOUND: "instantBooking.practitioner.errors.requestNotFound",
  INSTANT_BOOKING_REQUEST_ALREADY_ACCEPTED: "instantBooking.practitioner.errors.requestAlreadyAccepted",
  INSTANT_BOOKING_REQUEST_ALREADY_REJECTED: "instantBooking.practitioner.errors.requestAlreadyRejected",
  INSTANT_BOOKING_REQUEST_ALREADY_CANCELLED: "instantBooking.practitioner.errors.requestAlreadyCancelled",
  INSTANT_BOOKING_PENDING_REQUEST_ALREADY_EXISTS: "instantBooking.practitioner.errors.pendingRequestAlreadyExists",
  INSTANT_BOOKING_REQUEST_ALREADY_FINALIZED: "instantBooking.practitioner.errors.requestAlreadyFinalized",
  INSTANT_BOOKING_PRACTITIONER_NOT_FOUND: "instantBooking.practitioner.errors.practitionerNotFound",
  INSTANT_BOOKING_PRACTITIONER_NOT_ONLINE: "instantBooking.practitioner.errors.practitionerNotOnline",
  INSTANT_BOOKING_PRACTITIONER_NOT_AVAILABLE_NOW: "instantBooking.practitioner.errors.practitionerNotAvailableNow",
  INSTANT_BOOKING_PRACTITIONER_BUSY: "instantBooking.practitioner.errors.practitionerBusy",
  INSTANT_BOOKING_PRACTITIONER_NOT_ELIGIBLE: "instantBooking.practitioner.errors.practitionerNotEligible",
  INSTANT_BOOKING_DISABLED: "instantBooking.practitioner.errors.instantBookingDisabled",
  INSTANT_BOOKING_INVALID_SESSION_MODE: "instantBooking.practitioner.errors.invalidSessionMode",
  INSTANT_BOOKING_INVALID_STATUS_TRANSITION: "instantBooking.practitioner.errors.invalidStatusTransition",
};

export function getPatientInstantBookingErrorKey(error: unknown): string {
  const code = readInstantBookingErrorCode(error);

  if (code && PATIENT_ERROR_KEY_MAP[code]) {
    return PATIENT_ERROR_KEY_MAP[code];
  }

  if (code === "REQUEST_TIMEOUT") {
    return "instantBooking.patient.errors.timeout";
  }

  return "instantBooking.patient.errors.generic";
}

export function getPractitionerInstantBookingErrorKey(error: unknown): string {
  const code = readInstantBookingErrorCode(error);

  if (code && PRACTITIONER_ERROR_KEY_MAP[code]) {
    return PRACTITIONER_ERROR_KEY_MAP[code];
  }

  if (code === "REQUEST_TIMEOUT") {
    return "instantBooking.practitioner.errors.timeout";
  }

  return "instantBooking.practitioner.errors.generic";
}
