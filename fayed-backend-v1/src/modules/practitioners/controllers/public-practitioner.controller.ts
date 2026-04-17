import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import {
  ListPublicPractitionersDto,
  PublicPractitionerSortBy,
} from '../dto/list-public-practitioners.dto';
import {
  PublicPractitionerDetailsSuccessResponseDto,
  PublicPractitionersListSuccessResponseDto,
} from '../dto/public-practitioner-response.dto';
import { GetPublicPractitionerDetailsUseCase } from '../use-cases/get-public-practitioner-details.use-case';
import { ListPublicPractitionersUseCase } from '../use-cases/list-public-practitioners.use-case';

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
  ) {
    return this.listPublicPractitionersUseCase.execute({
      locale,
      search: query.search ?? query.q,
      specialtySlug: query.specialtySlug ?? query.specialty,
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
  ) {
    return this.getPublicPractitionerDetailsUseCase.execute({
      slug,
      locale,
    });
  }
}
