import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { PatientJourneySuccessResponseDto } from '../dto/patient-journey-response.dto';
import { GetMyPatientJourneyUseCase } from '../use-cases/get-my-patient-journey.use-case';

@ApiTags('Patient Journey')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.PATIENT)
@Controller('patients/me/journey')
export class PatientJourneyController {
  constructor(
    private readonly getMyPatientJourneyUseCase: GetMyPatientJourneyUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get a curated patient journey summary',
    description:
      'Aggregates upcoming care, recent history, support snapshot, and deterministic next-step guidance for the authenticated patient.',
  })
  @ApiResponse({ status: 200, type: PatientJourneySuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access patient journey',
  })
  @ApiNotFoundResponse({ description: 'Patient profile was not found' })
  async getJourney(@CurrentUser() currentUser: AuthenticatedUser) {
    const result = await this.getMyPatientJourneyUseCase.execute({
      userId: currentUser.id,
    });

    return {
      success: true as const,
      data: result,
    };
  }
}
