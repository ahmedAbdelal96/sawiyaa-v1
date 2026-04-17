import { NotFoundException } from '@nestjs/common';
import { ContentLocale } from '@prisma/client';
import { ArticleRepository } from '../repositories/article.repository';
import { ListPublicArticlesUseCase } from './list-public-articles.use-case';
import { ListPublicCategoryArticlesUseCase } from './list-public-category-articles.use-case';

describe('ListPublicCategoryArticlesUseCase', () => {
  const articleRepository = {
    findCategoryBySlug: jest.fn(),
  } as unknown as ArticleRepository;

  const listPublicArticlesUseCase = {
    execute: jest.fn(),
  } as unknown as ListPublicArticlesUseCase;

  const useCase = new ListPublicCategoryArticlesUseCase(
    articleRepository,
    listPublicArticlesUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unknown category slug', async () => {
    (articleRepository.findCategoryBySlug as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        categorySlug: 'missing',
        query: {
          page: 1,
          limit: 12,
          locale: ContentLocale.ar,
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delegates to public list with category filter', async () => {
    (articleRepository.findCategoryBySlug as jest.Mock).mockResolvedValue({
      id: 'cat_1',
      isActive: true,
    });
    (listPublicArticlesUseCase.execute as jest.Mock).mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 12, totalItems: 0, totalPages: 1 },
    });

    await useCase.execute({
      categorySlug: 'starting-therapy',
      query: {
        page: 1,
        limit: 12,
        locale: ContentLocale.ar,
      },
    });

    expect(listPublicArticlesUseCase.execute).toHaveBeenCalledWith({
      page: 1,
      limit: 12,
      locale: ContentLocale.ar,
      categorySlug: 'starting-therapy',
    });
  });
});
