import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AcademyProgramStatus, AcademyProgramDeliveryMethod } from '@prisma/client';

type AcademyProgramCapacitySummary = {
  targetLearnerCount?: number | null;
  activeLearnerCount?: number;
  remainingTargetSlots?: number | null;
  isOverTargetLearners?: boolean;
};

@Injectable()
export class AcademyProgramPresenter {
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

  presentPublicProgramItem(program: {
    id: string;
    slug: string;
    titleAr: string;
    titleEn: string;
    descriptionAr: string | null;
    descriptionEn: string | null;
    coverImageUrl: string | null;
    category?: {
      id: string;
      slugRoot: string;
      translations?: Array<{
        locale: string;
        title: string;
      }>;
    } | null;
    priceEgp: { toString(): string } | null;
    priceUsd: { toString(): string } | null;
    registrationOpen: boolean;
    maxSeats: number | null;
    startAt: Date | null;
    endAt: Date | null;
    publishedAt: Date | null;
    _count?: {
      sessions?: number;
    };
  } & AcademyProgramCapacitySummary,
  locale: SupportedLocale) {
    const category = this.presentCategorySummary(program.category, locale);
    const title = this.resolveLocalizedValue({
      locale,
      primary: program.titleAr,
      secondary: program.titleEn,
      slugFallback: program.slug,
    });
    const description = this.resolveLocalizedDescription({
      locale,
      primary: program.descriptionAr,
      secondary: program.descriptionEn,
    });

    const targetLearnerCount = program.targetLearnerCount ?? program.maxSeats ?? null;
    const activeLearnerCount = program.activeLearnerCount ?? 0;
    const remainingTargetSlots =
      program.remainingTargetSlots ??
      (targetLearnerCount === null
        ? null
        : Math.max(targetLearnerCount - activeLearnerCount, 0));
    const isOverTargetLearners =
      program.isOverTargetLearners ??
      (targetLearnerCount !== null && activeLearnerCount > targetLearnerCount);

    return {
      id: program.id,
      slug: program.slug,
      titleAr: program.titleAr,
      titleEn: program.titleEn,
      title,
      descriptionAr: program.descriptionAr,
      descriptionEn: program.descriptionEn,
      description,
      coverImageUrl: program.coverImageUrl ?? null,
      category,
      priceEgp: program.priceEgp?.toString() ?? null,
      priceUsd: program.priceUsd?.toString() ?? null,
      registrationOpen: program.registrationOpen,
      maxSeats: program.maxSeats ?? null,
      targetLearnerCount,
      activeLearnerCount,
      remainingTargetSlots,
      isOverTargetLearners,
      startAt: program.startAt?.toISOString() ?? null,
      endAt: program.endAt?.toISOString() ?? null,
      publishedAt: program.publishedAt?.toISOString() ?? null,
    };
  }

  presentPublicProgramDetails(
    program: {
      id: string;
      slug: string;
      titleAr: string;
      titleEn: string;
      descriptionAr: string | null;
      descriptionEn: string | null;
      coverImageUrl: string | null;
      category?: {
        id: string;
        slugRoot: string;
        translations?: Array<{
          locale: string;
          title: string;
        }>;
      } | null;
      priceEgp: { toString(): string } | null;
      priceUsd: { toString(): string } | null;
      registrationOpen: boolean;
      maxSeats: number | null;
      startAt: Date | null;
      endAt: Date | null;
      publishedAt: Date | null;
      sessions?: Array<{
        id: string;
        academyProgramId: string;
        titleAr: string;
        titleEn: string;
        descriptionAr: string | null;
        descriptionEn: string | null;
        startsAt: Date;
        endsAt: Date;
        deliveryMethod: AcademyProgramDeliveryMethod;
        sortOrder: number;
        isPublished: boolean;
        publishedAt: Date | null;
      }>;
    } & AcademyProgramCapacitySummary,
    locale: SupportedLocale,
  ) {
    return {
      ...this.presentPublicProgramItem(program, locale),
      sessions:
        program.sessions?.map((session) =>
          this.presentPublicSessionItem(session, locale),
        ) ?? [],
    };
  }

  presentAdminProgramItem(program: {
    id: string;
    slug: string;
    titleAr: string;
    titleEn: string;
    descriptionAr: string | null;
    descriptionEn: string | null;
    coverImageUrl: string | null;
    categoryId: string | null;
    category?: {
      id: string;
      slugRoot: string;
      translations?: Array<{
        locale: string;
        title: string;
      }>;
    } | null;
    priceEgp: { toString(): string } | null;
    priceUsd: { toString(): string } | null;
    registrationOpen: boolean;
    maxSeats: number | null;
    startAt: Date | null;
    endAt: Date | null;
    status: AcademyProgramStatus;
    publishedAt: Date | null;
    archivedAt: Date | null;
    createdByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
    _count?: {
      sessions?: number;
    };
  } & AcademyProgramCapacitySummary) {
    const targetLearnerCount = program.targetLearnerCount ?? program.maxSeats ?? null;
    const activeLearnerCount = program.activeLearnerCount ?? 0;
    const remainingTargetSlots =
      program.remainingTargetSlots ??
      (targetLearnerCount === null
        ? null
        : Math.max(targetLearnerCount - activeLearnerCount, 0));
    const isOverTargetLearners =
      program.isOverTargetLearners ??
      (targetLearnerCount !== null && activeLearnerCount > targetLearnerCount);

    return {
      id: program.id,
      slug: program.slug,
      titleAr: program.titleAr,
      titleEn: program.titleEn,
      descriptionAr: program.descriptionAr,
      descriptionEn: program.descriptionEn,
      coverImageUrl: program.coverImageUrl ?? null,
      categoryId: program.categoryId,
      category: this.presentCategorySummary(program.category, 'en'),
      priceEgp: program.priceEgp?.toString() ?? null,
      priceUsd: program.priceUsd?.toString() ?? null,
      registrationOpen: program.registrationOpen,
      maxSeats: program.maxSeats ?? null,
      targetLearnerCount,
      activeLearnerCount,
      remainingTargetSlots,
      isOverTargetLearners,
      startAt: program.startAt?.toISOString() ?? null,
      endAt: program.endAt?.toISOString() ?? null,
      status: program.status,
      publishedAt: program.publishedAt?.toISOString() ?? null,
      archivedAt: program.archivedAt?.toISOString() ?? null,
      createdByUserId: program.createdByUserId,
      createdAt: program.createdAt.toISOString(),
      updatedAt: program.updatedAt.toISOString(),
    };
  }

  presentAdminProgramDetails(program: {
    id: string;
    slug: string;
    titleAr: string;
    titleEn: string;
    descriptionAr: string | null;
    descriptionEn: string | null;
    coverImageUrl: string | null;
    categoryId: string | null;
    category?: {
      id: string;
      slugRoot: string;
      translations?: Array<{
        locale: string;
        title: string;
      }>;
    } | null;
    priceEgp: { toString(): string } | null;
    priceUsd: { toString(): string } | null;
    registrationOpen: boolean;
    maxSeats: number | null;
    startAt: Date | null;
    endAt: Date | null;
    status: AcademyProgramStatus;
    publishedAt: Date | null;
    archivedAt: Date | null;
    createdByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
    _count?: {
      sessions?: number;
    };
    sessions?: Array<{
      id: string;
      academyProgramId: string;
      titleAr: string;
      titleEn: string;
      descriptionAr: string | null;
      descriptionEn: string | null;
      startsAt: Date;
      endsAt: Date;
      deliveryMethod: AcademyProgramDeliveryMethod;
      internalDeliveryNote: string | null;
      internalDeliveryLink: string | null;
      sortOrder: number;
      isPublished: boolean;
      publishedAt: Date | null;
      createdByUserId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
  } & AcademyProgramCapacitySummary) {
    return {
      ...this.presentAdminProgramItem(program),
      sessions:
        program.sessions?.map((session) =>
          this.presentAdminSessionItem(session),
        ) ?? [],
    };
  }

  presentPublicSessionItem(
    session: {
      id: string;
      academyProgramId: string;
      titleAr: string;
      titleEn: string;
      descriptionAr: string | null;
      descriptionEn: string | null;
      startsAt: Date;
      endsAt: Date;
      deliveryMethod: AcademyProgramDeliveryMethod;
      sortOrder: number;
      isPublished: boolean;
      publishedAt: Date | null;
    },
    locale: SupportedLocale,
  ) {
    return {
      id: session.id,
      programId: session.academyProgramId,
      titleAr: session.titleAr,
      titleEn: session.titleEn,
      title: this.resolveLocalizedValue({
        locale,
        primary: session.titleAr,
        secondary: session.titleEn,
        slugFallback: session.id,
      }),
      descriptionAr: session.descriptionAr,
      descriptionEn: session.descriptionEn,
      description: this.resolveLocalizedDescription({
        locale,
        primary: session.descriptionAr,
        secondary: session.descriptionEn,
      }),
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
      deliveryMethod: session.deliveryMethod,
      sortOrder: session.sortOrder,
      isPublished: session.isPublished,
      publishedAt: session.publishedAt?.toISOString() ?? null,
    };
  }

  presentAdminSessionItem(session: {
    id: string;
    academyProgramId: string;
    titleAr: string;
    titleEn: string;
    descriptionAr: string | null;
    descriptionEn: string | null;
    startsAt: Date;
    endsAt: Date;
    deliveryMethod: AcademyProgramDeliveryMethod;
    internalDeliveryNote: string | null;
    internalDeliveryLink: string | null;
    sortOrder: number;
    isPublished: boolean;
    publishedAt: Date | null;
    createdByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: session.id,
      programId: session.academyProgramId,
      titleAr: session.titleAr,
      titleEn: session.titleEn,
      descriptionAr: session.descriptionAr,
      descriptionEn: session.descriptionEn,
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
      deliveryMethod: session.deliveryMethod,
      internalDeliveryNote: session.internalDeliveryNote,
      internalDeliveryLink: session.internalDeliveryLink,
      sortOrder: session.sortOrder,
      isPublished: session.isPublished,
      publishedAt: session.publishedAt?.toISOString() ?? null,
      createdByUserId: session.createdByUserId,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  private presentCategorySummary(
    category:
      | {
          id: string;
          slugRoot: string;
          translations?: Array<{
            locale: string;
            title: string;
          }>;
        }
      | null
      | undefined,
    locale: SupportedLocale,
  ) {
    if (!category) {
      return null;
    }

    const translation =
      category.translations?.find((item) => item.locale === locale) ??
      category.translations?.find((item) => item.locale === 'en') ??
      category.translations?.[0] ??
      null;

    return {
      id: category.id,
      slug: category.slugRoot.trim().toLowerCase(),
      titleAr:
        category.translations?.find((item) => item.locale === 'ar')?.title ??
        null,
      titleEn:
        category.translations?.find((item) => item.locale === 'en')?.title ??
        null,
      title:
        translation?.title?.trim() ||
        this.humanizeSlug(category.slugRoot) ||
        category.slugRoot.trim().toLowerCase(),
    };
  }

  private resolveLocalizedValue(input: {
    locale: SupportedLocale;
    primary: string | null | undefined;
    secondary: string | null | undefined;
    slugFallback: string;
  }) {
    const primary = input.primary?.trim() ?? '';
    const secondary = input.secondary?.trim() ?? '';

    if (input.locale === 'ar') {
      return primary || secondary || input.slugFallback;
    }

    return secondary || primary || input.slugFallback;
  }

  private resolveLocalizedDescription(input: {
    locale: SupportedLocale;
    primary: string | null | undefined;
    secondary: string | null | undefined;
  }) {
    const primary = input.primary?.trim() ?? '';
    const secondary = input.secondary?.trim() ?? '';

    if (input.locale === 'ar') {
      return primary || secondary || null;
    }

    return secondary || primary || null;
  }

  private humanizeSlug(slug: string): string {
    const cleaned = slug.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

    if (!cleaned) {
      return 'Academy program';
    }

    return cleaned
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
