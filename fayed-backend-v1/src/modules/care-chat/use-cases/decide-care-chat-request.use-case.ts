import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ChatApprovalStatus } from '@prisma/client';
import { DecideCareChatRequestDto } from '../dto/decide-care-chat-request.dto';
import { CareChatPresenter } from '../presenters/care-chat.presenter';
import { CareChatConversationRepository } from '../repositories/care-chat-conversation.repository';
import { CareChatRequestRepository } from '../repositories/care-chat-request.repository';
import { ValidateCareChatApprovalTransitionService } from '../services/validate-care-chat-approval-transition.service';
import { CARE_CHAT_DEFAULT_EXPIRY_DAYS } from '../types/care-chat.types';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';

@Injectable()
export class DecideCareChatRequestUseCase {
  private readonly logger = new Logger(DecideCareChatRequestUseCase.name);

  constructor(
    private readonly careChatRequestRepository: CareChatRequestRepository,
    private readonly careChatConversationRepository: CareChatConversationRepository,
    private readonly validateCareChatApprovalTransitionService: ValidateCareChatApprovalTransitionService,
    private readonly careChatPresenter: CareChatPresenter,
    private readonly operationalNotificationService: OperationalNotificationService,
  ) {}

  async execute(input: {
    userId: string;
    requestId: string;
    payload: DecideCareChatRequestDto;
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

    const now = new Date();
    if (
      request.status === ChatApprovalStatus.PENDING &&
      request.expiresAt &&
      request.expiresAt <= now
    ) {
      await this.careChatRequestRepository.updateRequest(request.id, {
        status: ChatApprovalStatus.EXPIRED,
      });
      throw new NotFoundException({
        messageKey: 'careChat.errors.requestExpired',
        error: 'CARE_CHAT_REQUEST_EXPIRED',
      });
    }

    this.validateCareChatApprovalTransitionService.assertDecisionAllowed({
      currentStatus: request.status,
      decision: input.payload.decision,
    });

    const updated = await this.careChatRequestRepository.withTransaction(
      async (tx) => {
        if (input.payload.decision === 'REJECT') {
          return this.careChatRequestRepository.updateRequest(
            request.id,
            {
              status: ChatApprovalStatus.REJECTED,
              reviewedByUserId: input.userId,
              reviewedAt: now,
              rejectedAt: now,
              internalReviewNote: input.payload.note?.trim() || null,
            },
            tx,
          );
        }

        const expiresAt = input.payload.expiresAt
          ? new Date(input.payload.expiresAt)
          : (request.expiresAt ?? this.defaultApprovalExpiry(now));

        const conversation =
          await this.careChatConversationRepository.createApprovedConversation({
            patientId: request.patientId,
            patientUserId: request.patient.userId,
            practitionerId: request.practitionerId,
            practitionerUserId: request.practitioner.userId,
            requestId: request.id,
            sessionId: request.relatedSessionId,
            expiresAt,
            tx,
          });

        await this.careChatRequestRepository.createApprovalNoticeMessage(
          {
            conversationId: conversation.id,
            actorRole: 'ADMIN',
            message:
              'تمت الموافقة على طلب الدردشة المهنية. هذه المحادثة متاحة أثناء كونها نشطة.',
          },
          tx,
        );

        return this.careChatRequestRepository.updateRequest(
          request.id,
          {
            status: ChatApprovalStatus.APPROVED,
            reviewedByUserId: input.userId,
            reviewedAt: now,
            approvedAt: now,
            internalReviewNote: input.payload.note?.trim() || null,
            expiresAt,
            linkedConversationId: conversation.id,
          },
          tx,
        );
      },
    );

    this.logger.log(
      `Care chat request decided (request=${request.id}, decision=${input.payload.decision}, reviewer=${input.userId})`,
    );

    if (updated.status === ChatApprovalStatus.APPROVED) {
      await this.operationalNotificationService.notifyCareChatRequestApproved({
        patientProfileId: request.patientId,
        practitionerProfileId: request.practitionerId,
        requestId: request.id,
        conversationId: updated.linkedConversationId,
      });
    }

    if (updated.status === ChatApprovalStatus.REJECTED) {
      await this.operationalNotificationService.notifyCareChatRequestRejected({
        patientProfileId: request.patientId,
        requestId: request.id,
      });
    }

    return {
      decision: input.payload.decision,
      item: this.careChatPresenter.presentAdminRequestItem(updated),
    };
  }

  private defaultApprovalExpiry(now: Date) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() + CARE_CHAT_DEFAULT_EXPIRY_DAYS);
    return date;
  }
}
