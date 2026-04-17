import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AppLoggerService } from '@common/logging/app-logger.service';
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
import { AdminModerationReportsController } from './controllers/admin-moderation-reports.controller';
import { ModerationReportsController } from './controllers/moderation-reports.controller';
import { ModerationPresenter } from './presenters/moderation.presenter';
import { ModerationRepository } from './repositories/moderation.repository';
import { ExecuteModerationSurfaceEnforcementService } from './services/execute-moderation-surface-enforcement.service';
import { ResolveModerationReporterRoleService } from './services/resolve-moderation-reporter-role.service';
import { ValidateModerationActionTransitionService } from './services/validate-moderation-action-transition.service';
import { CreateModerationReportUseCase } from './use-cases/create-moderation-report.use-case';
import { ExecuteModerationActionUseCase } from './use-cases/execute-moderation-action.use-case';
import { GetModerationCaseUseCase } from './use-cases/get-moderation-case.use-case';
import { ListModerationCasesUseCase } from './use-cases/list-moderation-cases.use-case';

@Module({
  controllers: [ModerationReportsController, AdminModerationReportsController],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    AppLoggerService,
    ModerationPresenter,
    ModerationRepository,
    ArticleRepository,
    ValidateArticleStatusTransitionService,
    CareChatRequestRepository,
    CareChatConversationRepository,
    ValidateCareChatApprovalTransitionService,
    ReviewRepository,
    ValidateReviewModerationTransitionService,
    UpdatePractitionerRatingSummaryService,
    SupportTicketRepository,
    ValidateSupportTicketStatusTransitionService,
    ResolveSupportAdminActorRoleService,
    ResolveModerationReporterRoleService,
    ValidateModerationActionTransitionService,
    ExecuteModerationSurfaceEnforcementService,
    CreateModerationReportUseCase,
    ListModerationCasesUseCase,
    GetModerationCaseUseCase,
    ExecuteModerationActionUseCase,
  ],
  exports: [CreateModerationReportUseCase],
})
export class ModerationModule {}
