import { Injectable } from '@nestjs/common';

@Injectable()
export class BuildPublicTrustConversionContentQueryService {
  build(input: {
    totalPublicReviews: number;
    freshness: 'NONE' | 'RECENT' | 'STALE';
    hasEnoughPublicReviews: boolean;
  }): { primaryQuery: string; fallbackQuery: string; reasonCodes: string[] } {
    if (input.totalPublicReviews === 0) {
      return {
        primaryQuery: 'start therapy',
        fallbackQuery: 'therapy',
        reasonCodes: ['TRUST_BLOCK_NEW_PRACTITIONER_CONTENT'],
      };
    }

    if (input.freshness === 'STALE') {
      return {
        primaryQuery: 'care continuity',
        fallbackQuery: 'therapy',
        reasonCodes: ['TRUST_BLOCK_STALE_REVIEW_CONTINUITY_CONTENT'],
      };
    }

    if (!input.hasEnoughPublicReviews) {
      return {
        primaryQuery: 'how therapy works',
        fallbackQuery: 'therapy',
        reasonCodes: ['TRUST_BLOCK_LOW_VOLUME_CONTEXT_CONTENT'],
      };
    }

    return {
      primaryQuery: 'therapy',
      fallbackQuery: 'mental health',
      reasonCodes: ['TRUST_BLOCK_ESTABLISHED_CONFIDENCE_CONTENT'],
    };
  }
}
