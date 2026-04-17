import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
import { SessionMode } from '@prisma/client';
import { CancelInstantBookingRequestDto } from '../dto/cancel-instant-booking-request.dto';
import { CreateInstantBookingRequestDto } from '../dto/create-instant-booking-request.dto';
import {
  InstantBookingItemSuccessResponseDto,
  InstantBookingItemsSuccessResponseDto,
} from '../dto/instant-booking-response.dto';
import { CancelInstantBookingRequestUseCase } from '../use-cases/cancel-instant-booking-request.use-case';
import { CreateInstantBookingRequestUseCase } from '../use-cases/create-instant-booking-request.use-case';
import { GetPatientInstantBookingRequestUseCase } from '../use-cases/get-patient-instant-booking-request.use-case';
import { ListPatientInstantBookingRequestsUseCase } from '../use-cases/list-patient-instant-booking-requests.use-case';

@ApiTags('Instant Booking')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.PATIENT)
@Controller('patients/me/instant-booking-requests')
export class PatientInstantBookingController {
  constructor(
    private readonly createInstantBookingRequestUseCase: CreateInstantBookingRequestUseCase,
    private readonly listPatientInstantBookingRequestsUseCase: ListPatientInstantBookingRequestsUseCase,
    private readonly getPatientInstantBookingRequestUseCase: GetPatientInstantBookingRequestUseCase,
    private readonly cancelInstantBookingRequestUseCase: CancelInstantBookingRequestUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create instant booking request',
    description:
      'Creates an immediate consultation request only when the targeted practitioner is public, online, instant-booking enabled, not busy, and availability-compatible right now.',
  })
  @ApiBody({ type: CreateInstantBookingRequestDto })
  @ApiResponse({ status: 201, type: InstantBookingItemSuccessResponseDto })
  @ApiBadRequestResponse({
    description:
      'Payload is invalid, session mode is unsupported, or practitioner is not currently eligible for instant booking',
  })
  @ApiConflictResponse({
    description: 'A duplicate pending instant booking request already exists for this patient and practitioner',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may create instant booking requests',
  })
  @ApiNotFoundResponse({
    description: 'Patient profile or practitioner profile was not found',
  })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Body() body: CreateInstantBookingRequestDto,
  ) {
    return this.createInstantBookingRequestUseCase.execute({
      userId: currentUser.id,
      locale,
      practitionerSlug: body.practitionerSlug,
      durationMinutes: body.durationMinutes,
      sessionMode: body.sessionMode ?? SessionMode.VIDEO,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'List patient instant booking requests',
    description:
      'Returns all instant booking requests created by the current patient in reverse chronological order.',
  })
  @ApiResponse({ status: 200, type: InstantBookingItemsSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access this route',
  })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.listPatientInstantBookingRequestsUseCase.execute({
      userId: currentUser.id,
      locale,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get patient instant booking request',
    description:
      'Returns a single instant booking request only when it belongs to the authenticated patient.',
  })
  @ApiParam({ name: 'id', description: 'Instant booking request id' })
  @ApiResponse({ status: 200, type: InstantBookingItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access this route',
  })
  @ApiNotFoundResponse({ description: 'Instant booking request was not found' })
  details(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') requestId: string,
  ) {
    return this.getPatientInstantBookingRequestUseCase.execute({
      userId: currentUser.id,
      locale,
      requestId,
    });
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel patient instant booking request',
    description:
      'Cancels a still-usable patient-owned instant booking request. Expired or already-finalized requests cannot be cancelled.',
  })
  @ApiParam({ name: 'id', description: 'Instant booking request id' })
  @ApiBody({ type: CancelInstantBookingRequestDto })
  @ApiResponse({ status: 200, type: InstantBookingItemSuccessResponseDto })
  @ApiConflictResponse({
    description: 'The instant booking request is already cancelled or cannot transition from its current status',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access this route',
  })
  @ApiNotFoundResponse({ description: 'Instant booking request was not found' })
  cancel(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') requestId: string,
    @Body() body: CancelInstantBookingRequestDto,
  ) {
    return this.cancelInstantBookingRequestUseCase.execute({
      userId: currentUser.id,
      locale,
      requestId,
      reason: body.reason,
    });
  }
}
