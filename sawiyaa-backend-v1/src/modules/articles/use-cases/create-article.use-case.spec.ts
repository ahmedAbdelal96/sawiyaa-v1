import { NotFoundException } from '@nestjs/common';
import { ArticleStatus, ContentLocale } from '@prisma/client';
import { ArticlePresenter } from '../presenters/article.presenter';
import { ArticleRepository } from '../repositories/article.repository';
import { CreateArticleUseCase } from './create-article.use-case';

describe('CreateArticleUseCase', () => {
  const articleRepository = {
    findCategoryById: jest.fn(),
    createArticle: jest.fn(),
  } as unknown as ArticleRepository;

  const articlePresenter = {
    presentAdminArticleItem: jest.fn(),
  } as unknown as ArticlePresenter;

  const useCase = new CreateArticleUseCase(articleRepository, articlePresenter);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects creation when category is missing/inactive', async () => {
    (articleRepository.findCategoryById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'admin_1',
        payload: {
          locale: ContentLocale.ar,
          title: 'Article',
          slug: 'article',
          content: 'Body',
          primaryCategoryId: 'cat_1',
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates draft article when category exists', async () => {
    (articleRepository.findCategoryById as jest.Mock).mockResolvedValue({
      id: 'cat_1',
      isActive: true,
    });
    (articleRepository.createArticle as jest.Mock).mockResolvedValue({
      id: 'article_1',
      authorUserId: 'admin_1',
      status: ArticleStatus.DRAFT,
      archivedAt: null,
      publishedAt: null,
      createdAt: new Date('2026-03-30T00:00:00.000Z'),
      updatedAt: new Date('2026-03-30T00:00:00.000Z'),
      coverImageUrl: null,
      translations: [
        {
          locale: ContentLocale.ar,
          title: 'Article',
          slug: 'article',
          excerpt: null,
          contentMarkdown: 'Body',
          metaTitle: null,
          metaDescription: null,
        },
      ],
      primaryCategory: {
        id: 'cat_1',
        slugRoot: 'cat-root',
        sortOrder: 0,
        isActive: true,
        translations: [
          {
            locale: ContentLocale.ar,
            title: 'Category',
            slug: 'category',
            description: null,
            metaTitle: null,
            metaDescription: null,
          },
        ],
      },
    });
    (articlePresenter.presentAdminArticleItem as jest.Mock).mockReturnValue({
      id: 'article_1',
      status: ArticleStatus.DRAFT,
    });

    const result = await useCase.execute({
      userId: 'admin_1',
      payload: {
        locale: ContentLocale.ar,
        title: 'Article',
        slug: 'article',
        content: 'Body',
        primaryCategoryId: 'cat_1',
      },
    });

    expect(result.item).toEqual({
      id: 'article_1',
      status: ArticleStatus.DRAFT,
    });
    expect(articleRepository.createArticle).toHaveBeenCalled();
  });
});
