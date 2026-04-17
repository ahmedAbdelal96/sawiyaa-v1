import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AssessmentsAuthoringAdminModule } from './admin-authoring/assessments-authoring-admin.module';
import { AssessmentSubmissionsController } from './controllers/assessment-submissions.controller';
import { PatientAssessmentsController } from './controllers/patient-assessments.controller';
import { PublicAssessmentsController } from './controllers/public-assessments.controller';
import { AssessmentSubmissionAccessPolicy } from './policies/assessment-submission-access.policy';
import { AssessmentPresenter } from './presenters/assessment.presenter';
import { AssessmentDefinitionRepository } from './repositories/assessment-definition.repository';
import { AssessmentPatientRepository } from './repositories/assessment-patient.repository';
import { AssessmentSubmissionRepository } from './repositories/assessment-submission.repository';
import { BuildAssessmentNextStepService } from './services/build-assessment-next-step.service';
import { BuildAssessmentResultSummaryService } from './services/build-assessment-result-summary.service';
import { MapAssessmentResultBandService } from './services/map-assessment-result-band.service';
import { ScoreAssessmentSubmissionService } from './services/score-assessment-submission.service';
import { ValidateAssessmentSubmissionService } from './services/validate-assessment-submission.service';
import { GetAssessmentDefinitionUseCase } from './use-cases/get-assessment-definition.use-case';
import { GetMyAssessmentSubmissionUseCase } from './use-cases/get-my-assessment-submission.use-case';
import { GetMyAssessmentsHistoryUseCase } from './use-cases/get-my-assessments-history.use-case';
import { ListActiveAssessmentsUseCase } from './use-cases/list-active-assessments.use-case';
import { SubmitAssessmentUseCase } from './use-cases/submit-assessment.use-case';

@Module({
  imports: [AssessmentsAuthoringAdminModule],
  controllers: [
    PublicAssessmentsController,
    AssessmentSubmissionsController,
    PatientAssessmentsController,
  ],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    AssessmentSubmissionAccessPolicy,
    AssessmentPresenter,
    AssessmentDefinitionRepository,
    AssessmentPatientRepository,
    AssessmentSubmissionRepository,
    ValidateAssessmentSubmissionService,
    ScoreAssessmentSubmissionService,
    MapAssessmentResultBandService,
    BuildAssessmentResultSummaryService,
    BuildAssessmentNextStepService,
    ListActiveAssessmentsUseCase,
    GetAssessmentDefinitionUseCase,
    SubmitAssessmentUseCase,
    GetMyAssessmentsHistoryUseCase,
    GetMyAssessmentSubmissionUseCase,
  ],
})
export class AssessmentsModule {}
