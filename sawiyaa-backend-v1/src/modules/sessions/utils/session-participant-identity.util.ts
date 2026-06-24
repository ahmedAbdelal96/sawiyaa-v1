/**
 * Participant identity mapper for admin evidence responses.
 *
 * Builds a `participants` object with display name, userId, primary email,
 * and primary phone for both the patient and the practitioner on a session.
 *
 * The shape passed in (`SessionWithParticipants`) is intentionally narrow:
 * we never accept a generic `Session` type because we want to ensure the
 * `emails` / `phones` arrays are only read from rows that explicitly opted
 * into loading them. The admin evidence use cases are the only callers.
 */
export type ParticipantContact = {
  userId: string | null;
  displayName: string | null;
  email: string | null;
  phone: string | null;
};

export type SessionWithParticipants = {
  patient: {
    id: string;
    user: {
      id: string;
      displayName: string | null;
      emails: Array<{ email: string; isPrimary: boolean }>;
      phones: Array<{ phone: string; isPrimary: boolean }>;
    };
  } | null;
  practitioner: {
    id: string;
    user: {
      id: string;
      displayName: string | null;
      emails: Array<{ email: string; isPrimary: boolean }>;
      phones: Array<{ phone: string; isPrimary: boolean }>;
    };
  } | null;
};

function pickPrimary<T extends { isPrimary: boolean }>(
  items: T[] | undefined,
  fallbackField: keyof T,
): string | null {
  if (!items || items.length === 0) return null;
  const primary = items.find((item) => item.isPrimary);
  if (primary) {
    return String(primary[fallbackField] ?? '');
  }
  // No `isPrimary=true` row — fall back to the first available entry.
  return String(items[0][fallbackField] ?? '');
}

export function buildParticipantIdentity(
  side: 'patient' | 'practitioner',
  session: SessionWithParticipants,
): ParticipantContact {
  const profile = session[side];
  if (!profile || !profile.user) {
    return {
      userId: null,
      displayName: null,
      email: null,
      phone: null,
    };
  }
  return {
    userId: profile.user.id,
    displayName: profile.user.displayName ?? null,
    email: pickPrimary(profile.user.emails, 'email'),
    phone: pickPrimary(profile.user.phones, 'phone'),
  };
}

export function buildParticipantsSummary(
  session: SessionWithParticipants,
): { patient: ParticipantContact; practitioner: ParticipantContact } {
  return {
    patient: buildParticipantIdentity('patient', session),
    practitioner: buildParticipantIdentity('practitioner', session),
  };
}
