"use client";

import type {
  UnifiedMessagingLane,
  UnifiedSessionChatStatus,
} from "../types/messages-shell.types";

type SessionReadState = {
  readAt: string;
  sessionStatus: UnifiedSessionChatStatus | null;
};

export type MessagesShellContinuitySnapshot = {
  activeLane: UnifiedMessagingLane;
  selectedSessionId: string | null;
  selectedSupportTicketId: string | null;
  selectedPractitionerRequestId: string | null;
  localSessionReads: Record<string, SessionReadState>;
};

const CONTINUITY_VERSION = 1;

type PersistedPayload = {
  version: number;
  snapshot: MessagesShellContinuitySnapshot;
};

function isUnifiedLane(value: string): value is UnifiedMessagingLane {
  return value === "session" || value === "practitioner" || value === "support";
}

export function buildMessagesShellContinuityStorageKey(role: string) {
  return `fayed:messages-shell:continuity:v${CONTINUITY_VERSION}:${role}`;
}

export function loadMessagesShellContinuitySnapshot(
  storageKey: string,
): MessagesShellContinuitySnapshot | null {
  if (typeof window === "undefined") return null;

  const rawValue = window.localStorage.getItem(storageKey);
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as PersistedPayload;
    if (!parsed || parsed.version !== CONTINUITY_VERSION || !parsed.snapshot) return null;
    if (!isUnifiedLane(parsed.snapshot.activeLane)) return null;

    return {
      activeLane: parsed.snapshot.activeLane,
      selectedSessionId:
        typeof parsed.snapshot.selectedSessionId === "string"
          ? parsed.snapshot.selectedSessionId
          : null,
      selectedSupportTicketId:
        typeof parsed.snapshot.selectedSupportTicketId === "string"
          ? parsed.snapshot.selectedSupportTicketId
          : null,
      selectedPractitionerRequestId:
        typeof parsed.snapshot.selectedPractitionerRequestId === "string"
          ? parsed.snapshot.selectedPractitionerRequestId
          : null,
      localSessionReads:
        parsed.snapshot.localSessionReads && typeof parsed.snapshot.localSessionReads === "object"
          ? parsed.snapshot.localSessionReads
          : {},
    };
  } catch {
    return null;
  }
}

export function saveMessagesShellContinuitySnapshot(
  storageKey: string,
  snapshot: MessagesShellContinuitySnapshot,
) {
  if (typeof window === "undefined") return;

  const payload: PersistedPayload = {
    version: CONTINUITY_VERSION,
    snapshot,
  };

  window.localStorage.setItem(storageKey, JSON.stringify(payload));
}
