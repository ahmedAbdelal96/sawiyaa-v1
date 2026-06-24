import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { ListSessionsDto } from '../dto/list-sessions.dto';
import { SessionMapper } from '../mappers/session.mapper';
import { SessionPractitionerRepository } from '../repositories/session-practitioner.repository';
import { SessionRepository } from '../repositories/session.repository';

/**
 * Practitioner session listing is read-only and operational.
 * It does not mutate presence or session lifecycle automatically in V1.
 */
@Injectable()
export class GetMyPractitionerSessionsUseCase {
  constructor(
    private readonly sessionPractitionerRepository: SessionPractitionerRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionMapper: SessionMapper,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    query: ListSessionsDto;
  }) {
    const now = new Date();
    const practitioner = await this.sessionPractitionerRepository.findByUserId(
      input.userId,
    );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.practitionerNotFound',
        error: 'SESSION_PRACTITIONER_NOT_FOUND',
      });
    }

    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [sessions, totalItems] =
      await this.sessionRepository.listPractitionerSessions({
        practitionerId: practitioner.id,
        status: input.query.status,
        presentationFilter: input.query.presentationFilter,
        now,
        skip,
        take: limit,
      });

    const unreadMap = await this.sessionRepository.countUnreadBySessionIdsForUser({
      userId: input.userId,
      sessionIds: sessions.map((s) => s.id),
    });

    // Batch-fetch final manual decisions for all sessions in this page
    const decisionMap = await this.sessionRepository.findLatestActiveSessionAdminDecisionsForSessions(
      sessions.map((s) => s.id),
    );

    return {
      items: sessions.map((session) =>
        this.sessionMapper.toListItem(
          session,
          now,
          unreadMap.get(session.id) ?? 0,
          decisionMap.get(session.id) ?? null,
        ),
      ),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
    };
  }
}