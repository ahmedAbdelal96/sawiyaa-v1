import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionPractitionerRepository } from '../repositories/session-practitioner.repository';
import { SessionRepository } from '../repositories/session.repository';
import { summarizeSessionPresentations } from '../utils/session-join-policy.util';

@Injectable()
export class GetMyPractitionerSessionSummaryUseCase {
  constructor(
    private readonly sessionPractitionerRepository: SessionPractitionerRepository,
    private readonly sessionRepository: SessionRepository,
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

    const presentationSummary = summarizeSessionPresentations(sessions);

    return {
      totalItems: presentationSummary.totalItems,
      upcoming: presentationSummary.upcoming + presentationSummary.unavailable,
      ready: presentationSummary.joinable,
      live: presentationSummary.inProgress,
      closed:
        presentationSummary.completed +
        presentationSummary.cancelled +
        presentationSummary.ended,
      actionRequired: presentationSummary.joinable,
      unavailable: presentationSummary.unavailable,
    };
  }
}
