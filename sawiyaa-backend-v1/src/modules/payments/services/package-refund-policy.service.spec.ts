import { Prisma } from '@prisma/client';
import { PackageRefundPolicyService } from './package-refund-policy.service';
import { PackageEntitlementService } from '@modules/package-plans/services/package-entitlement.service';
import { ValidatePaymentStatusTransitionService } from './validate-payment-status-transition.service';

function purchase(overrides: Record<string, unknown> = {}) {
  return {
    id: 'purchase-1',
    patientId: 'patient-1',
    practitionerId: 'practitioner-1',
    titleSnapshot: 'Care package',
    status: 'ACTIVE',
    sessionCountSnapshot: 3,
    selectedCurrencyCode: 'EGP',
    selectedBaseSessionPriceSnapshot: new Prisma.Decimal('100.00'),
    patientPayableTotalSnapshot: new Prisma.Decimal('270.00'),
    metadataJson: null,
    patient: { id: 'patient-1', user: { displayName: 'Patient' } },
    practitioner: { id: 'practitioner-1', user: { displayName: 'Practitioner' } },
    payment: { id: 'payment-1', amountTotal: new Prisma.Decimal('270.00'), currencyCode: 'EGP' },
    sessions: [
      { id: 's1', status: 'COMPLETED', packageEntitlementDecision: null },
      { id: 's2', status: 'UPCOMING', packageEntitlementDecision: null },
      { id: 's3', status: 'PATIENT_NO_SHOW', packageEntitlementDecision: null },
    ],
    ...overrides,
  };
}

describe('PackageRefundPolicyService preview', () => {
  function make(input: any) {
    const repository = { findById: jest.fn().mockResolvedValue(input) };
    const payments = {
      sumSucceededRefundAmountByPaymentId: jest
        .fn()
        .mockResolvedValue({ _sum: { amount: new Prisma.Decimal('0.00') } }),
    };
    return new PackageRefundPolicyService(
      {} as never,
      repository as never,
      payments as never,
      new PackageEntitlementService(),
      {} as never,
      {} as never,
      {} as never,
      new ValidatePaymentStatusTransitionService(),
    );
  }

  it('suggests full net paid for zero used sessions and excludes no-show', async () => {
    const item = purchase({
      sessions: [
        { id: 's1', status: 'UPCOMING', packageEntitlementDecision: null },
        { id: 's2', status: 'PATIENT_NO_SHOW', packageEntitlementDecision: null },
        { id: 's3', status: 'CANCELLED', packageEntitlementDecision: { decisionType: 'RESTORE_TO_PACKAGE' } },
      ],
    });
    const preview = await make(item).previewByPurchaseId(item.id);
    expect(preview.usedSessions).toBe(0);
    expect(preview.suggestedRefundAmount).toBe('270.00');
    expect(preview.futureSessionsAffected).toBe(1);
  });

  it('uses immutable snapshot price and explicit COUNT_AS_USED decisions', async () => {
    const item = purchase({
      sessions: [
        { id: 's1', status: 'COMPLETED', packageEntitlementDecision: null },
        { id: 's2', status: 'PATIENT_NO_SHOW', packageEntitlementDecision: { decisionType: 'COUNT_AS_USED' } },
        { id: 's3', status: 'UPCOMING', packageEntitlementDecision: null },
      ],
    });
    const preview = await make(item).previewByPurchaseId(item.id);
    expect(preview.usedSessions).toBe(2);
    expect(preview.usedStandaloneValue).toBe('200.00');
    expect(preview.suggestedRefundAmount).toBe('70.00');
  });

  it('flags historical purchases without a snapshot for manual review', async () => {
    const item = purchase({ selectedBaseSessionPriceSnapshot: null });
    const preview = await make(item).previewByPurchaseId(item.id);
    expect(preview.manualReviewRequired).toBe(true);
    expect(preview.manualReviewReason).toBe('MANUAL_PRICE_REVIEW_REQUIRED');
    expect(preview.suggestedRefundAmount).toBeNull();
  });
});
