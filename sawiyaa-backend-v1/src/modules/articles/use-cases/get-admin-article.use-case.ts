import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentLocale } from '@prisma/client';
import { ArticlePresenter } from '../presenters/article.presenter';
import { ArticleRepository } from '../repositories/article.repository';
import { ARTICLE_DEFAULT_LOCALE } from '../types/articles.types';

@Injectable()
export class GetAdminArticleUseCase {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly articlePresenter: ArticlePresenter,
  ) {}

  async execute(input: { id: string; locale?: ContentLocale }) {
    const article = await this.articleRepository.findArticleById(input.id);
    if (!article) {
      throw new NotFoundException({
        messageKey: 'articles.errors.articleNotFound',
        error: 'ARTICLE_NOT_FOUND',
      });
    }

    const locale =
      input.locale ?? article.translations[0]?.locale ?? ARTICLE_DEFAULT_LOCALE;

    return {
      item: this.articlePresenter.presentAdminArticleItem(article, locale),
    };
  }
}
