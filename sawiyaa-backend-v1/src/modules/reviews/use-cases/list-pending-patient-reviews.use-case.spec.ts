import { NotFoundException } from '@nestjs/common';
import { ReviewPresenter } from '../presenters/review.presenter';
import { ReviewActorRepository } from '../repositories/review-actor.repository';
import { ResolveSessionReviewEligibilityService } from '../services/resolve-session-review-eligibility.service';
import { ListPendingPatientReviewsUseCase } from './list-pending-patient-reviews.use-case';

describe('ListPendingPatientReviewsUseCase', () => {
  const reviewActorRepository = {
    findPatientProfileByUserId: jest.fn(),
  } as unknown as ReviewActorRepository;
  const resolveSessionReviewEligibility = {
    listEligibleSessionsForReview: jest.fn(),
  } as unknown as ResolveSessionReviewEligibilityService;
  const reviewPresenter = new ReviewPresenter();

  const useCase = new ListPendingPatientReviewsUseCase(
    reviewActorRepository,
    resolveSessionReviewEligibility,
    reviewPresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws not found when patient profile is missing', async () => {
    (reviewActorRepository.findPatientProfileByUserId as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'user-1',
        query: { page: 1, limit: 3 },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns pending sessions with safe review reminder shape', async () => {
    (reviewActorRepository.findPatientProfileByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
    });
    (resolveSessionReviewEligibility.listEligibleSessionsForReview as jest.Mock).mockResolvedValue([
      [
        {
          id: 'session-2',
          completedAt: new Date('2026-03-02T10:00:00.000Z'),
          scheduledStartAt: new Date('2026-03-02T09:00:00.000Z'),
          practitioner: {
            id: 'practitioner-2',
            publicSlug: 'dr-two',
            user: {
              displayName: 'Dr Two',
            },
          },
        },
        {
          id: 'session-1',
          completedAt: new Date('2026-03-01T10:00:00.000Z'),
          scheduledStartAt: new Date('2026-03-01T09:00:00.000Z'),
          practitioner: {
            id: 'practitioner-1',
            publicSlug: 'dr-one',
            user: {
              displayName: 'Dr One',
            },
          },
        },
      ],
      2,
    ]);

    const result = await useCase.execute({
      userId: 'user-1',
      query: { page: 1, limit: 3 },
    });

    expect(result).toEqual({
      items: [
        {
          sessionId: 'session-2',
          completedAt: '2026-03-02T10:00:00.000Z',
          scheduledStartAt: '2026-03-02T09:00:00.000Z',
          practitioner: {
            id: 'practitioner-2',
            slug: 'dr-two',
            displayName: 'Dr Two',
          },
        },
        {
          sessionId: 'session-1',
          completedAt: '2026-03-01T10:00:00.000Z',
          scheduledStartAt: '2026-03-01T09:00:00.000Z',
          practitioner: {
            id: 'practitioner-1',
            slug: 'dr-one',
            displayName: 'Dr One',
          },
        },
      ],
      pagination: {
        page: 1,
        limit: 3,
        totalItems: 2,
        totalPages: 1,
      },
    });
    expect(resolveSessionReviewEligibility.listEligibleSessionsForReview).toHaveBeenCalledWith({
      patientId: 'patient-1',
      page: 1,
      limit: 3,
    });
  });
});
