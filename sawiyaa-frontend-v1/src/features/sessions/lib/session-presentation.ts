import type { SessionStatus } from "../types/sessions.types";

const SESSION_CHAT_OPEN_STATUSES: SessionStatus[] = [
  "READY_TO_JOIN",
  "IN_PROGRESS",
  "COMPLETED",
  "PATIENT_NO_SHOW",
  "PRACTITIONER_NO_SHOW",
  "BOTH_NO_SHOW",
];

export function getSessionPresentationKey(
  status: SessionStatus | null | undefined,
): SessionStatus {
  return status ?? "EXPIRED";
}

export function canOpenSessionChatFromPresentationStatus(
  status: SessionStatus | null | undefined,
): boolean {
  return SESSION_CHAT_OPEN_STATUSES.includes(
    getSessionPresentationKey(status),
  );
}

