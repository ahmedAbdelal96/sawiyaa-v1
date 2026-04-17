import { Injectable, NotFoundException } from '@nestjs/common';
import { ListSupportTicketsDto } from '../dto/list-support-tickets.dto';
import { SupportPresenter } from '../presenters/support.presenter';
import { SupportActorRepository } from '../repositories/support-actor.repository';
import { SupportTicketRepository } from '../repositories/support-ticket.repository';
import { SupportActorKind } from '../types/support.types';

@Injectable()
export class ListMySupportTicketsUseCase {
  constructor(
    private readonly supportActorRepository: SupportActorRepository,
    private readonly supportTicketRepository: SupportTicketRepository,
    private readonly supportPresenter: SupportPresenter,
  ) {}

  async execute(input: {
    actorKind: SupportActorKind;
    userId: string;
    query: ListSupportTicketsDto;
  }) {
    const ownerProfileId = await this.resolveOwnerProfileId(
      input.actorKind,
      input.userId,
    );

    const [items, totalItems] = await this.supportTicketRepository.listByOwner({
      actorKind: input.actorKind,
      profileId: ownerProfileId,
      page: input.query.page,
      limit: input.query.limit,
      status: input.query.status,
      category: input.query.category,
      priority: input.query.priority,
    });

    return this.supportPresenter.presentTicketList({
      items,
      pagination: {
        page: input.query.page,
        limit: input.query.limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / input.query.limit)),
      },
    });
  }

  private async resolveOwnerProfileId(actorKind: SupportActorKind, userId: string) {
    if (actorKind === 'PATIENT') {
      const patient = await this.supportActorRepository.findPatientProfileByUserId(userId);
      if (!patient) {
        throw new NotFoundException({
          messageKey: 'support.errors.patientProfileNotFound',
          error: 'SUPPORT_PATIENT_PROFILE_NOT_FOUND',
        });
      }

      return patient.id;
    }

    const practitioner =
      await this.supportActorRepository.findPractitionerProfileByUserId(userId);
    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'support.errors.practitionerProfileNotFound',
        error: 'SUPPORT_PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    return practitioner.id;
  }
}
