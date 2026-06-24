import { PresenceStatus, type PractitionerPresence } from '@prisma/client';

export const PRESENCE_LIVENESS_TTL_MS = 2 * 60 * 1000;

type PresenceLivenessSource = Pick<
  PractitionerPresence,
  'status' | 'lastSeenAtUtc'
>;

export function getPresenceFreshnessCutoff(referenceTime = new Date()) {
  return new Date(referenceTime.getTime() - PRESENCE_LIVENESS_TTL_MS);
}

export function isPresenceFresh(
  presence: PresenceLivenessSource | null,
  referenceTime = new Date(),
) {
  if (!presence?.lastSeenAtUtc) {
    return false;
  }

  return presence.lastSeenAtUtc >= getPresenceFreshnessCutoff(referenceTime);
}

export function resolveEffectivePresenceStatus(
  presence: PresenceLivenessSource | null,
  referenceTime = new Date(),
) {
  if (!presence) {
    return PresenceStatus.OFFLINE;
  }

  if (presence.status === PresenceStatus.OFFLINE) {
    return PresenceStatus.OFFLINE;
  }

  return isPresenceFresh(presence, referenceTime)
    ? presence.status
    : PresenceStatus.OFFLINE;
}

export function isPresenceEffectivelyOnline(
  presence: PresenceLivenessSource | null,
  referenceTime = new Date(),
) {
  return (
    resolveEffectivePresenceStatus(presence, referenceTime) ===
    PresenceStatus.ONLINE
  );
}
