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
import { AdminArticleLocaleQueryDto } from '../dto/admin-article-locale-query.dto';
import { CreateArticleDto } from '../dto/create-article.dto';
import { ListAdminArticlesDto } from '../dto/list-admin-articles.dto';
import { UpdateArticleDto } from '../dto/update-article.dto';
import {
  AdminArticleItemSuccessResponseDto,
  AdminArticleListSuccessResponseDto,
} from '../dto/article-response.dto';
import { ArchiveArticleUseCase } from '../use-cases/archive-article.use-case';
import { CreateArticleUseCase } from '../use-cases/create-article.use-case';
import { GetAdminArticleUseCase } from '../use-cases/get-admin-article.use-case';
import { ListAdminArticlesUseCase } from '../use-cases/list-admin-articles.use-case';
import { PublishArticleUseCase } from '../use-cases/publish-article.use-case';
import { UpdateArticleUseCase } from '../use-cases/update-article.use-case';

@ApiTags('Articles')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN)
@Controller('admin/articles')
export class AdminArticlesController {
  constructor(
    private readonly createArticleUseCase: CreateArticleUseCase,
    private readonly listAdminArticlesUseCase: ListAdminArticlesUseCase,
    private readonly getAdminArticleUseCase: GetAdminArticleUseCase,
    private readonly updateArticleUseCase: UpdateArticleUseCase,
    private readonly publishArticleUseCase: PublishArticleUseCase,
    private readonly archiveArticleUseCase: ArchiveArticleUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create article draft (admin only)' })
  @ApiBody({ type: CreateArticleDto })
  @ApiResponse({ status: 201, type: AdminArticleItemSuccessResponseDto })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateArticleDto,
  ) {
    return this.createArticleUseCase
      .execute({
        userId: currentUser.id,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get()
  @ApiOperation({ summary: 'List articles for admin management' })
  @ApiResponse({ status: 200, type: AdminArticleListSuccessResponseDto })
  list(@Query() query: ListAdminArticlesDto) {
    return this.listAdminArticlesUseCase
      .execute(query)
      .then((data) => ({ success: true as const, data }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get article details for admin' })
  @ApiResponse({ status: 200, type: AdminArticleItemSuccessResponseDto })
  getById(
    @Param('id') articleId: string,
    @Query() query: AdminArticleLocaleQueryDto,
  ) {
    return this.getAdminArticleUseCase
      .execute({
        id: articleId,
        locale: query.locale,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update article draft/published content' })
  @ApiBody({ type: UpdateArticleDto })
  @ApiResponse({ status: 200, type: AdminArticleItemSuccessResponseDto })
  update(@Param('id') articleId: string, @Body() body: UpdateArticleDto) {
    return this.updateArticleUseCase
      .execute({
        articleId,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish article (admin only)' })
  @ApiResponse({ status: 200, type: AdminArticleItemSuccessResponseDto })
  publish(
    @Param('id') articleId: string,
    @Query() query: AdminArticleLocaleQueryDto,
  ) {
    return this.publishArticleUseCase
      .execute({
        articleId,
        locale: query.locale,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive article (admin only)' })
  @ApiResponse({ status: 200, type: AdminArticleItemSuccessResponseDto })
  archive(
    @Param('id') articleId: string,
    @Query() query: AdminArticleLocaleQueryDto,
  ) {
    return this.archiveArticleUseCase
      .execute({
        articleId,
        locale: query.locale,
      })
      .then((data) => ({ success: true as const, data }));
  }
}
