import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { Public } from '@common/decorators/public.decorator';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { resolveCountryFromRequest } from '@modules/auth/utils/request-country-context.util';
import {
  ListPublicPractitionersDto,
  PublicPractitionerSortBy,
} from '../dto/list-public-practitioners.dto';
import {
  PublicPractitionerDetailsSuccessResponseDto,
  PublicPractitionersListSuccessResponseDto,
} from '../dto/public-practitioner-response.dto';
import { ListPublicPractitionerFiltersUseCase } from '../use-cases/list-public-practitioner-filters.use-case';
import { GetPublicPractitionerDetailsUseCase } from '../use-cases/get-public-practitioner-details.use-case';
import { ListPublicPractitionersUseCase } from '../use-cases/list-public-practitioners.use-case';
import {
  PublicPractitionerFiltersResponseDto,
  PublicPractitionerFiltersSuccessResponseDto,
} from '../dto/public-practitioner-filters-response.dto';

/**
 * Public read-only controller for practitioner pages.
 * Contract is slug-based for details route to support SEO-friendly URLs.
 */
@ApiTags('Practitioners Public')
@Public()
@Controller('public/practitioners')
export class PublicPractitionerController {
  constructor(
    private readonly listPublicPractitionersUseCase: ListPublicPractitionersUseCase,
    private readonly listPublicPractitionerFiltersUseCase: ListPublicPractitionerFiltersUseCase,
    private readonly getPublicPractitionerDetailsUseCase: GetPublicPractitionerDetailsUseCase,
  ) {}

  /** Public listing endpoint with baseline filters/search/sort for discovery pages. */
  @Get()
  @ApiOperation({
    summary: 'List public practitioners',
    description:
      'Public endpoint that returns only published, approved, active, and public-visible practitioners with public-safe fields.',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'specialtySlug', required: false })
  @ApiQuery({ name: 'specialtyCategorySlug', required: false })
  @ApiQuery({ name: 'language', required: false })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'practitionerKind', required: false })
  @ApiQuery({ name: 'gender', required: false })
  @ApiQuery({ name: 'duration', required: false })
  @ApiQuery({ name: 'onlineNow', required: false })
  @ApiQuery({ name: 'availableToday', required: false })
  @ApiQuery({ name: 'availableThisWeek', required: false })
  @ApiQuery({ name: 'acceptsCoupon', required: false })
  @ApiQuery({ name: 'acceptsPackage', required: false })
  @ApiQuery({ name: 'minRating', required: false })
  @ApiQuery({ name: 'minSessionFee', required: false })
  @ApiQuery({ name: 'maxSessionFee', required: false })
  @ApiQuery({ name: 'sort', required: false, enum: PublicPractitionerSortBy })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: PublicPractitionersListSuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid listing query parameters' })
  list(
    @Query() query: ListPublicPractitionersDto,
    @CurrentLocale() locale: SupportedLocale,
    @CurrentUser() currentUser: AuthenticatedUser | null,
    @Req() request: Request,
  ) {
    return this.listPublicPractitionersUseCase.execute({
      locale,
      currentUserId: currentUser?.id ?? null,
      guestCountryIsoCode: resolveCountryFromRequest(request).countryCode,
      search: query.search ?? query.q,
      specialtySlug: query.specialtySlug ?? query.specialty,
      specialtyCategorySlug: query.specialtyCategorySlug,
      language: query.language ?? query.lang,
      country: query.country,
      practitionerKind: query.practitionerKind,
      gender: query.gender,
      duration: query.duration,
      onlineNow: query.onlineNow,
      availableToday: query.availableToday,
      availableThisWeek: query.availableThisWeek,
      acceptsCoupon: query.acceptsCoupon,
      acceptsPackage: query.acceptsPackage,
      minRating: query.minRating,
      minSessionFee: query.minSessionFee,
      maxSessionFee: query.maxSessionFee,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('filters')
  @ApiOperation({
    summary: 'List public practitioner filter metadata',
    description:
      'Public-safe metadata for practitioner discovery filters derived from public-visible practitioners only.',
  })
  @ApiQuery({ name: 'duration', required: false })
  @ApiResponse({ status: 200, type: PublicPractitionerFiltersSuccessResponseDto })
  listFilters(
    @Query() query: ListPublicPractitionersDto,
    @CurrentLocale() locale: SupportedLocale,
    @CurrentUser() currentUser: AuthenticatedUser | null,
    @Req() request: Request,
  ): PublicPractitionerFiltersResponseDto | Promise<PublicPractitionerFiltersResponseDto> {
    return this.listPublicPractitionerFiltersUseCase.execute({
      locale,
      currentUserId: currentUser?.id ?? null,
      guestCountryIsoCode: resolveCountryFromRequest(request).countryCode,
      duration: query.duration,
    });
  }

  /** Public details endpoint by SEO-friendly slug (not by id). */
  @Get(':slug')
  @ApiOperation({
    summary: 'Get public practitioner details by slug',
    description:
      'Public endpoint used by frontend SEO route contract: /practitioners/[slug]. This endpoint never requires practitioner id in URL.',
  })
  @ApiParam({
    name: 'slug',
    description: 'Practitioner public slug',
  })
  @ApiResponse({
    status: 200,
    type: PublicPractitionerDetailsSuccessResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Practitioner slug was not found or not publicly visible',
  })
  bySlug(
    @Param('slug') slug: string,
    @CurrentLocale() locale: SupportedLocale,
    @CurrentUser() currentUser: AuthenticatedUser | null,
    @Req() request: Request,
  ) {
    return this.getPublicPractitionerDetailsUseCase.execute({
      slug,
      locale,
      currentUserId: currentUser?.id ?? null,
      guestCountryIsoCode: resolveCountryFromRequest(request).countryCode,
    });
  }
}
