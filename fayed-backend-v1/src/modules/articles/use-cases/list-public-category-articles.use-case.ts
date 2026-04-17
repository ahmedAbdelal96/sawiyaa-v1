import { Injectable, NotFoundException } from '@nestjs/common';
import { ListPublicArticlesDto } from '../dto/list-public-articles.dto';
import { ArticleRepository } from '../repositories/article.repository';
import { ListPublicArticlesUseCase } from './list-public-articles.use-case';

@Injectable()
export class ListPublicCategoryArticlesUseCase {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly listPublicArticlesUseCase: ListPublicArticlesUseCase,
  ) {}

  async execute(input: { categorySlug: string; query: ListPublicArticlesDto }) {
    const category = await this.articleRepository.findCategoryBySlug({
      slug: input.categorySlug,
      locale: input.query.locale,
    });

    if (!category || !category.isActive) {
      throw new NotFoundException({
        messageKey: 'articles.errors.categoryNotFound',
        error: 'ARTICLE_CATEGORY_NOT_FOUND',
      });
    }

    return this.listPublicArticlesUseCase.execute({
      ...input.query,
      categorySlug: input.categorySlug,
    });
  }
}
