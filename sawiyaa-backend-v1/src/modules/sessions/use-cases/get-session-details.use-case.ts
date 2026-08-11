import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SessionMapper } from '../mappers/session.mapper';
import { SessionAccessPolicy } from '../policies/session-access.policy';
import { SessionPatientRepository } from '../repositories/session-patient.repository';
import { SessionPractitionerRepository } from '../repositories/session-practitioner.repository';
import { SessionRepository } from '../repositories/session.repository';
import { ResolvePatientSessionActionsService } from '../services/resolve-patient-session-actions.service';
import { SessionOperationalInterpreterService } from '../services/session-operational-interpreter.service';
import { ResolvePractitionerSessionCommandActionsService } from '../services/resolve-practitioner-session-command-actions.service';
import { ResolveSessionChatAvailabilityService } from '@modules/chat/services/resolve-session-chat-availability.service';

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
    private readonly resolvePatientSessionActionsService: ResolvePatientSessionActionsService,
    private readonly operationalInterpreter: SessionOperationalInterpreterService,
    private readonly practitionerCommandActions: ResolvePractitionerSessionCommandActionsService,
    private readonly resolveSessionChatAvailability: ResolveSessionChatAvailabilityService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    sessionId: string;
    actorType: 'PATIENT' | 'PRACTITIONER';
  }) {
    const session = input.actorType === 'PRACTITIONER'
      ? await this.sessionRepository.findByIdWithRichDetails(input.sessionId)
      : await this.sessionRepository.findById(input.sessionId);

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

    // Fetch final manual decision if one exists to override presentationStatus
    const latestDecision = await this.sessionRepository.findLatestActiveSessionAdminDecision(
      input.sessionId,
    );
    const now = new Date();
    const actions =
      input.actorType === 'PATIENT'
        ? await this.resolvePatientSessionActionsService.resolveOne({
            session,
            finalManualDecision: latestDecision?.decisionType ?? null,
            now,
          })
        : undefined;
    const operational = await this.operationalInterpreter.interpret({
      session,
      actor: input.actorType,
      now,
      finalManualDecision: latestDecision?.decisionType ?? null,
      patientActions: actions,
      practitionerCommandActions: input.actorType === 'PRACTITIONER'
        ? await this.practitionerCommandActions.resolve({ session, now })
        : undefined,
    });

    const details = this.sessionMapper.toDetails(
        session,
        now,
        0,
        latestDecision?.decisionType ?? null,
        actions,
        operational,
      );

    return {
      item: {
        ...details,
        sessionChat: this.resolveSessionChatAvailability.resolve({
          status: session.status,
          sessionMode: session.sessionMode,
          scheduledStartAt: session.scheduledStartAt,
          scheduledEndAt: session.scheduledEndAt,
          provider: session.provider,
          providerRoomId: session.providerRoomId,
          providerSessionRef: session.providerSessionRef,
        }),
      },
    };
  }
}
