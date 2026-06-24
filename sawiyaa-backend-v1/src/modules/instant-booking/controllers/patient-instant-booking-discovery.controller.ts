import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import {
  InstantBookingEligiblePractitionersSuccessResponseDto,
} from '../dto/instant-booking-discovery-response.dto';
import { ListPatientInstantBookingPractitionersDto } from '../dto/list-patient-instant-booking-practitioners.dto';
import { ListPatientInstantBookingPractitionersUseCase } from '../use-cases/list-patient-instant-booking-practitioners.use-case';

@ApiTags('Instant Booking')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.PATIENT)
@Controller('patients/me/instant-booking')
export class PatientInstantBookingDiscoveryController {
  constructor(
    private readonly listPatientInstantBookingPractitionersUseCase: ListPatientInstantBookingPractitionersUseCase,
  ) {}

  @Get('practitioners')
  @ApiOperation({
    summary: 'List eligible instant booking practitioners',
    description:
      'Returns only practitioners who are publicly visible, online, instant-booking enabled, priced, and available now.',
  })
  @ApiQuery({
    name: 'duration',
    required: false,
    enum: [30, 60],
    description: 'Optional instant booking duration filter in minutes',
  })
  @ApiQuery({
    name: 'currency',
    required: false,
    enum: ['EGP', 'USD'],
    description: 'Optional currency filter for backend-owned instant prices',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    type: InstantBookingEligiblePractitionersSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access this route',
  })
  @ApiBadRequestResponse({
    description: 'Invalid duration, currency, or pagination parameters',
  })
  async list(
    @CurrentLocale() locale: SupportedLocale,
    @Query() query: ListPatientInstantBookingPractitionersDto,
  ) {
    const data = await this.listPatientInstantBookingPractitionersUseCase.execute({
      locale,
      duration: query.duration,
      currency: query.currency,
      page: query.page,
      limit: query.limit,
    });

    return {
      success: true as const,
      data,
    };
  }
}
