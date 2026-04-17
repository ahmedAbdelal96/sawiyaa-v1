import { Injectable, Logger } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ConflictException } from '@nestjs/common';
import { CreateArticleCategoryDto } from '../dto/create-article-category.dto';
import { ArticlePresenter } from '../presenters/article.presenter';
import { ArticleRepository } from '../repositories/article.repository';

@Injectable()
export class CreateArticleCategoryUseCase {
  private readonly logger = new Logger(CreateArticleCategoryUseCase.name);

  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly articlePresenter: ArticlePresenter,
  ) {}

  async execute(input: { userId: string; payload: CreateArticleCategoryDto }) {
    const payload = input.payload;

    try {
      const created = await this.articleRepository.createCategory({
        slugRoot: payload.slugRoot.trim().toLowerCase(),
        sortOrder: payload.sortOrder ?? 0,
        isActive: payload.isActive ?? true,
        createdByUserId: input.userId,
        translations: {
          create: {
            locale: payload.locale,
            title: payload.title.trim(),
            slug: payload.slug.trim().toLowerCase(),
            description: payload.description?.trim() || null,
            metaTitle: payload.metaTitle?.trim() || null,
            metaDescription: payload.metaDescription?.trim() || null,
          },
        },
      });

      this.logger.log(
        `Article category created (id=${created.id}, slugRoot=${created.slugRoot})`,
      );

      return {
        item: this.articlePresenter.presentCategory(created, payload.locale),
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
