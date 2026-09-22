import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { GeneralChatAvailabilityService } from '../services/general-chat-availability.service';
import { GetMyGeneralChatConversationDetailUseCase } from './get-my-general-chat-conversation-detail.use-case';
import { GENERAL_CHAT_ERROR_CODES } from '../types/general-chat.types';
import { SupportedLocale } from '@common/i18n/types/locale.types';

@Injectable()
export class GetSessionGeneralChatConversationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generalChatRepository: GeneralChatRepository,
    private readonly generalChatAvailabilityService: GeneralChatAvailabilityService,
    private readonly getConversationDetail: GetMyGeneralChatConversationDetailUseCase,
  ) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    sessionId: string;
    locale?: SupportedLocale;
  }) {
    const session = await this.prisma.session.findUnique({
      where: { id: input.sessionId },
      select: {
        id: true,
        status: true,
        sessionMode: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
        provider: true,
        providerRoomId: true,
        providerSessionRef: true,
        patient: { select: { userId: true } },
        practitioner: { select: { userId: true } },
      },
    });

    if (!session) {
      throw new NotFoundException({
        messageKey: 'chat.errors.linkedSessionForbidden',
        errorCode: GENERAL_CHAT_ERROR_CODES.linkedSessionForbidden,
      });
    }

    const isParticipant =
      session.patient.userId === input.authenticatedUser.id ||
      session.practitioner.userId === input.authenticatedUser.id;

    if (!isParticipant) {
      throw new ForbiddenException({
        messageKey: 'chat.errors.linkedSessionForbidden',
        errorCode: GENERAL_CHAT_ERROR_CODES.linkedSessionForbidden,
      });
    }

    const conversations =
      await this.generalChatRepository.findConversationsBySessionId(
        input.sessionId,
      );

    if (conversations.length > 1) {
      throw new BadRequestException(
        `DATA_INTEGRITY_VIOLATION: Multiple canonical conversations exist for session ${input.sessionId}`,
      );
    }

    if (conversations.length === 1) {
      const detail = await this.getConversationDetail.execute({
        authenticatedUser: input.authenticatedUser,
        conversationId: conversations[0].id,
        locale: input.locale ?? 'ar',
      });

      return {
        item: detail.item,
        sessionId: input.sessionId,
        chatAvailability: detail.item.chatAvailability,
      };
    }

    const chatAvailability =
      this.generalChatAvailabilityService.resolveAvailability({
        conversation: {
          status: 'OPEN',
          closedAt: null,
          adminLock: {
            disabledAt: null,
            disabledByUserId: null,
            disabledReason: null,
            enabledAt: null,
            enabledByUserId: null,
          },
          practitionerLock: {
            disabledAt: null,
            disabledByUserId: null,
            disabledReason: null,
            enabledAt: null,
            enabledByUserId: null,
          },
        },
        linkedSession: {
          status: session.status,
          sessionMode: session.sessionMode,
          scheduledStartAt: session.scheduledStartAt,
          scheduledEndAt: session.scheduledEndAt,
          provider: session.provider,
          providerRoomId: session.providerRoomId,
          providerSessionRef: session.providerSessionRef,
        },
      });

    return {
      item: null,
      sessionId: input.sessionId,
      chatAvailability,
    };
  }
}
