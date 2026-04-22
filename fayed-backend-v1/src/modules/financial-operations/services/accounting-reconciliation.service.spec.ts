import { JournalEntrySourceType, Prisma, ReconciliationReviewStatus } from '@prisma/client';
import { AccountingReconciliationService } from './accounting-reconciliation.service';

describe('AccountingReconciliationService', () => {
  let service: AccountingReconciliationService;

  beforeEach(() => {
    service = new AccountingReconciliationService();
  });

  it('flags payout as missing proof when journal exists without proof artifact', () => {
    const evaluation = service.evaluatePayout({
      amountPaid: new Prisma.Decimal('120.00'),
      transferFeeAmount: new Prisma.Decimal('5.00'),
      payoutMethodSnapshot: {
        transferFeeAmount: '5.00',
      },
      proofPresent: false,
      journal: {
        id: 'journal-1',
        occurredAt: new Date(),
        currencyCode: 'EGP',
        metadataJson: {
          amountPaid: '120.00',
        },
      },
    });

    const status = service.deriveSystemStatus(
      JournalEntrySourceType.PRACTITIONER_PAYOUT,
      evaluation.anomalies,
    );

    expect(evaluation.anomalies.some((item) => item.code === 'MISSING_PAYOUT_PROOF')).toBe(true);
    expect(status).toBe('MISSING_PROOF');
  });

  it('flags payment mismatch when journal amount does not match captured amount', () => {
    const evaluation = service.evaluatePayment({
      amountTotal: new Prisma.Decimal('200.00'),
      vatAmountSnapshot: new Prisma.Decimal('10.00'),
      gatewayFeeAmountSnapshot: new Prisma.Decimal('4.00'),
      journal: {
        id: 'journal-2',
        occurredAt: new Date(),
        currencyCode: 'EGP',
        metadataJson: {
          amountTotal: '150.00',
        },
      },
    });

    const status = service.deriveSystemStatus(
      JournalEntrySourceType.PAYMENT_CAPTURED,
      evaluation.anomalies,
    );

    expect(evaluation.anomalies.some((item) => item.code === 'AMOUNT_MISMATCH')).toBe(true);
    expect(status).toBe('MISMATCH');
  });

  it('keeps operator pending review status as effective status', () => {
    const effective = service.deriveEffectiveStatus({
      systemStatus: 'MATCHED',
      review: {
        status: ReconciliationReviewStatus.PENDING_REVIEW,
        note: null,
        reviewedAt: null,
        reviewedByUserId: null,
        reviewedByDisplayName: null,
      },
    });

    expect(effective).toBe(ReconciliationReviewStatus.PENDING_REVIEW);
  });
});
