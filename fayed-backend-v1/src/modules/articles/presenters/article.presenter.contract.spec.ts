import { ArticleStatus, ContentLocale } from '@prisma/client';
import { BuildPublicArticleTrustMetadataService } from '../services/build-public-article-trust-metadata.service';
import { ArticlePresenter } from './article.presenter';

describe('ArticlePresenter contract separation', () => {
  const presenter = new ArticlePresenter(
    new BuildPublicArticleTrustMetadataService(),
  );

  const article = {
    id: 'article_1',
    authorUserId: 'admin_1',
    status: ArticleStatus.PUBLISHED,
    archivedAt: null,
    publishedAt: new Date('2026-03-31T10:00:00.000Z'),
    createdAt: new Date('2026-03-30T10:00:00.000Z'),
    updatedAt: new Date('2026-03-31T10:00:00.000Z'),
    coverImageUrl: 'https://example.com/image.png',
    translations: [
      {
        locale: ContentLocale.ar,
        title: 'عنوان',
        slug: 'article-slug',
        excerpt: 'ملخص',
        contentMarkdown: 'المحتوى',
        metaTitle: 'meta title',
        metaDescription: 'meta description',
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
          title: 'تصنيف',
          slug: 'category-slug',
          description: null,
          metaTitle: null,
          metaDescription: null,
        },
      ],
    },
  };

  it('keeps public payload curated without admin-only fields', () => {
    const publicItem = presenter.presentPublicArticleDetails(article, ContentLocale.ar);
    expect(publicItem).toBeTruthy();
    expect(publicItem).not.toHaveProperty('status');
    expect(publicItem).not.toHaveProperty('authorUserId');
    expect(publicItem).not.toHaveProperty('archivedAt');
    expect(publicItem).toHaveProperty('trust.freshnessBand');
    expect(publicItem).toHaveProperty('trust.reasonCodes');
  });

  it('keeps admin payload with management fields', () => {
    const adminItem = presenter.presentAdminArticleItem(article, ContentLocale.ar);
    expect(adminItem).toBeTruthy();
    expect(adminItem).toHaveProperty('status', ArticleStatus.PUBLISHED);
    expect(adminItem).toHaveProperty('authorUserId', 'admin_1');
  });
});
