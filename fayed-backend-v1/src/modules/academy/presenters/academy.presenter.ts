import { Injectable } from '@nestjs/common';
import { CourseStatus, CourseVisibility, PaymentStatus } from '@prisma/client';
import { AcademyCourseStats } from '../types/academy.types';
import {
  resolveAcademyCheckoutPricing,
  resolveAcademyCoursePricingState,
  resolveAcademyDefaultPricing,
} from '../utils/academy-pricing.util';

@Injectable()
export class AcademyPresenter {
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

  presentPublicCourseItem(
    course: {
      id: string;
      slug: string;
      title: string;
      shortDescription: string | null;
      coverImageUrl: string | null;
      thumbnailUrl: string | null;
      priceAmountEgp: { toString(): string } | null;
      priceAmountUsd: { toString(): string } | null;
      priceAmount: { toString(): string } | null;
      currencyCode: string | null;
      startsAt: Date | null;
      endsAt: Date | null;
      plannedDurationDays: number | null;
      plannedLectureCount: number | null;
      publishedAt: Date | null;
    },
    stats?: AcademyCourseStats | null,
    options?: { resolvedCountryCode?: string | null },
  ) {
    const pricingState = resolveAcademyCoursePricingState(null, {
      priceAmountEgp: course.priceAmountEgp?.toString() ?? null,
      priceAmountUsd: course.priceAmountUsd?.toString() ?? null,
      priceAmount: course.priceAmount?.toString() ?? null,
      currencyCode: course.currencyCode ?? null,
    });
    const displayPricing = resolveAcademyCheckoutPricing({
      priceAmountEgp: course.priceAmountEgp,
      priceAmountUsd: course.priceAmountUsd,
      priceAmount: course.priceAmount,
      currencyCode: course.currencyCode,
      resolvedCountryCode: options?.resolvedCountryCode ?? null,
    });

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      shortDescription: course.shortDescription ?? null,
      coverImageUrl: course.coverImageUrl ?? null,
      thumbnailUrl: course.thumbnailUrl ?? null,
      priceAmountEgp: pricingState.priceAmountEgp,
      priceAmountUsd: pricingState.priceAmountUsd,
      priceAmount: displayPricing.amount,
      currencyCode: displayPricing.currencyCode,
      regionalPricingMode: displayPricing.regionalPricingMode,
      resolvedCountryIsoCode: displayPricing.resolvedCountryCode,
      startsAt: course.startsAt?.toISOString() ?? null,
      endsAt: course.endsAt?.toISOString() ?? null,
      plannedDurationDays: course.plannedDurationDays ?? null,
      plannedLectureCount: course.plannedLectureCount ?? null,
      publishedAt: course.publishedAt?.toISOString() ?? null,
      stats: stats ?? null,
    };
  }

  presentPublicCourseDetails(
    course: {
      id: string;
      slug: string;
      title: string;
      shortDescription: string | null;
      fullDescription: string | null;
      coverImageUrl: string | null;
      thumbnailUrl: string | null;
      priceAmountEgp: { toString(): string } | null;
      priceAmountUsd: { toString(): string } | null;
      priceAmount: { toString(): string } | null;
      currencyCode: string | null;
      startsAt: Date | null;
      endsAt: Date | null;
      plannedDurationDays: number | null;
      plannedLectureCount: number | null;
      meetingUrl: string | null;
      whatsappGroupUrl: string | null;
      publishedAt: Date | null;
      status: CourseStatus;
      visibility: CourseVisibility;
      lectures?: Array<{
        id: string;
        lectureOrder: number;
        lectureTitle: string | null;
        startsAt: Date;
        endsAt: Date;
        createdAt: Date;
        updatedAt: Date;
        createdByUser?: {
          id: string;
          displayName: string | null;
        } | null;
      }>;
    },
    stats?: AcademyCourseStats | null,
    options?: { resolvedCountryCode?: string | null },
  ) {
    return {
      ...this.presentPublicCourseItem(course, stats, options),
      fullDescription: course.fullDescription ?? null,
      meetingUrl: null,
      whatsappGroupUrl: null,
      status: course.status,
      visibility: course.visibility,
      lectures: course.lectures?.map((lecture) => this.presentLectureItem(lecture)) ?? [],
    };
  }

  presentAdminCourseItem(
    course: {
      id: string;
      slug: string;
      title: string;
      shortDescription: string | null;
      fullDescription: string | null;
      coverImageUrl: string | null;
      thumbnailUrl: string | null;
      priceAmountEgp: { toString(): string } | null;
      priceAmountUsd: { toString(): string } | null;
      priceAmount: { toString(): string } | null;
      currencyCode: string | null;
      startsAt: Date | null;
      endsAt: Date | null;
      plannedDurationDays: number | null;
      plannedLectureCount: number | null;
      meetingUrl: string | null;
      whatsappGroupUrl: string | null;
      status: CourseStatus;
      visibility: CourseVisibility;
      publishedAt: Date | null;
      archivedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      lectures?: Array<{
        id: string;
        lectureOrder: number;
        lectureTitle: string | null;
        startsAt: Date;
        endsAt: Date;
        createdAt: Date;
        updatedAt: Date;
        createdByUser?: {
          id: string;
          displayName: string | null;
        } | null;
      }>;
    },
    stats?: AcademyCourseStats | null,
  ) {
    const displayPricing = resolveAcademyDefaultPricing({
      priceAmountEgp: course.priceAmountEgp,
      priceAmountUsd: course.priceAmountUsd,
      priceAmount: course.priceAmount,
      currencyCode: course.currencyCode,
    });

    return {
      ...this.presentPublicCourseDetails(course, stats),
      priceAmount: displayPricing.amount,
      currencyCode: displayPricing.currencyCode,
      meetingUrl: course.meetingUrl ?? null,
      whatsappGroupUrl: course.whatsappGroupUrl ?? null,
      archivedAt: course.archivedAt?.toISOString() ?? null,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
      plannedDurationDays: course.plannedDurationDays ?? null,
      plannedLectureCount: course.plannedLectureCount ?? null,
      lectures: course.lectures?.map((lecture) => this.presentLectureItem(lecture)) ?? [],
    };
  }

  presentLectureItem(input: {
    id: string;
    lectureOrder: number;
    lectureTitle: string | null;
    startsAt: Date;
    endsAt: Date;
    createdAt: Date;
    updatedAt: Date;
    createdByUser?: {
      id: string;
      displayName: string | null;
    } | null;
  }) {
    return {
      id: input.id,
      lectureOrder: input.lectureOrder,
      lectureTitle: input.lectureTitle ?? null,
      startsAt: input.startsAt.toISOString(),
      endsAt: input.endsAt.toISOString(),
      createdAt: input.createdAt.toISOString(),
      updatedAt: input.updatedAt.toISOString(),
      createdByUser: input.createdByUser
        ? {
            id: input.createdByUser.id,
            displayName: input.createdByUser.displayName,
          }
        : null,
    };
  }

  presentEnrollmentItem(input: {
    id: string;
    publicAccessToken: string;
    enrollmentStatus: string;
    paymentStatus: string | null;
    registeredAt: Date;
    confirmedAt: Date | null;
    cancelledAt: Date | null;
    failedAt: Date | null;
    failedReason: string | null;
    notesInternal: string | null;
    academyCourse: {
      id: string;
      slug: string;
      title: string;
      meetingUrl: string | null;
      whatsappGroupUrl: string | null;
    };
    academyLearner: {
      fullName: string;
      phoneNumber: string;
      whatsappNumber: string | null;
      email: string | null;
      countryCode: string | null;
      countryCodeDeclared: string | null;
      countryCodeSource: string | null;
      countryCodeMismatch: boolean;
      sourceLabel: string | null;
    };
    paymentAttempts?: Array<{
      id: string;
      provider: string;
      status: PaymentStatus;
      amountSubtotal: { toString(): string };
      amountTotal: { toString(): string };
      currencyCode: string;
      providerPaymentRef: string | null;
      providerOrderRef: string | null;
      providerCustomerRef: string | null;
      checkoutUrl: string | null;
      clientSecret: string | null;
      failureReason: string | null;
      createdAt: Date;
    }>;
    payment?: {
      id: string;
      provider: string;
      status: PaymentStatus;
      amountTotal: { toString(): string };
      currencyCode: string;
      metadataJson: unknown;
    } | null;
  }) {
    const latestAttempt = input.paymentAttempts?.[0] ?? null;
    const paymentMetadata = (input.payment?.metadataJson ?? {}) as Record<
      string,
      unknown
    >;

    return {
      id: input.id,
      publicAccessToken: input.publicAccessToken,
      courseId: input.academyCourse.id,
      courseSlug: input.academyCourse.slug,
      courseTitle: input.academyCourse.title,
      enrollmentStatus: input.enrollmentStatus,
      paymentStatus: input.paymentStatus,
      registeredAt: input.registeredAt.toISOString(),
      confirmedAt: input.confirmedAt?.toISOString() ?? null,
      cancelledAt: input.cancelledAt?.toISOString() ?? null,
      failedAt: input.failedAt?.toISOString() ?? null,
      failedReason: input.failedReason ?? null,
      notesInternal: input.notesInternal ?? null,
      learner: {
        fullName: input.academyLearner.fullName,
        phoneNumber: input.academyLearner.phoneNumber,
        whatsappNumber: input.academyLearner.whatsappNumber,
        email: input.academyLearner.email,
        countryCode: input.academyLearner.countryCode,
        countryCodeDeclared: input.academyLearner.countryCodeDeclared,
        countryCodeSource: input.academyLearner.countryCodeSource,
        countryCodeMismatch: input.academyLearner.countryCodeMismatch,
        sourceLabel: input.academyLearner.sourceLabel,
      },
      payment: input.payment
        ? {
            id: input.payment.id,
            provider: input.payment.provider,
            status: input.payment.status,
            amount: input.payment.amountTotal.toString(),
            currency: input.payment.currencyCode,
            checkoutUrl:
              typeof paymentMetadata.checkoutUrl === 'string'
                ? paymentMetadata.checkoutUrl
                : latestAttempt?.checkoutUrl ?? null,
            clientSecret:
              typeof paymentMetadata.clientSecret === 'string'
                ? paymentMetadata.clientSecret
                : latestAttempt?.clientSecret ?? null,
          }
        : latestAttempt
          ? {
              id: latestAttempt.id,
              provider: latestAttempt.provider,
              status: latestAttempt.status,
              amount: latestAttempt.amountTotal.toString(),
              currency: latestAttempt.currencyCode,
              checkoutUrl: latestAttempt.checkoutUrl,
              clientSecret: latestAttempt.clientSecret,
            }
          : null,
      joinAccess: {
        meetingUrl: input.academyCourse.meetingUrl ?? null,
        whatsappGroupUrl: input.academyCourse.whatsappGroupUrl ?? null,
      },
    };
  }
}
