import {
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

    const category = await this.articleRepository.findCategoryById(
      payload.primaryCategoryId,
    );
    if (!category || !category.isActive) {
      throw new NotFoundException({
        messageKey: 'articles.errors.categoryNotFound',
        error: 'ARTICLE_CATEGORY_NOT_FOUND',
      });
    }

    try {
      const created = await this.articleRepository.createArticle({
        authorUserId: input.userId,
        primaryCategoryId: payload.primaryCategoryId,
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
            articleCategoryId: payload.primaryCategoryId,
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
}
