import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationStatus } from '@prisma/client';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { AppRole } from '@common/enums/app-role.enum';
import { GENERAL_CHAT_ERROR_CODES } from '../types/general-chat.types';
import { GeneralChatRepository } from '../repositories/general-chat.repository';

@Injectable()
export class CloseGeneralChatConversationUseCase {
  constructor(private readonly generalChatRepository: GeneralChatRepository) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    conversationId: string;
  }) {
    const conversation =
      await this.generalChatRepository.findConversationByIdInGeneralScope(
        input.conversationId,
      );

    if (!conversation) {
      throw new NotFoundException({
        messageKey: 'chat.errors.conversationNotFound',
        errorCode: GENERAL_CHAT_ERROR_CODES.conversationNotFound,
      });
    }

    const participant = conversation.participants.find(
      (p) => p.userId === input.authenticatedUser.id,
    );
    const isAdmin = input.authenticatedUser.roles.includes(AppRole.ADMIN);

    // Product rule: patient cannot close; practitioner or admin can.
    if (!isAdmin) {
      if (!participant) {
        throw new ForbiddenException({
          messageKey: 'chat.errors.conversationAccessDenied',
          errorCode: GENERAL_CHAT_ERROR_CODES.conversationAccessDenied,
        });
      }
      if (participant.participantRole !== 'PRACTITIONER') {
        throw new ForbiddenException({
          messageKey: 'chat.errors.conversationAccessDenied',
          errorCode: GENERAL_CHAT_ERROR_CODES.conversationAccessDenied,
        });
      }
    }

    if (conversation.status === ConversationStatus.CLOSED) {
      throw new BadRequestException({
        messageKey: 'chat.errors.conversationNotSendable',
        errorCode: GENERAL_CHAT_ERROR_CODES.conversationNotSendable,
      });
    }

    await this.generalChatRepository.updateConversationStatus({
      conversationId: conversation.id,
      status: ConversationStatus.CLOSED,
    });

    return { closed: true };
  }
}
