import { PractitionerSettlementStatus } from '@prisma/client';
import { AdminSettlementWorkflowUseCase } from './admin-settlement-workflow.use-case';
import { Prisma } from '@prisma/client';

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

  it('fails closed for legacy settlement adjustments', async () => {
    const { service, adjustmentService, audit } = setup();
    await expect(service.addAdjustment({ settlementId: 'settlement-1', actorUserId: 'user-1', body: { type: 'TAX', amount: '10.00', reason: 'Tax withholding' } })).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'LEGACY_SETTLEMENT_ADJUSTMENTS_DISABLED' }),
    });
    expect(adjustmentService.apply).not.toHaveBeenCalled();
    expect(audit.recordRequired).not.toHaveBeenCalled();
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
    expect(result.item.financial).toEqual(expect.objectContaining({ platformCommissionRatePercent: '30', platformCommissionAmount: null, finalWalletCredit: '4500' }));
    expect(result.item.practitioner.walletStatus).toBe('ACTIVE');
    expect(result.item.adjustments[0].createdBy.name).toBe('Accountant');
    expect(result.item.session.durationMinutes).toBe(60);
  });

  it('fails closed for legacy settlement rejection', async () => {
    const { service, audit } = setup();
    await expect(service.reject({ settlementId: 'settlement-1', actorUserId: 'user-1', reason: 'Not eligible' })).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'LEGACY_SETTLEMENT_REJECTION_DISABLED' }),
    });
    expect(audit.recordRequired).not.toHaveBeenCalled();
  });

  it('fails closed instead of combining accountant approval with wallet credit', async () => {
    const { service, tx, reviewService, audit } = setup();
    tx.practitionerSettlement.findUnique.mockResolvedValue({
      id: 'settlement-1', status: PractitionerSettlementStatus.UNDER_REVIEW, amountNet: { toString: () => '90' },
      walletCurrencyCode: 'EGP', exchangeRate: 1, sourceReview: { id: 'review-1', reviewStatus: 'DECISION_APPROVED', paymentAmount: new Prisma.Decimal(100), accountantApprovedSourceAmount: new Prisma.Decimal(80), suggestedPlatformAmount: 20 },
    });
    await expect(service.approve({ settlementId: 'settlement-1', actorUserId: 'user-1' })).rejects.toMatchObject({ response: expect.objectContaining({ error: 'LEGACY_SETTLEMENT_APPROVAL_DISABLED' }) });
    expect(reviewService.approveReview).not.toHaveBeenCalled();
    expect(audit.recordRequired).not.toHaveBeenCalled();
  });

  it('does not record a wallet-credit audit event through the legacy endpoint', async () => {
    const { service, tx, audit } = setup();
    tx.practitionerSettlement.findUnique
      .mockResolvedValueOnce({
        id: 'settlement-1', status: PractitionerSettlementStatus.UNDER_REVIEW,
        amountNet: { toString: () => '90' }, amountGross: { toString: () => '100' },
        amountAdjustments: { toString: () => '500' }, originalCurrencyCode: 'USD',
        walletCurrencyCode: 'EGP', sourceReview: { id: 'review-1', reviewStatus: 'DECISION_APPROVED', paymentAmount: new Prisma.Decimal(100), accountantApprovedSourceAmount: new Prisma.Decimal(80), suggestedPlatformAmount: new Prisma.Decimal(20) },
      })
      .mockResolvedValueOnce({ id: 'settlement-1', status: PractitionerSettlementStatus.CREDITED, finalWalletCredit: { toString: () => '4500' }, amountNet: { toString: () => '4500' }, walletCurrencyCode: 'EGP' });
    const reviewService = (service as any).reviewService;
    reviewService.approveReview.mockResolvedValue({ item: { id: 'review-1' }, wasAlreadyPosted: false });
    await expect(service.approve({ settlementId: 'settlement-1', actorUserId: 'user-1', exchangeRate: '50' })).rejects.toMatchObject({ response: expect.objectContaining({ error: 'LEGACY_SETTLEMENT_APPROVAL_DISABLED' }) });
    expect(audit.recordRequired).not.toHaveBeenCalled();
  });

  it('does not approve a rejected settlement', async () => {
    const { service, tx, reviewService } = setup();
    tx.practitionerSettlement.findUnique.mockResolvedValue({ id: 'settlement-1', status: PractitionerSettlementStatus.REJECTED });
    await expect(service.approve({ settlementId: 'settlement-1', actorUserId: 'user-1' })).rejects.toMatchObject({ response: expect.objectContaining({ error: 'LEGACY_SETTLEMENT_APPROVAL_DISABLED' }) });
    expect(reviewService.approveReview).not.toHaveBeenCalled();
  });

  it('returns an idempotent safe response for an already paid-out settlement', async () => {
    const { service, tx, reviewService } = setup();
    tx.practitionerSettlement.findUnique.mockResolvedValue({ id: 'settlement-1', status: PractitionerSettlementStatus.PAID_OUT });
    await expect(service.approve({ settlementId: 'settlement-1', actorUserId: 'user-1' })).rejects.toMatchObject({ response: expect.objectContaining({ error: 'LEGACY_SETTLEMENT_APPROVAL_DISABLED' }) });
    expect(reviewService.approveReview).not.toHaveBeenCalled();
  });
});
