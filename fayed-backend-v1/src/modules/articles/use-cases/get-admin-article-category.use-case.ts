import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentLocale } from '@prisma/client';
import { ArticlePresenter } from '../presenters/article.presenter';
import { ArticleRepository } from '../repositories/article.repository';

@Injectable()
export class GetAdminArticleCategoryUseCase {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly articlePresenter: ArticlePresenter,
  ) {}

  async execute(input: { id: string; locale: ContentLocale }) {
    const row = await this.articleRepository.findCategoryById(input.id);
    if (!row) {
      throw new NotFoundException({
        messageKey: 'articles.errors.categoryNotFound',
        error: 'ARTICLE_CATEGORY_NOT_FOUND',
      });
    }

    return {
      item: this.articlePresenter.presentCategory(row, input.locale),
    };
  }
}
