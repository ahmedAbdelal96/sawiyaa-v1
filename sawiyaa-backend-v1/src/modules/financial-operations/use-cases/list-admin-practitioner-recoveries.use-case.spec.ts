import { BadRequestException } from '@nestjs/common';
import { PractitionerRecoveryRepository } from '../repositories/practitioner-recovery.repository';
import { PractitionerRecoveryPresenter } from '../presenters/practitioner-recovery.presenter';
import { ListAdminPractitionerRecoveriesUseCase } from './list-admin-practitioner-recoveries.use-case';
import { PractitionerRecoveryStatus } from '@prisma/client';

describe('ListAdminPractitionerRecoveriesUseCase', () => {
  function buildUseCase() {
    const recoveryRepository = {
      listRecoveries: jest.fn().mockResolvedValue([
        [
          {
            id: 'recovery_1',
            practitionerId: 'pract_1',
            sessionId: 'session_1',
            paymentId: 'payment_1',
            refundId: 'refund_1',
            sessionEarningReviewId: 'review_1',
            settlementId: null,
            payoutId: null,
            amount: { toString: () => '100.00' },
            recoveredAmount: { toString: () => '40.00' },
            currencyCode: 'EGP',
            status: PractitionerRecoveryStatus.OPEN,
            reasonCode: 'REFUND_AFTER_PAYOUT',
            internalReason: null,
            practitionerFacingNote: null,
            createdByUserId: null,
            resolvedByUserId: null,
            resolvedAt: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            practitioner: {
              id: 'pract_1',
              publicSlug: 'doc-hassan',
              professionalTitle: 'Consultant',
              user: { displayName: 'Dr Hassan' },
            },
            session: {
              id: 'session_1',
              sessionCode: 'SES-1',
              status: 'COMPLETED',
              paymentCoverageType: 'DIRECT_PAYMENT',
              scheduledStartAt: new Date('2026-01-01T00:00:00.000Z'),
              scheduledEndAt: new Date('2026-01-01T01:00:00.000Z'),
              completedAt: new Date('2026-01-01T01:00:00.000Z'),
            },
            payment: null,
            refund: null,
            sessionEarningReview: null,
            settlement: null,
            createdByUser: null,
            resolvedByUser: null,
            actions: [],
          },
        ],
        1,
      ]),
    } as unknown as PractitionerRecoveryRepository;

    const presenter = {
      presentListItem: jest.fn().mockImplementation((row) => row),
      presentList: jest.fn().mockImplementation((items, page, limit, totalItems, filters) => ({
        items,
        pagination: { page, limit, totalItems, totalPages: 1 },
        filters,
      })),
    } as unknown as PractitionerRecoveryPresenter;

    const useCase = new ListAdminPractitionerRecoveriesUseCase(
      recoveryRepository,
      presenter,
    );

    return { useCase, recoveryRepository, presenter };
  }

  it('returns paginated recovery results', async () => {
    const setup = buildUseCase();

    const result = await setup.useCase.execute({
      query: {
        page: 1,
        limit: 20,
        status: PractitionerRecoveryStatus.OPEN,
        currencyCode: 'egp',
        reasonCode: 'REFUND_AFTER_PAYOUT',
        createdFrom: '2026-01-01T00:00:00.000Z',
      } as never,
    });

    expect(setup.recoveryRepository.listRecoveries).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PractitionerRecoveryStatus.OPEN,
        currencyCode: 'EGP',
        reasonCode: 'REFUND_AFTER_PAYOUT',
        skip: 0,
        take: 20,
      }),
    );
    expect(result.pagination.totalItems).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it('rejects invalid date ranges', async () => {
    const setup = buildUseCase();

    await expect(
      setup.useCase.execute({
        query: {
          page: 1,
          limit: 20,
          createdFrom: '2026-02-02T00:00:00.000Z',
          createdTo: '2026-01-01T00:00:00.000Z',
        } as never,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
