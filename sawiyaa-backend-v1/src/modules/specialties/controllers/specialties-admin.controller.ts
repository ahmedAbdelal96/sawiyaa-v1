import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AdminGuard } from '@common/guards/authorization/admin.guard';
import { CreateSpecialtyDto } from '../dto/create-specialty.dto';
import { CreateSpecialtyCategoryDto } from '../dto/create-specialty-category.dto';
import {
  SpecialtiesListResponseDto,
  SpecialtyCategorySuccessResponseDto,
  SpecialtyCategoriesListResponseDto,
  SpecialtySuccessResponseDto,
} from '../dto/specialty-response.dto';
import { ToggleSpecialtyStatusDto } from '../dto/toggle-specialty-status.dto';
import { UpdateSpecialtyCategoryDto } from '../dto/update-specialty-category.dto';
import { UpdateSpecialtyDto } from '../dto/update-specialty.dto';
import { CreateSpecialtyCategoryUseCase } from '../use-cases/create-specialty-category.use-case';
import { CreateSpecialtyUseCase } from '../use-cases/create-specialty.use-case';
import { ListAdminSpecialtiesUseCase } from '../use-cases/list-admin-specialties.use-case';
import { ListAdminSpecialtyCategoriesUseCase } from '../use-cases/list-admin-specialty-categories.use-case';
import { ListSpecialtiesDto } from '../dto/list-specialties.dto';
import { ToggleSpecialtyStatusUseCase } from '../use-cases/toggle-specialty-status.use-case';
import { UpdateSpecialtyCategoryUseCase } from '../use-cases/update-specialty-category.use-case';
import { UpdateSpecialtyUseCase } from '../use-cases/update-specialty.use-case';

/**
 * Admin specialties controller manages practitioner-specialty catalog state changes.
 * It does not manage practitioner linkage or non-practitioner taxonomies.
 */
@ApiTags('Admin - Specialties')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, AdminGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/specialties')
export class SpecialtiesAdminController {
  constructor(
    private readonly listAdminSpecialtiesUseCase: ListAdminSpecialtiesUseCase,
    private readonly listAdminSpecialtyCategoriesUseCase: ListAdminSpecialtyCategoriesUseCase,
    private readonly createSpecialtyCategoryUseCase: CreateSpecialtyCategoryUseCase,
    private readonly updateSpecialtyCategoryUseCase: UpdateSpecialtyCategoryUseCase,
    private readonly createSpecialtyUseCase: CreateSpecialtyUseCase,
    private readonly updateSpecialtyUseCase: UpdateSpecialtyUseCase,
    private readonly toggleSpecialtyStatusUseCase: ToggleSpecialtyStatusUseCase,
  ) {}

  /** Lists specialties for admin including inactive rows. */
  @Get()
  @ApiOperation({
    summary: 'List specialties for admin',
    description:
      'Admin read endpoint that returns both active and inactive specialties to support reactivation flows.',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Optional lightweight search text',
  })
  @ApiResponse({
    status: 200,
    type: SpecialtiesListResponseDto,
  })
  list(
    @CurrentLocale() locale: SupportedLocale,
    @Query() query: ListSpecialtiesDto,
  ) {
    return this.listAdminSpecialtiesUseCase.execute({
      locale,
      q: query.q,
    });
  }

  /** Lists specialty categories for admin including inactive rows. */
  @Get('categories')
  @ApiOperation({
    summary: 'List specialty categories for admin',
    description:
      'Admin read endpoint that returns active and inactive specialty categories to support reactivation flows.',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Optional lightweight search text',
  })
  @ApiResponse({
    status: 200,
    type: SpecialtyCategoriesListResponseDto,
  })
  listCategories(
    @CurrentLocale() locale: SupportedLocale,
    @Query() query: ListSpecialtiesDto,
  ) {
    return this.listAdminSpecialtyCategoriesUseCase.execute({
      locale,
      q: query.q,
    });
  }

  /** Creates a primary specialty category record. */
  @Post('categories')
  @ApiOperation({
    summary: 'Create specialty category',
    description:
      'Admin endpoint to create a primary specialty category. Slug is generated server-side from title.',
  })
  @ApiBody({ type: CreateSpecialtyCategoryDto })
  @ApiResponse({ status: 201, type: SpecialtyCategorySuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  createCategory(
    @Body() body: CreateSpecialtyCategoryDto,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.createSpecialtyCategoryUseCase.execute({
      locale,
      title: body.title,
      description: body.description,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
    });
  }

  /** Updates a primary specialty category record. */
  @Patch('categories/:id')
  @ApiOperation({
    summary: 'Update specialty category',
    description:
      'Admin endpoint to update a primary specialty category. Slug is regenerated server-side when title changes.',
  })
  @ApiParam({
    name: 'id',
    description: 'Specialty category id',
  })
  @ApiBody({ type: UpdateSpecialtyCategoryDto })
  @ApiResponse({ status: 200, type: SpecialtyCategorySuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  @ApiNotFoundResponse({ description: 'Specialty category not found' })
  @ApiConflictResponse({
    description: 'Specialty category slug already exists',
  })
  updateCategory(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateSpecialtyCategoryDto,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.updateSpecialtyCategoryUseCase.execute({
      id,
      locale,
      title: body.title,
      description: body.description,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
    });
  }

  /** Creates a practitioner specialty catalog record. */
  @Post()
  @ApiOperation({
    summary: 'Create specialty',
    description:
      'Admin endpoint to create a practitioner specialty with canonical slug and localized title.',
  })
  @ApiBody({ type: CreateSpecialtyDto })
  @ApiResponse({ status: 201, type: SpecialtySuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  @ApiConflictResponse({
    description: 'Specialty slug already exists',
  })
  create(
    @Body() body: CreateSpecialtyDto,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.createSpecialtyUseCase.execute({
      locale,
      categoryId: body.categoryId,
      slug: body.slug,
      title: body.title,
      description: body.description,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
    });
  }

  /** Updates specialty baseline data and localized translation fields. */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update specialty',
    description:
      'Admin endpoint to update canonical specialty fields and locale-specific translation content. Slug updates are optional and conflict-checked when provided.',
  })
  @ApiParam({
    name: 'id',
    description: 'Specialty id',
  })
  @ApiBody({ type: UpdateSpecialtyDto })
  @ApiResponse({ status: 200, type: SpecialtySuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Validation failed or specialty state is invalid',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  @ApiNotFoundResponse({ description: 'Specialty not found' })
  @ApiConflictResponse({ description: 'Specialty slug already exists' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateSpecialtyDto,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.updateSpecialtyUseCase.execute({
      id,
      locale,
      categoryId: body.categoryId,
      slug: body.slug,
      title: body.title,
      description: body.description,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
    });
  }

  /** Toggles specialty activation state for catalog availability control. */
  @Patch(':id/toggle-status')
  @ApiOperation({
    summary: 'Toggle specialty status',
    description:
      'Admin endpoint to activate/deactivate specialty records used by public/shared reads. Deactivation hides the specialty from public reads and blocks new practitioner linkage, but does not delete existing practitioner links.',
  })
  @ApiParam({
    name: 'id',
    description: 'Specialty id',
  })
  @ApiBody({ type: ToggleSpecialtyStatusDto })
  @ApiResponse({ status: 200, type: SpecialtySuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Requested status is already applied' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  @ApiNotFoundResponse({ description: 'Specialty not found' })
  toggleStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ToggleSpecialtyStatusDto,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.toggleSpecialtyStatusUseCase.execute({
      id,
      isActive: body.isActive,
      locale,
    });
  }
}
