import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ModerationReportTargetType } from '@prisma/client';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CreateModerationReportUseCase } from '@modules/moderation/use-cases/create-moderation-report.use-case';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { ReportGeneralChatTargetDto } from '../dto/report-general-chat-target.dto';
import { GENERAL_CHAT_ERROR_CODES } from '../types/general-chat.types';

@Injectable()
export class ReportGeneralChatTargetUseCase {
  constructor(
    private readonly generalChatRepository: GeneralChatRepository,
    private readonly createModerationReportUseCase: CreateModerationReportUseCase,
  ) {}

  async reportConversation(input: {
    authenticatedUser: AuthenticatedUser;
    conversationId: string;
    dto: ReportGeneralChatTargetDto;
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

    const isParticipant = conversation.participants.some(
      (participant) => participant.userId === input.authenticatedUser.id,
    );
    if (!isParticipant) {
      throw new ForbiddenException({
        messageKey: 'chat.errors.conversationAccessDenied',
        errorCode: GENERAL_CHAT_ERROR_CODES.conversationAccessDenied,
      });
    }

    const report = await this.createModerationReportUseCase.execute({
      currentUser: input.authenticatedUser,
      payload: {
        targetType: ModerationReportTargetType.GENERAL_CHAT_CONVERSATION,
        targetId: input.conversationId,
        reason: input.dto.reason,
        note: input.dto.note,
      },
    });

    return {
      item: {
        reportId: report.item.id,
        targetType: report.item.targetType,
        targetId: report.item.targetId,
        reason: report.item.reason,
        status: report.item.status,
        createdAt: report.item.createdAt,
      },
    };
  }

  async reportMessage(input: {
    authenticatedUser: AuthenticatedUser;
    conversationId: string;
    messageId: string;
    dto: ReportGeneralChatTargetDto;
  }) {
    const message =
      await this.generalChatRepository.findAccessibleMessageInConversationScope({
        conversationId: input.conversationId,
        messageId: input.messageId,
        userId: input.authenticatedUser.id,
      });

    if (!message) {
      throw new NotFoundException({
        messageKey: 'chat.errors.messageNotFound',
        errorCode: GENERAL_CHAT_ERROR_CODES.messageNotFound,
      });
    }

    const report = await this.createModerationReportUseCase.execute({
      currentUser: input.authenticatedUser,
      payload: {
        targetType: ModerationReportTargetType.GENERAL_CHAT_MESSAGE,
        targetId: input.messageId,
        reason: input.dto.reason,
        note: input.dto.note,
      },
    });

    return {
      item: {
        reportId: report.item.id,
        targetType: report.item.targetType,
        targetId: report.item.targetId,
        reason: report.item.reason,
        status: report.item.status,
        createdAt: report.item.createdAt,
      },
    };
  }
}
