import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { CareSignalContextRepository } from '@modules/care-experience-intelligence/repositories/care-signal-context.repository';
import { BuildAssessmentDerivedRecommendationsService } from '@modules/care-experience-intelligence/services/build-assessment-derived-recommendations.service';
import { BuildNormalizedCareSignalContextService } from '@modules/care-experience-intelligence/services/build-normalized-care-signal-context.service';
import { InterpretAssessmentCareIntentService } from '@modules/care-experience-intelligence/services/interpret-assessment-care-intent.service';
import { RecommendationPrecedenceService } from '@modules/care-experience-intelligence/services/recommendation-precedence.service';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { MatchingController } from './controllers/matching.controller';
import { MatchingPresenter } from './presenters/matching.presenter';
import { MatchingSessionAccessPolicy } from './policies/matching-session-access.policy';
import { MatchingCandidateRepository } from './repositories/matching-candidate.repository';
import { MatchingPatientRepository } from './repositories/matching-patient.repository';
import { MatchingSessionRepository } from './repositories/matching-session.repository';
import { BuildMatchingRationaleService } from './services/build-matching-rationale.service';
import { NormalizeMatchingInputService } from './services/normalize-matching-input.service';
import { ScorePractitionerMatchService } from './services/score-practitioner-match.service';
import { CreateMatchingSessionUseCase } from './use-cases/create-matching-session.use-case';
import { GetMatchingSessionUseCase } from './use-cases/get-matching-session.use-case';

@Module({
  controllers: [MatchingController],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    RecommendationPrecedenceService,
    CareSignalContextRepository,
    InterpretAssessmentCareIntentService,
    BuildNormalizedCareSignalContextService,
    BuildAssessmentDerivedRecommendationsService,
    PublicPractitionerVisibilityPolicy,
    MatchingSessionAccessPolicy,
    MatchingPresenter,
    MatchingPatientRepository,
    MatchingSessionRepository,
    MatchingCandidateRepository,
    NormalizeMatchingInputService,
    ScorePractitionerMatchService,
    BuildMatchingRationaleService,
    CreateMatchingSessionUseCase,
    GetMatchingSessionUseCase,
  ],
})
export class MatchingModule {}
