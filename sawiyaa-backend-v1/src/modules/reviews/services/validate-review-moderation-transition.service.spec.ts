import {
  SessionReviewModerationDecision,
  SessionReviewStatus,
} from '@prisma/client';
import { ValidateReviewModerationTransitionService } from './validate-review-moderation-transition.service';

describe('ValidateReviewModerationTransitionService', () => {
  const service = new ValidateReviewModerationTransitionService();

  it('approves as-is into published state and counts publicly', () => {
    const now = new Date('2026-03-30T12:00:00.000Z');
    const next = service.resolveNextState({
      currentStatus: SessionReviewStatus.PENDING_MODERATION,
      decision: SessionReviewModerationDecision.APPROVED_AS_IS,
      originalRatingValue: 4,
      now,
    });

    expect(next).toEqual({
      status: SessionReviewStatus.PUBLISHED,
      publishedAt: now,
      hiddenAt: null,
      archivedAt: null,
      publicRatingValue: 4,
      countsInPublicAverage: true,
      moderationDecision: SessionReviewModerationDecision.APPROVED_AS_IS,
    });
  });

  it('edits and approves using the public rating value', () => {
    const now = new Date('2026-03-30T12:00:00.000Z');
    const next = service.resolveNextState({
      currentStatus: SessionReviewStatus.PENDING_MODERATION,
      decision: SessionReviewModerationDecision.EDITED_AND_APPROVED,
      originalRatingValue: 2,
      publicRatingValue: 4,
      now,
    });

    expect(next.publicRatingValue).toBe(4);
    expect(next.status).toBe(SessionReviewStatus.PUBLISHED);
    expect(next.countsInPublicAverage).toBe(true);
  });

  it('rejects edited approval without a public rating value', () => {
    expect(() =>
      service.resolveNextState({
        currentStatus: SessionReviewStatus.PENDING_MODERATION,
        decision: SessionReviewModerationDecision.EDITED_AND_APPROVED,
        originalRatingValue: 2,
        now: new Date(),
      }),
    ).toThrow();
  });

  it('marks internal note only as hidden and excluded from public average', () => {
    const now = new Date('2026-03-30T12:00:00.000Z');
    const next = service.resolveNextState({
      currentStatus: SessionReviewStatus.PENDING_MODERATION,
      decision: SessionReviewModerationDecision.INTERNAL_NOTE_ONLY,
      originalRatingValue: 1,
      now,
    });

    expect(next).toEqual({
      status: SessionReviewStatus.HIDDEN,
      publishedAt: null,
      hiddenAt: now,
      archivedAt: null,
      publicRatingValue: null,
      countsInPublicAverage: false,
      moderationDecision: SessionReviewModerationDecision.INTERNAL_NOTE_ONLY,
    });
  });

  it('rejects invalid moderation transition', () => {
    expect(() =>
      service.resolveNextState({
        currentStatus: SessionReviewStatus.ARCHIVED,
        decision: SessionReviewModerationDecision.APPROVED_AS_IS,
        originalRatingValue: 5,
        now: new Date(),
      }),
    ).toThrow();
  });
});
