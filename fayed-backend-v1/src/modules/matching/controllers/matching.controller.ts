import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
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
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CreateMatchingSessionDto } from '../dto/create-matching-session.dto';
import { MatchingSessionSuccessResponseDto } from '../dto/matching-response.dto';
import { CreateMatchingSessionUseCase } from '../use-cases/create-matching-session.use-case';
import { GetMatchingSessionUseCase } from '../use-cases/get-matching-session.use-case';

/**
 * Guided matching controller provides decision-support recommendations.
 * It is intentionally separate from raw directory listing/search endpoints.
 */
@ApiTags('Guided Matching')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.PATIENT)
@Controller('matching/sessions')
export class MatchingController {
  constructor(
    private readonly createMatchingSessionUseCase: CreateMatchingSessionUseCase,
    private readonly getMatchingSessionUseCase: GetMatchingSessionUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create guided matching session and return ranked recommendations',
    description:
      'Creates a matching session, stores normalized answers, computes deterministic recommendations, and returns explainable rationale for each candidate.',
  })
  @ApiBody({ type: CreateMatchingSessionDto })
  @ApiResponse({ status: 201, type: MatchingSessionSuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Matching intake payload is invalid' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts can start guided matching',
  })
  @ApiNotFoundResponse({
    description: 'Patient profile was not found for the authenticated user',
  })
  async create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Body() body: CreateMatchingSessionDto,
  ) {
    const result = await this.createMatchingSessionUseCase.execute({
      userId: currentUser.id,
      locale,
      payload: body,
    });

    return {
      success: true as const,
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get guided matching session result',
    description:
      'Returns stored answers and recommendation results for the authenticated patient-owned matching session.',
  })
  @ApiParam({ name: 'id', description: 'Matching session id' })
  @ApiResponse({ status: 200, type: MatchingSessionSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Session is not accessible by the current patient account',
  })
  @ApiNotFoundResponse({
    description: 'Matching session was not found',
  })
  async getById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    const result = await this.getMatchingSessionUseCase.execute({
      userId: currentUser.id,
      sessionId,
    });

    return {
      success: true as const,
      data: result,
    };
  }
}
