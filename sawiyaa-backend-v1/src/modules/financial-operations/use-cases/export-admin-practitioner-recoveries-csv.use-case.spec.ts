import { PractitionerRecoveryRepository } from '../repositories/practitioner-recovery.repository';
import { PractitionerRecoveryPresenter } from '../presenters/practitioner-recovery.presenter';
import { ExportAdminPractitionerRecoveriesCsvUseCase } from './export-admin-practitioner-recoveries-csv.use-case';

describe('ExportAdminPractitionerRecoveriesCsvUseCase', () => {
  it('exports filtered practitioner recoveries as CSV', async () => {
    const recoveryRepository = {
      listRecoveriesForExport: jest.fn().mockResolvedValue([
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
          status: 'OPEN',
          reasonCode: 'REFUND_AFTER_PAYOUT',
          internalReason: 'Manual note',
          practitionerFacingNote: 'Facing note',
          createdByUserId: 'admin_1',
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
          createdByUser: { id: 'admin_1', displayName: 'Finance Admin' },
          resolvedByUser: null,
          actions: [],
        },
      ]),
    } as unknown as PractitionerRecoveryRepository;

    const presenter = {
      presentDetailItem: jest.fn().mockReturnValue({
        recoveryId: 'recovery_1',
        practitioner: {
          practitionerId: 'pract_1',
          displayName: 'Dr Hassan',
          publicSlug: 'doc-hassan',
          professionalTitle: 'Consultant',
        },
        session: {
          sessionCode: 'SES-1',
        },
        payment: {
          paymentId: 'payment_1',
        },
        refund: {
          refundId: 'refund_1',
        },
        sessionEarningReview: {
          sessionEarningReviewId: 'review_1',
        },
        settlement: null,
        payoutId: null,
        amount: '100.00',
        recoveredAmount: '40.00',
        remainingAmount: '60.00',
        currencyCode: 'EGP',
        status: 'OPEN',
        reasonCode: 'REFUND_AFTER_PAYOUT',
        createdAt: '2026-01-01T00:00:00.000Z',
        resolvedAt: null,
        internalReason: 'Manual note',
        practitionerFacingNote: 'Facing note',
        createdBy: { id: 'admin_1', displayName: 'Finance Admin' },
        resolvedBy: null,
        actionHistory: [],
      }),
    } as unknown as PractitionerRecoveryPresenter;

    const useCase = new ExportAdminPractitionerRecoveriesCsvUseCase(
      recoveryRepository,
      presenter,
    );

    const result = await useCase.execute({
      page: 1,
      limit: 20,
      practitionerId: 'pract_1',
      status: 'OPEN',
      reasonCode: 'REFUND_AFTER_PAYOUT',
      currencyCode: 'egp',
      createdFrom: '2026-01-01T00:00:00.000Z',
      createdTo: '2026-01-31T23:59:59.999Z',
    } as never);

    expect(recoveryRepository.listRecoveriesForExport).toHaveBeenCalledWith(
      expect.objectContaining({
        practitionerId: 'pract_1',
        status: 'OPEN',
        reasonCode: 'REFUND_AFTER_PAYOUT',
        currencyCode: 'EGP',
      }),
    );
    expect(result.fileName).toContain('admin-practitioner-recoveries-2026-01-01-to-2026-01-31.csv');
    expect(result.content).toContain('Recovery ID');
    expect(result.content).toContain('recovery_1');
    expect(result.content).toContain('2026-01-01T00:00:00.000Z');
  });
});
