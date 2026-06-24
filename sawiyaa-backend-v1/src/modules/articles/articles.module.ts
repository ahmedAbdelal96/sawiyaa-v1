import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminArticleCategoriesController } from './controllers/admin-article-categories.controller';
import { AdminArticlesController } from './controllers/admin-articles.controller';
import { PublicArticlesController } from './controllers/public-articles.controller';
import { ArticlePresenter } from './presenters/article.presenter';
import { ArticleRepository } from './repositories/article.repository';
import { BuildPublicArticleTrustMetadataService } from './services/build-public-article-trust-metadata.service';
import { ArticleCoverStorageService } from './services/article-cover-storage.service';
import { ValidateArticleStatusTransitionService } from './services/validate-article-status-transition.service';
import { ArchiveArticleUseCase } from './use-cases/archive-article.use-case';
import { CreateArticleCategoryUseCase } from './use-cases/create-article-category.use-case';
import { CreateArticleUseCase } from './use-cases/create-article.use-case';
import { GetAdminArticleCategoryUseCase } from './use-cases/get-admin-article-category.use-case';
import { GetAdminArticleUseCase } from './use-cases/get-admin-article.use-case';
import { GetPublicArticleBySlugUseCase } from './use-cases/get-public-article-by-slug.use-case';
import { ListAdminArticleCategoriesUseCase } from './use-cases/list-admin-article-categories.use-case';
import { ListAdminArticlesUseCase } from './use-cases/list-admin-articles.use-case';
import { ListPublicArticleCategoriesUseCase } from './use-cases/list-public-article-categories.use-case';
import { ListPublicArticlesUseCase } from './use-cases/list-public-articles.use-case';
import { ListPublicCategoryArticlesUseCase } from './use-cases/list-public-category-articles.use-case';
import { PublishArticleUseCase } from './use-cases/publish-article.use-case';
import { UpdateArticleCategoryUseCase } from './use-cases/update-article-category.use-case';
import { UpdateArticleUseCase } from './use-cases/update-article.use-case';

@Module({
  controllers: [
    PublicArticlesController,
    AdminArticlesController,
    AdminArticleCategoriesController,
  ],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    BuildPublicArticleTrustMetadataService,
    ArticleCoverStorageService,
    ArticlePresenter,
    ArticleRepository,
    ValidateArticleStatusTransitionService,
    CreateArticleCategoryUseCase,
    UpdateArticleCategoryUseCase,
    ListAdminArticleCategoriesUseCase,
    GetAdminArticleCategoryUseCase,
    ListPublicArticleCategoriesUseCase,
    CreateArticleUseCase,
    UpdateArticleUseCase,
    PublishArticleUseCase,
    ArchiveArticleUseCase,
    ListAdminArticlesUseCase,
    GetAdminArticleUseCase,
    ListPublicArticlesUseCase,
    GetPublicArticleBySlugUseCase,
    ListPublicCategoryArticlesUseCase,
  ],
})
export class ArticlesModule {}
