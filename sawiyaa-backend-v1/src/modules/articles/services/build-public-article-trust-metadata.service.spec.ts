import {
  PublicArticleFreshnessBandDto,
  PublicArticleTrustReasonCodeDto,
} from '../dto/article-response.dto';
import { BuildPublicArticleTrustMetadataService } from './build-public-article-trust-metadata.service';

describe('BuildPublicArticleTrustMetadataService', () => {
  const service = new BuildPublicArticleTrustMetadataService();
  const now = new Date('2026-04-01T12:00:00.000Z');

  it('marks recently published content as NEW with attributed author', () => {
    const trust = service.build({
      publishedAt: new Date('2026-03-31T12:00:00.000Z'),
      authorDisplayName: 'Editorial Team',
      now,
    });

    expect(trust).toEqual({
      freshnessBand: PublicArticleFreshnessBandDto.NEW,
      isFreshContent: true,
      authorDisplayName: 'Editorial Team',
      reasonCodes: [
        PublicArticleTrustReasonCodeDto.PUBLISHED_DATE_VERIFIED,
        PublicArticleTrustReasonCodeDto.RECENTLY_PUBLISHED,
        PublicArticleTrustReasonCodeDto.AUTHOR_ATTRIBUTED,
      ],
    });
  });

  it('marks older content as ESTABLISHED and keeps unattributed author safe', () => {
    const trust = service.build({
      publishedAt: new Date('2026-01-01T12:00:00.000Z'),
      authorDisplayName: null,
      now,
    });

    expect(trust).toEqual({
      freshnessBand: PublicArticleFreshnessBandDto.ESTABLISHED,
      isFreshContent: false,
      authorDisplayName: null,
      reasonCodes: [
        PublicArticleTrustReasonCodeDto.PUBLISHED_DATE_VERIFIED,
        PublicArticleTrustReasonCodeDto.ESTABLISHED_CONTENT,
        PublicArticleTrustReasonCodeDto.AUTHOR_UNATTRIBUTED,
      ],
    });
  });

  it('stays deterministic for missing publishedAt fallback', () => {
    const trust = service.build({
      publishedAt: null,
      authorDisplayName: null,
      now,
    });

    expect(trust.freshnessBand).toBe(PublicArticleFreshnessBandDto.UNPUBLISHED);
    expect(trust.isFreshContent).toBe(false);
  });
});
