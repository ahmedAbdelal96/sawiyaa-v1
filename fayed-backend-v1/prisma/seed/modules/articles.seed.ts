import { createHash } from 'crypto';
import {
  ArticleStatus,
  ArticleVisibility,
  ContentLocale,
  PrismaClient,
} from '@prisma/client';
import { SeedModule } from '../shared/seed.types';
import { seedIds } from '../shared/seed.constants';
import { ARTICLE_CATEGORIES } from './articles-data/categories.data';
import type { ArticleSeedEntry } from './articles-data/articles.types';
import {
  PUBLISHED_ARTICLES,
  DRAFT_ARTICLES,
  SCHEDULED_ARTICLE,
} from './articles-data/articles.fixtures';
import { getArticleCoverPath } from './articles-data/article-covers';

function uuid(seed: string): string {
  const h = createHash('md5').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// Maps authorSeedKey to real seeded practitioner user IDs from curated-dev seed.
const AUTHOR_USER_IDS: Record<string, string> = {
  practitionerB: seedIds.users.practitionerB,
};

function getAuthorUserId(authorSeedKey: string): string {
  return AUTHOR_USER_IDS[authorSeedKey] ?? seedIds.users.practitionerB;
}

// Deterministic IDs for articles (not categories — those come from DB)
function publishedId(i: number): string {
  return uuid(`bulk-article-${i}`);
}

function draftId(i: number): string {
  return uuid(`bulk-article-draft-${i}`);
}

function scheduledId(): string {
  return uuid(`bulk-article-scheduled`);
}

export const articlesSeedModule: SeedModule = {
  name: 'articles',
  async run(prisma: PrismaClient): Promise<void> {
    console.log('[seed:articles] Starting...');

    // ─── Pre-load existing category IDs (must use real DB IDs, not generated) ─
    const existingCats = await prisma.articleCategory.findMany();
    const catIdBySlugRoot: Record<string, string> = {};
    for (const c of existingCats) {
      catIdBySlugRoot[c.slugRoot] = c.id;
    }

    // ─── Categories ─────────────────────────────────────────────────────
    for (const cat of ARTICLE_CATEGORIES) {
      // Use existing DB ID if found, otherwise generate a stable one for creation
      let catId = catIdBySlugRoot[cat.slugRoot];
      if (!catId) {
        catId = uuid(`bulk-article-category-${cat.slugRoot}`);
        // Persist the new category so we get a valid FK
        await prisma.articleCategory.create({
          data: {
            id: catId,
            slugRoot: cat.slugRoot,
            sortOrder: cat.sortOrder,
            isActive: true,
          },
        });
      }

      await prisma.articleCategory.upsert({
        where: { slugRoot: cat.slugRoot },
        create: {
          id: catId,
          slugRoot: cat.slugRoot,
          sortOrder: cat.sortOrder,
          isActive: true,
        },
        update: { sortOrder: cat.sortOrder, isActive: true },
      });
      catIdBySlugRoot[cat.slugRoot] = catId;

      // Upsert translations — the category FK must match the REAL catId
      await prisma.articleCategoryTranslation.upsert({
        where: {
          articleCategoryId_locale: { articleCategoryId: catId, locale: ContentLocale.ar },
        },
        create: {
          articleCategoryId: catId,
          locale: ContentLocale.ar,
          title: cat.titleAr,
          slug: cat.slugAr,
        },
        update: { title: cat.titleAr, slug: cat.slugAr },
      });

      await prisma.articleCategoryTranslation.upsert({
        where: {
          articleCategoryId_locale: { articleCategoryId: catId, locale: ContentLocale.en },
        },
        create: {
          articleCategoryId: catId,
          locale: ContentLocale.en,
          title: cat.titleEn,
          slug: cat.slugEn,
        },
        update: { title: cat.titleEn, slug: cat.slugEn },
      });
    }
    console.log(`[seed:articles] ${ARTICLE_CATEGORIES.length} categories upserted`);

    // ─── Published Articles ────────────────────────────────────────────
    for (let i = 0; i < PUBLISHED_ARTICLES.length; i++) {
      const entry = PUBLISHED_ARTICLES[i];
      const artId = publishedId(i + 1);
      const catId = catIdBySlugRoot[entry.categorySlugRoot];
      const userId = getAuthorUserId(entry.authorSeedKey);
      const catSlot = i % 5;
      const coverUrl = getArticleCoverPath(entry.categorySlugRoot, catSlot, entry.hasCover);

      await prisma.article.upsert({
        where: { id: artId },
        create: {
          id: artId,
          authorUserId: userId,
          authorPractitionerId: null,
          primaryCategoryId: catId,
          status: ArticleStatus.PUBLISHED,
          visibility: ArticleVisibility.PUBLIC,
          coverImageUrl: coverUrl,
          featuredImageAlt: null,
          currentRevisionNumber: 1,
          publishedAt: daysAgo(entry.publishedAtDaysAgo),
          approvedAt: daysAgo(entry.publishedAtDaysAgo),
        },
        update: {
          authorUserId: userId,
          primaryCategoryId: catId,
          status: ArticleStatus.PUBLISHED,
          visibility: ArticleVisibility.PUBLIC,
          coverImageUrl: coverUrl,
          featuredImageAlt: null,
          publishedAt: daysAgo(entry.publishedAtDaysAgo),
          approvedAt: daysAgo(entry.publishedAtDaysAgo),
        },
      });

      await prisma.articleTranslation.upsert({
        where: { articleId_locale: { articleId: artId, locale: ContentLocale.ar } },
        create: {
          articleId: artId,
          locale: ContentLocale.ar,
          title: entry.titleAr,
          excerpt: entry.excerptAr,
          contentMarkdown: entry.contentAr,
          slug: entry.slugAr,
          readingTimeMinutes: Math.max(3, Math.ceil(entry.contentAr.split(' ').length / 200)),
        },
        update: {
          title: entry.titleAr,
          excerpt: entry.excerptAr,
          contentMarkdown: entry.contentAr,
          slug: entry.slugAr,
          readingTimeMinutes: Math.max(3, Math.ceil(entry.contentAr.split(' ').length / 200)),
        },
      });

      await prisma.articleTranslation.upsert({
        where: { articleId_locale: { articleId: artId, locale: ContentLocale.en } },
        create: {
          articleId: artId,
          locale: ContentLocale.en,
          title: entry.titleEn,
          excerpt: entry.excerptEn,
          contentMarkdown: entry.contentEn,
          slug: entry.slugEn,
          readingTimeMinutes: Math.max(3, Math.ceil(entry.contentEn.split(' ').length / 200)),
        },
        update: {
          title: entry.titleEn,
          excerpt: entry.excerptEn,
          contentMarkdown: entry.contentEn,
          slug: entry.slugEn,
          readingTimeMinutes: Math.max(3, Math.ceil(entry.contentEn.split(' ').length / 200)),
        },
      });

      await prisma.articleCategoryAssignment.upsert({
        where: {
          articleId_articleCategoryId: { articleId: artId, articleCategoryId: catId },
        },
        create: { articleId: artId, articleCategoryId: catId, isPrimary: true },
        update: { isPrimary: true },
      });
    }
    console.log(`[seed:articles] ${PUBLISHED_ARTICLES.length} published articles upserted`);

    // ─── Draft Articles ────────────────────────────────────────────────
    for (let i = 0; i < DRAFT_ARTICLES.length; i++) {
      const entry = DRAFT_ARTICLES[i];
      const artId = draftId(i);
      const catId = catIdBySlugRoot[entry.categorySlugRoot];
      const userId = getAuthorUserId(entry.authorSeedKey);

      await prisma.article.upsert({
        where: { id: artId },
        create: {
          id: artId,
          authorUserId: userId,
          authorPractitionerId: null,
          primaryCategoryId: catId,
          status: ArticleStatus.DRAFT,
          visibility: ArticleVisibility.PRIVATE,
          coverImageUrl: null,
          featuredImageAlt: null,
          currentRevisionNumber: 1,
          publishedAt: null,
          approvedAt: null,
        },
        update: {
          authorUserId: userId,
          primaryCategoryId: catId,
          status: ArticleStatus.DRAFT,
          visibility: ArticleVisibility.PRIVATE,
          coverImageUrl: null,
          featuredImageAlt: null,
          publishedAt: null,
          approvedAt: null,
        },
      });

      await prisma.articleTranslation.upsert({
        where: { articleId_locale: { articleId: artId, locale: ContentLocale.ar } },
        create: {
          articleId: artId,
          locale: ContentLocale.ar,
          title: entry.titleAr,
          excerpt: entry.excerptAr,
          contentMarkdown: entry.contentAr,
          slug: entry.slugAr,
          readingTimeMinutes: 2,
        },
        update: {
          title: entry.titleAr,
          excerpt: entry.excerptAr,
          contentMarkdown: entry.contentAr,
          slug: entry.slugAr,
        },
      });

      await prisma.articleTranslation.upsert({
        where: { articleId_locale: { articleId: artId, locale: ContentLocale.en } },
        create: {
          articleId: artId,
          locale: ContentLocale.en,
          title: entry.titleEn,
          excerpt: entry.excerptEn,
          contentMarkdown: entry.contentEn,
          slug: entry.slugEn,
          readingTimeMinutes: 2,
        },
        update: {
          title: entry.titleEn,
          excerpt: entry.excerptEn,
          contentMarkdown: entry.contentEn,
          slug: entry.slugEn,
        },
      });

      await prisma.articleCategoryAssignment.upsert({
        where: {
          articleId_articleCategoryId: { articleId: artId, articleCategoryId: catId },
        },
        create: { articleId: artId, articleCategoryId: catId, isPrimary: true },
        update: { isPrimary: true },
      });
    }
    console.log(`[seed:articles] ${DRAFT_ARTICLES.length} draft articles upserted`);

    // ─── Scheduled Article ────────────────────────────────────────────
    {
      const entry = SCHEDULED_ARTICLE;
      const artId = scheduledId();
      const catId = catIdBySlugRoot[entry.categorySlugRoot];
      const userId = getAuthorUserId(entry.authorSeedKey);
      const scheduledAt = daysFromNow(entry.scheduledDaysFromNow ?? 14);

      await prisma.article.upsert({
        where: { id: artId },
        create: {
          id: artId,
          authorUserId: userId,
          authorPractitionerId: null,
          primaryCategoryId: catId,
          status: ArticleStatus.SUBMITTED,
          visibility: ArticleVisibility.PUBLIC,
          coverImageUrl: null,
          featuredImageAlt: null,
          currentRevisionNumber: 1,
          publishedAt: null,
          scheduledPublishAt: scheduledAt,
          approvedAt: null,
        },
        update: {
          authorUserId: userId,
          primaryCategoryId: catId,
          status: ArticleStatus.SUBMITTED,
          visibility: ArticleVisibility.PUBLIC,
          coverImageUrl: null,
          featuredImageAlt: null,
          publishedAt: null,
          scheduledPublishAt: scheduledAt,
          approvedAt: null,
        },
      });

      await prisma.articleTranslation.upsert({
        where: { articleId_locale: { articleId: artId, locale: ContentLocale.ar } },
        create: {
          articleId: artId,
          locale: ContentLocale.ar,
          title: entry.titleAr,
          excerpt: entry.excerptAr,
          contentMarkdown: entry.contentAr,
          slug: entry.slugAr,
          readingTimeMinutes: 2,
        },
        update: {
          title: entry.titleAr,
          excerpt: entry.excerptAr,
          contentMarkdown: entry.contentAr,
          slug: entry.slugAr,
        },
      });

      await prisma.articleTranslation.upsert({
        where: { articleId_locale: { articleId: artId, locale: ContentLocale.en } },
        create: {
          articleId: artId,
          locale: ContentLocale.en,
          title: entry.titleEn,
          excerpt: entry.excerptEn,
          contentMarkdown: entry.contentEn,
          slug: entry.slugEn,
          readingTimeMinutes: 2,
        },
        update: {
          title: entry.titleEn,
          excerpt: entry.excerptEn,
          contentMarkdown: entry.contentEn,
          slug: entry.slugEn,
        },
      });

      await prisma.articleCategoryAssignment.upsert({
        where: {
          articleId_articleCategoryId: { articleId: artId, articleCategoryId: catId },
        },
        create: { articleId: artId, articleCategoryId: catId, isPrimary: true },
        update: { isPrimary: true },
      });
    }
    console.log('[seed:articles] 1 scheduled article upserted');

    // ─── Summary ───────────────────────────────────────────────────────
    const publishedWithCover = PUBLISHED_ARTICLES.filter(a => a.hasCover).length;
    const publishedNullCover = PUBLISHED_ARTICLES.filter(a => !a.hasCover).length;
    console.log(
      `[seed:articles] Done. Categories=${ARTICLE_CATEGORIES.length}, ` +
        `Published=${PUBLISHED_ARTICLES.length} (withCover=${publishedWithCover}, nullCover=${publishedNullCover}), ` +
        `Draft=${DRAFT_ARTICLES.length}, Scheduled=1`,
    );
  },
};
