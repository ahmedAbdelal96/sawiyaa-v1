import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SessionMapper } from '../mappers/session.mapper';
import { SessionAccessPolicy } from '../policies/session-access.policy';
import { SessionPatientRepository } from '../repositories/session-patient.repository';
import { SessionPractitionerRepository } from '../repositories/session-practitioner.repository';
import { SessionRepository } from '../repositories/session.repository';

/**
 * Session details stay ownership-aware so patient and practitioner reads remain separated
 * even though both consume the same Session entity source of truth.
 */
@Injectable()
export class GetSessionDetailsUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly sessionPatientRepository: SessionPatientRepository,
    private readonly sessionPractitionerRepository: SessionPractitionerRepository,
    private readonly sessionMapper: SessionMapper,
    private readonly sessionAccessPolicy: SessionAccessPolicy,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    sessionId: string;
    actorType: 'PATIENT' | 'PRACTITIONER';
  }) {
    const session = await this.sessionRepository.findById(input.sessionId);

    if (!session) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      });
    }

    if (input.actorType === 'PATIENT') {
      const patient = await this.sessionPatientRepository.findByUserId(
        input.userId,
      );

      if (!patient) {
        throw new NotFoundException({
          messageKey: 'sessions.errors.patientNotFound',
          error: 'SESSION_PATIENT_NOT_FOUND',
        });
      }

      if (session.patient.id !== patient.id) {
        this.sessionAccessPolicy.assertPatientOwner({
          sessionPatientId: session.patient.id,
          requesterPatientId: patient.id,
        });
      }
    } else {
      const practitioner =
        await this.sessionPractitionerRepository.findByUserId(input.userId);

      if (!practitioner) {
        throw new NotFoundException({
          messageKey: 'sessions.errors.practitionerNotFound',
          error: 'SESSION_PRACTITIONER_NOT_FOUND',
        });
      }

      if (session.practitioner.id !== practitioner.id) {
        this.sessionAccessPolicy.assertPractitionerOwner({
          sessionPractitionerId: session.practitioner.id,
          requesterPractitionerId: practitioner.id,
        });
      }
    }

    return {
      item: this.sessionMapper.toDetails(session),
    };
  }
}
