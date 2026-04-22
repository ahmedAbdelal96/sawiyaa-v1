import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
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
import { MyPresenceSuccessResponseDto } from '../dto/presence-response.dto';
import { SetMyInstantBookingAvailabilityDto } from '../dto/set-my-instant-booking-availability.dto';
import { SetMyPresenceStatusDto } from '../dto/set-my-presence-status.dto';
import { GetMyPresenceUseCase } from '../use-cases/get-my-presence.use-case';
import { HeartbeatMyPresenceUseCase } from '../use-cases/heartbeat-my-presence.use-case';
import { SetMyInstantBookingAvailabilityUseCase } from '../use-cases/set-my-instant-booking-availability.use-case';
import { SetMyPresenceStatusUseCase } from '../use-cases/set-my-presence-status.use-case';

/**
 * Presence self-service controller manages only the current practitioner's live state.
 * It intentionally does not encode schedule management or session lifecycle behavior.
 */
@ApiTags('Presence')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(
  AccountStateRequirement.ACTIVE_ACCOUNT,
  AccountStateRequirement.PRACTITIONER_OTP_VERIFIED,
)
@Roles(AppRole.PRACTITIONER)
@Controller('practitioners/me/presence')
export class PractitionerPresenceController {
  constructor(
    private readonly getMyPresenceUseCase: GetMyPresenceUseCase,
    private readonly setMyPresenceStatusUseCase: SetMyPresenceStatusUseCase,
    private readonly setMyInstantBookingAvailabilityUseCase: SetMyInstantBookingAvailabilityUseCase,
    private readonly heartbeatMyPresenceUseCase: HeartbeatMyPresenceUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get current practitioner presence',
    description:
      'Returns the practitioner live-state record without mixing it with weekly schedule availability.',
  })
  @ApiResponse({ status: 200, type: MyPresenceSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  getMyPresence(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.getMyPresenceUseCase.execute({
      userId: currentUser.id,
      locale,
    });
  }

  @Put('status')
  @ApiOperation({
    summary: 'Set current practitioner presence status',
    description:
      'Manual practitioner-owned live-state update. This does not change recurring schedule availability.',
  })
  @ApiBody({ type: SetMyPresenceStatusDto })
  @ApiResponse({ status: 200, type: MyPresenceSuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Presence status payload is invalid' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  setStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Body() body: SetMyPresenceStatusDto,
  ) {
    return this.setMyPresenceStatusUseCase.execute({
      userId: currentUser.id,
      locale,
      status: body.status,
    });
  }

  @Put('instant-booking')
  @ApiOperation({
    summary: 'Set instant-booking readiness',
    description:
      'Explicitly enables or disables instant-booking readiness without changing generic live presence status.',
  })
  @ApiBody({ type: SetMyInstantBookingAvailabilityDto })
  @ApiResponse({ status: 200, type: MyPresenceSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Instant-booking readiness payload is invalid',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  setInstantBookingAvailability(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Body() body: SetMyInstantBookingAvailabilityDto,
  ) {
    return this.setMyInstantBookingAvailabilityUseCase.execute({
      userId: currentUser.id,
      locale,
      isInstantBookingEnabled: body.isInstantBookingEnabled,
    });
  }

  @Post('heartbeat')
  @ApiOperation({
    summary: 'Record practitioner presence heartbeat',
    description:
      'Touches live freshness timestamps only. V1 heartbeat does not auto-change OFFLINE/ONLINE semantics.',
  })
  @ApiResponse({ status: 201, type: MyPresenceSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  heartbeat(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.heartbeatMyPresenceUseCase.execute({
      userId: currentUser.id,
      locale,
    });
  }
}
