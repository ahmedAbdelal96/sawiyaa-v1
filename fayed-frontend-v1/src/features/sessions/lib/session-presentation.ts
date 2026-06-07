import type { SessionPresentationStatus } from "../types/sessions.types";

const SESSION_CHAT_OPEN_PRESENTATION_STATUSES: SessionPresentationStatus[] = [
  "JOINABLE",
  "IN_PROGRESS",
  "COMPLETED",
  "ENDED",
];

export function getSessionPresentationKey(
  presentationStatus: SessionPresentationStatus | null | undefined,
): SessionPresentationStatus {
  return presentationStatus ?? "UNAVAILABLE";
}

export function canOpenSessionChatFromPresentationStatus(
  presentationStatus: SessionPresentationStatus | null | undefined,
): boolean {
  return SESSION_CHAT_OPEN_PRESENTATION_STATUSES.includes(
    getSessionPresentationKey(presentationStatus),
  );
}

