import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PublicPackageOffersQueryDto } from '../dto/public-package-offers-query.dto';
import { ListPublicPackageOffersUseCase } from '../use-cases/list-public-package-offers.use-case';
import { resolveCountryFromRequest } from '@modules/auth/utils/request-country-context.util';

@ApiTags('Public - Package Offers Discovery')
@Controller('public/package-offers')
export class PublicPackageOffersController {
  constructor(
    private readonly listPublicPackageOffersUseCase: ListPublicPackageOffersUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List public package offers across eligible practitioners',
    description:
      'Returns paginated practitioner-package offers with server-side price quotes, filters, and duration options.',
  })
  @ApiResponse({ status: 200, description: 'Package offers list' })
  list(
    @CurrentLocale() locale: SupportedLocale,
    @Query() query: PublicPackageOffersQueryDto,
    @Req() request: Request,
  ) {
    return this.listPublicPackageOffersUseCase
      .execute({
        locale,
        query,
        guestCountryIsoCode: resolveCountryFromRequest(request).countryCode,
      })
      .then((data) => ({ success: true as const, data }));
  }
}
