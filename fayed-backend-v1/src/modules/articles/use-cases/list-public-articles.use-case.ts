import { Injectable } from '@nestjs/common';
import { ListPublicArticlesDto } from '../dto/list-public-articles.dto';
import { ArticlePresenter } from '../presenters/article.presenter';
import { ArticleRepository } from '../repositories/article.repository';

@Injectable()
export class ListPublicArticlesUseCase {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly articlePresenter: ArticlePresenter,
  ) {}

  async execute(query: ListPublicArticlesDto) {
    const [rows, totalItems] = await this.articleRepository.listPublicArticles({
      page: query.page,
      limit: query.limit,
      locale: query.locale,
      categorySlug: query.categorySlug?.trim() || undefined,
      q: query.q?.trim() || undefined,
    });

    return {
      items: rows
        .map((item) => this.articlePresenter.presentPublicArticleItem(item, query.locale))
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
      pagination: this.articlePresenter.presentPagination({
        page: query.page,
        limit: query.limit,
        totalItems,
      }),
    };
  }
}
