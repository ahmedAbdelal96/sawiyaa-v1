import {
  ArticleStatus,
  ArticleVisibility,
  ContentLocale,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { ArticleRepository } from './article.repository';

describe('ArticleRepository public contract', () => {
  const prisma = {
    article: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  } as unknown as PrismaService;

  const repository = new ArticleRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.article.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.article.count as jest.Mock).mockResolvedValue(0);
    (prisma.article.findFirst as jest.Mock).mockResolvedValue(null);
  });

  it('listPublicArticles excludes non-public visibility and non-published statuses', async () => {
    await repository.listPublicArticles({
      page: 1,
      limit: 12,
      locale: ContentLocale.ar,
    });

    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: ArticleStatus.PUBLISHED,
          visibility: {
            in: [ArticleVisibility.PUBLIC],
          },
        }),
        orderBy: [
          { publishedAt: 'desc' },
          { createdAt: 'desc' },
          { id: 'asc' },
        ],
      }),
    );
  });

  it('findPublicArticleBySlug allows UNLISTED only on details lookup', async () => {
    await repository.findPublicArticleBySlug({
      slug: 'an-unlisted-article',
      locale: ContentLocale.ar,
    });

    expect(prisma.article.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: ArticleStatus.PUBLISHED,
          visibility: {
            in: [ArticleVisibility.PUBLIC, ArticleVisibility.UNLISTED],
          },
        }),
      }),
    );
  });
});
