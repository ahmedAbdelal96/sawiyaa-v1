import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { ArticlePresenter } from '@modules/articles/presenters/article.presenter';
import { ArticleRepository } from '@modules/articles/repositories/article.repository';
import { BuildPublicArticleTrustMetadataService } from '@modules/articles/services/build-public-article-trust-metadata.service';
import { ListPublicArticlesUseCase } from '@modules/articles/use-cases/list-public-articles.use-case';
import { CareSignalContextRepository } from '@modules/care-experience-intelligence/repositories/care-signal-context.repository';
import { BuildAssessmentDerivedRecommendationsService } from '@modules/care-experience-intelligence/services/build-assessment-derived-recommendations.service';
import { BuildNormalizedCareSignalContextService } from '@modules/care-experience-intelligence/services/build-normalized-care-signal-context.service';
import { InterpretAssessmentCareIntentService } from '@modules/care-experience-intelligence/services/interpret-assessment-care-intent.service';
import { MarketingPractitionerPlacementsModule } from '@modules/marketing-practitioner-placements/marketing-practitioner-placements.module';
import { RecommendationPrecedenceService } from '@modules/care-experience-intelligence/services/recommendation-precedence.service';
import { ReviewsModule } from '@modules/reviews/reviews.module';
import { PatientHomeController } from './controllers/patient-home.controller';
import { PatientJourneyController } from './controllers/patient-journey.controller';
import { PatientJourneyMapper } from './mappers/patient-journey.mapper';
import { PatientHomeRepository } from './repositories/patient-home.repository';
import { PatientJourneyPatientRepository } from './repositories/patient-journey-patient.repository';
import { PatientJourneyReadRepository } from './repositories/patient-journey-read.repository';
import { BuildPatientJourneyLinkedContentService } from './services/build-patient-journey-linked-content.service';
import { BuildPatientJourneyNextStepsService } from './services/build-patient-journey-next-steps.service';
import { GetMyPatientHomeUseCase } from './use-cases/get-my-patient-home.use-case';
import { GetMyPatientJourneyUseCase } from './use-cases/get-my-patient-journey.use-case';
import { TrackPatientPractitionerViewUseCase } from './use-cases/track-patient-practitioner-view.use-case';

@Module({
  imports: [MarketingPractitionerPlacementsModule, ReviewsModule],
  controllers: [PatientJourneyController, PatientHomeController],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    BuildPublicArticleTrustMetadataService,
    ArticlePresenter,
    ArticleRepository,
    ListPublicArticlesUseCase,
    RecommendationPrecedenceService,
    CareSignalContextRepository,
    InterpretAssessmentCareIntentService,
    BuildNormalizedCareSignalContextService,
    BuildAssessmentDerivedRecommendationsService,
    PatientJourneyMapper,
    PatientHomeRepository,
    PatientJourneyPatientRepository,
    PatientJourneyReadRepository,
    BuildPatientJourneyLinkedContentService,
    BuildPatientJourneyNextStepsService,
    GetMyPatientHomeUseCase,
    GetMyPatientJourneyUseCase,
    TrackPatientPractitionerViewUseCase,
  ],
})
export class PatientJourneyModule {}
