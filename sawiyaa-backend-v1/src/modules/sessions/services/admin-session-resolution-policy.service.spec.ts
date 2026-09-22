import { ConflictException } from '@nestjs/common';
import { Prisma, SessionResolutionPatientRemedy, SessionResolutionPractitionerRemedy } from '@prisma/client';
import { AdminSessionResolutionPolicyService } from './admin-session-resolution-policy.service';

describe('AdminSessionResolutionPolicyService', () => {
  const allocation = { allocate: jest.fn() };
  const prisma = { session: { findUnique: jest.fn() }, payment: { findFirst: jest.fn() }, refund: { aggregate: jest.fn() } } as any;
  const extractPaymentLedgerBreakdown = { extract: jest.fn() };
  const service = new AdminSessionResolutionPolicyService(allocation as any, prisma, extractPaymentLedgerBreakdown as any);

  beforeEach(() => jest.clearAllMocks());

  it('requires a custom note for OTHER', () => {
    expect(() => service.normalizeFinding({ findingCode: 'OTHER', patientRemedy: SessionResolutionPatientRemedy.KEEP_ORIGINAL, practitionerRemedy: SessionResolutionPractitionerRemedy.NO_EARNING, reasonCode: 'OTHER', adminNotes: '', idempotencyKey: 'x' })).toThrow(ConflictException);
  });

  it('previews direct wallet credit from remaining captured payment', async () => {
    prisma.session.findUnique.mockResolvedValue({ id: 's', paymentCoverageType: 'DIRECT_PAYMENT', packagePurchaseId: null, packagePurchase: null });
    prisma.payment.findFirst.mockResolvedValue({ id: 'p', amountTotal: new Prisma.Decimal('400.00'), currencyCode: 'EGP' });
    prisma.refund.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal('50.00') } });
    extractPaymentLedgerBreakdown.extract.mockReturnValue({ practitionerShareAmount: '320.00', platformCommissionAmount: '80.00', currencyCode: 'EGP' });
    const plan = await service.buildPlan({ sessionId: 's', decision: { findingCode: 'TECHNICAL_ISSUE', patientRemedy: SessionResolutionPatientRemedy.CREDIT_WALLET, practitionerRemedy: SessionResolutionPractitionerRemedy.CREATE_EARNING_REVIEW, reasonCode: 'TECHNICAL_VIDEO', adminNotes: 'reviewed', idempotencyKey: 'x' } });
    expect(plan.patient.walletCredit).toEqual({ amount: '350.00', currency: 'EGP', source: 'CAPTURED_PAYMENT_REMAINING' });
    expect(plan.practitioner.accountingReviewWillBeCreated).toBe(true);
  });

  it('fails preview closed when direct payment snapshots are incomplete', async () => {
    prisma.session.findUnique.mockResolvedValue({ id: 's', paymentCoverageType: 'DIRECT_PAYMENT', packagePurchaseId: null, packagePurchase: null });
    prisma.payment.findFirst.mockResolvedValue({ id: 'p', amountTotal: new Prisma.Decimal('650.00'), currencyCode: 'EGP' });
    extractPaymentLedgerBreakdown.extract.mockImplementation(() => {
      throw new ConflictException({ error: 'FINANCIAL_OPERATIONS_PAYMENT_SNAPSHOTS_INCOMPLETE' });
    });
    await expect(service.buildPlan({ sessionId: 's', decision: { findingCode: 'TECHNICAL_ISSUE', patientRemedy: SessionResolutionPatientRemedy.CREDIT_WALLET, practitionerRemedy: SessionResolutionPractitionerRemedy.NO_EARNING, reasonCode: 'TECHNICAL_VIDEO', adminNotes: 'reviewed', idempotencyKey: 'x' } })).rejects.toMatchObject({ response: { error: 'FINANCIAL_OPERATIONS_PAYMENT_SNAPSHOTS_INCOMPLETE' } });
  });

  it('previews discounted package value from immutable allocation snapshots', async () => {
    prisma.session.findUnique.mockResolvedValue({ id: 's', paymentCoverageType: 'PACKAGE', packagePurchaseId: 'pp', packageSessionIndex: 2, packagePurchase: { packageSessionIndex: 2, sessionCountSnapshot: 3, patientPayableTotalSnapshot: new Prisma.Decimal('900'), platformFinalShareSnapshot: new Prisma.Decimal('500'), practitionerFinalShareSnapshot: new Prisma.Decimal('400'), platformOriginalShareSnapshot: new Prisma.Decimal('600'), practitionerOriginalShareSnapshot: new Prisma.Decimal('450'), platformDiscountShareSnapshot: new Prisma.Decimal('100'), practitionerDiscountShareSnapshot: new Prisma.Decimal('50'), discountAmountSnapshot: new Prisma.Decimal('150'), selectedCurrencyCode: 'EGP' } });
    allocation.allocate.mockReturnValue({ patientPayableAmount: '300.00' });
    const plan = await service.buildPlan({ sessionId: 's', decision: { findingCode: 'PATIENT_NO_SHOW', patientRemedy: SessionResolutionPatientRemedy.CREDIT_WALLET, practitionerRemedy: SessionResolutionPractitionerRemedy.NO_EARNING, reasonCode: 'GOODWILL', adminNotes: 'reviewed', idempotencyKey: 'x' } });
    expect(plan.patient.walletCredit).toEqual({ amount: '300.00', currency: 'EGP', source: 'IMMUTABLE_PACKAGE_SESSION_ALLOCATION' });
  });

  it('fails closed when restoring a package entitlement for a direct-paid session', async () => {
    prisma.session.findUnique.mockResolvedValue({ id: 's', paymentCoverageType: 'DIRECT_PAYMENT', packagePurchaseId: null, packagePurchase: null });
    await expect(service.buildPlan({ sessionId: 's', decision: { findingCode: 'PATIENT_NO_SHOW', patientRemedy: SessionResolutionPatientRemedy.RESTORE_PACKAGE, practitionerRemedy: SessionResolutionPractitionerRemedy.NO_EARNING, reasonCode: 'INVALID_PACKAGE_RESTORE', adminNotes: 'reviewed', idempotencyKey: 'x' } })).rejects.toMatchObject({ response: { error: 'SESSION_RESOLUTION_RESTORE_REQUIRES_PACKAGE' } });
  });
});
