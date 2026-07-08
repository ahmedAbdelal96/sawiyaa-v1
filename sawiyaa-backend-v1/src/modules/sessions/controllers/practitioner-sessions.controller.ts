import {
  Controller,
  Body,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
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
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ListSessionsDto } from '../dto/list-sessions.dto';
import {
  SessionItemSuccessResponseDto,
  SessionsListSuccessResponseDto,
} from '../dto/session-response.dto';
import { PractitionerSessionSummarySuccessResponseDto } from '../dto/practitioner-session-summary-response.dto';
import {
  SessionJoinItemSuccessResponseDto,
  SessionRoomCloseItemSuccessResponseDto,
  SessionRuntimeItemSuccessResponseDto,
} from '../dto/session-runtime-response.dto';
import { CloseSessionVideoRoomDto } from '../dto/close-session-video-room.dto';
import { GetMyPractitionerSessionsUseCase } from '../use-cases/get-my-practitioner-sessions.use-case';
import { GetMyPractitionerSessionSummaryUseCase } from '../use-cases/get-my-practitioner-session-summary.use-case';
import { GetSessionDetailsUseCase } from '../use-cases/get-session-details.use-case';
import { CloseSessionVideoRoomByPractitionerUseCase } from '../use-cases/close-session-video-room-by-practitioner.use-case';
import { MarkSessionCompletedByPractitionerUseCase } from '../use-cases/mark-session-completed-by-practitioner.use-case';
import { MarkSessionNoShowByPractitionerUseCase } from '../use-cases/mark-session-no-show-by-practitioner.use-case';
import { PrepareSessionRuntimeUseCase } from '../use-cases/prepare-session-runtime.use-case';
import { ResolveSessionJoinContractUseCase } from '../use-cases/resolve-session-join-contract.use-case';

/**
 * Practitioner sessions controller is the practitioner-owned operational read surface.
 * It exposes scheduled consultation records without taking over presence or availability responsibilities.
 */
@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(
  AccountStateRequirement.ACTIVE_ACCOUNT,
  AccountStateRequirement.PRACTITIONER_OTP_VERIFIED,
  AccountStateRequirement.PRACTITIONER_APPROVED,
)
@Roles(AppRole.PRACTITIONER)
@Controller('practitioners/me/sessions')
export class PractitionerSessionsController {
  constructor(
    private readonly getMyPractitionerSessionsUseCase: GetMyPractitionerSessionsUseCase,
    private readonly getMyPractitionerSessionSummaryUseCase: GetMyPractitionerSessionSummaryUseCase,
    private readonly getSessionDetailsUseCase: GetSessionDetailsUseCase,
    private readonly closeSessionVideoRoomByPractitionerUseCase: CloseSessionVideoRoomByPractitionerUseCase,
    private readonly markSessionCompletedByPractitionerUseCase: MarkSessionCompletedByPractitionerUseCase,
    private readonly markSessionNoShowByPractitionerUseCase: MarkSessionNoShowByPractitionerUseCase,
    private readonly prepareSessionRuntimeUseCase: PrepareSessionRuntimeUseCase,
    private readonly resolveSessionJoinContractUseCase: ResolveSessionJoinContractUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List current practitioner sessions',
    description:
      'Returns practitioner-owned scheduled sessions with stable pagination and optional lifecycle filtering.',
  })
  @ApiResponse({ status: 200, type: SessionsListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Query() query: ListSessionsDto,
  ) {
    return this.getMyPractitionerSessionsUseCase.execute({
      userId: currentUser.id,
      locale,
      query,
    });
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get a practitioner session summary',
    description:
      'Returns practitioner session counts grouped by the shared presentation policy for dashboard-style rendering.',
  })
  @ApiResponse({ status: 200, type: PractitionerSessionSummarySuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  summary(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.getMyPractitionerSessionSummaryUseCase.execute({
      userId: currentUser.id,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a practitioner-owned session details view',
    description:
      'Returns a single session details view only when it belongs to the authenticated practitioner.',
  })
  @ApiParam({ name: 'id', description: 'Session id' })
  @ApiResponse({ status: 200, type: SessionItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
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
      actorType: 'PRACTITIONER',
    });
  }

  @Post(':id/runtime/prepare')
  @ApiOperation({
    summary: 'Prepare session video runtime',
    description:
      'Prepares provider room/runtime for a practitioner-owned video session. Operation is idempotent for already prepared sessions.',
  })
  @ApiParam({ name: 'id', description: 'Session id' })
  @ApiResponse({ status: 201, type: SessionRuntimeItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, OTP-verified access, and owned session',
  })
  @ApiNotFoundResponse({ description: 'Session was not found' })
  prepareRuntime(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    return this.prepareSessionRuntimeUseCase.execute({
      userId: currentUser.id,
      sessionId,
      actorType: 'PRACTITIONER',
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
      'Route requires practitioner role, active account, OTP-verified access, and owned session',
  })
  @ApiNotFoundResponse({ description: 'Session was not found' })
  resolveJoin(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    return this.resolveSessionJoinContractUseCase.execute({
      userId: currentUser.id,
      sessionId,
      actorType: 'PRACTITIONER',
    });
  }

  @Post(':id/runtime/close')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Close session video room',
    description:
      'Closes a practitioner-owned video room after the session has started and blocks further join/rejoin attempts.',
  })
  @ApiParam({ name: 'id', description: 'Session id' })
  @ApiResponse({ status: 200, type: SessionRoomCloseItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, OTP-verified access, and owned session',
  })
  @ApiNotFoundResponse({ description: 'Session was not found' })
  @ApiConflictResponse({
    description: 'Session room close is not allowed in the current state',
  })
  closeRuntime(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') sessionId: string,
    @Body() body: CloseSessionVideoRoomDto,
  ) {
    return this.closeSessionVideoRoomByPractitionerUseCase.execute({
      userId: currentUser.id,
      sessionId,
      payload: body,
    });
  }

  @Post(':id/mark-completed')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Mark a practitioner-owned session as completed',
    description:
      'Transitions a practitioner-owned session to COMPLETED when the current lifecycle state allows it.',
  })
  @ApiParam({ name: 'id', description: 'Session id' })
  @ApiResponse({ status: 200, type: SessionItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, OTP-verified access, and owned session',
  })
  @ApiNotFoundResponse({ description: 'Session was not found' })
  @ApiConflictResponse({
    description: 'Current lifecycle status cannot transition to COMPLETED',
  })
  markCompleted(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') sessionId: string,
  ) {
    return this.markSessionCompletedByPractitionerUseCase.execute({
      userId: currentUser.id,
      locale,
      sessionId,
    });
  }

  @Post(':id/mark-no-show')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Mark a practitioner-owned session as no-show',
    description:
      'Transitions a practitioner-owned session to NO_SHOW when the current lifecycle state allows it.',
  })
  @ApiParam({ name: 'id', description: 'Session id' })
  @ApiResponse({ status: 200, type: SessionItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, OTP-verified access, and owned session',
  })
  @ApiNotFoundResponse({ description: 'Session was not found' })
  @ApiConflictResponse({
    description: 'Current lifecycle status cannot transition to NO_SHOW',
  })
  markNoShow(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') sessionId: string,
  ) {
    return this.markSessionNoShowByPractitionerUseCase.execute({
      userId: currentUser.id,
      locale,
      sessionId,
    });
  }
}
