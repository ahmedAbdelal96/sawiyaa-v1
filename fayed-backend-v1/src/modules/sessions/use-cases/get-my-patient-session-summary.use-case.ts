import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionPatientRepository } from '../repositories/session-patient.repository';
import { SessionRepository } from '../repositories/session.repository';

@Injectable()
export class GetMyPatientSessionSummaryUseCase {
  constructor(
    private readonly sessionPatientRepository: SessionPatientRepository,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async execute(input: { userId: string }) {
    const patient = await this.sessionPatientRepository.findByUserId(
      input.userId,
    );

    if (!patient) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.patientNotFound',
        error: 'SESSION_PATIENT_NOT_FOUND',
      });
    }

    const summary = await this.sessionRepository.summarizePatientSessions(
      patient.id,
    );

    return summary;
  }
}
