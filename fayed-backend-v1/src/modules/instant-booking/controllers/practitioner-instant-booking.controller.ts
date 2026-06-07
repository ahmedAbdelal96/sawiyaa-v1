import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
import {
  InstantBookingItemSuccessResponseDto,
  InstantBookingItemsSuccessResponseDto,
} from '../dto/instant-booking-response.dto';
import { RejectInstantBookingRequestDto } from '../dto/reject-instant-booking-request.dto';
import { AcceptInstantBookingRequestUseCase } from '../use-cases/accept-instant-booking-request.use-case';
import { ListPractitionerPendingInstantBookingRequestsUseCase } from '../use-cases/list-practitioner-pending-instant-booking-requests.use-case';
import { RejectInstantBookingRequestUseCase } from '../use-cases/reject-instant-booking-request.use-case';

@ApiTags('Instant Booking')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(
  AccountStateRequirement.ACTIVE_ACCOUNT,
  AccountStateRequirement.PRACTITIONER_OTP_VERIFIED,
  AccountStateRequirement.PRACTITIONER_APPROVED,
)
@Roles(AppRole.PRACTITIONER)
@Controller('practitioners/me/instant-booking-requests')
export class PractitionerInstantBookingController {
  constructor(
    private readonly listPractitionerPendingInstantBookingRequestsUseCase: ListPractitionerPendingInstantBookingRequestsUseCase,
    private readonly acceptInstantBookingRequestUseCase: AcceptInstantBookingRequestUseCase,
    private readonly rejectInstantBookingRequestUseCase: RejectInstantBookingRequestUseCase,
  ) {}

  @Get('pending')
  @ApiOperation({
    summary: 'List pending practitioner instant booking requests',
    description:
      'Returns pending and still-unexpired instant booking requests assigned to the authenticated practitioner.',
  })
  @ApiResponse({ status: 200, type: InstantBookingItemsSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  listPending(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.listPractitionerPendingInstantBookingRequestsUseCase.execute({
      userId: currentUser.id,
      locale,
    });
  }

  @Post(':id/accept')
  @ApiOperation({
    summary: 'Accept instant booking request',
    description:
      'Accepts a still-pending instant booking request, revalidates live readiness and conflicts, then creates the linked Session source-of-truth record.',
  })
  @ApiParam({ name: 'id', description: 'Instant booking request id' })
  @ApiResponse({ status: 200, type: InstantBookingItemSuccessResponseDto })
  @ApiBadRequestResponse({
    description:
      'Practitioner is no longer online/eligible for instant booking or availability no longer fits the immediate request',
  })
  @ApiConflictResponse({
    description:
      'Request is expired, already finalized, or a session conflict emerged before acceptance',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  @ApiNotFoundResponse({ description: 'Instant booking request was not found' })
  accept(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') requestId: string,
  ) {
    return this.acceptInstantBookingRequestUseCase.execute({
      userId: currentUser.id,
      locale,
      requestId,
    });
  }

  @Post(':id/reject')
  @ApiOperation({
    summary: 'Reject instant booking request',
    description:
      'Rejects a still-pending instant booking request and records an optional operational reason.',
  })
  @ApiParam({ name: 'id', description: 'Instant booking request id' })
  @ApiBody({ type: RejectInstantBookingRequestDto })
  @ApiResponse({ status: 200, type: InstantBookingItemSuccessResponseDto })
  @ApiConflictResponse({
    description:
      'Request is expired, already finalized, or cannot transition to REJECTED',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  @ApiNotFoundResponse({ description: 'Instant booking request was not found' })
  reject(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') requestId: string,
    @Body() body: RejectInstantBookingRequestDto,
  ) {
    return this.rejectInstantBookingRequestUseCase.execute({
      userId: currentUser.id,
      locale,
      requestId,
      reason: body.reason,
    });
  }
}
