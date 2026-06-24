import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { ArticlePresenter } from '@modules/articles/presenters/article.presenter';
import { ArticleRepository } from '@modules/articles/repositories/article.repository';
import { BuildPublicArticleTrustMetadataService } from '@modules/articles/services/build-public-article-trust-metadata.service';
import { ListPublicArticlesUseCase } from '@modules/articles/use-cases/list-public-articles.use-case';
import { AdminReviewsController } from './controllers/admin-reviews.controller';
import { PatientReviewsController } from './controllers/patient-reviews.controller';
import { PublicPractitionerReviewsController } from './controllers/public-practitioner-reviews.controller';
import { PublicPractitionerTrustBlockController } from './controllers/public-practitioner-trust-block.controller';
import { PublicPractitionerTrustSummaryController } from './controllers/public-practitioner-trust-summary.controller';
import { ReviewPresenter } from './presenters/review.presenter';
import { ReviewActorRepository } from './repositories/review-actor.repository';
import { ReviewRepository } from './repositories/review.repository';
import { BuildPublicTrustConversionContentQueryService } from './services/build-public-trust-conversion-content-query.service';
import { BuildPractitionerCredibilitySummaryService } from './services/build-practitioner-credibility-summary.service';
import { ReviewSessionRepository } from './repositories/review-session.repository';
import { ValidateReviewModerationTransitionService } from './services/validate-review-moderation-transition.service';
import { ValidateSessionReviewEligibilityService } from './services/validate-session-review-eligibility.service';
import { SessionReviewRatingAggregationService } from './services/session-review-rating-aggregation.service';
import { CreateSessionReviewUseCase } from './use-cases/create-session-review.use-case';
import { GetAdminReviewUseCase } from './use-cases/get-admin-review.use-case';
import { GetMyReviewUseCase } from './use-cases/get-my-review.use-case';
import { GetPublicPractitionerTrustBlockUseCase } from './use-cases/get-public-practitioner-trust-block.use-case';
import { GetPublicPractitionerTrustSummaryUseCase } from './use-cases/get-public-practitioner-trust-summary.use-case';
import { ListAdminReviewsUseCase } from './use-cases/list-admin-reviews.use-case';
import { ListMyReviewsUseCase } from './use-cases/list-my-reviews.use-case';
import { ListPublicPractitionerReviewsUseCase } from './use-cases/list-public-practitioner-reviews.use-case';
import { ModerateReviewUseCase } from './use-cases/moderate-review.use-case';

@Module({
  controllers: [
    PatientReviewsController,
    AdminReviewsController,
    PublicPractitionerReviewsController,
    PublicPractitionerTrustSummaryController,
    PublicPractitionerTrustBlockController,
  ],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    BuildPublicArticleTrustMetadataService,
    ArticlePresenter,
    ArticleRepository,
    ListPublicArticlesUseCase,
    BuildPublicTrustConversionContentQueryService,
    ReviewPresenter,
    ReviewActorRepository,
    ReviewRepository,
    ReviewSessionRepository,
    BuildPractitionerCredibilitySummaryService,
    SessionReviewRatingAggregationService,
    ValidateSessionReviewEligibilityService,
    ValidateReviewModerationTransitionService,
    CreateSessionReviewUseCase,
    ListMyReviewsUseCase,
    GetMyReviewUseCase,
    GetPublicPractitionerTrustBlockUseCase,
    GetPublicPractitionerTrustSummaryUseCase,
    ListAdminReviewsUseCase,
    GetAdminReviewUseCase,
    ModerateReviewUseCase,
    ListPublicPractitionerReviewsUseCase,
  ],
  exports: [SessionReviewRatingAggregationService],
})
export class ReviewsModule {}
