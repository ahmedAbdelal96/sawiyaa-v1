import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ContentLocale } from '@prisma/client';
import { UpdateArticleDto } from '../dto/update-article.dto';
import { ArticlePresenter } from '../presenters/article.presenter';
import { ArticleRepository } from '../repositories/article.repository';
import { ARTICLE_DEFAULT_LOCALE } from '../types/articles.types';

@Injectable()
export class UpdateArticleUseCase {
  private readonly logger = new Logger(UpdateArticleUseCase.name);

  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly articlePresenter: ArticlePresenter,
  ) {}

  async execute(input: { articleId: string; payload: UpdateArticleDto }) {
    const existing = await this.articleRepository.findArticleById(
      input.articleId,
    );
    if (!existing) {
      throw new NotFoundException({
        messageKey: 'articles.errors.articleNotFound',
        error: 'ARTICLE_NOT_FOUND',
      });
    }

    if (input.payload.primaryCategoryId) {
      const category = await this.articleRepository.findCategoryById(
        input.payload.primaryCategoryId,
      );
      if (!category || !category.isActive) {
        throw new NotFoundException({
          messageKey: 'articles.errors.categoryNotFound',
          error: 'ARTICLE_CATEGORY_NOT_FOUND',
        });
      }
    }

    const hasTranslationFieldPatch = this.hasTranslationFieldPatch(
      input.payload,
    );
    if (hasTranslationFieldPatch && !input.payload.locale) {
      throw new BadRequestException({
        messageKey: 'articles.errors.localeRequiredForTranslationUpdate',
        error: 'ARTICLE_LOCALE_REQUIRED_FOR_TRANSLATION_UPDATE',
      });
    }

    const locale = this.resolveLocale(existing, input.payload.locale);
    try {
      let updated = existing;
      if (
        input.payload.primaryCategoryId !== undefined ||
        input.payload.coverImageUrl !== undefined ||
        input.payload.featuredImageAlt !== undefined
      ) {
        updated = await this.articleRepository.updateArticle(input.articleId, {
          ...(input.payload.primaryCategoryId !== undefined
            ? { primaryCategoryId: input.payload.primaryCategoryId }
            : {}),
          ...(input.payload.coverImageUrl !== undefined
            ? { coverImageUrl: input.payload.coverImageUrl?.trim() || null }
            : {}),
          ...(input.payload.featuredImageAlt !== undefined
            ? {
                featuredImageAlt:
                  input.payload.featuredImageAlt?.trim() || null,
              }
            : {}),
        });
      }

      if (input.payload.primaryCategoryId) {
        await this.articleRepository.setPrimaryCategoryAssignment({
          articleId: input.articleId,
          categoryId: input.payload.primaryCategoryId,
        });
      }

      if (hasTranslationFieldPatch) {
        await this.articleRepository.upsertArticleTranslation({
          articleId: input.articleId,
          locale,
          ...(input.payload.title !== undefined
            ? { title: input.payload.title.trim() }
            : {}),
          ...(input.payload.slug !== undefined
            ? { slug: input.payload.slug.trim().toLowerCase() }
            : {}),
          ...(input.payload.excerpt !== undefined
            ? { excerpt: input.payload.excerpt?.trim() || null }
            : {}),
          ...(input.payload.content !== undefined
            ? { contentMarkdown: input.payload.content.trim() }
            : {}),
          ...(input.payload.metaTitle !== undefined
            ? { metaTitle: input.payload.metaTitle?.trim() || null }
            : {}),
          ...(input.payload.metaDescription !== undefined
            ? { metaDescription: input.payload.metaDescription?.trim() || null }
            : {}),
        });
      }

      const refreshed = await this.articleRepository.findArticleById(
        input.articleId,
      );
      if (!refreshed) {
        throw new NotFoundException({
          messageKey: 'articles.errors.articleNotFound',
          error: 'ARTICLE_NOT_FOUND',
        });
      }

      this.logger.log(`Article updated (id=${input.articleId})`);

      return {
        item: this.articlePresenter.presentAdminArticleItem(refreshed, locale),
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

  private hasTranslationFieldPatch(payload: UpdateArticleDto): boolean {
    return (
      payload.title !== undefined ||
      payload.slug !== undefined ||
      payload.excerpt !== undefined ||
      payload.content !== undefined ||
      payload.metaTitle !== undefined ||
      payload.metaDescription !== undefined
    );
  }

  private resolveLocale(
    article: {
      translations: Array<{
        locale: ContentLocale;
      }>;
    },
    payloadLocale?: ContentLocale,
  ): ContentLocale {
    if (payloadLocale) {
      return payloadLocale;
    }

    if (
      article.translations.some(
        (translation) => translation.locale === ARTICLE_DEFAULT_LOCALE,
      )
    ) {
      return ARTICLE_DEFAULT_LOCALE;
    }

    if (
      article.translations.some(
        (translation) => translation.locale === ContentLocale.en,
      )
    ) {
      return ContentLocale.en;
    }

    return ARTICLE_DEFAULT_LOCALE;
  }
}
