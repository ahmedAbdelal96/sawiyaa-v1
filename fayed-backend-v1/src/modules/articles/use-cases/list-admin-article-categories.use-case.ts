import { Injectable } from '@nestjs/common';
import { ListArticleCategoriesDto } from '../dto/list-article-categories.dto';
import { ArticlePresenter } from '../presenters/article.presenter';
import { ArticleRepository } from '../repositories/article.repository';

@Injectable()
export class ListAdminArticleCategoriesUseCase {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly articlePresenter: ArticlePresenter,
  ) {}

  async execute(query: ListArticleCategoriesDto) {
    const [rows, totalItems] = await this.articleRepository.listCategories({
      page: query.page,
      limit: query.limit,
      locale: query.locale,
      isActive: query.isActive,
    });

    return {
      items: rows
        .map((item) =>
          this.articlePresenter.presentCategory(item, query.locale),
        )
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
      pagination: this.articlePresenter.presentPagination({
        page: query.page,
        limit: query.limit,
        totalItems,
      }),
    };
  }
}
