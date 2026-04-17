import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
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
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { AssessmentSubmissionResultSuccessResponseDto } from '../dto/assessment-response.dto';
import { SubmitAssessmentDto } from '../dto/submit-assessment.dto';
import { SubmitAssessmentUseCase } from '../use-cases/submit-assessment.use-case';

@ApiTags('Assessments')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.PATIENT)
@Controller('assessments')
export class AssessmentSubmissionsController {
  constructor(private readonly submitAssessmentUseCase: SubmitAssessmentUseCase) {}

  @Post(':slug/submissions')
  @ApiOperation({
    summary: 'Submit completed assessment responses',
    description:
      'Validates required answers, calculates deterministic result, persists submission snapshots, and returns a non-diagnostic result payload.',
  })
  @ApiBody({ type: SubmitAssessmentDto })
  @ApiResponse({ status: 201, type: AssessmentSubmissionResultSuccessResponseDto })
  @ApiBadRequestResponse({
    description:
      'Malformed answers, required questions missing, duplicate question answers, or option mismatch',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts can submit assessments',
  })
  @ApiNotFoundResponse({
    description: 'Patient profile or assessment definition was not found',
  })
  submit(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('slug') slug: string,
    @Body() body: SubmitAssessmentDto,
  ) {
    return this.submitAssessmentUseCase
      .execute({
        userId: currentUser.id,
        locale,
        slug,
        payload: body,
      })
      .then((data) => ({
        success: true as const,
        data,
      }));
  }
}
