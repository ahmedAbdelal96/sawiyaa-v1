import { Injectable } from '@nestjs/common';

type PractitionerCredibilityVolumeLevel = 'NONE' | 'LOW' | 'ESTABLISHED';
type PractitionerCredibilityFreshness = 'NONE' | 'RECENT' | 'STALE';

@Injectable()
export class BuildPractitionerCredibilitySummaryService {
  private static readonly ESTABLISHED_REVIEWS_THRESHOLD = 3;
  private static readonly RECENT_REVIEW_DAYS_THRESHOLD = 30;

  build(input: {
    ratingsCount: number;
    writtenReviewsCount: number;
    averagePublicRating: number | null;
    latestPublishedAt: Date | null;
    now?: Date;
  }) {
    const now = input.now ?? new Date();
    const ratingsCount = Math.max(0, input.ratingsCount);
    const writtenReviewsCount = Math.max(0, input.writtenReviewsCount);

    const averageOverallRating =
      ratingsCount > 0 && input.averagePublicRating != null
        ? Number(Number(input.averagePublicRating).toFixed(2))
        : null;

    const volumeLevel = this.resolveVolumeLevel(ratingsCount);
    const freshness = this.resolveFreshness({
      latestPublishedAt: input.latestPublishedAt,
      now,
    });
    const hasEnoughPublicReviews =
      ratingsCount >=
      BuildPractitionerCredibilitySummaryService.ESTABLISHED_REVIEWS_THRESHOLD;

    const rationaleCodes: string[] = [];
    if (ratingsCount === 0) {
      rationaleCodes.push('NO_PUBLIC_REVIEWS');
    } else if (!hasEnoughPublicReviews) {
      rationaleCodes.push('LOW_PUBLIC_REVIEW_VOLUME');
    } else {
      rationaleCodes.push('ESTABLISHED_PUBLIC_REVIEW_VOLUME');
    }

    if (freshness === 'RECENT') {
      rationaleCodes.push('RECENT_PUBLIC_FEEDBACK');
    } else if (freshness === 'STALE') {
      rationaleCodes.push('PUBLIC_FEEDBACK_NOT_RECENT');
    } else {
      rationaleCodes.push('NO_PUBLIC_FEEDBACK_TIMELINE');
    }

    return {
      averageOverallRating,
      ratingsCount,
      publishedRatingsCount: ratingsCount,
      writtenReviewsCount,
      totalPublicReviews: ratingsCount,
      totalPublishedReviews: ratingsCount,
      totalSubmittedReviews: ratingsCount,
      latestPublishedReviewAt: input.latestPublishedAt?.toISOString() ?? null,
      hasEnoughPublicReviews,
      volumeLevel,
      freshness,
      rationaleCodes,
    };
  }

  private resolveVolumeLevel(
    totalPublicReviews: number,
  ): PractitionerCredibilityVolumeLevel {
    if (totalPublicReviews <= 0) {
      return 'NONE';
    }

    if (
      totalPublicReviews <
      BuildPractitionerCredibilitySummaryService.ESTABLISHED_REVIEWS_THRESHOLD
    ) {
      return 'LOW';
    }

    return 'ESTABLISHED';
  }

  private resolveFreshness(input: {
    latestPublishedAt: Date | null;
    now: Date;
  }): PractitionerCredibilityFreshness {
    if (!input.latestPublishedAt) {
      return 'NONE';
    }

    const ageMs = input.now.getTime() - input.latestPublishedAt.getTime();
    const ageDays = ageMs / (24 * 60 * 60 * 1000);

    return ageDays <=
      BuildPractitionerCredibilitySummaryService.RECENT_REVIEW_DAYS_THRESHOLD
      ? 'RECENT'
      : 'STALE';
  }
}
