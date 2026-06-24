import { Injectable } from '@nestjs/common';
import { ReviewModerationAction, SessionReviewStatus } from '@prisma/client';

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
    reviewTitle: string | null;
    reviewText: string | null;
    reviewStatus: SessionReviewStatus;
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
    ratingValue: number;
    reviewText: string | null;
    submittedAt: Date | null;
    publishedAt: Date | null;
  }) {
    return {
      id: item.id,
      overallRating: item.ratingValue,
      textReview: item.reviewText,
      submittedAt: item.submittedAt?.toISOString() ?? null,
      publishedAt: item.publishedAt?.toISOString() ?? null,
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
    action: ReviewModerationAction;
    item: unknown;
  }) {
    return {
      action: input.action,
      item: input.item,
    };
  }

  private resolveModeratedAt(item: {
    reviewStatus: SessionReviewStatus;
    updatedAt: Date;
    publishedAt: Date | null;
  }) {
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
