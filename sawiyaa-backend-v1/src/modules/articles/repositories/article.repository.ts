import { Injectable } from '@nestjs/common';
import { ArticleStatus, ContentLocale, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  ARTICLE_ALLOWED_PUBLIC_DETAIL_VISIBILITIES,
  ARTICLE_ALLOWED_PUBLIC_VISIBILITIES,
} from '../types/articles.types';

@Injectable()
export class ArticleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCategoryById(id: string) {
    return this.prisma.articleCategory.findUnique({
      where: { id },
      include: {
        translations: true,
      },
    });
  }

  findCategoryBySlug(input: { slug: string; locale: ContentLocale }) {
    return this.prisma.articleCategory.findFirst({
      where: {
        isActive: true,
        translations: {
          some: {
            slug: input.slug.trim().toLowerCase(),
            locale: input.locale,
          },
        },
      },
      include: {
        translations: true,
      },
    });
  }

  findCategoryByRootSlug(rootSlug: string) {
    return this.prisma.articleCategory.findUnique({
      where: {
        slugRoot: rootSlug,
      },
      include: {
        translations: true,
      },
    });
  }

  findCategoryByParentAndTranslationSlug(input: {
    parentId: string;
    locale: ContentLocale;
    slug: string;
  }) {
    return this.prisma.articleCategory.findFirst({
      where: {
        parentId: input.parentId,
        translations: {
          some: {
            locale: input.locale,
            slug: input.slug.trim().toLowerCase(),
          },
        },
      },
      include: {
        translations: true,
      },
    });
  }

  findSpecialtyById(input: { id: string; locale: ContentLocale }) {
    return this.prisma.specialty.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        slug: true,
        categoryId: true,
        isActive: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            isActive: true,
            sortOrder: true,
          },
        },
        translations: {
          where: {
            locale: {
              in: [input.locale, ContentLocale.en],
            },
          },
          orderBy: [{ locale: 'asc' }],
          select: {
            locale: true,
            title: true,
            description: true,
          },
        },
      },
    });
  }

  createCategory(data: Prisma.ArticleCategoryUncheckedCreateInput) {
    return this.prisma.articleCategory.create({
      data,
      include: {
        translations: true,
      },
    });
  }

  updateCategory(
    id: string,
    data: Prisma.ArticleCategoryUncheckedUpdateInput,
    translation?: {
      locale: ContentLocale;
      title?: string;
      slug?: string;
      description?: string | null;
      metaTitle?: string | null;
      metaDescription?: string | null;
    },
  ) {
    return this.prisma.articleCategory.update({
      where: { id },
      data: {
        ...data,
        ...(translation
          ? {
              translations: {
                upsert: {
                  where: {
                    articleCategoryId_locale: {
                      articleCategoryId: id,
                      locale: translation.locale,
                    },
                  },
                  update: {
                    ...(translation.title !== undefined
                      ? { title: translation.title }
                      : {}),
                    ...(translation.slug !== undefined
                      ? { slug: translation.slug }
                      : {}),
                    ...(translation.description !== undefined
                      ? { description: translation.description }
                      : {}),
                    ...(translation.metaTitle !== undefined
                      ? { metaTitle: translation.metaTitle }
                      : {}),
                    ...(translation.metaDescription !== undefined
                      ? { metaDescription: translation.metaDescription }
                      : {}),
                  },
                  create: {
                    locale: translation.locale,
                    title: translation.title ?? 'Untitled',
                    slug: translation.slug ?? `category-${Date.now()}`,
                    description: translation.description ?? null,
                    metaTitle: translation.metaTitle ?? null,
                    metaDescription: translation.metaDescription ?? null,
                  },
                },
              },
            }
          : {}),
      },
      include: {
        translations: true,
      },
    });
  }

  listCategories(input: {
    page: number;
    limit: number;
    locale: ContentLocale;
    isActive?: boolean;
  }) {
    const where: Prisma.ArticleCategoryWhereInput = {
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    };
    const skip = (input.page - 1) * input.limit;

    return Promise.all([
      this.prisma.articleCategory.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          translations: {
            where: {
              locale: {
                in: [input.locale, ContentLocale.en],
              },
            },
          },
        },
      }),
      this.prisma.articleCategory.count({ where }),
    ]);
  }

  findArticleById(id: string) {
    return this.prisma.article.findUnique({
      where: { id },
      include: this.articleInclude(),
    });
  }

  createArticle(data: Prisma.ArticleUncheckedCreateInput) {
    return this.prisma.article.create({
      data,
      include: this.articleInclude(),
    });
  }

  updateArticle(id: string, data: Prisma.ArticleUncheckedUpdateInput) {
    return this.prisma.article.update({
      where: { id },
      data,
      include: this.articleInclude(),
    });
  }

  upsertArticleTranslation(input: {
    articleId: string;
    locale: ContentLocale;
    title?: string;
    slug?: string;
    excerpt?: string | null;
    contentMarkdown?: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
  }) {
    return this.prisma.articleTranslation.upsert({
      where: {
        articleId_locale: {
          articleId: input.articleId,
          locale: input.locale,
        },
      },
      update: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.excerpt !== undefined ? { excerpt: input.excerpt } : {}),
        ...(input.contentMarkdown !== undefined
          ? { contentMarkdown: input.contentMarkdown }
          : {}),
        ...(input.metaTitle !== undefined
          ? { metaTitle: input.metaTitle }
          : {}),
        ...(input.metaDescription !== undefined
          ? { metaDescription: input.metaDescription }
          : {}),
      },
      create: {
        articleId: input.articleId,
        locale: input.locale,
        title: input.title ?? 'Untitled',
        slug: input.slug ?? `article-${Date.now()}`,
        excerpt: input.excerpt ?? null,
        contentMarkdown: input.contentMarkdown ?? '',
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
      },
    });
  }

  setPrimaryCategoryAssignment(input: {
    articleId: string;
    categoryId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.articleCategoryAssignment.updateMany({
        where: {
          articleId: input.articleId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });

      await tx.articleCategoryAssignment.upsert({
        where: {
          articleId_articleCategoryId: {
            articleId: input.articleId,
            articleCategoryId: input.categoryId,
          },
        },
        update: {
          isPrimary: true,
        },
        create: {
          articleId: input.articleId,
          articleCategoryId: input.categoryId,
          isPrimary: true,
        },
      });
    });
  }

  listAdminArticles(input: {
    page: number;
    limit: number;
    locale: ContentLocale;
    status?: ArticleStatus;
    categoryId?: string;
    q?: string;
  }) {
    const skip = (input.page - 1) * input.limit;
    const where: Prisma.ArticleWhereInput = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.categoryId
        ? {
            OR: [
              { primaryCategoryId: input.categoryId },
              {
                categoryAssignments: {
                  some: {
                    articleCategoryId: input.categoryId,
                  },
                },
              },
            ],
          }
        : {}),
      ...(input.q
        ? {
            translations: {
              some: {
                OR: [
                  { title: { contains: input.q, mode: 'insensitive' } },
                  { excerpt: { contains: input.q, mode: 'insensitive' } },
                ],
              },
            },
          }
        : {}),
    };

    return Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ updatedAt: 'desc' }],
        include: this.articleInclude(input.locale),
      }),
      this.prisma.article.count({ where }),
    ]);
  }

  listPublicArticles(input: {
    page: number;
    limit: number;
    locale: ContentLocale;
    categorySlug?: string;
    categoryRoot?: string;
    q?: string;
  }) {
    const skip = (input.page - 1) * input.limit;
    const now = new Date();
    const where: Prisma.ArticleWhereInput = {
      status: ArticleStatus.PUBLISHED,
      visibility: {
        in: ARTICLE_ALLOWED_PUBLIC_VISIBILITIES,
      },
      publishedAt: {
        lte: now,
      },
      ...(input.categorySlug
        ? {
            OR: [
              {
                primaryCategory: {
                  translations: {
                    some: {
                      locale: input.locale,
                      slug: input.categorySlug.trim().toLowerCase(),
                    },
                  },
                },
              },
              {
                categoryAssignments: {
                  some: {
                    articleCategory: {
                      translations: {
                        some: {
                          locale: input.locale,
                          slug: input.categorySlug.trim().toLowerCase(),
                        },
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
      ...(input.categoryRoot
        ? {
            OR: [
              {
                primaryCategory: {
                  OR: [
                    { slugRoot: input.categoryRoot.trim().toLowerCase() },
                    {
                      slugRoot: {
                        startsWith: `${input.categoryRoot.trim().toLowerCase()}-`,
                      },
                    },
                  ],
                },
              },
              {
                categoryAssignments: {
                  some: {
                    articleCategory: {
                      OR: [
                        { slugRoot: input.categoryRoot.trim().toLowerCase() },
                        {
                          slugRoot: {
                            startsWith: `${input.categoryRoot.trim().toLowerCase()}-`,
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
      ...(input.q
        ? {
            translations: {
              some: {
                locale: input.locale,
                OR: [
                  { title: { contains: input.q, mode: 'insensitive' } },
                  { excerpt: { contains: input.q, mode: 'insensitive' } },
                ],
              },
            },
          }
        : {}),
    };

    return Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [
          { publishedAt: 'desc' },
          { createdAt: 'desc' },
          { id: 'asc' },
        ],
        include: this.articleInclude(input.locale),
      }),
      this.prisma.article.count({ where }),
    ]);
  }

  findPublicArticleBySlug(input: { slug: string; locale: ContentLocale }) {
    const now = new Date();
    return this.prisma.article.findFirst({
      where: {
        status: ArticleStatus.PUBLISHED,
        visibility: {
          in: ARTICLE_ALLOWED_PUBLIC_DETAIL_VISIBILITIES,
        },
        publishedAt: {
          lte: now,
        },
        translations: {
          some: {
            locale: input.locale,
            slug: input.slug.trim().toLowerCase(),
          },
        },
      },
      include: this.articleInclude(input.locale),
    });
  }

  private articleInclude(locale?: ContentLocale) {
    const locales = locale ? [locale, ContentLocale.en] : undefined;
    return {
      translations: locales
        ? {
            where: {
              locale: {
                in: locales,
              },
            },
          }
        : true,
      primaryCategory: {
        include: {
          translations: locales
            ? {
                where: {
                  locale: {
                    in: locales,
                  },
                },
              }
            : true,
        },
      },
      authorUser: {
        select: {
          displayName: true,
        },
      },
    } as const;
  }
}
