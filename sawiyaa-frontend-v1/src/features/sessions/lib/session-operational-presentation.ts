import type { SessionOperationalInterpretation, SessionStatus } from "../types/sessions.types";

/** Presentation-only mapping. It never interprets raw session facts. */
export function operationalStateOf(session: { operational?: SessionOperationalInterpretation; status: SessionStatus }): SessionStatus {
  return session.operational?.state ?? session.status;
}

export function operationalJoinAllowed(session: { operational?: SessionOperationalInterpretation }): boolean {
  return session.operational?.join.allowed === true;
}

export function operationalJoinReason(session: { operational?: SessionOperationalInterpretation }) {
  return session.operational?.join.reasonCode ?? null;
}
