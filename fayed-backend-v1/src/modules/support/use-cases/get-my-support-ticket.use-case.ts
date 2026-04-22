import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportTicketAccessPolicy } from '../policies/support-ticket-access.policy';
import { SupportPresenter } from '../presenters/support.presenter';
import { SupportActorRepository } from '../repositories/support-actor.repository';
import { SupportTicketRepository } from '../repositories/support-ticket.repository';
import { SupportActorKind } from '../types/support.types';

@Injectable()
export class GetMySupportTicketUseCase {
  constructor(
    private readonly supportActorRepository: SupportActorRepository,
    private readonly supportTicketRepository: SupportTicketRepository,
    private readonly supportTicketAccessPolicy: SupportTicketAccessPolicy,
    private readonly supportPresenter: SupportPresenter,
  ) {}

  async execute(input: {
    actorKind: SupportActorKind;
    userId: string;
    ticketId: string;
  }) {
    if (input.actorKind === 'PATIENT') {
      const patient =
        await this.supportActorRepository.findPatientProfileByUserId(
          input.userId,
        );
      if (!patient) {
        throw new NotFoundException({
          messageKey: 'support.errors.patientProfileNotFound',
          error: 'SUPPORT_PATIENT_PROFILE_NOT_FOUND',
        });
      }

      const ticket = await this.supportTicketRepository.findByOwner({
        actorKind: 'PATIENT',
        profileId: patient.id,
        ticketId: input.ticketId,
      });
      if (!ticket) {
        throw new NotFoundException({
          messageKey: 'support.errors.ticketNotFound',
          error: 'SUPPORT_TICKET_NOT_FOUND',
        });
      }

      this.supportTicketAccessPolicy.assertPatientOwnership({
        ticketPatientId: ticket.patientId,
        requesterPatientId: patient.id,
      });

      return {
        item: this.supportPresenter.presentUserTicketDetails(ticket),
      };
    }

    const practitioner =
      await this.supportActorRepository.findPractitionerProfileByUserId(
        input.userId,
      );
    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'support.errors.practitionerProfileNotFound',
        error: 'SUPPORT_PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    const ticket = await this.supportTicketRepository.findByOwner({
      actorKind: 'PRACTITIONER',
      profileId: practitioner.id,
      ticketId: input.ticketId,
    });
    if (!ticket) {
      throw new NotFoundException({
        messageKey: 'support.errors.ticketNotFound',
        error: 'SUPPORT_TICKET_NOT_FOUND',
      });
    }

    this.supportTicketAccessPolicy.assertPractitionerOwnership({
      ticketPractitionerId: ticket.practitionerId,
      requesterPractitionerId: practitioner.id,
    });

    return {
      item: this.supportPresenter.presentUserTicketDetails(ticket),
    };
  }
}
