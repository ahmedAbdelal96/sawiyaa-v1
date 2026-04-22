import { ConflictException, Injectable } from '@nestjs/common';
import { SessionRepository } from '../repositories/session.repository';

/**
 * Conflict validation remains a separate service so Sessions can consume availability-derived windows
 * while also enforcing booking collisions without embedding that logic inside controllers or repositories.
 */
@Injectable()
export class ValidateSessionConflictsService {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async assertNoPractitionerConflict(input: {
    practitionerId: string;
    scheduledStartAtUtc: Date;
    scheduledEndAtUtc: Date;
  }): Promise<void> {
    const conflicts =
      await this.sessionRepository.listSessionsInRangeForPractitioner(
        input.practitionerId,
        input.scheduledEndAtUtc,
        input.scheduledStartAtUtc,
      );

    if (conflicts.length > 0) {
      throw new ConflictException({
        messageKey: 'sessions.errors.practitionerTimeConflict',
        error: 'SESSION_PRACTITIONER_TIME_CONFLICT',
      });
    }
  }

  async assertNoPatientConflict(input: {
    patientId: string;
    scheduledStartAtUtc: Date;
    scheduledEndAtUtc: Date;
  }): Promise<void> {
    const conflicts =
      await this.sessionRepository.listSessionsInRangeForPatient(
        input.patientId,
        input.scheduledEndAtUtc,
        input.scheduledStartAtUtc,
      );

    if (conflicts.length > 0) {
      throw new ConflictException({
        messageKey: 'sessions.errors.patientTimeConflict',
        error: 'SESSION_PATIENT_TIME_CONFLICT',
      });
    }
  }
}
