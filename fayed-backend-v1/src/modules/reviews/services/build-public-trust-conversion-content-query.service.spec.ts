import { BuildPublicTrustConversionContentQueryService } from './build-public-trust-conversion-content-query.service';

describe('BuildPublicTrustConversionContentQueryService', () => {
  const service = new BuildPublicTrustConversionContentQueryService();

  it('returns new-practitioner query plan deterministically', () => {
    const plan = service.build({
      totalPublicReviews: 0,
      freshness: 'NONE',
      hasEnoughPublicReviews: false,
    });

    expect(plan).toEqual({
      primaryQuery: 'start therapy',
      fallbackQuery: 'therapy',
      reasonCodes: ['TRUST_BLOCK_NEW_PRACTITIONER_CONTENT'],
    });
  });

  it('returns established-confidence query plan deterministically', () => {
    const plan = service.build({
      totalPublicReviews: 12,
      freshness: 'RECENT',
      hasEnoughPublicReviews: true,
    });

    expect(plan.reasonCodes).toContain('TRUST_BLOCK_ESTABLISHED_CONFIDENCE_CONTENT');
  });
});
