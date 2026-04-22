import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ChatApprovalStatus, ConversationStatus } from '@prisma/client';
import { RevokeCareChatRequestDto } from '../dto/revoke-care-chat-request.dto';
import { CareChatPresenter } from '../presenters/care-chat.presenter';
import { CareChatConversationRepository } from '../repositories/care-chat-conversation.repository';
import { CareChatRequestRepository } from '../repositories/care-chat-request.repository';
import { ValidateCareChatApprovalTransitionService } from '../services/validate-care-chat-approval-transition.service';

@Injectable()
export class RevokeCareChatRequestUseCase {
  private readonly logger = new Logger(RevokeCareChatRequestUseCase.name);

  constructor(
    private readonly careChatRequestRepository: CareChatRequestRepository,
    private readonly careChatConversationRepository: CareChatConversationRepository,
    private readonly validateCareChatApprovalTransitionService: ValidateCareChatApprovalTransitionService,
    private readonly careChatPresenter: CareChatPresenter,
  ) {}

  async execute(input: {
    userId: string;
    requestId: string;
    payload: RevokeCareChatRequestDto;
  }) {
    const request = await this.careChatRequestRepository.findById(
      input.requestId,
    );
    if (!request) {
      throw new NotFoundException({
        messageKey: 'careChat.errors.requestNotFound',
        error: 'CARE_CHAT_REQUEST_NOT_FOUND',
      });
    }

    this.validateCareChatApprovalTransitionService.assertRevokeAllowed(
      request.status,
    );

    const now = new Date();
    const updated = await this.careChatRequestRepository.withTransaction(
      async (tx) => {
        if (request.linkedConversationId) {
          await this.careChatConversationRepository.updateConversationStatus(
            request.linkedConversationId,
            {
              status: ConversationStatus.SUSPENDED,
              closedAt: now,
            },
            tx,
          );
        }

        await this.careChatRequestRepository.createModerationAction({
          requestId: request.id,
          conversationId: request.linkedConversationId,
          actedByUserId: input.userId,
          actionNote: input.payload.note?.trim() || null,
          tx,
        });

        return this.careChatRequestRepository.updateRequest(
          request.id,
          {
            status: ChatApprovalStatus.REVOKED,
            revokedAt: now,
            reviewedByUserId: input.userId,
            reviewedAt: now,
            internalReviewNote: input.payload.note?.trim() || null,
          },
          tx,
        );
      },
    );

    this.logger.warn(
      `Care chat request revoked (request=${request.id}, reviewer=${input.userId})`,
    );

    return {
      item: this.careChatPresenter.presentAdminRequestItem(updated),
    };
  }
}
