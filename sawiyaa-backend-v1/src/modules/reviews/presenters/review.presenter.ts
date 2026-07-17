import { Injectable } from '@nestjs/common';
import {
  SessionReviewModerationDecision,
  SessionReviewStatus,
} from '@prisma/client';
import { PendingPatientReviewItemView } from '../types/reviews.types';

@Injectable()
export class ReviewPresenter {
  presentPatientReviewItem(item: {
    id: string;
    sessionId: string;
    ratingValue: number;
    reviewTitle: string | null;
    reviewText: string | null;
    reviewStatus: SessionReviewStatus;
    submittedAt: Date | null;
    publishedAt: Date | null;
    moderatedAt?: Date | null;
    updatedAt: Date;
    practitioner: {
      id: string;
      publicSlug: string;
      user: {
        displayName: string | null;
      };
    };
  }) {
    return {
      id: item.id,
      sessionId: item.sessionId,
      overallRating: item.ratingValue,
      title: item.reviewTitle,
      textReview: item.reviewText,
      status: item.reviewStatus,
      submittedAt: item.submittedAt?.toISOString() ?? null,
      publishedAt: item.publishedAt?.toISOString() ?? null,
      moderatedAt: this.resolveModeratedAt(item),
      practitioner: {
        id: item.practitioner.id,
        slug: item.practitioner.publicSlug,
        displayName: item.practitioner.user.displayName ?? null,
      },
    };
  }

  presentAdminReviewItem(item: {
    id: string;
    sessionId: string;
    patientId: string;
    practitionerId: string;
    isAnonymous: boolean;
    ratingValue: number;
    publicRatingValue: number | null;
    reviewTitle: string | null;
    reviewText: string | null;
    reviewStatus: SessionReviewStatus;
    moderationDecision: SessionReviewModerationDecision | null;
    moderatedByUserId: string | null;
    moderatedAt: Date | null;
    moderationReason: string | null;
    countsInPublicAverage: boolean;
    submittedAt: Date | null;
    publishedAt: Date | null;
    updatedAt: Date;
    practitioner: {
      id: string;
      publicSlug: string;
      user: {
        displayName: string | null;
      };
    };
    patient: {
      id: string;
      displayName: string | null;
      user: {
        displayName: string | null;
      };
    };
    session: {
      id: string;
      scheduledStartAt: Date | null;
    };
  }) {
    const patientDisplayName =
      item.patient.displayName ?? item.patient.user.displayName ?? null;
    const patientLabel = item.isAnonymous
      ? 'Anonymous patient'
      : patientDisplayName ?? 'Patient';

    return {
      ...this.presentPatientReviewItem(item),
      originalRatingValue: item.ratingValue,
      publicRatingValue: item.publicRatingValue,
      moderationDecision: item.moderationDecision,
      moderatedByUserId: item.moderatedByUserId,
      moderatedAt: item.moderatedAt?.toISOString() ?? null,
      moderationReason: item.moderationReason,
      countsInPublicAverage: item.countsInPublicAverage,
      patientProfileId: item.patientId,
      practitionerProfileId: item.practitionerId,
      patient: {
        id: item.patient.id,
        displayName: patientDisplayName,
        label: patientLabel,
        isAnonymous: item.isAnonymous,
      },
      session: {
        id: item.session.id,
        scheduledStartAt: item.session.scheduledStartAt?.toISOString() ?? null,
      },
    };
  }

  presentReviewList(input: {
    items: unknown[];
    page: number;
    limit: number;
    totalItems: number;
  }) {
    return {
      items: input.items,
      pagination: {
        page: input.page,
        limit: input.limit,
        totalItems: input.totalItems,
        totalPages: Math.max(1, Math.ceil(input.totalItems / input.limit)),
      },
    };
  }

  presentPublicReviewItem(item: {
    id: string;
    publicRatingValue: number | null;
    reviewText: string | null;
    moderationDecision: SessionReviewModerationDecision | null;
    submittedAt: Date | null;
    publishedAt: Date | null;
  }) {
    return {
      id: item.id,
      overallRating: item.publicRatingValue as number,
      textReview: null,
      submittedAt: item.submittedAt?.toISOString() ?? null,
      publishedAt: item.publishedAt?.toISOString() ?? null,
    };
  }

  presentPendingReviewItem(item: {
    id: string;
    completedAt: Date | null;
    scheduledStartAt: Date | null;
    decisions?: Array<{ createdAt: Date }>;
    practitioner: {
      id: string;
      publicSlug: string;
      user: {
        displayName: string | null;
      };
    };
  }): PendingPatientReviewItemView {
    return {
      sessionId: item.id,
      completedAt:
        item.completedAt?.toISOString() ??
        item.decisions?.[0]?.createdAt.toISOString() ??
        null,
      scheduledStartAt: item.scheduledStartAt?.toISOString() ?? null,
      practitioner: {
        id: item.practitioner.id,
        slug: item.practitioner.publicSlug,
        displayName: item.practitioner.user.displayName ?? null,
      },
    };
  }

  presentPublicSummary(input: {
    averageRating: number | null;
    ratingsCount: number;
    publishedRatingsCount: number;
    writtenReviewsCount: number;
    totalPublicReviews: number;
    totalPublishedReviews: number;
    totalSubmittedReviews: number;
    latestPublishedReviewAt: string | null;
    hasEnoughPublicReviews: boolean;
    volumeLevel: 'NONE' | 'LOW' | 'ESTABLISHED';
    freshness: 'NONE' | 'RECENT' | 'STALE';
    rationaleCodes: string[];
  }) {
    return {
      averageOverallRating: input.averageRating,
      ratingsCount: input.ratingsCount,
      publishedRatingsCount: input.publishedRatingsCount,
      writtenReviewsCount: input.writtenReviewsCount,
      totalPublicReviews: input.totalPublicReviews,
      totalPublishedReviews: input.totalPublishedReviews,
      totalSubmittedReviews: input.totalSubmittedReviews,
      latestPublishedReviewAt: input.latestPublishedReviewAt,
      hasEnoughPublicReviews: input.hasEnoughPublicReviews,
      volumeLevel: input.volumeLevel,
      freshness: input.freshness,
      rationaleCodes: input.rationaleCodes,
    };
  }

  presentPublicPractitionerSummary(input: {
    id: string;
    slug: string;
    displayName: string | null;
  }) {
    return {
      id: input.id,
      slug: input.slug,
      displayName: input.displayName,
    };
  }

  presentModerationResult(input: {
    decision: SessionReviewModerationDecision;
    item: unknown;
  }) {
    return {
      decision: input.decision,
      action: input.decision,
      item: input.item,
    };
  }

  private resolveModeratedAt(item: {
    reviewStatus: SessionReviewStatus;
    updatedAt: Date;
    publishedAt: Date | null;
    moderatedAt?: Date | null;
  }) {
    if (item.moderatedAt) {
      return item.moderatedAt.toISOString();
    }

    if (
      item.reviewStatus === SessionReviewStatus.PENDING_MODERATION ||
      item.reviewStatus === SessionReviewStatus.DRAFT ||
      item.reviewStatus === SessionReviewStatus.SUBMITTED
    ) {
      return null;
    }

    return item.publishedAt?.toISOString() ?? item.updatedAt.toISOString();
  }
}
