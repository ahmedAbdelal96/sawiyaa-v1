import { Injectable } from '@nestjs/common';
import {
  PublicArticleFreshnessBandDto,
  PublicArticleTrustReasonCodeDto,
} from '../dto/article-response.dto';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const NEW_CONTENT_DAYS_THRESHOLD = 7;
const RECENT_CONTENT_DAYS_THRESHOLD = 30;

@Injectable()
export class BuildPublicArticleTrustMetadataService {
  build(input: {
    publishedAt: Date | null;
    authorDisplayName: string | null;
    now?: Date;
  }) {
    const now = input.now ?? new Date();
    const freshnessBand = this.resolveFreshnessBand(input.publishedAt, now);
    const isFreshContent =
      freshnessBand === PublicArticleFreshnessBandDto.NEW ||
      freshnessBand === PublicArticleFreshnessBandDto.RECENT;

    const reasonCodes: PublicArticleTrustReasonCodeDto[] = [
      PublicArticleTrustReasonCodeDto.PUBLISHED_DATE_VERIFIED,
      freshnessBand === PublicArticleFreshnessBandDto.ESTABLISHED
        ? PublicArticleTrustReasonCodeDto.ESTABLISHED_CONTENT
        : PublicArticleTrustReasonCodeDto.RECENTLY_PUBLISHED,
      input.authorDisplayName
        ? PublicArticleTrustReasonCodeDto.AUTHOR_ATTRIBUTED
        : PublicArticleTrustReasonCodeDto.AUTHOR_UNATTRIBUTED,
    ];

    return {
      freshnessBand,
      isFreshContent,
      authorDisplayName: input.authorDisplayName ?? null,
      reasonCodes,
    };
  }

  private resolveFreshnessBand(
    publishedAt: Date | null,
    now: Date,
  ): PublicArticleFreshnessBandDto {
    if (!publishedAt) {
      return PublicArticleFreshnessBandDto.UNPUBLISHED;
    }

    const ageDays = Math.floor(
      (now.getTime() - publishedAt.getTime()) / DAY_IN_MS,
    );
    if (ageDays <= NEW_CONTENT_DAYS_THRESHOLD) {
      return PublicArticleFreshnessBandDto.NEW;
    }

    if (ageDays <= RECENT_CONTENT_DAYS_THRESHOLD) {
      return PublicArticleFreshnessBandDto.RECENT;
    }

    return PublicArticleFreshnessBandDto.ESTABLISHED;
  }
}
