import { PractitionerSettlementStatus } from '@prisma/client';
import { AdminSettlementWorkflowUseCase } from './admin-settlement-workflow.use-case';

describe('AdminSettlementWorkflowUseCase', () => {
  function setup() {
    const tx = {
      practitionerSettlement: { findUnique: jest.fn(), update: jest.fn() },
      practitionerWallet: { findFirst: jest.fn().mockResolvedValue({ currencyCode: 'EGP' }) },
      sessionEarningReview: { update: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (db: typeof tx) => unknown) => callback(tx)),
      session: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
      payment: { findUnique: jest.fn() },
      securityAuditLog: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const repository = { listAdminSettlementWorkflow: jest.fn(), findAdminSettlementWorkflowById: jest.fn() } as any;
    const adjustmentService = { apply: jest.fn().mockResolvedValue({ id: 'adjustment-1' }) } as any;
    const reviewService = { approveReview: jest.fn().mockResolvedValue({ item: { id: 'review-1' }, wasAlreadyPosted: false }) } as any;
    const audit = { recordRequired: jest.fn() } as any;
    return { service: new AdminSettlementWorkflowUseCase(prisma, repository, adjustmentService, reviewService, audit), tx, prisma, repository, adjustmentService, reviewService, audit };
  }

  it('adds adjustments only through the accountant transaction path', async () => {
    const { service, tx, adjustmentService, audit } = setup();
    tx.practitionerSettlement.findUnique.mockResolvedValue({ status: PractitionerSettlementStatus.UNDER_REVIEW });
    await service.addAdjustment({ settlementId: 'settlement-1', actorUserId: 'user-1', body: { type: 'TAX', amount: '10.00', reason: 'Tax withholding' } });
    expect(adjustmentService.apply).toHaveBeenCalledWith(expect.objectContaining({ settlementId: 'settlement-1', actorUserId: 'user-1' }));
    expect(audit.recordRequired).toHaveBeenCalledWith(tx, expect.objectContaining({ action: 'SETTLEMENT_ADJUSTMENT_ADDED' }));
  });

  it('returns accountant payment, commission, wallet and actor details', async () => {
    const { service, prisma, repository } = setup();
    repository.findAdminSettlementWorkflowById.mockResolvedValue({
      id: 'settlement-1', status: PractitionerSettlementStatus.UNDER_REVIEW,
      createdAt: new Date('2026-07-28T10:00:00.000Z'), updatedAt: new Date('2026-07-28T11:00:00.000Z'),
      practitionerId: 'practitioner-1', walletId: 'wallet-1', walletCurrencyCode: 'EGP',
      originalAmount: '100', originalCurrencyCode: 'USD', amountGross: '5000', amountAdjustments: '500',
      finalWalletCredit: '4500', amountPaidTotal: '0', currencyCode: 'EGP', exchangeRate: '50', convertedAmount: '5000',
      approvedByUserId: null, approvedAt: null, rejectionReason: null, rejectedByUserId: null, rejectedAt: null,
      practitioner: { id: 'practitioner-1', publicSlug: 'doctor', user: { id: 'user-p', displayName: 'Doctor' }, country: { isoCode: 'EG', name: 'Egypt' }, wallets: [{ id: 'wallet-1', status: 'ACTIVE', currencyCode: 'EGP' }] },
      sourceReview: { sessionId: 'session-1', paymentId: 'payment-1', sourceType: 'SESSION', reviewStatus: 'PENDING_REVIEW', suggestedPlatformAmount: '300' },
      adjustments: [{ id: 'adjustment-1', type: 'TAX', amount: '500', currencyCode: 'EGP', reason: 'Tax', createdByUserId: 'user-a', createdByUser: { id: 'user-a', displayName: 'Accountant' }, createdAt: new Date() }],
      payoutRecords: [],
    });
    prisma.session.findUnique.mockResolvedValue({ id: 'session-1', sessionCode: 'S-1', status: 'COMPLETED', scheduledStartAt: new Date(), completedAt: new Date(), flowType: 'SCHEDULED', durationMinutes: 60, patient: { displayName: 'Patient' } });
    prisma.payment.findUnique.mockResolvedValue({ id: 'payment-1', providerPaymentRef: 'pay-ref', providerOrderRef: null, status: 'CAPTURED', provider: 'STRIPE', currencyCode: 'USD', amountTotal: '100', commissionPlatformRatePercent: '30', capturedAt: new Date('2026-07-28T10:30:00.000Z') });

    const result = await service.detail('settlement-1');
    expect(result.item.payment).toEqual(expect.objectContaining({ reference: 'pay-ref', status: 'CAPTURED', provider: 'STRIPE' }));
    expect(result.item.financial).toEqual(expect.objectContaining({ platformCommissionRatePercent: '30', platformCommissionAmount: '300', finalWalletCredit: '4500' }));
    expect(result.item.practitioner.walletStatus).toBe('ACTIVE');
    expect(result.item.adjustments[0].createdBy.name).toBe('Accountant');
    expect(result.item.session.durationMinutes).toBe(60);
  });

  it('rejects without wallet credit and preserves the reason', async () => {
    const { service, tx, audit } = setup();
    tx.practitionerSettlement.findUnique.mockResolvedValue({ status: PractitionerSettlementStatus.UNDER_REVIEW, sourceReviewId: 'review-1', finalWalletCredit: { toString: () => '90' }, amountNet: { toString: () => '90' }, walletCurrencyCode: 'EGP' });
    tx.practitionerSettlement.update.mockResolvedValue({ id: 'settlement-1', sourceReviewId: 'review-1' });
    await service.reject({ settlementId: 'settlement-1', actorUserId: 'user-1', reason: 'Not eligible' });
    expect(tx.practitionerSettlement.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: PractitionerSettlementStatus.REJECTED, rejectionReason: 'Not eligible' }) }));
    expect(audit.recordRequired).toHaveBeenCalledWith(tx, expect.objectContaining({ action: 'SETTLEMENT_REJECTED' }));
  });

  it('delegates approval to the existing sole wallet-credit path', async () => {
    const { service, tx, reviewService, audit } = setup();
    tx.practitionerSettlement.findUnique.mockResolvedValue({
      id: 'settlement-1', status: PractitionerSettlementStatus.UNDER_REVIEW, amountNet: { toString: () => '90' },
      walletCurrencyCode: 'EGP', exchangeRate: 1, sourceReview: { id: 'review-1', reviewStatus: 'PENDING_REVIEW', suggestedPlatformAmount: 10 },
    });
    const result = await service.approve({ settlementId: 'settlement-1', actorUserId: 'user-1' });
    expect(reviewService.approveReview).toHaveBeenCalledWith(expect.objectContaining({ reviewId: 'review-1', reviewerUserId: 'user-1' }));
    expect(audit.recordRequired).toHaveBeenCalledWith(tx, expect.objectContaining({ action: 'SETTLEMENT_APPROVED' }));
    expect(result.wasAlreadyApproved).toBe(false);
  });

  it('records the final wallet amount and currency in approval audit events', async () => {
    const { service, tx, audit } = setup();
    tx.practitionerSettlement.findUnique
      .mockResolvedValueOnce({
        id: 'settlement-1', status: PractitionerSettlementStatus.UNDER_REVIEW,
        amountNet: { toString: () => '90' }, amountGross: { toString: () => '100' },
        amountAdjustments: { toString: () => '500' }, originalCurrencyCode: 'USD',
        walletCurrencyCode: 'EGP', sourceReview: { id: 'review-1', reviewStatus: 'PENDING_REVIEW', suggestedPlatformAmount: { mul: () => ({ toDecimalPlaces: () => ({}) }) } },
      })
      .mockResolvedValueOnce({ id: 'settlement-1', status: PractitionerSettlementStatus.CREDITED, finalWalletCredit: { toString: () => '4500' }, amountNet: { toString: () => '4500' }, walletCurrencyCode: 'EGP' });
    const reviewService = (service as any).reviewService;
    reviewService.approveReview.mockResolvedValue({ item: { id: 'review-1' }, wasAlreadyPosted: false });
    await service.approve({ settlementId: 'settlement-1', actorUserId: 'user-1', exchangeRate: '50' });
    expect(audit.recordRequired).toHaveBeenCalledWith(tx, expect.objectContaining({
      action: 'SETTLEMENT_CREDITED',
      metadata: expect.objectContaining({ amount: '4500', currencyCode: 'EGP', newState: 'CREDITED' }),
    }));
  });

  it('does not approve a rejected settlement', async () => {
    const { service, tx, reviewService } = setup();
    tx.practitionerSettlement.findUnique.mockResolvedValue({ id: 'settlement-1', status: PractitionerSettlementStatus.REJECTED });
    await expect(service.approve({ settlementId: 'settlement-1', actorUserId: 'user-1' })).rejects.toThrow('not awaiting approval');
    expect(reviewService.approveReview).not.toHaveBeenCalled();
  });

  it('returns an idempotent safe response for an already paid-out settlement', async () => {
    const { service, tx, reviewService } = setup();
    tx.practitionerSettlement.findUnique.mockResolvedValue({ id: 'settlement-1', status: PractitionerSettlementStatus.PAID_OUT });
    await expect(service.approve({ settlementId: 'settlement-1', actorUserId: 'user-1' })).resolves.toEqual(expect.objectContaining({ wasAlreadyApproved: true }));
    expect(reviewService.approveReview).not.toHaveBeenCalled();
  });
});
