import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ArticleStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateArticleDto } from '../dto/create-article.dto';
import { ArticlePresenter } from '../presenters/article.presenter';
import { ArticleRepository } from '../repositories/article.repository';

@Injectable()
export class CreateArticleUseCase {
  private readonly logger = new Logger(CreateArticleUseCase.name);

  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly articlePresenter: ArticlePresenter,
  ) {}

  async execute(input: { userId: string; payload: CreateArticleDto }) {
    const payload = input.payload;
    const resolvedCategoryId = await this.resolveArticleCategoryId(payload);
    const category =
      await this.articleRepository.findCategoryById(resolvedCategoryId);
    if (!category || !category.isActive) {
      throw new NotFoundException({
        messageKey: 'articles.errors.categoryNotFound',
        error: 'ARTICLE_CATEGORY_NOT_FOUND',
      });
    }

    try {
      const created = await this.articleRepository.createArticle({
        authorUserId: input.userId,
        primaryCategoryId: resolvedCategoryId,
        status: ArticleStatus.DRAFT,
        coverImageUrl: payload.coverImageUrl?.trim() || null,
        featuredImageAlt: payload.featuredImageAlt?.trim() || null,
        translations: {
          create: {
            locale: payload.locale,
            title: payload.title.trim(),
            slug: payload.slug.trim().toLowerCase(),
            excerpt: payload.excerpt?.trim() || null,
            contentMarkdown: payload.content.trim(),
            metaTitle: payload.metaTitle?.trim() || null,
            metaDescription: payload.metaDescription?.trim() || null,
          },
        },
        categoryAssignments: {
          create: {
            articleCategoryId: resolvedCategoryId,
            isPrimary: true,
          },
        },
      });

      this.logger.log(
        `Article created as draft (id=${created.id}, author=${input.userId})`,
      );

      return {
        item: this.articlePresenter.presentAdminArticleItem(
          created,
          payload.locale,
        ),
      };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          messageKey: 'articles.errors.articleSlugAlreadyExists',
          error: 'ARTICLE_SLUG_ALREADY_EXISTS',
        });
      }
      throw error;
    }
  }

  private async resolveArticleCategoryId(payload: CreateArticleDto) {
    if (payload.primaryCategoryId?.trim()) {
      return payload.primaryCategoryId.trim();
    }

    if (!payload.specialtyId?.trim()) {
      throw new BadRequestException({
        messageKey: 'articles.errors.categoryNotFound',
        error: 'ARTICLE_CATEGORY_NOT_FOUND',
      });
    }

    const specialty = await this.articleRepository.findSpecialtyById({
      id: payload.specialtyId.trim(),
      locale: payload.locale,
    });

    if (!specialty || !specialty.isActive || !specialty.category) {
      throw new NotFoundException({
        messageKey: 'articles.errors.categoryNotFound',
        error: 'ARTICLE_CATEGORY_NOT_FOUND',
      });
    }

    const rootSlug = specialty.category.slug.trim().toLowerCase();
    const specialtySlug = specialty.slug.trim().toLowerCase();
    const specialtyTitle =
      specialty.translations.find((item) => item.locale === payload.locale)
        ?.title ??
      specialty.translations.find((item) => item.locale === 'en')?.title ??
      specialty.slug;
    const specialtyDescription =
      specialty.translations.find((item) => item.locale === payload.locale)
        ?.description ??
      specialty.translations.find((item) => item.locale === 'en')
        ?.description ??
      null;

    let rootCategory =
      await this.articleRepository.findCategoryByRootSlug(rootSlug);

    if (!rootCategory) {
      rootCategory = await this.articleRepository.createCategory({
        slugRoot: rootSlug,
        isActive: true,
        isFeatured: false,
        translations: {
          create: {
            locale: payload.locale,
            title: specialty.category.name,
            slug: rootSlug,
            description: specialty.category.description ?? null,
          },
        },
      });
    }

    let leafCategory =
      await this.articleRepository.findCategoryByParentAndTranslationSlug({
        parentId: rootCategory.id,
        locale: payload.locale,
        slug: specialtySlug,
      });

    if (!leafCategory) {
      leafCategory = await this.articleRepository.createCategory({
        parentId: rootCategory.id,
        slugRoot: `${rootSlug}-${specialtySlug}`,
        isActive: true,
        isFeatured: false,
        translations: {
          create: {
            locale: payload.locale,
            title: specialtyTitle,
            slug: specialtySlug,
            description: specialtyDescription,
          },
        },
      });
    }

    return leafCategory.id;
  }
}
