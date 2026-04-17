import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ArticleLocaleQueryDto } from '../dto/article-locale-query.dto';
import { CreateArticleCategoryDto } from '../dto/create-article-category.dto';
import { ListArticleCategoriesDto } from '../dto/list-article-categories.dto';
import { UpdateArticleCategoryDto } from '../dto/update-article-category.dto';
import {
  AdminArticleCategoryItemSuccessResponseDto,
  AdminArticleCategoryListSuccessResponseDto,
} from '../dto/article-response.dto';
import { CreateArticleCategoryUseCase } from '../use-cases/create-article-category.use-case';
import { GetAdminArticleCategoryUseCase } from '../use-cases/get-admin-article-category.use-case';
import { ListAdminArticleCategoriesUseCase } from '../use-cases/list-admin-article-categories.use-case';
import { UpdateArticleCategoryUseCase } from '../use-cases/update-article-category.use-case';

@ApiTags('Articles')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN)
@Controller('admin/article-categories')
export class AdminArticleCategoriesController {
  constructor(
    private readonly createArticleCategoryUseCase: CreateArticleCategoryUseCase,
    private readonly listAdminArticleCategoriesUseCase: ListAdminArticleCategoriesUseCase,
    private readonly getAdminArticleCategoryUseCase: GetAdminArticleCategoryUseCase,
    private readonly updateArticleCategoryUseCase: UpdateArticleCategoryUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create article category (admin only)' })
  @ApiBody({ type: CreateArticleCategoryDto })
  @ApiResponse({ status: 201, type: AdminArticleCategoryItemSuccessResponseDto })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateArticleCategoryDto,
  ) {
    return this.createArticleCategoryUseCase
      .execute({
        userId: currentUser.id,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get()
  @ApiOperation({ summary: 'List article categories for admin management' })
  @ApiResponse({ status: 200, type: AdminArticleCategoryListSuccessResponseDto })
  list(@Query() query: ListArticleCategoriesDto) {
    return this.listAdminArticleCategoriesUseCase
      .execute(query)
      .then((data) => ({ success: true as const, data }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category details by id for admin' })
  @ApiResponse({ status: 200, type: AdminArticleCategoryItemSuccessResponseDto })
  getById(@Param('id') categoryId: string, @Query() query: ArticleLocaleQueryDto) {
    return this.getAdminArticleCategoryUseCase
      .execute({
        id: categoryId,
        locale: query.locale,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category details by id for admin' })
  @ApiBody({ type: UpdateArticleCategoryDto })
  @ApiResponse({ status: 200, type: AdminArticleCategoryItemSuccessResponseDto })
  update(
    @Param('id') categoryId: string,
    @Body() body: UpdateArticleCategoryDto,
  ) {
    return this.updateArticleCategoryUseCase
      .execute({
        categoryId,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }
}
