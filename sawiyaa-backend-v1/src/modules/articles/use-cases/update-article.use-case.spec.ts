import { BadRequestException } from '@nestjs/common';
import { ArticleStatus, ContentLocale } from '@prisma/client';
import { ArticlePresenter } from '../presenters/article.presenter';
import { ArticleRepository } from '../repositories/article.repository';
import { UpdateArticleUseCase } from './update-article.use-case';

describe('UpdateArticleUseCase', () => {
  const articleRepository = {
    findArticleById: jest.fn(),
    findCategoryById: jest.fn(),
    updateArticle: jest.fn(),
    setPrimaryCategoryAssignment: jest.fn(),
    upsertArticleTranslation: jest.fn(),
  } as unknown as ArticleRepository;

  const articlePresenter = {
    presentAdminArticleItem: jest.fn(),
  } as unknown as ArticlePresenter;

  const useCase = new UpdateArticleUseCase(articleRepository, articlePresenter);

  const existingArticle = {
    id: 'article_1',
    authorUserId: 'admin_1',
    status: ArticleStatus.DRAFT,
    archivedAt: null,
    publishedAt: null,
    createdAt: new Date('2026-03-31T00:00:00.000Z'),
    updatedAt: new Date('2026-03-31T00:00:00.000Z'),
    coverImageUrl: null,
    translations: [
      {
        locale: ContentLocale.ar,
        title: 'Arabic title',
        slug: 'arabic-title',
        excerpt: null,
        contentMarkdown: 'Body',
        metaTitle: null,
        metaDescription: null,
      },
    ],
    primaryCategory: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (articleRepository.findArticleById as jest.Mock).mockResolvedValue(
      existingArticle,
    );
    (articlePresenter.presentAdminArticleItem as jest.Mock).mockReturnValue({
      id: 'article_1',
      locale: ContentLocale.ar,
    });
  });

  it('requires locale when translation fields are patched', async () => {
    await expect(
      useCase.execute({
        articleId: 'article_1',
        payload: {
          title: 'Updated title',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(articleRepository.upsertArticleTranslation).not.toHaveBeenCalled();
  });

  it('does not upsert translation when locale is provided without translation fields', async () => {
    await useCase.execute({
      articleId: 'article_1',
      payload: {
        locale: ContentLocale.en,
      },
    });

    expect(articleRepository.upsertArticleTranslation).not.toHaveBeenCalled();
  });

  it('updates translation deterministically using provided locale', async () => {
    await useCase.execute({
      articleId: 'article_1',
      payload: {
        locale: ContentLocale.en,
        title: 'English title',
      },
    });

    expect(articleRepository.upsertArticleTranslation).toHaveBeenCalledWith(
      expect.objectContaining({
        articleId: 'article_1',
        locale: ContentLocale.en,
        title: 'English title',
      }),
    );
  });
});
