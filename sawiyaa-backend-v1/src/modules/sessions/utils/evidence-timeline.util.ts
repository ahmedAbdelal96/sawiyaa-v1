/**
 * Evidence timeline mapper for admin attendance responses.
 *
 * Phase 3 — takes the persisted `SessionAttendanceEvent` rows and
 * `SessionEvent` rows for a session, normalizes them, sanitizes the
 * metadata, and produces:
 *   - a `platformTimeline` (platform events only)
 *   - an `evidenceTimeline` (combined attendance + platform, sorted
 *     chronologically with a deterministic tiebreak)
 *
 * The mapper is pure: it accepts plain JS objects and returns plain JS
 * objects, so it can be unit-tested in isolation from the database and
 * the NestJS container.
 */
import { sanitizeSafeMetadata } from './safe-metadata.util';

// ------------------------------------------------------------------
// Public types
// ------------------------------------------------------------------

export type EvidenceActorRole =
  | 'PATIENT'
  | 'PRACTITIONER'
  | 'ADMIN'
  | 'SYSTEM'
  | 'UNKNOWN';

export type EvidenceSource = 'PLATFORM' | 'DAILY_WEBHOOK' | 'SYSTEM';

export type EvidenceSeverity =
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR'
  | 'NEUTRAL';

export type EvidenceKind = 'ATTENDANCE' | 'PLATFORM';

export type SafeMetadata = Record<
  string,
  string | number | boolean | null
>;

// ------------------------------------------------------------------
// Inputs (narrow shapes — the caller is responsible for ensuring the
// rows actually have these fields; we keep the input minimal so the
// mapper is easy to unit-test with hand-built fixtures).
// ------------------------------------------------------------------

export type AttendanceInputItem = {
  id: string;
  sessionId: string;
  attendanceEventType: 'JOINED' | 'LEFT';
  participantRole: 'PATIENT' | 'PRACTITIONER' | 'UNKNOWN';
  participantUserId: string | null;
  provider: string;
  providerEventType: string;
  providerEventRef: string | null;
  providerRoomRef: string | null;
  providerParticipantRef: string | null;
  occurredAt: Date;
  ingestedAt: Date;
};

export type PlatformInputItem = {
  id: string;
  sessionId: string;
  eventType: string;
  actorUserId: string | null;
  metadataJson: Record<string, unknown> | null;
  createdAt: Date;
};

export type EvidenceTimelineItem = {
  id: string;
  sessionId: string;
  kind: EvidenceKind;
  eventType: string;
  actorRole: EvidenceActorRole;
  actorUserId: string | null;
  actorDisplayName: string | null;
  occurredAt: string;
  recordedAt: string;
  source: EvidenceSource;
  severity: EvidenceSeverity;
  titleKey: string;
  safeMetadataSummary: SafeMetadata;
};

export type PlatformTimelineItem = EvidenceTimelineItem & {
  kind: 'PLATFORM';
};

// ------------------------------------------------------------------
// Event classification tables
// ------------------------------------------------------------------

/**
 * Stable priority for tiebreaks when two events have the same `occurredAt`.
 * Lower = earlier in the merged timeline.
 * Covers every SessionEventType value from the Prisma schema.
 */
const EVENT_TYPE_PRIORITY: Record<string, number> = {
  // Platform join flow (10–39)
  JOIN_ATTEMPTED: 10,
  JOIN_ALLOWED: 20,
  JOIN_BLOCKED: 20,
  JOIN_TOKEN_ISSUED: 30,
  JOIN_TOKEN_FAILED: 30,
  // Meeting lifecycle (40–49)
  MEETING_STARTED: 40,
  MEETING_ENDED: 70, // kept at 70 — final event
  // Attendance (50–69)
  JOINED: 50,
  LEFT: 60,
  // Session lifecycle (80–99)
  SESSION_CREATED: 80,
  PAYMENT_PENDING: 81,
  PAYMENT_CONFIRMED: 82,
  PRACTITIONER_ACCEPTED: 83,
  PRACTITIONER_REJECTED: 83,
  SESSION_CONFIRMED: 84,
  SESSION_READY_TO_JOIN: 85,
  PATIENT_JOINED: 86,
  PRACTITIONER_JOINED: 86,
  SESSION_STARTED: 87,
  SESSION_COMPLETED: 88,
  CANCELLED_BY_PATIENT: 89,
  CANCELLED_BY_PRACTITIONER: 89,
  EXPIRED_UNPAID: 89,
  NO_SHOW_PATIENT: 89,
  NO_SHOW_PRACTITIONER: 89,
  // Provider room (90–99)
  PROVIDER_ROOM_CREATED: 90,
  PROVIDER_ROOM_ENDED: 91,
};

const DEFAULT_EVENT_TYPE_PRIORITY = 100;

const SEVERITY_BY_EVENT_TYPE: Record<string, EvidenceSeverity> = {
  // Join flow
  JOIN_ATTEMPTED: 'INFO',
  JOIN_ALLOWED: 'SUCCESS',
  JOIN_BLOCKED: 'WARNING',
  JOIN_TOKEN_ISSUED: 'INFO',
  JOIN_TOKEN_FAILED: 'ERROR',
  // Meeting lifecycle
  MEETING_STARTED: 'SUCCESS',
  MEETING_ENDED: 'NEUTRAL',
  // Attendance
  JOINED: 'SUCCESS',
  LEFT: 'NEUTRAL',
  // Session lifecycle — INFO by default
  SESSION_CREATED: 'INFO',
  PAYMENT_PENDING: 'INFO',
  PAYMENT_CONFIRMED: 'SUCCESS',
  PRACTITIONER_ACCEPTED: 'SUCCESS',
  PRACTITIONER_REJECTED: 'WARNING',
  SESSION_CONFIRMED: 'INFO',
  SESSION_READY_TO_JOIN: 'INFO',
  PATIENT_JOINED: 'SUCCESS',
  PRACTITIONER_JOINED: 'SUCCESS',
  SESSION_STARTED: 'SUCCESS',
  SESSION_COMPLETED: 'SUCCESS',
  CANCELLED_BY_PATIENT: 'WARNING',
  CANCELLED_BY_PRACTITIONER: 'WARNING',
  EXPIRED_UNPAID: 'WARNING',
  NO_SHOW_PATIENT: 'WARNING',
  NO_SHOW_PRACTITIONER: 'WARNING',
  // Provider room
  PROVIDER_ROOM_CREATED: 'INFO',
  PROVIDER_ROOM_ENDED: 'NEUTRAL',
};

/**
 * Title key used by the frontend to look up the localized label.
 * Mirrors `messages/{en,ar}/admin-session-runtime.json` keys under
 * `inspector.evidenceTimeline.eventTypes.*`.
 *
 * Unknown event types map to `UNKNOWN_PLATFORM_EVENT` so the frontend
 * always has a safe i18n key to display — never a raw enum value.
 */
const TITLE_KEY_BY_EVENT_TYPE: Record<string, string> = {
  // Join flow
  JOIN_ATTEMPTED: 'JOIN_ATTEMPTED',
  JOIN_ALLOWED: 'JOIN_ALLOWED',
  JOIN_BLOCKED: 'JOIN_BLOCKED',
  JOIN_TOKEN_ISSUED: 'JOIN_TOKEN_ISSUED',
  JOIN_TOKEN_FAILED: 'JOIN_TOKEN_FAILED',
  // Meeting lifecycle
  MEETING_STARTED: 'MEETING_STARTED',
  MEETING_ENDED: 'MEETING_ENDED',
  // Attendance (from Daily webhooks)
  JOINED: 'ATTENDANCE_JOINED',
  LEFT: 'ATTENDANCE_LEFT',
  // Session lifecycle
  SESSION_CREATED: 'SESSION_CREATED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PRACTITIONER_ACCEPTED: 'PRACTITIONER_ACCEPTED',
  PRACTITIONER_REJECTED: 'PRACTITIONER_REJECTED',
  SESSION_CONFIRMED: 'SESSION_CONFIRMED',
  SESSION_READY_TO_JOIN: 'SESSION_READY_TO_JOIN',
  PATIENT_JOINED: 'PATIENT_JOINED',
  PRACTITIONER_JOINED: 'PRACTITIONER_JOINED',
  SESSION_STARTED: 'SESSION_STARTED',
  SESSION_COMPLETED: 'SESSION_COMPLETED',
  CANCELLED_BY_PATIENT: 'CANCELLED_BY_PATIENT',
  CANCELLED_BY_PRACTITIONER: 'CANCELLED_BY_PRACTITIONER',
  EXPIRED_UNPAID: 'EXPIRED_UNPAID',
  NO_SHOW_PATIENT: 'NO_SHOW_PATIENT',
  NO_SHOW_PRACTITIONER: 'NO_SHOW_PRACTITIONER',
  // Provider room
  PROVIDER_ROOM_CREATED: 'PROVIDER_ROOM_CREATED',
  PROVIDER_ROOM_ENDED: 'PROVIDER_ROOM_ENDED',
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/**
 * Reads the `occurredAt` field from a `SessionEvent` metadataJson blob if
 * present and parseable; otherwise returns null. Daily webhooks can
 * sometimes emit a string timestamp inside the JSON body, so we accept
 * either an ISO string or a Date-compatible value.
 */
function readMetadataOccurredAt(
  metadata: Record<string, unknown> | null,
): Date | null {
  if (!metadata) return null;
  const raw = metadata.occurredAt;
  if (typeof raw === 'string') {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
  return null;
}

function pickSource(
  eventType: string,
  metadata: Record<string, unknown> | null,
): EvidenceSource {
  if (eventType === 'MEETING_STARTED' || eventType === 'MEETING_ENDED') {
    if (metadata && metadata.source === 'daily-webhook') {
      return 'DAILY_WEBHOOK';
    }
    return 'SYSTEM';
  }
  // JOIN_* events are emitted by the resolve-session-join-contract use case.
  return 'PLATFORM';
}

function pickActorRole(
  eventType: string,
  actorUserId: string | null,
  participantRole: 'PATIENT' | 'PRACTITIONER' | 'UNKNOWN' | undefined,
  session: {
    patientUserId: string | null;
    practitionerUserId: string | null;
  },
): EvidenceActorRole {
  // 1. Attendance rows carry a per-event participant role — trust it first.
  if (participantRole === 'PATIENT') return 'PATIENT';
  if (participantRole === 'PRACTITIONER') return 'PRACTITIONER';

  // 2. System-emitted meeting events with no actor are SYSTEM.
  if (
    (eventType === 'MEETING_STARTED' || eventType === 'MEETING_ENDED') &&
    !actorUserId
  ) {
    return 'SYSTEM';
  }

  // 3. If we know who the actor is, match against the session's
  //    patient/practitioner ids.
  if (actorUserId) {
    if (session.patientUserId && actorUserId === session.patientUserId) {
      return 'PATIENT';
    }
    if (
      session.practitionerUserId &&
      actorUserId === session.practitionerUserId
    ) {
      return 'PRACTITIONER';
    }
    return 'UNKNOWN';
  }

  return 'UNKNOWN';
}

function pickSeverity(eventType: string): EvidenceSeverity {
  return SEVERITY_BY_EVENT_TYPE[eventType] ?? 'NEUTRAL';
}

/**
 * Maps a raw SessionEventType to a safe i18n titleKey.
 * Unknown/future event types fall back to `UNKNOWN_PLATFORM_EVENT`
 * so the frontend never displays a raw enum value as a user-visible label.
 */
function pickTitleKey(eventType: string): string {
  return TITLE_KEY_BY_EVENT_TYPE[eventType] ?? 'UNKNOWN_PLATFORM_EVENT';
}

function eventTypePriority(eventType: string): number {
  return EVENT_TYPE_PRIORITY[eventType] ?? DEFAULT_EVENT_TYPE_PRIORITY;
}

function toIsoOrNull(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

function toIso(value: Date): string {
  return value.toISOString();
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

/**
 * Builds a sanitized `platformTimeline` from the raw `SessionEvent` rows.
 * The output is sorted ascending by `occurredAt` (or `createdAt` if the
 * metadata does not provide an `occurredAt`).
 */
export function buildPlatformTimeline(input: {
  platformEvents: PlatformInputItem[];
  session: { patientUserId: string | null; practitionerUserId: string | null };
  resolveActorDisplayName: (userId: string | null) => string | null;
}): PlatformTimelineItem[] {
  return input.platformEvents
    .map<PlatformTimelineItem>((row) => {
      const metadata = (row.metadataJson ?? null) as Record<
        string,
        unknown
      > | null;
      const occurredAt =
        readMetadataOccurredAt(metadata) ?? row.createdAt;
      const actorRole = pickActorRole(
        row.eventType,
        row.actorUserId,
        undefined,
        input.session,
      );
      return {
        id: row.id,
        sessionId: row.sessionId,
        kind: 'PLATFORM',
        eventType: row.eventType,
        actorRole,
        actorUserId: row.actorUserId,
        actorDisplayName: input.resolveActorDisplayName(row.actorUserId),
        occurredAt: toIso(occurredAt),
        recordedAt: toIso(row.createdAt),
        source: pickSource(row.eventType, metadata),
        severity: pickSeverity(row.eventType),
        titleKey: pickTitleKey(row.eventType),
        safeMetadataSummary: sanitizeSafeMetadata(metadata ?? {}),
      };
    })
    .sort((a, b) => {
      const aTime = new Date(a.occurredAt).getTime();
      const bTime = new Date(b.occurredAt).getTime();
      if (aTime !== bTime) return aTime - bTime;
      const aPri = eventTypePriority(a.eventType);
      const bPri = eventTypePriority(b.eventType);
      if (aPri !== bPri) return aPri - bPri;
      // Final deterministic tiebreak: id.
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });
}

/**
 * Builds a sanitized attendance timeline item (kind = 'ATTENDANCE').
 */
function buildAttendanceTimelineItem(
  row: AttendanceInputItem,
  session: { patientUserId: string | null; practitionerUserId: string | null },
  resolveActorDisplayName: (userId: string | null) => string | null,
): EvidenceTimelineItem {
  const actorRole = pickActorRole(
    row.attendanceEventType,
    row.participantUserId,
    row.participantRole,
    session,
  );
  return {
    id: row.id,
    sessionId: row.sessionId,
    kind: 'ATTENDANCE',
    eventType: row.attendanceEventType,
    actorRole,
    actorUserId: row.participantUserId,
    actorDisplayName: resolveActorDisplayName(row.participantUserId),
    occurredAt: toIso(row.occurredAt),
    recordedAt: toIso(row.ingestedAt),
    source: 'DAILY_WEBHOOK',
    severity: pickSeverity(row.attendanceEventType),
    titleKey: pickTitleKey(row.attendanceEventType),
    safeMetadataSummary: sanitizeSafeMetadata({
      provider: row.provider,
      providerEventType: row.providerEventType,
      providerEventRef: row.providerEventRef,
      providerRoomRef: row.providerRoomRef,
      providerParticipantRef: row.providerParticipantRef,
    }),
  };
}

/**
 * Merges attendance and platform events into a single chronologically
 * sorted `evidenceTimeline`. The platform and attendance inputs are
 * assumed to be already sorted internally; this function does the final
 * merge and the stable tiebreak.
 */
export function buildEvidenceTimeline(input: {
  attendanceEvents: AttendanceInputItem[];
  platformEvents: PlatformInputItem[];
  session: { patientUserId: string | null; practitionerUserId: string | null };
  resolveActorDisplayName: (userId: string | null) => string | null;
}): EvidenceTimelineItem[] {
  const attendanceItems = input.attendanceEvents.map((row) =>
    buildAttendanceTimelineItem(
      row,
      input.session,
      input.resolveActorDisplayName,
    ),
  );
  const platformItems = buildPlatformTimeline({
    platformEvents: input.platformEvents,
    session: input.session,
    resolveActorDisplayName: input.resolveActorDisplayName,
  });
  const merged: EvidenceTimelineItem[] = [
    ...attendanceItems,
    ...platformItems,
  ];
  return merged.sort((a, b) => {
    const aTime = new Date(a.occurredAt).getTime();
    const bTime = new Date(b.occurredAt).getTime();
    if (aTime !== bTime) return aTime - bTime;
    const aPri = eventTypePriority(a.eventType);
    const bPri = eventTypePriority(b.eventType);
    if (aPri !== bPri) return aPri - bPri;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
}
