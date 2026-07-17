import { ApiProperty } from '@nestjs/swagger';
import {
  SessionAttendanceEventType,
  SessionAttendanceParticipantRole,
  SessionProvider,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketType,
} from '@prisma/client';
import { SessionPresentationStatus } from '../types/session-video.types';

class AdminSessionAttendanceParticipantSummaryDto {
  @ApiProperty({ nullable: true })
  userId!: string | null;
}

class AdminSessionIdentityContactDto {
  @ApiProperty({ nullable: true })
  userId!: string | null;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ nullable: true })
  phone!: string | null;
}

class AdminSessionParticipantsDto {
  @ApiProperty({ type: AdminSessionIdentityContactDto })
  patient!: AdminSessionIdentityContactDto;

  @ApiProperty({ type: AdminSessionIdentityContactDto })
  practitioner!: AdminSessionIdentityContactDto;
}

class AdminSessionVideoRoomCloseDto {
  @ApiProperty({ nullable: true })
  closedAt!: string | null;

  @ApiProperty({ nullable: true })
  closedByUserId!: string | null;

  @ApiProperty({ nullable: true })
  closedByDisplayName!: string | null;

  @ApiProperty({ nullable: true })
  closeReason!: string | null;

  @ApiProperty({ nullable: true })
  closeNote!: string | null;
}

class AdminSessionRelatedSupportTicketDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: SupportTicketType })
  category!: SupportTicketType;

  @ApiProperty({ enum: SupportTicketStatus })
  status!: SupportTicketStatus;

  @ApiProperty({ enum: SupportTicketPriority })
  priority!: SupportTicketPriority;

  @ApiProperty()
  subject!: string;

  @ApiProperty({ nullable: true })
  lastMessageAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

class AdminEvidenceTimelineItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty({ enum: ['ATTENDANCE', 'PLATFORM'] })
  kind!: 'ATTENDANCE' | 'PLATFORM';

  @ApiProperty()
  eventType!: string;

  @ApiProperty({
    enum: ['PATIENT', 'PRACTITIONER', 'ADMIN', 'SYSTEM', 'UNKNOWN'],
  })
  actorRole!: 'PATIENT' | 'PRACTITIONER' | 'ADMIN' | 'SYSTEM' | 'UNKNOWN';

  @ApiProperty({ nullable: true })
  actorUserId!: string | null;

  @ApiProperty({ nullable: true })
  actorDisplayName!: string | null;

  @ApiProperty()
  occurredAt!: string;

  @ApiProperty()
  recordedAt!: string;

  @ApiProperty({ enum: ['PLATFORM', 'DAILY_WEBHOOK', 'SYSTEM'] })
  source!: 'PLATFORM' | 'DAILY_WEBHOOK' | 'SYSTEM';

  @ApiProperty({ enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'NEUTRAL'] })
  severity!: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'NEUTRAL';

  @ApiProperty()
  titleKey!: string;

  @ApiProperty({ type: Object, nullable: true })
  safeMetadataSummary!: Record<string, string | number | boolean | null> | null;
}

class AdminSessionAttendanceTimelineItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty({ enum: SessionAttendanceEventType })
  attendanceEventType!: SessionAttendanceEventType;

  @ApiProperty({ enum: SessionAttendanceParticipantRole })
  participantRole!: SessionAttendanceParticipantRole;

  @ApiProperty({ type: AdminSessionAttendanceParticipantSummaryDto })
  participant!: AdminSessionAttendanceParticipantSummaryDto;

  @ApiProperty({ enum: SessionProvider })
  provider!: SessionProvider;

  @ApiProperty()
  providerEventType!: string;

  @ApiProperty({ nullable: true })
  providerEventRef!: string | null;

  @ApiProperty({ nullable: true })
  providerRoomRef!: string | null;

  @ApiProperty({ nullable: true })
  providerParticipantRef!: string | null;

  @ApiProperty()
  occurredAt!: string;

  @ApiProperty()
  ingestedAt!: string;
}

class AdminSessionAttendanceSummaryDto {
  @ApiProperty()
  patientHasJoined!: boolean;

  @ApiProperty()
  practitionerHasJoined!: boolean;

  @ApiProperty({ nullable: true })
  patientJoinedAt!: string | null;

  @ApiProperty({ nullable: true })
  practitionerJoinedAt!: string | null;

  @ApiProperty({ nullable: true })
  patientLeftAt!: string | null;

  @ApiProperty({ nullable: true })
  practitionerLeftAt!: string | null;

  @ApiProperty({ nullable: true })
  firstJoinedAt!: string | null;

  @ApiProperty({ nullable: true })
  lastLeftAt!: string | null;
}

// =============================================================================
// Extended attendance summary DTOs (Phase 2 — Attendance Summary Engine)
// =============================================================================

class PresenceIntervalDto {
  @ApiProperty()
  joinedAt!: string;

  @ApiProperty({ nullable: true })
  leftAt!: string | null;

  @ApiProperty()
  durationSeconds!: number;
}

class RoleAttendanceSummaryDto {
  @ApiProperty({ nullable: true })
  firstJoinedAt!: string | null;

  @ApiProperty({ nullable: true })
  lastLeftAt!: string | null;

  @ApiProperty()
  totalPresenceSeconds!: number;

  @ApiProperty({ type: PresenceIntervalDto, isArray: true })
  joinedIntervals!: PresenceIntervalDto[];

  @ApiProperty()
  joinCount!: number;

  @ApiProperty()
  reconnectCount!: number;

  @ApiProperty({ nullable: true })
  lateSeconds!: number | null;

  @ApiProperty()
  joinedOnTime!: boolean;

  @ApiProperty()
  leftEarly!: boolean;

  @ApiProperty()
  noShowCandidate!: boolean;

  @ApiProperty()
  hadAnyJoinAttempt!: boolean;

  @ApiProperty()
  hadBlockedJoinAttempt!: boolean;

  @ApiProperty({ nullable: true })
  lastBlockedReason!: string | null;

  @ApiProperty()
  tokenIssuedCount!: number;

  @ApiProperty()
  hasDuplicateLikeJoinEvents!: boolean;

  @ApiProperty()
  duplicateLikeJoinEventCount!: number;
}

class MeetingBoundsDto {
  @ApiProperty({ nullable: true })
  meetingStartedAt!: string | null;

  @ApiProperty({ nullable: true })
  meetingEndedAt!: string | null;

  @ApiProperty({ nullable: true })
  firstAnyParticipantJoinedAt!: string | null;

  @ApiProperty({ nullable: true })
  lastAnyParticipantLeftAt!: string | null;

  @ApiProperty({ nullable: true })
  totalMeetingObservedSeconds!: number | null;

  @ApiProperty({ enum: ['HIGH', 'MEDIUM', 'LOW'] })
  sourceConfidence!: 'HIGH' | 'MEDIUM' | 'LOW';
}

class OverlapSummaryDto {
  @ApiProperty()
  overlapSeconds!: number;

  @ApiProperty()
  overlapMinutes!: number;

  @ApiProperty({ nullable: true })
  overlapPercentOfScheduledDuration!: number | null;

  @ApiProperty({ nullable: true })
  firstOverlapAt!: string | null;

  @ApiProperty({ nullable: true })
  lastOverlapAt!: string | null;

  @ApiProperty()
  hasMeaningfulOverlap!: boolean;

  @ApiProperty({ type: String, isArray: true })
  confidenceFlags!: string[];
}

class EvidenceFlagsDto {
  @ApiProperty()
  attendanceEventCount!: number;

  @ApiProperty()
  platformJoinAttemptCount!: number;

  @ApiProperty()
  unknownParticipantEventCount!: number;

  @ApiProperty()
  duplicateIgnoredCount!: number;

  @ApiProperty()
  hasOutOfOrderEvents!: boolean;

  @ApiProperty()
  hasMissingLeaveEvent!: boolean;

  @ApiProperty()
  hasMissingJoinEvent!: boolean;

  @ApiProperty()
  hasOnlyPatientJoined!: boolean;

  @ApiProperty()
  hasOnlyPractitionerJoined!: boolean;

  @ApiProperty()
  hasNoParticipants!: boolean;

  @ApiProperty()
  hasReconnects!: boolean;

  @ApiProperty()
  hasDuplicateLikeJoinEvents!: boolean;

  @ApiProperty()
  duplicateLikeJoinEventCount!: number;

  @ApiProperty()
  hasPrematureDecisionRisk!: boolean;

  @ApiProperty()
  hasTechnicalRisk!: boolean;

  @ApiProperty()
  hasOpenIntervalsWithoutCloseBoundary!: boolean;

  @ApiProperty()
  openIntervalCount!: number;

  @ApiProperty()
  missingJoinEventCount!: number;

  @ApiProperty()
  missingLeaveEventCount!: number;
}

class RecommendationDto {
  @ApiProperty({
    enum: [
      'COMPLETION_CANDIDATE',
      'PATIENT_NO_SHOW_CANDIDATE',
      'PRACTITIONER_NO_SHOW_CANDIDATE',
      'BOTH_NO_SHOW_CANDIDATE',
      'TECHNICAL_REVIEW_CANDIDATE',
      'INSUFFICIENT_EVIDENCE',
      'MANUAL_REVIEW_REQUIRED',
    ],
  })
  recommendedOutcome!: string;

  @ApiProperty()
  recommendedReason!: string;

  @ApiProperty({ type: String, isArray: true })
  riskFlags!: string[];

  @ApiProperty({ example: false })
  isFinalDecision!: false;

  @ApiProperty({ example: true })
  requiresAdminReview!: boolean;
}

class SessionTimingDto {
  @ApiProperty({ nullable: true })
  scheduledStartAt!: string | null;

  @ApiProperty({ nullable: true })
  scheduledEndAt!: string | null;

  @ApiProperty({ nullable: true })
  durationMinutes!: number | null;

  @ApiProperty({ nullable: true })
  joinWindowOpenedAt!: string | null;

  @ApiProperty({ nullable: true })
  joinWindowClosedAt!: string | null;
}

class ExtendedSessionSummaryDto {
  @ApiProperty({ type: SessionTimingDto })
  session!: SessionTimingDto;

  @ApiProperty({ type: RoleAttendanceSummaryDto })
  patient!: RoleAttendanceSummaryDto;

  @ApiProperty({ type: RoleAttendanceSummaryDto })
  practitioner!: RoleAttendanceSummaryDto;

  @ApiProperty({ type: MeetingBoundsDto })
  meeting!: MeetingBoundsDto;

  @ApiProperty({ type: OverlapSummaryDto })
  overlap!: OverlapSummaryDto;

  @ApiProperty({ type: EvidenceFlagsDto })
  evidence!: EvidenceFlagsDto;

  @ApiProperty({ type: RecommendationDto })
  recommendation!: RecommendationDto;
}

class AdminSessionAttendanceDataResponseDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty({ type: AdminSessionAttendanceSummaryDto })
  summary!: AdminSessionAttendanceSummaryDto;

  @ApiProperty({ type: AdminSessionAttendanceTimelineItemDto, isArray: true })
  timeline!: AdminSessionAttendanceTimelineItemDto[];

  /**
   * Phase 3 — Platform-side evidence events (join attempts, token issuance,
   * meeting lifecycle, etc.). Always present; empty array if no platform
   * events have been recorded.
   */
  @ApiProperty({ type: AdminEvidenceTimelineItemDto, isArray: true })
  platformTimeline!: AdminEvidenceTimelineItemDto[];

  /**
   * Phase 3 — Unified evidence timeline combining attendance + platform
   * events, sorted chronologically with a deterministic tiebreak. Always
   * present; empty array if no events exist.
   */
  @ApiProperty({ type: AdminEvidenceTimelineItemDto, isArray: true })
  evidenceTimeline!: AdminEvidenceTimelineItemDto[];

  /**
   * Phase 3 — Participant identity summary (displayName + primary email +
   * primary phone) for both the patient and the practitioner. Optional
   * fields may be null when the user has no verified contact row.
   */
  @ApiProperty({ type: AdminSessionParticipantsDto })
  participants!: AdminSessionParticipantsDto;

  @ApiProperty({ type: AdminSessionVideoRoomCloseDto })
  videoRoomClose!: AdminSessionVideoRoomCloseDto;

  @ApiProperty({ type: AdminSessionRelatedSupportTicketDto, isArray: true })
  relatedSupportTickets!: AdminSessionRelatedSupportTicketDto[];

  /**
   * Phase 3 — Lifecycle presentation status (UPCOMING / JOINABLE /
   * IN_PROGRESS / COMPLETED / CANCELLED / ENDED / UNAVAILABLE). Computed
   * by the existing presentation-status resolver.
   */
  @ApiProperty({
    enum: [
      'UPCOMING',
      'READY_TO_JOIN',
      'IN_PROGRESS',
      'AWAITING_COMPLETION_CONFIRMATION',
      'COMPLETED',
      'CANCELLED',
      'PATIENT_NO_SHOW',
      'PRACTITIONER_NO_SHOW',
      'BOTH_NO_SHOW',
      'EXPIRED',
    ],
    nullable: true,
  })
  presentationStatus!: SessionPresentationStatus | null;

  /** Extended attendance summary from the Phase 2 Attendance Summary Engine */
  @ApiProperty({ type: ExtendedSessionSummaryDto, nullable: true })
  extendedSummary!: ExtendedSessionSummaryDto | null;
}

export class AdminSessionAttendanceSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminSessionAttendanceDataResponseDto })
  data!: AdminSessionAttendanceDataResponseDto;
}
