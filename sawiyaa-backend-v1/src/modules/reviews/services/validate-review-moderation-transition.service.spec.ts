import { ReviewModerationAction, SessionReviewStatus } from '@prisma/client';
import { ValidateReviewModerationTransitionService } from './validate-review-moderation-transition.service';

describe('ValidateReviewModerationTransitionService', () => {
  const service = new ValidateReviewModerationTransitionService();

  it('maps approved action to published status', () => {
    const now = new Date('2026-03-30T12:00:00.000Z');
    const next = service.resolveNextState({
      currentStatus: SessionReviewStatus.PENDING_MODERATION,
      action: ReviewModerationAction.APPROVED,
      now,
    });

    expect(next).toEqual({
      status: SessionReviewStatus.PUBLISHED,
      publishedAt: now,
      hiddenAt: null,
      archivedAt: null,
    });
  });

  it('maps hidden action to hidden status', () => {
    const now = new Date('2026-03-30T12:00:00.000Z');
    const next = service.resolveNextState({
      currentStatus: SessionReviewStatus.PUBLISHED,
      action: ReviewModerationAction.HIDDEN,
      now,
    });

    expect(next.status).toBe(SessionReviewStatus.HIDDEN);
    expect(next.hiddenAt).toEqual(now);
    expect(next.publishedAt).toBeNull();
  });

  it('rejects invalid moderation transition', () => {
    expect(() =>
      service.resolveNextState({
        currentStatus: SessionReviewStatus.ARCHIVED,
        action: ReviewModerationAction.APPROVED,
        now: new Date(),
      }),
    ).toThrow();
  });
});
