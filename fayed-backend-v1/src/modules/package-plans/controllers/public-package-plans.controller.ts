import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { PublicPackagePlansQueryDto } from '../dto/public-package-plans-query.dto';
import { PackagePlanQuotedListSuccessResponseDto } from '../dto/package-plan-quote-response.dto';
import { ListPublicPackagePlansUseCase } from '../use-cases/list-public-package-plans.use-case';

@ApiTags('Public - Package Plans')
@Controller('public/practitioners')
export class PublicPackagePlansController {
  constructor(
    private readonly listPublicPackagePlansUseCase: ListPublicPackagePlansUseCase,
  ) {}

  @Get(':slug/package-plans')
  @ApiOperation({
    summary: 'List active standardized package plans for a practitioner',
    description:
      'Returns only public-safe package plans and a quote preview for the selected session duration and currency.',
  })
  @ApiParam({ name: 'slug', description: 'Public practitioner slug' })
  @ApiResponse({ status: 200, type: PackagePlanQuotedListSuccessResponseDto })
  @ApiNotFoundResponse({ description: 'Practitioner was not found' })
  list(
    @Param('slug') practitionerSlug: string,
    @CurrentUser() currentUser: AuthenticatedUser | undefined,
    @CurrentLocale() locale: SupportedLocale,
    @Query() query: PublicPackagePlansQueryDto,
  ) {
    return this.listPublicPackagePlansUseCase
      .execute({
        practitionerSlug,
        currentUserId: currentUser?.id ?? null,
        locale,
        durationMinutes: query.durationMinutes,
        sessionMode: query.sessionMode,
        requestedCurrencyCode: query.currencyCode,
      })
      .then((data) => ({ success: true as const, data }));
  }
}
