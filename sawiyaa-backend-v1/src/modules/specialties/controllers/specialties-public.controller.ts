import { Controller, Get, Param, Query } from '@nestjs/common';
import {
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
import { ListSpecialtiesDto } from '../dto/list-specialties.dto';
import {
  SpecialtiesListResponseDto,
  SpecialtyCategoriesListResponseDto,
  SpecialtySuccessResponseDto,
} from '../dto/specialty-response.dto';
import { GetSpecialtyBySlugUseCase } from '../use-cases/get-specialty-by-slug.use-case';
import { ListSpecialtiesUseCase } from '../use-cases/list-specialties.use-case';
import { ListSpecialtyCategoriesUseCase } from '../use-cases/list-specialty-categories.use-case';

/**
 * Public specialties read controller.
 * This controller intentionally serves practitioner-specialty catalog reads only.
 */
@ApiTags('Specialties')
@Public()
@Controller()
export class SpecialtiesPublicController {
  constructor(
    private readonly listSpecialtiesUseCase: ListSpecialtiesUseCase,
    private readonly listSpecialtyCategoriesUseCase: ListSpecialtyCategoriesUseCase,
    private readonly getSpecialtyBySlugUseCase: GetSpecialtyBySlugUseCase,
  ) {}

  /** Lists active practitioner specialties for shared/public consumption. */
  @Get('specialties')
  @ApiOperation({
    summary: 'List active practitioner specialties',
    description:
      'Public read endpoint for active practitioner specialties with optional category context.',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Optional lightweight search text',
  })
  @ApiResponse({
    status: 200,
    type: SpecialtiesListResponseDto,
    description:
      'Returns active specialties only. Inactive specialties are hidden from public catalog reads.',
  })
  list(
    @CurrentLocale() locale: SupportedLocale,
    @Query() query: ListSpecialtiesDto,
  ) {
    return this.listSpecialtiesUseCase.execute({
      locale,
      q: query.q,
    });
  }

  @Get('specialty-categories')
  @ApiOperation({
    summary: 'List specialty categories',
    description:
      'Public read endpoint for active specialty categories used as primary taxonomy groups.',
  })
  @ApiResponse({
    status: 200,
    type: SpecialtyCategoriesListResponseDto,
    description: 'Returns active categories ordered by sort order.',
  })
  listCategories(@CurrentLocale() locale: SupportedLocale) {
    return this.listSpecialtyCategoriesUseCase.execute(locale);
  }

  /** Fetches one active specialty by canonical or localized slug. */
  @Get('specialties/:slug')
  @ApiOperation({
    summary: 'Get specialty by slug',
    description:
      'Public read endpoint for a single active specialty using canonical specialty slug or localized translation slug. Inactive specialties are not returned.',
  })
  @ApiParam({
    name: 'slug',
    description: 'Specialty slug',
  })
  @ApiResponse({ status: 200, type: SpecialtySuccessResponseDto })
  @ApiNotFoundResponse({ description: 'Specialty was not found' })
  bySlug(
    @Param('slug') slug: string,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.getSpecialtyBySlugUseCase.execute({ slug, locale });
  }
}
