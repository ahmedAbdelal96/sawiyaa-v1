import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionPractitionerRepository } from '../repositories/session-practitioner.repository';
import { SessionRepository } from '../repositories/session.repository';
import { SessionStatus } from '@prisma/client';
import { SessionOperationalInterpreterService } from '../services/session-operational-interpreter.service';
import { summarizeOperationalStates } from '../utils/session-operational-summary.util';

@Injectable()
export class GetMyPractitionerSessionSummaryUseCase {
  constructor(
    private readonly sessionPractitionerRepository: SessionPractitionerRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly operationalInterpreter: SessionOperationalInterpreterService,
  ) {}

  async execute(input: { userId: string }) {
    const practitioner = await this.sessionPractitionerRepository.findByUserId(
      input.userId,
    );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.practitionerNotFound',
        error: 'SESSION_PRACTITIONER_NOT_FOUND',
      });
    }

    const sessions =
      await this.sessionRepository.listPractitionerSessionSummaryCandidates(
        practitioner.id,
      );

    const now = new Date();
    const operational = await Promise.all(sessions.map((session) =>
      this.operationalInterpreter.interpret({ session, actor: 'ADMIN', now }),
    ));
    const { counts } = summarizeOperationalStates(operational.map((item) => item.state));

    return {
      totalItems: sessions.length,
      upcoming: counts[SessionStatus.UPCOMING] ?? 0,
      ready: counts[SessionStatus.READY_TO_JOIN] ?? 0,
      live: counts[SessionStatus.IN_PROGRESS] ?? 0,
      closed:
        (counts[SessionStatus.COMPLETED] ?? 0) +
        (counts[SessionStatus.CANCELLED] ?? 0) +
        (counts[SessionStatus.AWAITING_COMPLETION_CONFIRMATION] ?? 0),
      actionRequired: counts[SessionStatus.READY_TO_JOIN] ?? 0,
      unavailable: 0,
    };
  }
}
