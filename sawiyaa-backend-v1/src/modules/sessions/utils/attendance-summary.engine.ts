/**
 * Attendance Summary Engine
 *
 * A deterministic pure function that reads raw session evidence and produces
 * a structured attendance summary with recommendation flags.
 *
 * Design principles:
 * - Pure calculation: no database access, no side effects
 * - Handles duplicates, out-of-order events, and missing events safely
 * - UNKNOWN participant events are counted but excluded from overlap
 * - Recommendations are advisory flags only — no automatic business decisions
 * - Deterministic: same input always produces same output (pass `now` for time-gated decisions)
 * - No `Date.now()` or `new Date()` called inside the engine for calculations
 * - Open intervals without a safe close boundary are flagged and not trusted for completion
 *
 * Key behaviors:
 * - Duplicate JOINED (JOINED while already joined) is NOT a reconnect — it is ignored
 *   as a duplicate-like event and does not create a new interval.
 * - Reconnect = JOINED → LEFT → JOINED (real leave before rejoin).
 * - joinCount = number of real intervals (duplicates excluded).
 * - reconnectCount = intervals beyond the first (real reconnects only).
 * - Platform events are mapped to roles via explicit user IDs, not inference.
 * - Meeting bounds prefer provider occurredAt over backend createdAt.
 * - No-show recommendations are time-gated — threshold must have passed.
 * - Meaningful overlap requires BOTH percent >= threshold AND minutes >= threshold.
 * - Open intervals without a safe close boundary (meetingEndedAt / scheduledEndAt / input.now)
 *   do NOT contribute to overlap and force MANUAL_REVIEW_REQUIRED.
 * - The engine is deterministic: no runtime clock calls, all time from input.
 */

import { SessionAttendanceEventType, SessionAttendanceParticipantRole } from '@prisma/client';
import { ATTENDANCE_SUMMARY_THRESHOLDS } from '../config/attendance-summary.config';
import type {
  AttendanceEvent,
  AttendanceSummaryInput,
  EvidenceFlags,
  MeetingBounds,
  OverlapSummary,
  PlatformEvent,
  PresenceInterval,
  RecommendedOutcome,
  Recommendation,
  RoleAttendanceSummary,
  SessionAttendanceSummary,
  SessionTimingContext,
} from '../types/attendance-summary.types';

// =============================================================================
// Public entry point
// =============================================================================

export function summarizeSessionAttendance(
  input: AttendanceSummaryInput,
): SessionAttendanceSummary {
  const {
    timing,
    attendanceEvents,
    platformEvents,
    patientUserId,
    practitionerUserId,
    now,
  } = input;

  // effectiveNow is the explicit "now" reference for time-gated decisions.
  // It is NEVER derived from the system clock inside this engine.
  const effectiveNow = now ?? null;

  const scheduledDurationSeconds = computeScheduledDurationSeconds(timing);
  const patientEvents = filterByRole(attendanceEvents, SessionAttendanceParticipantRole.PATIENT);
  const practitionerEvents = filterByRole(attendanceEvents, SessionAttendanceParticipantRole.PRACTITIONER);
  const unknownEvents = filterByRole(attendanceEvents, SessionAttendanceParticipantRole.UNKNOWN);

  // Platform event analysis
  const platformJoinAttempts = platformEvents.filter(
    (e) => e.eventType === 'JOIN_ATTEMPTED',
  );
  const joinBlockedEvents = platformEvents.filter(
    (e) => e.eventType === 'JOIN_BLOCKED',
  );
  const tokenIssuedEvents = platformEvents.filter(
    (e) => e.eventType === 'JOIN_TOKEN_ISSUED',
  );
  const meetingStartedEvents = platformEvents.filter(
    (e) => e.eventType === 'MEETING_STARTED',
  );
  const meetingEndedEvents = platformEvents.filter(
    (e) => e.eventType === 'MEETING_ENDED',
  );

  // Meeting bounds — prefer provider occurredAt, fallback to createdAt
  const meetingBounds = computeMeetingBounds(
    timing,
    attendanceEvents,
    meetingStartedEvents,
    meetingEndedEvents,
  );

  // Close boundary priority for open intervals:
  // 1. meetingEndedAt  2. scheduledEndAt  3. effectiveNow (if explicitly provided)  4. null (leave open)
  const closeBoundary: Date | null =
    meetingBounds.meetingEndedAt ??
    timing.scheduledEndAt ??
    effectiveNow ??
    null;

  // Build presence intervals per role (duplicate JOINEDs are excluded)
  const {
    intervals: patientIntervals,
    duplicateLikeCount: patientDuplicateLikeCount,
    hasOpenIntervalWithoutCloseBoundary: patientHasOpenWithoutClose,
    missingJoinEventCount: patientMissingJoinCount,
    missingLeaveEventCount: patientMissingLeaveCount,
  } = buildPresenceIntervals(patientEvents, closeBoundary, effectiveNow);
  const {
    intervals: practitionerIntervals,
    duplicateLikeCount: practitionerDuplicateLikeCount,
    hasOpenIntervalWithoutCloseBoundary: practitionerHasOpenWithoutClose,
    missingJoinEventCount: practitionerMissingJoinCount,
    missingLeaveEventCount: practitionerMissingLeaveCount,
  } = buildPresenceIntervals(practitionerEvents, closeBoundary, effectiveNow);

  // Per-role summaries
  const patient = buildRoleSummary(
    patientIntervals,
    patientEvents,
    platformJoinAttempts,
    joinBlockedEvents,
    tokenIssuedEvents,
    timing,
    SessionAttendanceParticipantRole.PATIENT,
    patientUserId,
    patientDuplicateLikeCount,
    effectiveNow,
  );
  const practitioner = buildRoleSummary(
    practitionerIntervals,
    practitionerEvents,
    platformJoinAttempts,
    joinBlockedEvents,
    tokenIssuedEvents,
    timing,
    SessionAttendanceParticipantRole.PRACTITIONER,
    practitionerUserId,
    practitionerDuplicateLikeCount,
    effectiveNow,
  );

  // Overlap — never produces Infinity or NaN; open intervals without close boundary are excluded
  const hasOpenWithoutClose =
    patientHasOpenWithoutClose || practitionerHasOpenWithoutClose;
  const overlap = computeOverlap(
    patientIntervals,
    practitionerIntervals,
    scheduledDurationSeconds,
    hasOpenWithoutClose,
  );

  // Evidence flags — use interval diagnostics, not raw event counts
  const evidence = buildEvidenceFlags(
    attendanceEvents,
    patientEvents,
    practitionerEvents,
    unknownEvents,
    platformJoinAttempts,
    patientIntervals,
    practitionerIntervals,
    patientDuplicateLikeCount,
    practitionerDuplicateLikeCount,
    patientHasOpenWithoutClose,
    practitionerHasOpenWithoutClose,
    patientMissingJoinCount,
    patientMissingLeaveCount,
    practitionerMissingJoinCount,
    practitionerMissingLeaveCount,
    timing,
    effectiveNow,
  );

  // Recommendation
  const recommendation = buildRecommendation(
    patient,
    practitioner,
    overlap,
    evidence,
    timing,
    effectiveNow,
  );

  return {
    session: {
      scheduledStartAt: timing.scheduledStartAt,
      scheduledEndAt: timing.scheduledEndAt,
      durationMinutes: timing.durationMinutes,
      joinWindowOpenedAt: timing.joinWindowOpenedAt,
      joinWindowClosedAt: timing.joinWindowClosedAt,
    },
    patient,
    practitioner,
    meeting: meetingBounds,
    overlap,
    evidence,
    recommendation,
  };
}

// =============================================================================
// Interval building
//
// Key rules:
// - Events sorted by occurredAt before processing.
// - JOINED while already joined → IGNORED (duplicate-like, no new interval).
// - LEFT while not joined → counted as missingJoinEvent (no negative interval).
// - JOINED → LEFT → JOINED = real reconnect (two intervals).
// - Open interval (JOINED with no following LEFT) closed at closeBoundary if available.
//   If no closeBoundary: leftAt = null, durationSeconds = 0, hasOpenIntervalWithoutCloseBoundary = true.
// - effectiveNow is used ONLY as the close boundary when no meetingEndedAt/scheduledEndAt is available.
// =============================================================================

interface IntervalBuildResult {
  intervals: PresenceInterval[];
  duplicateLikeCount: number;
  /** True if there is an open interval (leftAt = null) and no close boundary was applied */
  hasOpenIntervalWithoutCloseBoundary: boolean;
  /** Count of LEFT events that arrived without a preceding real JOINED */
  missingJoinEventCount: number;
  /** Count of real JOINED events that have no following LEFT and no close boundary was applied */
  missingLeaveEventCount: number;
}

function buildPresenceIntervals(
  events: AttendanceEvent[],
  closeBoundary: Date | null,
  effectiveNow: Date | null,
): IntervalBuildResult {
  const sorted = [...events].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
  );

  const intervals: PresenceInterval[] = [];
  let currentlyJoined = false;
  let currentJoinAt: Date | null = null;
  let duplicateLikeCount = 0;
  let missingJoinEventCount = 0;
  let missingLeaveEventCount = 0;
  let hasOpenIntervalWithoutCloseBoundary = false;

  for (const event of sorted) {
    if (event.attendanceEventType === SessionAttendanceEventType.JOINED) {
      if (!currentlyJoined) {
        // New real join — open interval
        currentJoinAt = event.occurredAt;
        currentlyJoined = true;
      } else {
        // JOINED while already joined — duplicate-like, ignore
        duplicateLikeCount++;
      }
    } else if (event.attendanceEventType === SessionAttendanceEventType.LEFT) {
      if (currentlyJoined && currentJoinAt) {
        // Real leave — close interval
        intervals.push({
          joinedAt: currentJoinAt,
          leftAt: event.occurredAt,
          durationSeconds: Math.floor(
            (event.occurredAt.getTime() - currentJoinAt.getTime()) / 1000,
          ),
        });
        currentJoinAt = null;
        currentlyJoined = false;
      } else {
        // LEFT while not joined — missing join event
        missingJoinEventCount++;
      }
    }
  }

  // Handle open interval
  if (currentlyJoined && currentJoinAt) {
    if (closeBoundary) {
      // Safely closed by meetingEndedAt / scheduledEndAt / effectiveNow
      intervals.push({
        joinedAt: currentJoinAt,
        leftAt: closeBoundary,
        durationSeconds: Math.floor(
          (closeBoundary.getTime() - currentJoinAt.getTime()) / 1000,
        ),
      });
    } else {
      // No close boundary available — leave open and flag it
      intervals.push({
        joinedAt: currentJoinAt,
        leftAt: null,
        durationSeconds: 0, // Cannot compute without a close boundary
      });
      missingLeaveEventCount++;
      hasOpenIntervalWithoutCloseBoundary = true;
    }
  }

  return {
    intervals,
    duplicateLikeCount,
    hasOpenIntervalWithoutCloseBoundary,
    missingJoinEventCount,
    missingLeaveEventCount,
  };
}

// =============================================================================
// Overlap calculation
//
// Meaningful overlap requires BOTH:
//   overlapPercent >= MIN_OVERLAP_FOR_COMPLETION_PERCENT
//   overlapMinutes >= MIN_OVERLAP_FOR_COMPLETION_MINUTES
//
// If scheduled duration is missing, use minutes-only but flag LOWER_CONFIDENCE.
// Open intervals without a safe close boundary do NOT contribute to overlap
// (their leftAt is null and no close boundary was applied) and cause
// hasUnreliableOverlap to be set, forcing MANUAL_REVIEW_REQUIRED for completion.
// =============================================================================

function computeOverlap(
  patientIntervals: PresenceInterval[],
  practitionerIntervals: PresenceInterval[],
  scheduledDurationSeconds: number | null,
  hasOpenWithoutClose: boolean,
): OverlapSummary {
  let overlapMs = 0;
  let firstOverlapAt: Date | null = null;
  let lastOverlapAt: Date | null = null;

  for (const pInterval of patientIntervals) {
    for (const prInterval of practitionerIntervals) {
      // Skip pairs where either interval is open without a close boundary.
      // leftAt = null AND no close boundary was applied → unreliable.
      if (pInterval.leftAt === null || prInterval.leftAt === null) {
        continue;
      }

      const overlapStart = Math.max(
        pInterval.joinedAt.getTime(),
        prInterval.joinedAt.getTime(),
      );
      const pLeft = pInterval.leftAt.getTime();
      const prLeft = prInterval.leftAt.getTime();
      const overlapEnd = Math.min(pLeft, prLeft);

      if (overlapStart < overlapEnd) {
        overlapMs += overlapEnd - overlapStart;
        if (!firstOverlapAt || overlapStart < firstOverlapAt.getTime()) {
          firstOverlapAt = new Date(overlapStart);
        }
        if (!lastOverlapAt || overlapEnd > lastOverlapAt.getTime()) {
          lastOverlapAt = new Date(overlapEnd);
        }
      }
    }
  }

  // If any open interval without close boundary exists, overlap may be incomplete
  const confidenceFlags: string[] = [];
  if (hasOpenWithoutClose) {
    confidenceFlags.push('UNRELIABLE_OVERLAP_OPEN_INTERVAL');
  }

  const overlapSeconds = Math.floor(overlapMs / 1000);
  const overlapMinutes = Math.floor(overlapSeconds / 60);
  const overlapPercent =
    scheduledDurationSeconds != null && scheduledDurationSeconds > 0
      ? Math.round((overlapSeconds / scheduledDurationSeconds) * 100 * 100) / 100
      : null;

  const hasDuration = scheduledDurationSeconds != null && scheduledDurationSeconds > 0;

  let hasMeaningfulOverlap = false;
  if (hasDuration) {
    // Both percent AND minutes must pass
    const percentPass =
      overlapPercent != null &&
      overlapPercent >= ATTENDANCE_SUMMARY_THRESHOLDS.MIN_OVERLAP_FOR_COMPLETION_PERCENT;
    const minutesPass =
      overlapMinutes >= ATTENDANCE_SUMMARY_THRESHOLDS.MIN_OVERLAP_FOR_COMPLETION_MINUTES;
    hasMeaningfulOverlap = percentPass && minutesPass;
  } else {
    // No scheduled duration — use minutes-only with lower confidence flag
    hasMeaningfulOverlap =
      overlapMinutes >= ATTENDANCE_SUMMARY_THRESHOLDS.MIN_OVERLAP_FOR_COMPLETION_MINUTES;
    if (hasMeaningfulOverlap) {
      confidenceFlags.push('LOW_CONFIDENCE_DURATION_MISSING');
    }
  }

  return {
    overlapSeconds,
    overlapMinutes,
    overlapPercentOfScheduledDuration: overlapPercent,
    firstOverlapAt,
    lastOverlapAt,
    hasMeaningfulOverlap,
    confidenceFlags,
  };
}

// =============================================================================
// Meeting bounds
//
// Prefer provider metadataJson.occurredAt over backend createdAt.
// If occurredAt is missing/invalid, fallback to createdAt but downgrade confidence.
// If no meeting events but participant events exist, sourceConfidence = MEDIUM.
// =============================================================================

function computeMeetingBounds(
  timing: SessionTimingContext,
  attendanceEvents: AttendanceEvent[],
  meetingStartedEvents: PlatformEvent[],
  meetingEndedEvents: PlatformEvent[],
): MeetingBounds {
  // Extract provider occurredAt from metadata, with validation
  const extractProviderOccurredAt = (event: PlatformEvent): Date | null => {
    const meta = event.metadataJson as Record<string, unknown> | null;
    if (!meta) return null;
    const raw = meta.occurredAt;
    if (typeof raw === 'string' || raw instanceof Date) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  const startedWithOccurredAt = meetingStartedEvents
    .map((e) => ({ event: e, occurredAt: extractProviderOccurredAt(e) }))
    .find((x) => x.occurredAt != null);
  const endedWithOccurredAt = meetingEndedEvents
    .map((e) => ({ event: e, occurredAt: extractProviderOccurredAt(e) }))
    .find((x) => x.occurredAt != null);

  // meetingStartedAt: prefer occurredAt, fallback to createdAt
  const meetingStartedAt: Date | null =
    startedWithOccurredAt?.occurredAt ??
    (meetingStartedEvents.length > 0 ? meetingStartedEvents[0].createdAt : null);
  // meetingEndedAt: prefer occurredAt, fallback to createdAt
  const meetingEndedAt: Date | null =
    endedWithOccurredAt?.occurredAt ??
    (meetingEndedEvents.length > 0 ? meetingEndedEvents[0].createdAt : null);

  // Determine confidence
  let sourceConfidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (meetingStartedAt && meetingEndedAt) {
    if (startedWithOccurredAt?.occurredAt && endedWithOccurredAt?.occurredAt) {
      sourceConfidence = 'HIGH';
    } else {
      sourceConfidence = 'MEDIUM';
    }
  } else if (meetingStartedAt || meetingEndedAt) {
    // Partial meeting bounds — at least one exists
    sourceConfidence = 'MEDIUM';
  }
  // else: no meeting events — check participant events below

  // Fall back to participant events if no meeting events
  const allParticipantJoins = attendanceEvents
    .filter((e) => e.attendanceEventType === SessionAttendanceEventType.JOINED)
    .map((e) => e.occurredAt)
    .sort((a, b) => a.getTime() - b.getTime());

  const allParticipantLeaves = attendanceEvents
    .filter((e) => e.attendanceEventType === SessionAttendanceEventType.LEFT)
    .map((e) => e.occurredAt)
    .sort((a, b) => a.getTime() - b.getTime());

  const firstAnyParticipantJoinedAt =
    allParticipantJoins.length > 0 ? allParticipantJoins[0] : null;
  const lastAnyParticipantLeftAt =
    allParticipantLeaves.length > 0
      ? allParticipantLeaves[allParticipantLeaves.length - 1]
      : null;

  // If no meeting events but participant events provide bounds, upgrade to MEDIUM
  if (!meetingStartedAt && !meetingEndedAt && firstAnyParticipantJoinedAt && lastAnyParticipantLeftAt) {
    sourceConfidence = 'MEDIUM';
  }

  // If we have participant joins but no leaves (open session with no meeting events),
  // the evidence is partial — keep LOW
  if (!meetingStartedAt && !meetingEndedAt && firstAnyParticipantJoinedAt && !lastAnyParticipantLeftAt) {
    sourceConfidence = 'LOW';
  }

  let totalMeetingObservedSeconds: number | null = null;
  if (meetingStartedAt && meetingEndedAt) {
    totalMeetingObservedSeconds = Math.floor(
      (meetingEndedAt.getTime() - meetingStartedAt.getTime()) / 1000,
    );
  } else if (firstAnyParticipantJoinedAt && lastAnyParticipantLeftAt) {
    totalMeetingObservedSeconds = Math.floor(
      (lastAnyParticipantLeftAt.getTime() - firstAnyParticipantJoinedAt.getTime()) /
        1000,
    );
  }

  return {
    meetingStartedAt,
    meetingEndedAt,
    firstAnyParticipantJoinedAt,
    lastAnyParticipantLeftAt,
    totalMeetingObservedSeconds,
    sourceConfidence,
  };
}

// =============================================================================
// Per-role summary
// =============================================================================

function buildRoleSummary(
  intervals: PresenceInterval[],
  roleEvents: AttendanceEvent[],
  platformJoinAttempts: PlatformEvent[],
  joinBlockedEvents: PlatformEvent[],
  tokenIssuedEvents: PlatformEvent[],
  timing: SessionTimingContext,
  role: SessionAttendanceParticipantRole,
  actorUserId: string | null,
  duplicateLikeCount: number,
  effectiveNow: Date | null,
): RoleAttendanceSummary {
  const scheduledStartAt = timing.scheduledStartAt;

  const firstJoinedAt =
    intervals.length > 0 ? intervals[0].joinedAt : null;

  const lastLeftAt =
    intervals.length > 0
      ? (intervals[intervals.length - 1].leftAt ?? intervals[intervals.length - 1].joinedAt)
      : null;

  // totalPresenceSeconds: sum of closed intervals only (open intervals have durationSeconds = 0)
  const totalPresenceSeconds = intervals.reduce(
    (sum, interval) => sum + (interval.leftAt !== null ? interval.durationSeconds : 0),
    0,
  );

  // joinCount = real intervals (duplicates excluded)
  const joinCount = intervals.length;

  // reconnectCount = intervals beyond the first (real reconnects only)
  const reconnectCount = Math.max(0, intervals.length - 1);

  // lateSeconds: based on first real join, with grace period
  let lateSeconds: number | null = null;
  let joinedOnTime = false;
  if (firstJoinedAt && scheduledStartAt) {
    const diffMs = firstJoinedAt.getTime() - scheduledStartAt.getTime();
    const diffMinutes = diffMs / 60_000;
    const graceThreshold = role === SessionAttendanceParticipantRole.PATIENT
      ? ATTENDANCE_SUMMARY_THRESHOLDS.PATIENT_LATE_AFTER_MINUTES
      : ATTENDANCE_SUMMARY_THRESHOLDS.PRACTITIONER_LATE_AFTER_MINUTES;
    lateSeconds = diffMinutes > 0 ? Math.floor(diffMinutes * 60) : 0;
    // joinedOnTime: within grace period
    joinedOnTime = diffMinutes <= graceThreshold;
  }

  // leftEarly: left before scheduled end
  const leftEarly =
    lastLeftAt != null &&
    timing.scheduledEndAt != null &&
    lastLeftAt < timing.scheduledEndAt;

  // noShowCandidate: time-gated — only use effectiveNow or explicit boundary
  const hasAnyJoin = intervals.length > 0;
  const noShowThreshold = role === SessionAttendanceParticipantRole.PATIENT
    ? ATTENDANCE_SUMMARY_THRESHOLDS.PATIENT_NO_SHOW_AFTER_MINUTES
    : ATTENDANCE_SUMMARY_THRESHOLDS.PRACTITIONER_NO_SHOW_AFTER_MINUTES;

  let noShowCandidate = false;
  if (hasAnyJoin) {
    // Joined — check if they were very late
    noShowCandidate = lateSeconds != null && lateSeconds > noShowThreshold * 60;
  } else {
    // Never joined — time-gate the no-show decision
    // Only use effectiveNow (explicit input) — never call new Date()
    if (scheduledStartAt && effectiveNow) {
      const elapsedMinutes =
        (effectiveNow.getTime() - scheduledStartAt.getTime()) / 60_000;
      noShowCandidate = elapsedMinutes >= noShowThreshold;
    } else if (scheduledStartAt && timing.scheduledEndAt) {
      // No effectiveNow — use scheduledEndAt as proxy only if it exists
      const elapsedMinutes =
        (timing.scheduledEndAt.getTime() - scheduledStartAt.getTime()) / 60_000;
      noShowCandidate = elapsedMinutes >= noShowThreshold;
    }
    // If no scheduledStartAt, cannot determine — leave noShowCandidate false
  }

  // Platform event mapping by explicit user ID
  const hadAnyJoinAttempt = platformJoinAttempts.some(
    (e) => e.actorUserId === actorUserId,
  );
  const hadBlockedJoinAttempt = joinBlockedEvents.some(
    (e) => e.actorUserId === actorUserId,
  );
  const lastBlockedReason = hadBlockedJoinAttempt
    ? joinBlockedEvents
        .filter((e) => e.actorUserId === actorUserId)
        .map((e) => String(e.metadataJson?.blockedReason ?? 'UNKNOWN'))
        .slice(-1)[0] ?? null
    : null;
  const tokenIssuedCount = tokenIssuedEvents.filter(
    (e) => e.actorUserId === actorUserId,
  ).length;

  return {
    firstJoinedAt,
    lastLeftAt,
    totalPresenceSeconds,
    joinedIntervals: intervals,
    joinCount,
    reconnectCount,
    lateSeconds,
    joinedOnTime,
    leftEarly,
    noShowCandidate,
    hadAnyJoinAttempt,
    hadBlockedJoinAttempt,
    lastBlockedReason,
    tokenIssuedCount,
    hasDuplicateLikeJoinEvents: duplicateLikeCount > 0,
    duplicateLikeJoinEventCount: duplicateLikeCount,
  };
}

// =============================================================================
// Evidence flags
// =============================================================================

function buildEvidenceFlags(
  allEvents: AttendanceEvent[],
  patientEvents: AttendanceEvent[],
  practitionerEvents: AttendanceEvent[],
  unknownEvents: AttendanceEvent[],
  platformJoinAttempts: PlatformEvent[],
  patientIntervals: PresenceInterval[],
  practitionerIntervals: PresenceInterval[],
  patientDuplicateLikeCount: number,
  practitionerDuplicateLikeCount: number,
  patientHasOpenWithoutClose: boolean,
  practitionerHasOpenWithoutClose: boolean,
  patientMissingJoinCount: number,
  patientMissingLeaveCount: number,
  practitionerMissingJoinCount: number,
  practitionerMissingLeaveCount: number,
  timing: SessionTimingContext,
  effectiveNow: Date | null,
): EvidenceFlags {
  const attendanceEventCount = allEvents.length;
  const platformJoinAttemptCount = platformJoinAttempts.length;
  const unknownParticipantEventCount = unknownEvents.length;
  const duplicateLikeJoinEventCount =
    patientDuplicateLikeCount + practitionerDuplicateLikeCount;

  const hasOutOfOrderEvents = detectOutOfOrderEvents(allEvents);

  // Use interval-builder diagnostics instead of raw event counts
  const hasMissingLeaveEvent =
    patientMissingLeaveCount > 0 || practitionerMissingLeaveCount > 0;
  const hasMissingJoinEvent =
    patientMissingJoinCount > 0 || practitionerMissingJoinCount > 0;
  const missingLeaveEventCount = patientMissingLeaveCount + practitionerMissingLeaveCount;
  const missingJoinEventCount = patientMissingJoinCount + practitionerMissingJoinCount;

  const patientJoins = patientEvents.filter(
    (e) => e.attendanceEventType === SessionAttendanceEventType.JOINED,
  );
  const practitionerJoins = practitionerEvents.filter(
    (e) => e.attendanceEventType === SessionAttendanceEventType.JOINED,
  );

  const hasOnlyPatientJoined =
    patientJoins.length > 0 && practitionerJoins.length === 0;
  const hasOnlyPractitionerJoined =
    practitionerJoins.length > 0 && patientJoins.length === 0;
  const hasNoParticipants =
    patientJoins.length === 0 && practitionerJoins.length === 0;

  // Reconnects: more than one real interval per role
  const hasReconnects =
    patientIntervals.length > 1 || practitionerIntervals.length > 1;

  const hasDuplicateLikeJoinEvents = duplicateLikeJoinEventCount > 0;

  // Open intervals without close boundary
  const hasOpenIntervalsWithoutCloseBoundary =
    patientHasOpenWithoutClose || practitionerHasOpenWithoutClose;
  const openIntervalCount =
    patientIntervals.filter((i) => i.leftAt === null).length +
    practitionerIntervals.filter((i) => i.leftAt === null).length;

  // Premature decision risk: check if threshold has not yet passed
  const hasPrematureDecisionRisk = checkPrematureDecisionRisk(
    timing,
    effectiveNow,
    patientJoins.length,
    practitionerJoins.length,
  );

  const hasTechnicalRisk =
    hasReconnects ||
    hasOutOfOrderEvents ||
    hasMissingLeaveEvent ||
    hasMissingJoinEvent ||
    hasDuplicateLikeJoinEvents;

  return {
    attendanceEventCount,
    platformJoinAttemptCount,
    unknownParticipantEventCount,
    duplicateIgnoredCount: 0,
    hasOutOfOrderEvents,
    hasMissingLeaveEvent,
    hasMissingJoinEvent,
    hasOnlyPatientJoined,
    hasOnlyPractitionerJoined,
    hasNoParticipants,
    hasReconnects,
    hasDuplicateLikeJoinEvents,
    duplicateLikeJoinEventCount,
    hasPrematureDecisionRisk,
    hasTechnicalRisk,
    hasOpenIntervalsWithoutCloseBoundary,
    openIntervalCount,
    missingJoinEventCount,
    missingLeaveEventCount,
  };
}

// =============================================================================
// Premature decision risk check
// =============================================================================

function checkPrematureDecisionRisk(
  timing: SessionTimingContext,
  effectiveNow: Date | null,
  patientJoinCount: number,
  practitionerJoinCount: number,
): boolean {
  if (!timing.scheduledStartAt) return false;

  // If both have joined, no premature risk
  if (patientJoinCount > 0 && practitionerJoinCount > 0) return false;

  // Determine the reference time for elapsed calculation
  // Use effectiveNow (explicit input) if available, otherwise scheduledEndAt as proxy
  const referenceTime = effectiveNow ?? timing.scheduledEndAt ?? timing.scheduledStartAt;
  const elapsedMinutes =
    (referenceTime.getTime() - timing.scheduledStartAt.getTime()) / 60_000;

  // If elapsed time is less than the no-show threshold, decision is premature
  const patientThreshold = ATTENDANCE_SUMMARY_THRESHOLDS.PATIENT_NO_SHOW_AFTER_MINUTES;
  const practitionerThreshold = ATTENDANCE_SUMMARY_THRESHOLDS.PRACTITIONER_NO_SHOW_AFTER_MINUTES;

  if (patientJoinCount === 0 && elapsedMinutes < patientThreshold) return true;
  if (practitionerJoinCount === 0 && elapsedMinutes < practitionerThreshold) return true;

  return false;
}

// =============================================================================
// Recommendation logic
// =============================================================================

function buildRecommendation(
  patient: RoleAttendanceSummary,
  practitioner: RoleAttendanceSummary,
  overlap: OverlapSummary,
  evidence: EvidenceFlags,
  timing: SessionTimingContext,
  effectiveNow: Date | null,
): Recommendation {
  const riskFlags: string[] = [];

  if (evidence.hasTechnicalRisk) {
    riskFlags.push('TECHNICAL_RISK_DETECTED');
  }
  if (evidence.hasOutOfOrderEvents) {
    riskFlags.push('OUT_OF_ORDER_EVENTS');
  }
  if (evidence.hasMissingLeaveEvent) {
    riskFlags.push('MISSING_LEAVE_EVENT');
  }
  if (evidence.hasMissingJoinEvent) {
    riskFlags.push('MISSING_JOIN_EVENT');
  }
  if (patient.reconnectCount >= ATTENDANCE_SUMMARY_THRESHOLDS.MAX_RECONNECT_COUNT_BEFORE_TECHNICAL_FLAG) {
    riskFlags.push('EXCESSIVE_PATIENT_RECONNECTS');
  }
  if (practitioner.reconnectCount >= ATTENDANCE_SUMMARY_THRESHOLDS.MAX_RECONNECT_COUNT_BEFORE_TECHNICAL_FLAG) {
    riskFlags.push('EXCESSIVE_PRACTITIONER_RECONNECTS');
  }
  if (evidence.unknownParticipantEventCount > 0) {
    riskFlags.push('UNKNOWN_PARTICIPANT_EVENTS');
  }
  if (evidence.hasDuplicateLikeJoinEvents) {
    riskFlags.push('DUPLICATE_LIKE_JOIN_EVENTS');
  }
  if (evidence.hasPrematureDecisionRisk) {
    riskFlags.push('PREMATURE_DECISION_RISK');
  }
  if (overlap.confidenceFlags.includes('LOW_CONFIDENCE_DURATION_MISSING')) {
    riskFlags.push('LOW_CONFIDENCE_DURATION_MISSING');
  }
  if (overlap.confidenceFlags.includes('UNRELIABLE_OVERLAP_OPEN_INTERVAL')) {
    riskFlags.push('UNRELIABLE_OVERLAP_OPEN_INTERVAL');
  }
  if (evidence.hasOpenIntervalsWithoutCloseBoundary) {
    riskFlags.push('OPEN_INTERVAL_WITHOUT_CLOSE_BOUNDARY');
  }

  // Insufficient evidence — no participant events AND no platform join attempts
  if (evidence.hasNoParticipants && evidence.platformJoinAttemptCount === 0) {
    return makeRecommendation('INSUFFICIENT_EVIDENCE',
      'No participant attendance events recorded and no platform join attempts found.',
      riskFlags);
  }

  // Edge case: join attempts exist but no attendance events recorded
  if (evidence.platformJoinAttemptCount > 0 && patient.joinCount === 0 && practitioner.joinCount === 0) {
    return makeRecommendation('MANUAL_REVIEW_REQUIRED',
      'Platform recorded join attempts but no participant attendance events were recorded.',
      riskFlags);
  }

  // Premature no-show: threshold not yet passed
  if (evidence.hasPrematureDecisionRisk) {
    if (patient.noShowCandidate || practitioner.noShowCandidate) {
      return makeRecommendation('MANUAL_REVIEW_REQUIRED',
        'No-show recommendation is premature — threshold has not yet passed.',
        riskFlags);
    }
  }

  // Open intervals without close boundary — cannot determine completion
  if (evidence.hasOpenIntervalsWithoutCloseBoundary) {
    if (patient.joinCount > 0 && practitioner.joinCount > 0) {
      return makeRecommendation('MANUAL_REVIEW_REQUIRED',
        'Both participants joined but at least one has an open interval without a safe close boundary. Overlap cannot be reliably determined.',
        riskFlags);
    }
  }

  // Both no-show candidates
  if (patient.noShowCandidate && practitioner.noShowCandidate) {
    return makeRecommendation('BOTH_NO_SHOW_CANDIDATE',
      'Neither patient nor practitioner joined within the no-show threshold.',
      riskFlags);
  }

  // Patient no-show candidate
  if (patient.noShowCandidate && !practitioner.noShowCandidate) {
    return makeRecommendation('PATIENT_NO_SHOW_CANDIDATE',
      'Practitioner joined but patient did not join within the no-show threshold.',
      riskFlags);
  }

  // Practitioner no-show candidate
  if (practitioner.noShowCandidate && !patient.noShowCandidate) {
    return makeRecommendation('PRACTITIONER_NO_SHOW_CANDIDATE',
      'Patient joined but practitioner did not join within the no-show threshold.',
      riskFlags);
  }

  // Both joined — check overlap
  if (patient.joinCount > 0 && practitioner.joinCount > 0) {
    if (!overlap.hasMeaningfulOverlap) {
      return makeRecommendation('TECHNICAL_REVIEW_CANDIDATE',
        'Both participants joined but overlap is insufficient for a valid session completion.',
        riskFlags);
    }

    return makeRecommendation('COMPLETION_CANDIDATE',
      'Both participants joined with meaningful overlap. Session appears valid for completion review.',
      riskFlags);
  }

  return makeRecommendation('MANUAL_REVIEW_REQUIRED',
    'Session does not clearly match any automated recommendation category.',
    riskFlags);
}

function makeRecommendation(
  recommendedOutcome: RecommendedOutcome,
  recommendedReason: string,
  riskFlags: string[],
): Recommendation {
  return {
    recommendedOutcome,
    recommendedReason,
    riskFlags,
    isFinalDecision: false,
    requiresAdminReview: true,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function filterByRole(
  events: AttendanceEvent[],
  role: SessionAttendanceParticipantRole,
): AttendanceEvent[] {
  return events.filter((e) => e.participantRole === role);
}

function computeScheduledDurationSeconds(
  timing: SessionTimingContext,
): number | null {
  if (timing.scheduledStartAt && timing.scheduledEndAt) {
    return Math.floor(
      (timing.scheduledEndAt.getTime() - timing.scheduledStartAt.getTime()) / 1000,
    );
  }
  if (timing.durationMinutes != null) {
    return timing.durationMinutes * 60;
  }
  return null;
}

function detectOutOfOrderEvents(events: AttendanceEvent[]): boolean {
  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1];
    const curr = events[i];
    if (curr.occurredAt < prev.occurredAt) {
      return true;
    }
    if (
      curr.occurredAt.getTime() === prev.occurredAt.getTime() &&
      curr.ingestedAt < prev.ingestedAt
    ) {
      return true;
    }
  }
  return false;
}