import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { Request } from 'express';
import { resolveCountryFromRequest } from '@modules/auth/utils/request-country-context.util';
import { InstantBookingAvailabilityResponseDto } from '../dto/instant-booking-availability-response.dto';
import { GetPublicPractitionerInstantBookingAvailabilityUseCase } from '../use-cases/get-public-practitioner-instant-booking-availability.use-case';

@ApiTags('Instant Booking')
@Public()
@Controller('public/practitioners')
export class PublicPractitionerInstantBookingAvailabilityController {
  constructor(
    private readonly availabilityUseCase: GetPublicPractitionerInstantBookingAvailabilityUseCase,
  ) {}

  @Get(':slug/instant-booking-availability')
  @ApiOperation({ summary: 'Get current instant-booking availability for one practitioner' })
  @ApiParam({ name: 'slug' })
  @ApiResponse({ status: 200, type: InstantBookingAvailabilityResponseDto })
  get(
    @Param('slug') slug: string,
    @CurrentLocale() locale: SupportedLocale,
    @Req() request: Request,
  ) {
    return this.availabilityUseCase.execute({
      slug,
      locale,
      countryIsoCode: resolveCountryFromRequest(request).countryCode,
    });
  }
}
