import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  ArticleStatus,
  ChatApprovalStatus,
  ConversationStatus,
  ConversationType,
  MessageVisibility,
  ModerationCaseActionType,
  ModerationReportTargetType,
  ReviewModerationAction,
  SupportTicketStatus,
} from '@prisma/client';
import { ArticleRepository } from '@modules/articles/repositories/article.repository';
import { ValidateArticleStatusTransitionService } from '@modules/articles/services/validate-article-status-transition.service';
import { CareChatConversationRepository } from '@modules/care-chat/repositories/care-chat-conversation.repository';
import { CareChatRequestRepository } from '@modules/care-chat/repositories/care-chat-request.repository';
import { ValidateCareChatApprovalTransitionService } from '@modules/care-chat/services/validate-care-chat-approval-transition.service';
import { ReviewRepository } from '@modules/reviews/repositories/review.repository';
import { UpdatePractitionerRatingSummaryService } from '@modules/reviews/services/update-practitioner-rating-summary.service';
import { ValidateReviewModerationTransitionService } from '@modules/reviews/services/validate-review-moderation-transition.service';
import { ResolveSupportAdminActorRoleService } from '@modules/support/services/resolve-support-admin-actor-role.service';
import { ValidateSupportTicketStatusTransitionService } from '@modules/support/services/validate-support-ticket-status-transition.service';
import { SupportTicketRepository } from '@modules/support/repositories/support-ticket.repository';

@Injectable()
export class ExecuteModerationSurfaceEnforcementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly careChatRequestRepository: CareChatRequestRepository,
    private readonly careChatConversationRepository: CareChatConversationRepository,
    private readonly validateCareChatApprovalTransitionService: ValidateCareChatApprovalTransitionService,
    private readonly reviewRepository: ReviewRepository,
    private readonly validateReviewModerationTransitionService: ValidateReviewModerationTransitionService,
    private readonly updatePractitionerRatingSummaryService: UpdatePractitionerRatingSummaryService,
    private readonly articleRepository: ArticleRepository,
    private readonly validateArticleStatusTransitionService: ValidateArticleStatusTransitionService,
    private readonly supportTicketRepository: SupportTicketRepository,
    private readonly validateSupportTicketStatusTransitionService: ValidateSupportTicketStatusTransitionService,
    private readonly resolveSupportAdminActorRoleService: ResolveSupportAdminActorRoleService,
  ) {}

  async execute(input: {
    action: ModerationCaseActionType;
    targetType: ModerationReportTargetType;
    targetId: string;
    actorUserId: string;
    actorRoles: AppRole[];
    reason: string | null;
    note: string | null;
  }): Promise<void> {
    switch (input.action) {
      case ModerationCaseActionType.ENFORCE_CARE_CHAT_REVOKE:
        return this.enforceCareChatRevoke(input);
      case ModerationCaseActionType.ENFORCE_CARE_CHAT_MESSAGE_HIDE:
        return this.enforceCareChatMessageHide(input);
      case ModerationCaseActionType.ENFORCE_REVIEW_HIDE:
        return this.enforceReview(input, ReviewModerationAction.HIDDEN);
      case ModerationCaseActionType.ENFORCE_REVIEW_REJECT:
        return this.enforceReview(input, ReviewModerationAction.REJECTED);
      case ModerationCaseActionType.ENFORCE_REVIEW_RESTORE:
        return this.enforceReview(input, ReviewModerationAction.RESTORED);
      case ModerationCaseActionType.ENFORCE_ARTICLE_ARCHIVE:
        return this.enforceArticleArchive(input);
      case ModerationCaseActionType.ENFORCE_SUPPORT_ESCALATE:
        return this.enforceSupportEscalation(input);
      default:
        return;
    }
  }

  private async enforceCareChatRevoke(input: {
    targetType: ModerationReportTargetType;
    targetId: string;
    actorUserId: string;
    note: string | null;
  }) {
    const requestId = await this.resolveCareChatRequestId(
      input.targetType,
      input.targetId,
    );

    const request = await this.careChatRequestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException({
        messageKey: 'moderation.errors.enforcementTargetReferenceNotFound',
        error: 'MODERATION_ENFORCEMENT_TARGET_REFERENCE_NOT_FOUND',
      });
    }

    this.validateCareChatApprovalTransitionService.assertRevokeAllowed(
      request.status,
    );

    const now = new Date();
    await this.careChatRequestRepository.withTransaction(async (tx) => {
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
        actedByUserId: input.actorUserId,
        actionNote: input.note,
        tx,
      });

      await this.careChatRequestRepository.updateRequest(
        request.id,
        {
          status: ChatApprovalStatus.REVOKED,
          revokedAt: now,
          reviewedByUserId: input.actorUserId,
          reviewedAt: now,
          internalReviewNote: input.note,
        },
        tx,
      );
    });
  }

  private async enforceCareChatMessageHide(input: {
    targetType: ModerationReportTargetType;
    targetId: string;
  }) {
    if (input.targetType !== ModerationReportTargetType.CARE_CHAT_MESSAGE) {
      throw new BadRequestException({
        messageKey: 'moderation.errors.invalidActionTargetCombination',
        error: 'MODERATION_INVALID_ACTION_TARGET_COMBINATION',
      });
    }

    const message = await this.prisma.message.findFirst({
      where: {
        id: input.targetId,
        deletedAt: null,
        conversation: {
          conversationType: ConversationType.CARE_APPROVED,
        },
      },
      select: { id: true, visibility: true },
    });
    if (!message) {
      throw new NotFoundException({
        messageKey: 'moderation.errors.enforcementTargetReferenceNotFound',
        error: 'MODERATION_ENFORCEMENT_TARGET_REFERENCE_NOT_FOUND',
      });
    }

    if (message.visibility !== MessageVisibility.HIDDEN_FROM_PARTIES) {
      await this.prisma.message.update({
        where: { id: message.id },
        data: { visibility: MessageVisibility.HIDDEN_FROM_PARTIES },
      });
    }
  }

  private async enforceReview(
    input: {
      targetType: ModerationReportTargetType;
      targetId: string;
      actorUserId: string;
      note: string | null;
    },
    action: ReviewModerationAction,
  ) {
    if (input.targetType !== ModerationReportTargetType.REVIEW) {
      throw new BadRequestException({
        messageKey: 'moderation.errors.invalidActionTargetCombination',
        error: 'MODERATION_INVALID_ACTION_TARGET_COMBINATION',
      });
    }

    const review = await this.reviewRepository.findById(input.targetId);
    if (!review) {
      throw new NotFoundException({
        messageKey: 'moderation.errors.enforcementTargetReferenceNotFound',
        error: 'MODERATION_ENFORCEMENT_TARGET_REFERENCE_NOT_FOUND',
      });
    }

    const now = new Date();
    const next = this.validateReviewModerationTransitionService.resolveNextState({
      currentStatus: review.reviewStatus,
      action,
      now,
    });

    await this.reviewRepository.withTransaction(async (tx) => {
      await this.reviewRepository.updateReview(
        review.id,
        {
          reviewStatus: next.status,
          publishedAt: next.publishedAt,
          hiddenAt: next.hiddenAt,
          archivedAt: next.archivedAt,
        },
        tx,
      );

      await this.reviewRepository.createModerationEntry(
        {
          sessionReviewId: review.id,
          reviewerUserId: input.actorUserId,
          moderationAction: action,
          moderationNote: input.note,
        },
        tx,
      );

      await this.updatePractitionerRatingSummaryService.execute({
        practitionerId: review.practitionerId,
        tx,
      });
    });
  }

  private async enforceArticleArchive(input: {
    targetType: ModerationReportTargetType;
    targetId: string;
  }) {
    if (input.targetType !== ModerationReportTargetType.ARTICLE) {
      throw new BadRequestException({
        messageKey: 'moderation.errors.invalidActionTargetCombination',
        error: 'MODERATION_INVALID_ACTION_TARGET_COMBINATION',
      });
    }

    const article = await this.articleRepository.findArticleById(input.targetId);
    if (!article) {
      throw new NotFoundException({
        messageKey: 'moderation.errors.enforcementTargetReferenceNotFound',
        error: 'MODERATION_ENFORCEMENT_TARGET_REFERENCE_NOT_FOUND',
      });
    }

    this.validateArticleStatusTransitionService.assertCanArchive(article.status);
    await this.articleRepository.updateArticle(article.id, {
      status: ArticleStatus.ARCHIVED,
      archivedAt: new Date(),
    });
  }

  private async enforceSupportEscalation(input: {
    targetType: ModerationReportTargetType;
    targetId: string;
    actorUserId: string;
    actorRoles: AppRole[];
  }) {
    const ticketId = await this.resolveSupportTicketId(
      input.targetType,
      input.targetId,
    );
    const ticket = await this.supportTicketRepository.findByIdForAdmin(ticketId);
    if (!ticket) {
      throw new NotFoundException({
        messageKey: 'moderation.errors.enforcementTargetReferenceNotFound',
        error: 'MODERATION_ENFORCEMENT_TARGET_REFERENCE_NOT_FOUND',
      });
    }

    if (ticket.status === SupportTicketStatus.ESCALATED) {
      return;
    }

    this.validateSupportTicketStatusTransitionService.assertValid({
      currentStatus: ticket.status,
      nextStatus: SupportTicketStatus.ESCALATED,
    });

    const actorRole = this.resolveSupportAdminActorRoleService.resolve(
      input.actorRoles,
    );
    await this.supportTicketRepository.updateStatus({
      ticketId: ticket.id,
      status: SupportTicketStatus.ESCALATED,
      actorUserId: input.actorUserId,
      actorRole,
    });
  }

  private async resolveCareChatRequestId(
    targetType: ModerationReportTargetType,
    targetId: string,
  ): Promise<string> {
    if (targetType === ModerationReportTargetType.CARE_CHAT_CONVERSATION) {
      const conversation = await this.prisma.conversation.findFirst({
        where: {
          id: targetId,
          conversationType: ConversationType.CARE_APPROVED,
          chatApprovalRequestId: { not: null },
        },
        select: { chatApprovalRequestId: true },
      });
      if (conversation?.chatApprovalRequestId) {
        return conversation.chatApprovalRequestId;
      }
    }

    if (targetType === ModerationReportTargetType.CARE_CHAT_MESSAGE) {
      const message = await this.prisma.message.findFirst({
        where: {
          id: targetId,
          deletedAt: null,
          conversation: {
            conversationType: ConversationType.CARE_APPROVED,
            chatApprovalRequestId: { not: null },
          },
        },
        select: {
          conversation: {
            select: { chatApprovalRequestId: true },
          },
        },
      });
      if (message?.conversation.chatApprovalRequestId) {
        return message.conversation.chatApprovalRequestId;
      }
    }

    throw new BadRequestException({
      messageKey: 'moderation.errors.invalidActionTargetCombination',
      error: 'MODERATION_INVALID_ACTION_TARGET_COMBINATION',
    });
  }

  private async resolveSupportTicketId(
    targetType: ModerationReportTargetType,
    targetId: string,
  ): Promise<string> {
    if (targetType === ModerationReportTargetType.SUPPORT_TICKET) {
      return targetId;
    }

    if (targetType === ModerationReportTargetType.SUPPORT_MESSAGE) {
      const message = await this.prisma.message.findFirst({
        where: {
          id: targetId,
          deletedAt: null,
          conversation: {
            conversationType: ConversationType.SUPPORT,
            supportTicketId: { not: null },
          },
        },
        select: {
          conversation: {
            select: {
              supportTicketId: true,
            },
          },
        },
      });
      if (message?.conversation.supportTicketId) {
        return message.conversation.supportTicketId;
      }
    }

    throw new BadRequestException({
      messageKey: 'moderation.errors.invalidActionTargetCombination',
      error: 'MODERATION_INVALID_ACTION_TARGET_COMBINATION',
    });
  }
}
