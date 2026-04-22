import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MatchingSessionAccessPolicy } from '../policies/matching-session-access.policy';
import { MatchingPatientRepository } from '../repositories/matching-patient.repository';
import { MatchingSessionRepository } from '../repositories/matching-session.repository';
import { MatchingPresenter } from '../presenters/matching.presenter';

@Injectable()
export class GetMatchingSessionUseCase {
  private readonly logger = new Logger(GetMatchingSessionUseCase.name);

  constructor(
    private readonly matchingPatientRepository: MatchingPatientRepository,
    private readonly matchingSessionRepository: MatchingSessionRepository,
    private readonly matchingSessionAccessPolicy: MatchingSessionAccessPolicy,
    private readonly matchingPresenter: MatchingPresenter,
  ) {}

  async execute(input: { userId: string; sessionId: string }) {
    const patientProfile = await this.matchingPatientRepository.findByUserId(
      input.userId,
    );
    if (!patientProfile) {
      throw new NotFoundException({
        messageKey: 'matching.errors.patientProfileNotFound',
        error: 'MATCHING_PATIENT_PROFILE_NOT_FOUND',
      });
    }

    const session =
      await this.matchingSessionRepository.findOwnedCompletedSession(
        input.sessionId,
        patientProfile.id,
      );
    if (!session) {
      throw new NotFoundException({
        messageKey: 'matching.errors.matchingSessionNotFound',
        error: 'MATCHING_SESSION_NOT_FOUND',
      });
    }

    this.matchingSessionAccessPolicy.assertOwnership({
      sessionPatientProfileId: session.patientProfileId,
      requesterPatientProfileId: patientProfile.id,
    });

    this.logger.log(
      `Guided matching session fetched (session=${session.id}, patient=${patientProfile.id})`,
    );

    return this.matchingPresenter.presentSession({
      sessionId: session.id,
      answers: session.answers,
      recommendations: session.recommendations,
    });
  }
}
