import { Injectable } from '@nestjs/common';
import { ListPublicArticleCategoriesDto } from '../dto/list-public-article-categories.dto';
import { ArticlePresenter } from '../presenters/article.presenter';
import { ArticleRepository } from '../repositories/article.repository';

@Injectable()
export class ListPublicArticleCategoriesUseCase {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly articlePresenter: ArticlePresenter,
  ) {}

  async execute(query: ListPublicArticleCategoriesDto) {
    const [rows, totalItems] = await this.articleRepository.listCategories({
      page: query.page,
      limit: query.limit,
      locale: query.locale,
      isActive: true,
    });

    return {
      items: rows
        .map((item) => this.articlePresenter.presentCategory(item, query.locale))
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
      pagination: this.articlePresenter.presentPagination({
        page: query.page,
        limit: query.limit,
        totalItems,
      }),
    };
  }
}
