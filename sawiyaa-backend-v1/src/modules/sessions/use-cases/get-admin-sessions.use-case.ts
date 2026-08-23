import { Injectable } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import {
  AdminSessionComplaintFilterDto,
  AdminSessionQueueViewDto,
  AdminSessionResolutionFilterDto,
  AdminSessionsSortDto,
  ListAdminSessionsDto,
} from '../dto/list-admin-sessions.dto';
import { SessionMapper } from '../mappers/session.mapper';
import { SessionRepository } from '../repositories/session.repository';
import { SessionOperationalInterpreterService } from '../services/session-operational-interpreter.service';

const DELAYED_STATUSES = new Set<SessionStatus>([
  SessionStatus.PENDING_PRACTITIONER_CONFIRMATION,
  SessionStatus.UPCOMING,
  SessionStatus.UPCOMING,
  SessionStatus.READY_TO_JOIN,
]);

@Injectable()
export class GetAdminSessionsUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly sessionMapper: SessionMapper,
    private readonly operationalInterpreter: SessionOperationalInterpreterService,
  ) {}

  async execute(input: { query: ListAdminSessionsDto }) {
    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;
    const skip = (page - 1) * limit;
    const now = new Date();

    const [sessions, totalItems] =
      await this.sessionRepository.listAdminSessions({
        status: input.query.status,
        sort:
          input.query.sort ??
          (input.query.view === AdminSessionQueueViewDto.REVIEW
            ? AdminSessionsSortDto.OLDEST
            : AdminSessionsSortDto.NEWEST),
        view: input.query.view,
        complaint: input.query.complaint,
        resolution: input.query.resolution,
        query: input.query.query,
        practitionerId: input.query.practitionerId,
        patientId: input.query.patientId,
        scheduledFrom: input.query.scheduledFrom
          ? new Date(input.query.scheduledFrom)
          : undefined,
        scheduledTo: input.query.scheduledTo
          ? new Date(input.query.scheduledTo)
          : undefined,
        late: input.query.late,
        missingAttendance: input.query.missingAttendance,
        now,
        skip,
        take: limit,
      });

    // Batch-fetch final manual decisions for all sessions in this page
    const decisionMap = await this.sessionRepository.findLatestActiveSessionAdminDecisionsForSessions(
      sessions.map((s) => s.id),
    );

    const activeComplaintCounts = this.sessionRepository.findActiveSupportTicketCounts
      ? await this.sessionRepository.findActiveSupportTicketCounts(
          sessions.map((session) => session.id),
        )
      : new Map<string, number>();

    return {
      items: await Promise.all(sessions.map(async (session) => ({
        ...this.toReviewProjection(
          session,
          activeComplaintCounts.get(session.id) ?? 0,
        ),
        ...this.sessionMapper.toListItem(
          session,
          now,
          0,
          decisionMap.get(session.id) ?? null,
          undefined,
          await this.operationalInterpreter.interpret({
            session,
            actor: 'ADMIN',
            now,
            finalManualDecision: decisionMap.get(session.id) ?? null,
          }),
        ),
        isDelayed: this.isDelayed(
          session.status,
          session.scheduledStartAt,
          now,
        ),
      }))),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
    };
  }

  private toReviewProjection(
    session: {
      id: string;
      status: SessionStatus;
      scheduledStartAt: Date | null;
      scheduledEndAt: Date | null;
      attendanceReconciliations?: Array<{
        status: string;
        confidence: string;
        patientTotalPresenceSeconds: number;
        practitionerTotalPresenceSeconds: number;
        reasonCodesJson: unknown;
        reconciledAt: Date;
      }>;
      events?: Array<{ occurredAt: Date | null }>;
      resolutionCase?: {
        status: string;
        openedAt: Date;
        suggestedOutcome: SessionStatus;
      } | null;
    },
    activeComplaintCount: number,
  ) {
    const reconciliation = session.attendanceReconciliations?.[0] ?? null;
    const patientSeconds = reconciliation?.patientTotalPresenceSeconds ?? 0;
    const practitionerSeconds =
      reconciliation?.practitionerTotalPresenceSeconds ?? 0;
    const overlapSeconds = Math.min(patientSeconds, practitionerSeconds);
    const durationSeconds = Math.max(
      1,
      (session.scheduledEndAt?.getTime() ?? 0) -
        (session.scheduledStartAt?.getTime() ?? 0),
    ) / 1000;
    const reasonCodes = Array.isArray(reconciliation?.reasonCodesJson)
      ? reconciliation.reasonCodesJson.filter(
          (value): value is string => typeof value === 'string',
        )
      : [];
    const enteredAt = session.events?.[0]?.occurredAt ?? null;

    return {
      reviewEnteredAt:
        session.resolutionCase?.status === 'OPEN'
          ? session.resolutionCase.openedAt.toISOString()
          : enteredAt?.toISOString() ?? null,
      queueAgeSeconds: enteredAt
        ? Math.max(0, (Date.now() - enteredAt.getTime()) / 1000)
        : null,
      attendance: {
        classification: session.resolutionCase?.suggestedOutcome ?? null,
        patientMinutes: Math.round(patientSeconds / 60),
        practitionerMinutes: Math.round(practitionerSeconds / 60),
        overlapMinutes: Math.round(overlapSeconds / 60),
        overlapPercent: Math.round((overlapSeconds / durationSeconds) * 100),
        confidence: reconciliation?.confidence ?? null,
        status: reconciliation?.status ?? null,
      },
      activeComplaintCount,
      hasActiveComplaint: activeComplaintCount > 0,
      recommendation: session.resolutionCase?.suggestedOutcome ?? null,
      riskFlags: reasonCodes.slice(0, 4),
      resolutionCase: session.resolutionCase
        ? {
            status: session.resolutionCase.status,
            openedAt: session.resolutionCase.openedAt.toISOString(),
          }
        : null,
    };
  }

  private isDelayed(
    status: SessionStatus,
    scheduledStartAt: Date | null,
    now: Date,
  ): boolean {
    if (!scheduledStartAt) {
      return false;
    }

    if (!DELAYED_STATUSES.has(status)) {
      return false;
    }

    return scheduledStartAt.getTime() < now.getTime();
  }
}
