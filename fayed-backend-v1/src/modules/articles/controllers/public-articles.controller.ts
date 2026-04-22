import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ListPublicArticlesDto } from '../dto/list-public-articles.dto';
import { ListPublicArticleCategoriesDto } from '../dto/list-public-article-categories.dto';
import {
  PublicArticleCategoryListSuccessResponseDto,
  PublicArticleItemSuccessResponseDto,
  PublicArticleListSuccessResponseDto,
} from '../dto/article-response.dto';
import { GetPublicArticleDto } from '../dto/get-public-article.dto';
import { GetPublicArticleBySlugUseCase } from '../use-cases/get-public-article-by-slug.use-case';
import { ListPublicArticleCategoriesUseCase } from '../use-cases/list-public-article-categories.use-case';
import { ListPublicArticlesUseCase } from '../use-cases/list-public-articles.use-case';
import { ListPublicCategoryArticlesUseCase } from '../use-cases/list-public-category-articles.use-case';

@ApiTags('Articles')
@Controller()
export class PublicArticlesController {
  constructor(
    private readonly listPublicArticlesUseCase: ListPublicArticlesUseCase,
    private readonly getPublicArticleBySlugUseCase: GetPublicArticleBySlugUseCase,
    private readonly listPublicArticleCategoriesUseCase: ListPublicArticleCategoriesUseCase,
    private readonly listPublicCategoryArticlesUseCase: ListPublicCategoryArticlesUseCase,
  ) {}

  @Get('articles')
  @ApiOperation({ summary: 'List published public articles' })
  @ApiResponse({ status: 200, type: PublicArticleListSuccessResponseDto })
  list(@Query() query: ListPublicArticlesDto) {
    return this.listPublicArticlesUseCase
      .execute(query)
      .then((data) => ({ success: true as const, data }));
  }

  @Get('articles/:slug')
  @ApiOperation({
    summary: 'Get published public article by locale-specific slug',
  })
  @ApiResponse({ status: 200, type: PublicArticleItemSuccessResponseDto })
  getBySlug(@Param('slug') slug: string, @Query() query: GetPublicArticleDto) {
    return this.getPublicArticleBySlugUseCase
      .execute({
        slug,
        locale: query.locale,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get('article-categories')
  @ApiOperation({ summary: 'List active article categories' })
  @ApiResponse({
    status: 200,
    type: PublicArticleCategoryListSuccessResponseDto,
  })
  listCategories(@Query() query: ListPublicArticleCategoriesDto) {
    return this.listPublicArticleCategoriesUseCase
      .execute(query)
      .then((data) => ({ success: true as const, data }));
  }

  @Get('article-categories/:slug/articles')
  @ApiOperation({ summary: 'List published articles under category slug' })
  @ApiResponse({ status: 200, type: PublicArticleListSuccessResponseDto })
  listByCategory(
    @Param('slug') categorySlug: string,
    @Query() query: ListPublicArticlesDto,
  ) {
    return this.listPublicCategoryArticlesUseCase
      .execute({
        categorySlug,
        query,
      })
      .then((data) => ({ success: true as const, data }));
  }
}
