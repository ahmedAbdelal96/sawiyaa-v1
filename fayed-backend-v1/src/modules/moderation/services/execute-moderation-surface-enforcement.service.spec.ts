import { AppRole } from '@common/enums/app-role.enum';
import { PrismaService } from '@common/prisma/prisma.service';
import {
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
import { SupportTicketRepository } from '@modules/support/repositories/support-ticket.repository';
import { ResolveSupportAdminActorRoleService } from '@modules/support/services/resolve-support-admin-actor-role.service';
import { ValidateSupportTicketStatusTransitionService } from '@modules/support/services/validate-support-ticket-status-transition.service';
import { ExecuteModerationSurfaceEnforcementService } from './execute-moderation-surface-enforcement.service';

describe('ExecuteModerationSurfaceEnforcementService', () => {
  const prisma = {
    conversation: { findFirst: jest.fn() },
    message: { findFirst: jest.fn(), update: jest.fn() },
  } as unknown as PrismaService;
  const careChatRequestRepository = {
    findById: jest.fn(),
    withTransaction: jest.fn(),
    createModerationAction: jest.fn(),
    updateRequest: jest.fn(),
  } as unknown as CareChatRequestRepository;
  const careChatConversationRepository = {
    updateConversationStatus: jest.fn(),
  } as unknown as CareChatConversationRepository;
  const validateCareChatApprovalTransitionService = {
    assertRevokeAllowed: jest.fn(),
  } as unknown as ValidateCareChatApprovalTransitionService;
  const reviewRepository = {
    findById: jest.fn(),
    withTransaction: jest.fn(),
    updateReview: jest.fn(),
    createModerationEntry: jest.fn(),
  } as unknown as ReviewRepository;
  const validateReviewModerationTransitionService = {
    resolveNextState: jest.fn(),
  } as unknown as ValidateReviewModerationTransitionService;
  const updatePractitionerRatingSummaryService = {
    execute: jest.fn(),
  } as unknown as UpdatePractitionerRatingSummaryService;
  const articleRepository = {
    findArticleById: jest.fn(),
    updateArticle: jest.fn(),
  } as unknown as ArticleRepository;
  const validateArticleStatusTransitionService = {
    assertCanArchive: jest.fn(),
  } as unknown as ValidateArticleStatusTransitionService;
  const supportTicketRepository = {
    findByIdForAdmin: jest.fn(),
    updateStatus: jest.fn(),
  } as unknown as SupportTicketRepository;
  const validateSupportTicketStatusTransitionService = {
    assertValid: jest.fn(),
  } as unknown as ValidateSupportTicketStatusTransitionService;
  const resolveSupportAdminActorRoleService = {
    resolve: jest.fn(),
  } as unknown as ResolveSupportAdminActorRoleService;

  const service = new ExecuteModerationSurfaceEnforcementService(
    prisma,
    careChatRequestRepository,
    careChatConversationRepository,
    validateCareChatApprovalTransitionService,
    reviewRepository,
    validateReviewModerationTransitionService,
    updatePractitionerRatingSummaryService,
    articleRepository,
    validateArticleStatusTransitionService,
    supportTicketRepository,
    validateSupportTicketStatusTransitionService,
    resolveSupportAdminActorRoleService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enforces review hide through review moderation path', async () => {
    (reviewRepository.findById as jest.Mock).mockResolvedValue({
      id: 'review_1',
      practitionerId: 'pr_1',
      reviewStatus: 'PUBLISHED',
    });
    (validateReviewModerationTransitionService.resolveNextState as jest.Mock).mockReturnValue(
      {
        status: 'HIDDEN',
        publishedAt: null,
        hiddenAt: new Date('2026-03-31T22:00:00.000Z'),
        archivedAt: null,
      },
    );
    (reviewRepository.withTransaction as jest.Mock).mockImplementation(async (r) =>
      r({}),
    );

    await service.execute({
      action: ModerationCaseActionType.ENFORCE_REVIEW_HIDE,
      targetType: ModerationReportTargetType.REVIEW,
      targetId: 'review_1',
      actorUserId: 'admin_1',
      actorRoles: [AppRole.ADMIN],
      reason: 'policy',
      note: 'hide',
    });

    expect(reviewRepository.updateReview).toHaveBeenCalledTimes(1);
    expect(reviewRepository.createModerationEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        moderationAction: ReviewModerationAction.HIDDEN,
      }),
      expect.anything(),
    );
    expect(updatePractitionerRatingSummaryService.execute).toHaveBeenCalledTimes(1);
  });

  it('enforces support escalation for support message targets', async () => {
    (prisma.message.findFirst as jest.Mock).mockResolvedValue({
      conversation: { supportTicketId: 'ticket_1' },
    });
    (supportTicketRepository.findByIdForAdmin as jest.Mock).mockResolvedValue({
      id: 'ticket_1',
      status: SupportTicketStatus.OPEN,
    });
    (resolveSupportAdminActorRoleService.resolve as jest.Mock).mockReturnValue(
      'ADMIN',
    );

    await service.execute({
      action: ModerationCaseActionType.ENFORCE_SUPPORT_ESCALATE,
      targetType: ModerationReportTargetType.SUPPORT_MESSAGE,
      targetId: 'msg_1',
      actorUserId: 'admin_1',
      actorRoles: [AppRole.ADMIN],
      reason: 'safety',
      note: 'urgent',
    });

    expect(validateSupportTicketStatusTransitionService.assertValid).toHaveBeenCalledWith(
      {
        currentStatus: SupportTicketStatus.OPEN,
        nextStatus: SupportTicketStatus.ESCALATED,
      },
    );
    expect(supportTicketRepository.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: 'ticket_1',
        status: SupportTicketStatus.ESCALATED,
      }),
    );
  });
});
