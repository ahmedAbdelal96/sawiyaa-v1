import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UpdateArticleCategoryDto } from '../dto/update-article-category.dto';
import { ArticlePresenter } from '../presenters/article.presenter';
import { ArticleRepository } from '../repositories/article.repository';
import { ARTICLE_DEFAULT_LOCALE } from '../types/articles.types';

@Injectable()
export class UpdateArticleCategoryUseCase {
  private readonly logger = new Logger(UpdateArticleCategoryUseCase.name);

  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly articlePresenter: ArticlePresenter,
  ) {}

  async execute(input: {
    categoryId: string;
    payload: UpdateArticleCategoryDto;
  }) {
    const existing = await this.articleRepository.findCategoryById(
      input.categoryId,
    );
    if (!existing) {
      throw new NotFoundException({
        messageKey: 'articles.errors.categoryNotFound',
        error: 'ARTICLE_CATEGORY_NOT_FOUND',
      });
    }

    try {
      const updated = await this.articleRepository.updateCategory(
        input.categoryId,
        {
          ...(input.payload.slugRoot !== undefined
            ? { slugRoot: input.payload.slugRoot.trim().toLowerCase() }
            : {}),
          ...(input.payload.sortOrder !== undefined
            ? { sortOrder: input.payload.sortOrder }
            : {}),
          ...(input.payload.isActive !== undefined
            ? { isActive: input.payload.isActive }
            : {}),
        },
        input.payload.locale
          ? {
              locale: input.payload.locale,
              ...(input.payload.title !== undefined
                ? { title: input.payload.title.trim() }
                : {}),
              ...(input.payload.slug !== undefined
                ? { slug: input.payload.slug.trim().toLowerCase() }
                : {}),
              ...(input.payload.description !== undefined
                ? { description: input.payload.description?.trim() || null }
                : {}),
              ...(input.payload.metaTitle !== undefined
                ? { metaTitle: input.payload.metaTitle?.trim() || null }
                : {}),
              ...(input.payload.metaDescription !== undefined
                ? {
                    metaDescription:
                      input.payload.metaDescription?.trim() || null,
                  }
                : {}),
            }
          : undefined,
      );

      const locale =
        input.payload.locale ??
        existing.translations[0]?.locale ??
        ARTICLE_DEFAULT_LOCALE;

      this.logger.log(`Article category updated (id=${updated.id})`);

      return {
        item: this.articlePresenter.presentCategory(updated, locale),
      };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          messageKey: 'articles.errors.categorySlugAlreadyExists',
          error: 'ARTICLE_CATEGORY_SLUG_ALREADY_EXISTS',
        });
      }
      throw error;
    }
  }
}
