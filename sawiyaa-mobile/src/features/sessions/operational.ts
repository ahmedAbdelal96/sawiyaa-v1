/**
 * Client-side accessors for the backend operational contract. Deliberately
 * conservative when an old/cache response lacks the additive field: no action
 * is enabled and no lifecycle state is inferred from legacy fields.
 */
export function operationalState(session: { operational?: { state: string } }): string | null {
  return session.operational?.state ?? null;
}

export function operationalJoinAllowed(session: { operational?: { join: { allowed: boolean } } }): boolean {
  return session.operational?.join.allowed === true;
}

export function operationalCanCancel(session: { operational?: { actions: { canCancel: boolean } } }): boolean {
  return session.operational?.actions.canCancel === true;
}
