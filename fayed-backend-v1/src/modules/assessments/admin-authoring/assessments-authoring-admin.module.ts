import { Module } from '@nestjs/common';
import { ActiveAccountGuard } from '@common/guards/account-state/active-account.guard';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AdminGuard } from '@common/guards/authorization/admin.guard';
import { BuildAssessmentNextStepService } from '@modules/assessments/services/build-assessment-next-step.service';
import { BuildAssessmentResultSummaryService } from '@modules/assessments/services/build-assessment-result-summary.service';
import { MapAssessmentResultBandService } from '@modules/assessments/services/map-assessment-result-band.service';
import { ScoreAssessmentSubmissionService } from '@modules/assessments/services/score-assessment-submission.service';
import { ValidateAssessmentSubmissionService } from '@modules/assessments/services/validate-assessment-submission.service';
import { AdminAssessmentsAuthoringController } from './controllers/admin-assessments-authoring.controller';
import { AdminAssessmentAuthoringRepository } from './repositories/admin-assessment-authoring.repository';
import { AdminAssessmentLifecyclePolicy } from './services/admin-assessment-lifecycle.policy';
import { AdminAssessmentPublishValidatorService } from './services/admin-assessment-publish-validator.service';
import { AdminAssessmentScoringConfigValidatorService } from './services/admin-assessment-scoring-config-validator.service';
import { AdminAssessmentAuthoringDefinitionsUseCase } from './use-cases/admin-assessment-authoring-definitions.use-case';
import { AdminAssessmentAuthoringLifecycleUseCase } from './use-cases/admin-assessment-authoring-lifecycle.use-case';
import { AdminAssessmentAuthoringQuestionsUseCase } from './use-cases/admin-assessment-authoring-questions.use-case';

@Module({
  controllers: [AdminAssessmentsAuthoringController],
  providers: [
    JwtAccessAuthGuard,
    AdminGuard,
    ActiveAccountGuard,
    AdminAssessmentAuthoringRepository,
    AdminAssessmentLifecyclePolicy,
    AdminAssessmentPublishValidatorService,
    AdminAssessmentScoringConfigValidatorService,
    ValidateAssessmentSubmissionService,
    ScoreAssessmentSubmissionService,
    MapAssessmentResultBandService,
    BuildAssessmentResultSummaryService,
    BuildAssessmentNextStepService,
    AdminAssessmentAuthoringDefinitionsUseCase,
    AdminAssessmentAuthoringQuestionsUseCase,
    AdminAssessmentAuthoringLifecycleUseCase,
  ],
})
export class AssessmentsAuthoringAdminModule {}
