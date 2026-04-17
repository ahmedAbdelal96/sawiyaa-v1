import { Injectable, NotFoundException } from '@nestjs/common';
import { CareChatPresenter } from '../presenters/care-chat.presenter';
import { CareChatActorRepository } from '../repositories/care-chat-actor.repository';
import { CareChatRequestRepository } from '../repositories/care-chat-request.repository';

@Injectable()
export class GetMyCareChatRequestUseCase {
  constructor(
    private readonly careChatActorRepository: CareChatActorRepository,
    private readonly careChatRequestRepository: CareChatRequestRepository,
    private readonly careChatPresenter: CareChatPresenter,
  ) {}

  async execute(input: {
    actorType: 'PATIENT' | 'PRACTITIONER';
    userId: string;
    requestId: string;
  }) {
    const profileId = await this.resolveProfileId(input.actorType, input.userId);
    const row = await this.careChatRequestRepository.findByIdForActor({
      actorType: input.actorType,
      profileId,
      requestId: input.requestId,
    });
    if (!row) {
      throw new NotFoundException({
        messageKey: 'careChat.errors.requestNotFound',
        error: 'CARE_CHAT_REQUEST_NOT_FOUND',
      });
    }

    return {
      item: this.careChatPresenter.presentUserRequestItem(row),
    };
  }

  private async resolveProfileId(
    actorType: 'PATIENT' | 'PRACTITIONER',
    userId: string,
  ) {
    if (actorType === 'PATIENT') {
      const patient = await this.careChatActorRepository.findPatientProfileByUserId(
        userId,
      );
      if (!patient) {
        throw new NotFoundException({
          messageKey: 'careChat.errors.patientProfileNotFound',
          error: 'CARE_CHAT_PATIENT_PROFILE_NOT_FOUND',
        });
      }

      return patient.id;
    }

    const practitioner =
      await this.careChatActorRepository.findPractitionerProfileByUserId(userId);
    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'careChat.errors.practitionerProfileNotFound',
        error: 'CARE_CHAT_PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    return practitioner.id;
  }
}
