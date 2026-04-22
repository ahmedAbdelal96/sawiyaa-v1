import { Injectable } from '@nestjs/common';
import { ListAdminArticlesDto } from '../dto/list-admin-articles.dto';
import { ArticlePresenter } from '../presenters/article.presenter';
import { ArticleRepository } from '../repositories/article.repository';

@Injectable()
export class ListAdminArticlesUseCase {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly articlePresenter: ArticlePresenter,
  ) {}

  async execute(query: ListAdminArticlesDto) {
    const [rows, totalItems] = await this.articleRepository.listAdminArticles({
      page: query.page,
      limit: query.limit,
      locale: query.locale,
      status: query.status,
      categoryId: query.categoryId,
      q: query.q?.trim() || undefined,
    });

    return {
      items: rows
        .map((item) =>
          this.articlePresenter.presentAdminArticleItem(item, query.locale),
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
