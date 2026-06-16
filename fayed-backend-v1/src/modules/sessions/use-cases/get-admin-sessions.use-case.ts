import { Injectable } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import {
  AdminSessionsSortDto,
  ListAdminSessionsDto,
} from '../dto/list-admin-sessions.dto';
import { SessionMapper } from '../mappers/session.mapper';
import { SessionRepository } from '../repositories/session.repository';

const DELAYED_STATUSES = new Set<SessionStatus>([
  SessionStatus.PENDING_PRACTITIONER_RESPONSE,
  SessionStatus.CONFIRMED,
  SessionStatus.UPCOMING,
  SessionStatus.READY_TO_JOIN,
]);

@Injectable()
export class GetAdminSessionsUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly sessionMapper: SessionMapper,
  ) {}

  async execute(input: { query: ListAdminSessionsDto }) {
    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;
    const skip = (page - 1) * limit;
    const now = new Date();

    const [sessions, totalItems] =
      await this.sessionRepository.listAdminSessions({
        status: input.query.status,
        sort: input.query.sort ?? AdminSessionsSortDto.NEWEST,
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

    return {
      items: sessions.map((session) => ({
        ...this.sessionMapper.toListItem(
          session,
          now,
          0,
          decisionMap.get(session.id) ?? null,
        ),
        isDelayed: this.isDelayed(
          session.status,
          session.scheduledStartAt,
          now,
        ),
      })),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
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