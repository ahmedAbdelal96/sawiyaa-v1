import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentLocale } from '@prisma/client';
import { ArticlePresenter } from '../presenters/article.presenter';
import { ArticleRepository } from '../repositories/article.repository';

@Injectable()
export class GetPublicArticleBySlugUseCase {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly articlePresenter: ArticlePresenter,
  ) {}

  async execute(input: { slug: string; locale: ContentLocale }) {
    const article = await this.articleRepository.findPublicArticleBySlug({
      slug: input.slug,
      locale: input.locale,
    });

    if (!article) {
      throw new NotFoundException({
        messageKey: 'articles.errors.articleNotFound',
        error: 'ARTICLE_NOT_FOUND',
      });
    }

    return {
      item: this.articlePresenter.presentPublicArticleDetails(article, input.locale),
    };
  }
}
