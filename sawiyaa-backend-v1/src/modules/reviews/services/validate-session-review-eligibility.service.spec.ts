import { SessionStatus } from '@prisma/client';
import { ReviewSessionRepository } from '../repositories/review-session.repository';
import { ValidateSessionReviewEligibilityService } from './validate-session-review-eligibility.service';

describe('ValidateSessionReviewEligibilityService', () => {
  const reviewSessionRepository = {
    findOwnedSessionForReview: jest.fn(),
  } as unknown as ReviewSessionRepository;
  const resolveSessionReviewEligibility = {
    resolveMany: jest.fn(),
  };

  const service = new ValidateSessionReviewEligibilityService(
    reviewSessionRepository,
    resolveSessionReviewEligibility as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes for completed and paid owned session', async () => {
    const session = {
      id: 'session-1',
      status: SessionStatus.COMPLETED,
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
    };
    (
      reviewSessionRepository.findOwnedSessionForReview as jest.Mock
    ).mockResolvedValue(session);
    resolveSessionReviewEligibility.resolveMany.mockResolvedValue(
      new Map([['session-1', { isEffectivelyCompleted: true, hasValidSource: true }]]),
    );

    await expect(
      service.assertEligible({
        sessionId: 'session-1',
        patientId: 'patient-1',
      }),
    ).resolves.toEqual(session);
  });

  it('rejects when session is not completed', async () => {
    (
      reviewSessionRepository.findOwnedSessionForReview as jest.Mock
    ).mockResolvedValue({
      id: 'session-1',
      status: SessionStatus.UPCOMING,
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
    });
    resolveSessionReviewEligibility.resolveMany.mockResolvedValue(
      new Map([['session-1', { isEffectivelyCompleted: false, hasValidSource: false }]]),
    );

    await expect(
      service.assertEligible({
        sessionId: 'session-1',
        patientId: 'patient-1',
      }),
    ).rejects.toMatchObject({
      response: { error: 'REVIEW_SESSION_NOT_COMPLETED' },
    });
  });

  it('rejects when session is no-show (must not unlock reviews)', async () => {
    (
      reviewSessionRepository.findOwnedSessionForReview as jest.Mock
    ).mockResolvedValue({
      id: 'session-1',
      status: SessionStatus.NO_SHOW,
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
    });
    resolveSessionReviewEligibility.resolveMany.mockResolvedValue(
      new Map([['session-1', { isEffectivelyCompleted: false, hasValidSource: false }]]),
    );

    await expect(
      service.assertEligible({
        sessionId: 'session-1',
        patientId: 'patient-1',
      }),
    ).rejects.toMatchObject({
      response: { error: 'REVIEW_SESSION_NOT_COMPLETED' },
    });
  });

  it('rejects when session has no captured payment', async () => {
    (
      reviewSessionRepository.findOwnedSessionForReview as jest.Mock
    ).mockResolvedValue({
      id: 'session-1',
      status: SessionStatus.COMPLETED,
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
    });
    resolveSessionReviewEligibility.resolveMany.mockResolvedValue(
      new Map([['session-1', { isEffectivelyCompleted: true, hasValidSource: false }]]),
    );

    await expect(
      service.assertEligible({
        sessionId: 'session-1',
        patientId: 'patient-1',
      }),
    ).rejects.toMatchObject({
      response: { error: 'REVIEW_SESSION_NOT_PAID' },
    });
  });
});
