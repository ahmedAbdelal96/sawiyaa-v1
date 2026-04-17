import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ConversationParticipantRole,
  SupportTicketPriority,
} from '@prisma/client';
import { CreateSupportTicketDto } from '../dto/create-support-ticket.dto';
import { SupportPresenter } from '../presenters/support.presenter';
import { SupportActorRepository } from '../repositories/support-actor.repository';
import { SupportTicketRepository } from '../repositories/support-ticket.repository';
import { ValidateSupportLinkedEntitiesService } from '../services/validate-support-linked-entities.service';
import { SupportActorKind } from '../types/support.types';

@Injectable()
export class CreateSupportTicketUseCase {
  private readonly logger = new Logger(CreateSupportTicketUseCase.name);

  constructor(
    private readonly supportActorRepository: SupportActorRepository,
    private readonly supportTicketRepository: SupportTicketRepository,
    private readonly validateSupportLinkedEntitiesService: ValidateSupportLinkedEntitiesService,
    private readonly supportPresenter: SupportPresenter,
  ) {}

  async execute(input: {
    actorKind: SupportActorKind;
    userId: string;
    payload: CreateSupportTicketDto;
  }) {
    const actor = await this.resolveActor(input.actorKind, input.userId);

    await this.validateSupportLinkedEntitiesService.validate({
      actorKind: input.actorKind,
      patientProfileId: actor.patientProfileId,
      practitionerProfileId: actor.practitionerProfileId,
      relatedSessionId: input.payload.relatedSessionId,
      relatedPaymentId: input.payload.relatedPaymentId,
      relatedInstantBookingRequestId: input.payload.relatedInstantBookingRequestId,
      relatedMatchingSessionId: input.payload.relatedMatchingSessionId,
      relatedAssessmentSubmissionId: input.payload.relatedAssessmentSubmissionId,
    });

    const created = await this.supportTicketRepository.createTicket({
      openedByUserId: input.userId,
      createdByRole:
        input.actorKind === 'PATIENT'
          ? ConversationParticipantRole.PATIENT
          : ConversationParticipantRole.PRACTITIONER,
      actorKind: input.actorKind,
      patientProfileId: actor.patientProfileId,
      practitionerProfileId: actor.practitionerProfileId,
      category: input.payload.category,
      subject: input.payload.subject.trim(),
      description: input.payload.description.trim(),
      priority: input.payload.priority ?? SupportTicketPriority.NORMAL,
      relatedSessionId: input.payload.relatedSessionId,
      relatedPaymentId: input.payload.relatedPaymentId,
      relatedInstantBookingRequestId: input.payload.relatedInstantBookingRequestId,
      relatedMatchingSessionId: input.payload.relatedMatchingSessionId,
      relatedAssessmentSubmissionId: input.payload.relatedAssessmentSubmissionId,
    });

    this.logger.log(
      `Support ticket created (ticket=${created.id}, actorKind=${input.actorKind}, user=${input.userId})`,
    );

    return {
      item: this.supportPresenter.presentUserTicketDetails(created),
    };
  }

  private async resolveActor(actorKind: SupportActorKind, userId: string) {
    if (actorKind === 'PATIENT') {
      const patient = await this.supportActorRepository.findPatientProfileByUserId(userId);
      if (!patient) {
        throw new NotFoundException({
          messageKey: 'support.errors.patientProfileNotFound',
          error: 'SUPPORT_PATIENT_PROFILE_NOT_FOUND',
        });
      }

      return {
        patientProfileId: patient.id,
      };
    }

    const practitioner =
      await this.supportActorRepository.findPractitionerProfileByUserId(userId);
    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'support.errors.practitionerProfileNotFound',
        error: 'SUPPORT_PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    return {
      practitionerProfileId: practitioner.id,
    };
  }
}
