import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import {
  PatientAssessmentSubmissionDetailsSuccessResponseDto,
  PatientAssessmentsHistorySuccessResponseDto,
} from '../dto/assessment-response.dto';
import { ListPatientAssessmentsDto } from '../dto/list-patient-assessments.dto';
import { GetMyAssessmentSubmissionUseCase } from '../use-cases/get-my-assessment-submission.use-case';
import { GetMyAssessmentsHistoryUseCase } from '../use-cases/get-my-assessments-history.use-case';

@ApiTags('Assessments')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.PATIENT)
@Controller('patients/me/assessments')
export class PatientAssessmentsController {
  constructor(
    private readonly getMyAssessmentsHistoryUseCase: GetMyAssessmentsHistoryUseCase,
    private readonly getMyAssessmentSubmissionUseCase: GetMyAssessmentSubmissionUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List current patient assessment history',
    description:
      'Returns owned assessment submissions with stable pagination for patient journey history surfaces.',
  })
  @ApiResponse({ status: 200, type: PatientAssessmentsHistorySuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access this route',
  })
  history(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListPatientAssessmentsDto,
  ) {
    return this.getMyAssessmentsHistoryUseCase
      .execute({
        userId: currentUser.id,
        query,
      })
      .then((data) => ({
        success: true as const,
        data,
      }));
  }

  @Get(':submissionId')
  @ApiOperation({
    summary: 'Get one owned assessment submission details',
    description:
      'Returns a single owned assessment submission result view for the authenticated patient.',
  })
  @ApiParam({ name: 'submissionId', description: 'Assessment submission id' })
  @ApiResponse({
    status: 200,
    type: PatientAssessmentSubmissionDetailsSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'The requested submission does not belong to the authenticated patient',
  })
  @ApiNotFoundResponse({ description: 'Assessment submission was not found' })
  details(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('submissionId') submissionId: string,
  ) {
    return this.getMyAssessmentSubmissionUseCase
      .execute({
        userId: currentUser.id,
        submissionId,
      })
      .then((data) => ({
        success: true as const,
        data,
      }));
  }
}
