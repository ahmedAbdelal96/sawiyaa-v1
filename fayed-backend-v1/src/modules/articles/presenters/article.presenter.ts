import { Injectable } from '@nestjs/common';
import { ArticleStatus, ContentLocale } from '@prisma/client';
import { BuildPublicArticleTrustMetadataService } from '../services/build-public-article-trust-metadata.service';

@Injectable()
export class ArticlePresenter {
  constructor(
    private readonly buildPublicArticleTrustMetadataService: BuildPublicArticleTrustMetadataService,
  ) {}

  presentPagination(input: {
    page: number;
    limit: number;
    totalItems: number;
  }) {
    return {
      page: input.page,
      limit: input.limit,
      totalItems: input.totalItems,
      totalPages: Math.max(1, Math.ceil(input.totalItems / input.limit)),
    };
  }

  presentCategory(
    category: {
      id: string;
      slugRoot: string;
      sortOrder: number;
      isActive: boolean;
      translations: Array<{
        locale: ContentLocale;
        title: string;
        slug: string;
        description: string | null;
        metaTitle: string | null;
        metaDescription: string | null;
      }>;
    },
    locale: ContentLocale,
  ) {
    const translation = this.pickTranslation(category.translations, locale);
    if (!translation) {
      return null;
    }

    return {
      id: category.id,
      slugRoot: category.slugRoot,
      title: translation.title,
      slug: translation.slug,
      description: translation.description ?? null,
      metaTitle: translation.metaTitle ?? null,
      metaDescription: translation.metaDescription ?? null,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    };
  }

  presentPublicArticleItem(
    article: {
      id: string;
      publishedAt: Date | null;
      coverImageUrl: string | null;
      translations: Array<{
        locale: ContentLocale;
        title: string;
        slug: string;
        excerpt: string | null;
      }>;
      primaryCategory: {
        id: string;
        slugRoot: string;
        sortOrder: number;
        isActive: boolean;
        translations: Array<{
          locale: ContentLocale;
          title: string;
          slug: string;
          description: string | null;
          metaTitle: string | null;
          metaDescription: string | null;
        }>;
      } | null;
      authorUser?: {
        displayName: string | null;
      } | null;
    },
    locale: ContentLocale,
  ) {
    const translation = this.pickTranslation(article.translations, locale);
    if (!translation) {
      return null;
    }

    return {
      id: article.id,
      title: translation.title,
      slug: translation.slug,
      excerpt: translation.excerpt ?? null,
      coverImageUrl: article.coverImageUrl ?? null,
      publishedAt: article.publishedAt?.toISOString() ?? null,
      category: article.primaryCategory
        ? this.presentCategory(article.primaryCategory, locale)
        : null,
      trust: this.buildPublicArticleTrustMetadataService.build({
        publishedAt: article.publishedAt,
        authorDisplayName: article.authorUser?.displayName ?? null,
      }),
    };
  }

  presentPublicArticleDetails(
    article: {
      id: string;
      publishedAt: Date | null;
      coverImageUrl: string | null;
      translations: Array<{
        locale: ContentLocale;
        title: string;
        slug: string;
        excerpt: string | null;
        contentMarkdown: string | null;
        metaTitle: string | null;
        metaDescription: string | null;
      }>;
      primaryCategory: {
        id: string;
        slugRoot: string;
        sortOrder: number;
        isActive: boolean;
        translations: Array<{
          locale: ContentLocale;
          title: string;
          slug: string;
          description: string | null;
          metaTitle: string | null;
          metaDescription: string | null;
        }>;
      } | null;
      authorUser?: {
        displayName: string | null;
      } | null;
    },
    locale: ContentLocale,
  ) {
    const translation = this.pickTranslation(article.translations, locale);
    if (!translation) {
      return null;
    }

    const category = article.primaryCategory
      ? this.presentCategory(article.primaryCategory, locale)
      : null;

    return {
      id: article.id,
      title: translation.title,
      slug: translation.slug,
      excerpt: translation.excerpt ?? null,
      coverImageUrl: article.coverImageUrl ?? null,
      publishedAt: article.publishedAt?.toISOString() ?? null,
      category,
      trust: this.buildPublicArticleTrustMetadataService.build({
        publishedAt: article.publishedAt,
        authorDisplayName: article.authorUser?.displayName ?? null,
      }),
      content: translation.contentMarkdown ?? '',
      seo: {
        metaTitle: translation.metaTitle ?? null,
        metaDescription: translation.metaDescription ?? null,
      },
      locale,
    };
  }

  presentAdminArticleItem(
    article: {
      id: string;
      authorUserId: string;
      status: ArticleStatus;
      archivedAt: Date | null;
      publishedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      coverImageUrl: string | null;
      translations: Array<{
        locale: ContentLocale;
        title: string;
        slug: string;
        excerpt: string | null;
        contentMarkdown: string | null;
        metaTitle: string | null;
        metaDescription: string | null;
      }>;
      primaryCategory: {
        id: string;
        slugRoot: string;
        sortOrder: number;
        isActive: boolean;
        translations: Array<{
          locale: ContentLocale;
          title: string;
          slug: string;
          description: string | null;
          metaTitle: string | null;
          metaDescription: string | null;
        }>;
      } | null;
    },
    locale: ContentLocale,
  ) {
    const publicDetails = this.presentPublicArticleDetails(article, locale);
    if (!publicDetails) {
      return null;
    }

    return {
      ...publicDetails,
      status: article.status,
      archivedAt: article.archivedAt?.toISOString() ?? null,
      authorUserId: article.authorUserId,
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt.toISOString(),
    };
  }

  private pickTranslation<
    T extends {
      locale: ContentLocale;
    },
  >(translations: T[], locale: ContentLocale): T | null {
    return (
      translations.find((item) => item.locale === locale) ??
      translations.find((item) => item.locale === ContentLocale.en) ??
      translations[0] ??
      null
    );
  }
}
