import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { ListSessionsDto } from '../dto/list-sessions.dto';
import { SessionMapper } from '../mappers/session.mapper';
import { SessionPatientRepository } from '../repositories/session-patient.repository';
import { SessionRepository } from '../repositories/session.repository';
import { ResolvePatientSessionActionsService } from '../services/resolve-patient-session-actions.service';
import { SessionOperationalInterpreterService } from '../services/session-operational-interpreter.service';

/**
 * Patient session listing is intentionally ownership-scoped.
 * This module exposes scheduled consultation records, not broader patient dashboard concerns.
 */
@Injectable()
export class GetMyPatientSessionsUseCase {
  constructor(
    private readonly sessionPatientRepository: SessionPatientRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionMapper: SessionMapper,
    private readonly resolvePatientSessionActionsService: ResolvePatientSessionActionsService,
    private readonly operationalInterpreter: SessionOperationalInterpreterService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    query: ListSessionsDto;
  }) {
    const now = new Date();
    const patient = await this.sessionPatientRepository.findByUserId(
      input.userId,
    );

    if (!patient) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.patientNotFound',
        error: 'SESSION_PATIENT_NOT_FOUND',
      });
    }

    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [sessions, totalItems] =
      await this.sessionRepository.listPatientSessions({
        patientId: patient.id,
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
    const actionMap = await this.resolvePatientSessionActionsService.resolveMany({
      sessions,
      finalDecisionBySessionId: decisionMap,
      now,
    });

    return {
      items: await Promise.all(sessions.map(async (session) => {
        const actions = actionMap.get(session.id);
        const operational = await this.operationalInterpreter.interpret({
          session,
          actor: 'PATIENT',
          now,
          finalManualDecision: decisionMap.get(session.id) ?? null,
          patientActions: actions,
        });
        return this.sessionMapper.toListItem(
          session,
          now,
          unreadMap.get(session.id) ?? 0,
          decisionMap.get(session.id) ?? null,
          actions,
          operational,
        );
      })),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
    };
  }
}
