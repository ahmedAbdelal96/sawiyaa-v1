import { Injectable, NotFoundException } from '@nestjs/common';
import { CareChatPresenter } from '../presenters/care-chat.presenter';
import { CareChatActorRepository } from '../repositories/care-chat-actor.repository';
import { CareChatConversationRepository } from '../repositories/care-chat-conversation.repository';
import { CareChatActorType } from '../types/care-chat.types';

@Injectable()
export class GetCareChatConversationUseCase {
  constructor(
    private readonly careChatActorRepository: CareChatActorRepository,
    private readonly careChatConversationRepository: CareChatConversationRepository,
    private readonly careChatPresenter: CareChatPresenter,
  ) {}

  async execute(input: {
    actorType: CareChatActorType;
    userId: string;
    conversationId: string;
  }) {
    const conversation = await this.findConversation(input);
    if (!conversation) {
      throw new NotFoundException({
        messageKey: 'careChat.errors.conversationNotFound',
        error: 'CARE_CHAT_CONVERSATION_NOT_FOUND',
      });
    }

    if (input.actorType !== 'ADMIN') {
      const lastMessageId =
        conversation.messages.length > 0
          ? conversation.messages[conversation.messages.length - 1].id
          : undefined;
      await this.careChatConversationRepository.markRead({
        conversationId: conversation.id,
        userId: input.userId,
        lastReadMessageId: lastMessageId,
        at: new Date(),
      });
    }

    return {
      item: this.careChatPresenter.presentConversation(conversation),
    };
  }

  private async findConversation(input: {
    actorType: CareChatActorType;
    userId: string;
    conversationId: string;
  }) {
    if (input.actorType === 'ADMIN') {
      return this.careChatConversationRepository.findByIdForAdmin(
        input.conversationId,
      );
    }

    if (input.actorType === 'PATIENT') {
      const patient =
        await this.careChatActorRepository.findPatientProfileByUserId(
          input.userId,
        );
      if (!patient) {
        throw new NotFoundException({
          messageKey: 'careChat.errors.patientProfileNotFound',
          error: 'CARE_CHAT_PATIENT_PROFILE_NOT_FOUND',
        });
      }

      return this.careChatConversationRepository.findByIdForActor({
        conversationId: input.conversationId,
        actorType: 'PATIENT',
        profileId: patient.id,
      });
    }

    const practitioner =
      await this.careChatActorRepository.findPractitionerProfileByUserId(
        input.userId,
      );
    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'careChat.errors.practitionerProfileNotFound',
        error: 'CARE_CHAT_PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    return this.careChatConversationRepository.findByIdForActor({
      conversationId: input.conversationId,
      actorType: 'PRACTITIONER',
      profileId: practitioner.id,
    });
  }
}
