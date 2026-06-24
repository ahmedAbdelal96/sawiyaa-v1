import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
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
import { CancelSessionDto } from '../dto/cancel-session.dto';
import { SessionCancellationPreviewSuccessResponseDto } from '../dto/session-cancellation-preview.dto';
import { CreateScheduledSessionDto } from '../dto/create-scheduled-session.dto';
import { ListSessionsDto } from '../dto/list-sessions.dto';
import { PatientSessionSummarySuccessResponseDto } from '../dto/patient-session-summary-response.dto';
import {
  SessionItemSuccessResponseDto,
  SessionsListSuccessResponseDto,
} from '../dto/session-response.dto';
import {
  SessionJoinItemSuccessResponseDto,
  SessionRuntimeItemSuccessResponseDto,
} from '../dto/session-runtime-response.dto';
import { PrepareSessionRuntimeUseCase } from '../use-cases/prepare-session-runtime.use-case';
import { ResolveSessionJoinContractUseCase } from '../use-cases/resolve-session-join-contract.use-case';
import { CancelSessionUseCase } from '../use-cases/cancel-session.use-case';
import { CreateScheduledSessionUseCase } from '../use-cases/create-scheduled-session.use-case';
import { GetMyPatientSessionsUseCase } from '../use-cases/get-my-patient-sessions.use-case';
import { GetMyPatientSessionSummaryUseCase } from '../use-cases/get-my-patient-session-summary.use-case';
import { GetSessionDetailsUseCase } from '../use-cases/get-session-details.use-case';
import { PreviewSessionCancellationUseCase } from '../use-cases/preview-session-cancellation.use-case';

/**
 * Patient sessions controller owns only the authenticated patient's scheduled consultation flows.
 * It intentionally excludes practitioner-side operations, instant booking, and payment gateway orchestration.
 */
@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.PATIENT)
@Controller('patients/me/sessions')
export class PatientSessionsController {
  constructor(
    private readonly createScheduledSessionUseCase: CreateScheduledSessionUseCase,
    private readonly getMyPatientSessionsUseCase: GetMyPatientSessionsUseCase,
    private readonly getMyPatientSessionSummaryUseCase: GetMyPatientSessionSummaryUseCase,
    private readonly getSessionDetailsUseCase: GetSessionDetailsUseCase,
    private readonly previewSessionCancellationUseCase: PreviewSessionCancellationUseCase,
    private readonly cancelSessionUseCase: CancelSessionUseCase,
    private readonly prepareSessionRuntimeUseCase: PrepareSessionRuntimeUseCase,
    private readonly resolveSessionJoinContractUseCase: ResolveSessionJoinContractUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a scheduled patient session',
    description:
      'Creates a scheduled consultation session in PENDING_PAYMENT after validating practitioner visibility, availability-derived windows, and collision rules.',
  })
  @ApiBody({ type: CreateScheduledSessionDto })
  @ApiResponse({ status: 201, type: SessionItemSuccessResponseDto })
  @ApiBadRequestResponse({
    description:
      'Datetime is invalid, session duration is invalid, requested window is unavailable, or start time is not in the future',
  })
  @ApiConflictResponse({
    description:
      'Practitioner or patient already has a blocking session in the requested range',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may create scheduled sessions',
  })
  @ApiNotFoundResponse({
    description: 'Patient profile or public practitioner was not found',
  })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Body() body: CreateScheduledSessionDto,
  ) {
    return this.createScheduledSessionUseCase.execute({
      userId: currentUser.id,
      locale,
      practitionerSlug: body.practitionerSlug,
      scheduledStartAt: body.scheduledStartAt,
      durationMinutes: body.durationMinutes,
      sessionMode: body.sessionMode,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'List current patient sessions',
    description:
      'Returns the authenticated patient session list with stable pagination and optional lifecycle filtering.',
  })
  @ApiResponse({ status: 200, type: SessionsListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may view patient sessions',
  })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Query() query: ListSessionsDto,
  ) {
    return this.getMyPatientSessionsUseCase.execute({
      userId: currentUser.id,
      locale,
      query,
    });
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get a patient session summary',
    description:
      'Returns patient session counts grouped by lifecycle and action needs for dashboard-style rendering.',
  })
  @ApiResponse({ status: 200, type: PatientSessionSummarySuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may view session summary',
  })
  summary(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.getMyPatientSessionSummaryUseCase.execute({
      userId: currentUser.id,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a patient-owned session details view',
    description:
      'Returns a single session details view only when it belongs to the authenticated patient.',
  })
  @ApiParam({ name: 'id', description: 'Session id' })
  @ApiResponse({ status: 200, type: SessionItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'The requested session does not belong to the authenticated patient',
  })
  @ApiNotFoundResponse({ description: 'Session was not found' })
  details(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') sessionId: string,
  ) {
    return this.getSessionDetailsUseCase.execute({
      userId: currentUser.id,
      locale,
      sessionId,
      actorType: 'PATIENT',
    });
  }

  @Post(':id/runtime/prepare')
  @ApiOperation({
    summary: 'Prepare session video runtime',
    description:
      'Prepares provider room/runtime for a patient-owned video session. Operation is idempotent for already prepared sessions.',
  })
  @ApiParam({ name: 'id', description: 'Session id' })
  @ApiResponse({ status: 201, type: SessionRuntimeItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only active patient accounts may prepare their own session runtime',
  })
  @ApiNotFoundResponse({ description: 'Session was not found' })
  prepareRuntime(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    return this.prepareSessionRuntimeUseCase.execute({
      userId: currentUser.id,
      sessionId,
      actorType: 'PATIENT',
    });
  }

  @Get(':id/runtime/join')
  @ApiOperation({
    summary: 'Resolve session join contract',
    description:
      'Returns backend-controlled join contract including canJoin, reason when blocked, and join token when join is allowed.',
  })
  @ApiParam({ name: 'id', description: 'Session id' })
  @ApiResponse({ status: 200, type: SessionJoinItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only active patient accounts may access their own session join contract',
  })
  @ApiNotFoundResponse({ description: 'Session was not found' })
  resolveJoin(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    return this.resolveSessionJoinContractUseCase.execute({
      userId: currentUser.id,
      sessionId,
      actorType: 'PATIENT',
    });
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel a patient-owned session',
    description:
      'Cancels a session only when lifecycle and active cancellation policy allow it. Cancellation outcome applies configured financial policy (wallet release/refund) safely.',
  })
  @ApiParam({ name: 'id', description: 'Session id' })
  @ApiBody({ type: CancelSessionDto })
  @ApiResponse({ status: 200, type: SessionItemSuccessResponseDto })
  @ApiConflictResponse({
    description:
      'Session is already cancelled or current lifecycle status cannot transition to CANCELLED',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may cancel their own sessions',
  })
  @ApiNotFoundResponse({ description: 'Session was not found' })
  cancel(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') sessionId: string,
    @Body() body: CancelSessionDto,
  ) {
    return this.cancelSessionUseCase.execute({
      userId: currentUser.id,
      locale,
      sessionId,
      reason: body.reason,
    });
  }

  @Get(':id/cancel-preview')
  @ApiOperation({
    summary: 'Preview patient session cancellation outcome',
    description:
      'Returns a policy-backed financial preview before confirmation, including allowed/not-allowed state and exact wallet/refund/release amounts.',
  })
  @ApiParam({ name: 'id', description: 'Session id' })
  @ApiResponse({
    status: 200,
    type: SessionCancellationPreviewSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only active patient accounts may preview cancellation on their own sessions',
  })
  @ApiNotFoundResponse({ description: 'Session was not found' })
  @ApiConflictResponse({
    description:
      'Cancellation policy cannot be evaluated because policy/rule/session schedule is missing',
  })
  previewCancellation(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') sessionId: string,
  ) {
    return this.previewSessionCancellationUseCase.execute({
      userId: currentUser.id,
      locale,
      sessionId,
    });
  }
}
