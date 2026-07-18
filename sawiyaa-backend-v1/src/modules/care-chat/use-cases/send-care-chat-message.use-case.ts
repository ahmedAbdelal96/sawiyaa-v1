import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { SendCareChatMessageDto } from '../dto/send-care-chat-message.dto';
import { CareChatPresenter } from '../presenters/care-chat.presenter';
import { CareChatActorRepository } from '../repositories/care-chat-actor.repository';
import { CareChatConversationRepository } from '../repositories/care-chat-conversation.repository';
import { ValidateCareChatSendMessageService } from '../services/validate-care-chat-send-message.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { MessagingUseCase } from '@modules/messaging/use-cases/messaging.use-case';

@Injectable()
export class SendCareChatMessageUseCase {
  private readonly logger = new Logger(SendCareChatMessageUseCase.name);

  constructor(
    private readonly careChatActorRepository: CareChatActorRepository,
    private readonly careChatConversationRepository: CareChatConversationRepository,
    private readonly validateCareChatSendMessageService: ValidateCareChatSendMessageService,
    private readonly careChatPresenter: CareChatPresenter,
    private readonly operationalNotificationService: OperationalNotificationService,
    private readonly messagingUseCase: MessagingUseCase,
  ) {}

  async execute(input: {
    actorType: 'PATIENT' | 'PRACTITIONER';
    userId: string;
    conversationId: string;
    payload: SendCareChatMessageDto;
  }) {
    const profileId = await this.resolveProfileId(
      input.actorType,
      input.userId,
    );
    const conversation =
      await this.careChatConversationRepository.findByIdForActor({
        conversationId: input.conversationId,
        actorType: input.actorType,
        profileId,
      });
    if (!conversation) {
      throw new NotFoundException({
        messageKey: 'careChat.errors.conversationNotFound',
        error: 'CARE_CHAT_CONVERSATION_NOT_FOUND',
      });
    }

    if (!conversation.chatApprovalRequest) {
      throw new NotFoundException({
        messageKey: 'careChat.errors.requestNotFound',
        error: 'CARE_CHAT_REQUEST_NOT_FOUND',
      });
    }

    const now = new Date();
    this.validateCareChatSendMessageService.assertCanSend({
      conversationStatus: conversation.status,
      approvalStatus: conversation.chatApprovalRequest.status,
      expiresAt:
        conversation.expiresAt ?? conversation.chatApprovalRequest.expiresAt,
      now,
    });

    await this.messagingUseCase.sendMessage(
      { id: input.userId, roles: [
        input.actorType === 'PATIENT' ? AppRole.PATIENT : AppRole.PRACTITIONER,
      ] },
      input.conversationId,
      input.payload.message,
      [],
      input.payload.clientMessageId,
    );

    const updated = await this.careChatConversationRepository.findByIdForActor({
      conversationId: input.conversationId,
      actorType: input.actorType,
      profileId,
    });
    if (!updated) {
      throw new NotFoundException({
        messageKey: 'careChat.errors.conversationNotFound',
        error: 'CARE_CHAT_CONVERSATION_NOT_FOUND',
      });
    }

    this.logger.log(
      `Care chat message sent (conversation=${updated.id}, sender=${input.userId}, role=${input.actorType})`,
    );

    return {
      item: this.careChatPresenter.presentConversation(updated),
    };
  }

  private async resolveProfileId(
    actorType: 'PATIENT' | 'PRACTITIONER',
    userId: string,
  ) {
    if (actorType === 'PATIENT') {
      const patient =
        await this.careChatActorRepository.findPatientProfileByUserId(userId);
      if (!patient) {
        throw new NotFoundException({
          messageKey: 'careChat.errors.patientProfileNotFound',
          error: 'CARE_CHAT_PATIENT_PROFILE_NOT_FOUND',
        });
      }
      return patient.id;
    }

    const practitioner =
      await this.careChatActorRepository.findPractitionerProfileByUserId(
        userId,
      );
    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'careChat.errors.practitionerProfileNotFound',
        error: 'CARE_CHAT_PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }
    return practitioner.id;
  }
}
