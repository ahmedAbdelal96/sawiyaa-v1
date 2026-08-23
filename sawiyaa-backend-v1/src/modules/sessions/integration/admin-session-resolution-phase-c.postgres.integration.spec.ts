import { randomUUID } from 'node:crypto';
import { PaymentPurpose, PaymentProvider, PaymentStatus, Prisma, SessionFlowType, SessionMode, SessionPaymentCoverageType, SessionProvider, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { MoneyAmountService } from '@modules/financial-operations/services/money-amount.service';
import { CalculatePackageSessionAllocationService } from '@modules/financial-operations/services/calculate-package-session-allocation.service';
import { ExtractPaymentLedgerBreakdownService } from '@modules/financial-operations/services/extract-payment-ledger-breakdown.service';
import { AdminSessionResolutionPolicyService } from '../services/admin-session-resolution-policy.service';

const databaseUrl = process.env.DATABASE_URL;
const parsedUrl = databaseUrl ? new URL(databaseUrl) : null;
const databaseName = parsedUrl ? decodeURIComponent(parsedUrl.pathname.slice(1)) : '';
const authorized = process.env.NODE_ENV === 'test' && process.env.SAWIYAA_ALLOW_DESTRUCTIVE_PHASE_C === 'true' && databaseName === 'fayed_db' && ['localhost', '127.0.0.1', '::1'].includes(parsedUrl?.hostname ?? '');
if (!authorized && databaseUrl) throw new Error(`Unsafe Phase C database: ${parsedUrl?.hostname}/${databaseName}`);
const describeIfAuthorized = authorized ? describe : describe.skip;

describeIfAuthorized('Phase C Admin Resolution persisted PostgreSQL matrix', () => {
  const prisma = new PrismaService();
  const money = new MoneyAmountService();
  const policy = new AdminSessionResolutionPolicyService(new CalculatePackageSessionAllocationService(money), prisma, new ExtractPaymentLedgerBreakdownService(money));
  const created: string[] = [];

  beforeAll(async () => { console.log(`[Phase C] env=${process.env.NODE_ENV} host=${parsedUrl?.hostname} database=${databaseName}`); await prisma.$connect(); });
  afterAll(async () => { await prisma.$disconnect(); });

  async function fixture(input: { package?: boolean; amount?: number; previousRefund?: number }) {
    const patientUserId = randomUUID(); const practitionerUserId = randomUUID(); const patientId = randomUUID(); const practitionerId = randomUUID(); const sessionId = randomUUID(); const paymentId = randomUUID();
    created.push(sessionId);
    await prisma.user.createMany({ data: [{ id: patientUserId, displayName: 'Phase C Test Patient' }, { id: practitionerUserId, displayName: 'Phase C Test Practitioner' }] });
    await prisma.patientProfile.create({ data: { id: patientId, userId: patientUserId } });
    await prisma.practitionerProfile.create({ data: { id: practitionerId, userId: practitionerUserId, publicSlug: `phase-c-${practitionerId}`, practitionerType: 'OTHER', status: 'DRAFT' } });
    let purchaseId: string | null = null;
    if (input.package) {
      purchaseId = randomUUID();
      await prisma.patientPackagePurchase.create({ data: { id: purchaseId, practitionerId, patientId, status: 'ACTIVE', titleSnapshot: 'Phase C Package', slugSnapshot: `phase-c-${purchaseId}`, packageVersionSnapshot: 1, sessionCountSnapshot: 3, currencyCodeSnapshot: 'EGP', selectedCurrencyCode: 'EGP', selectedAmountSnapshot: 900, patientPayableTotalSnapshot: 900, undiscountedTotalSnapshot: 1200, discountAmountSnapshot: 300, platformDiscountShareSnapshot: 200, practitionerDiscountShareSnapshot: 100, platformOriginalShareSnapshot: 600, practitionerOriginalShareSnapshot: 600, platformFinalShareSnapshot: 400, practitionerFinalShareSnapshot: 500, sessionDurationMinutesSnapshot: 30, sessionModeSnapshot: SessionMode.VIDEO, schedulePolicySnapshot: 'ALLOW_SCHEDULE_LATER' } });
    }
    await prisma.session.create({ data: { id: sessionId, sessionCode: `PC-${sessionId.slice(0, 8)}`, patientId, practitionerId, flowType: SessionFlowType.SCHEDULED, sessionMode: SessionMode.VIDEO, durationMinutes: 30, status: SessionStatus.AWAITING_ADMIN_RESOLUTION, paymentCoverageType: input.package ? SessionPaymentCoverageType.PACKAGE : SessionPaymentCoverageType.DIRECT_PAYMENT, packagePurchaseId: purchaseId, packageSessionIndex: input.package ? 2 : null, packageSessionCount: input.package ? 3 : null, provider: SessionProvider.NONE } });
    await prisma.payment.create({ data: { id: paymentId, sessionId: input.package ? null : sessionId, patientId, practitionerId, paymentPurpose: input.package ? PaymentPurpose.SESSION_PACKAGE_PURCHASE : PaymentPurpose.SESSION_BOOKING, provider: PaymentProvider.STRIPE, status: PaymentStatus.CAPTURED, amountSubtotal: input.amount ?? 400, amountDiscount: 0, amountTotal: input.amount ?? 400, amountFromWallet: 0, amountFromGateway: input.amount ?? 400, currencyCode: 'EGP', commissionPlatformRatePercent: 20, capturedAt: new Date() } });
    if (purchaseId) await prisma.patientPackagePurchase.update({ where: { id: purchaseId }, data: { paymentId } });
    if (input.previousRefund) await prisma.refund.create({ data: { paymentId, sessionId, refundType: 'PARTIAL', destination: 'CUSTOMER_WALLET', status: 'SUCCEEDED', amount: input.previousRefund, currencyCode: 'EGP', refundReason: 'Phase C prior refund', processedAt: new Date() } });
    return { sessionId, paymentId, purchaseId, patientId, practitionerId, patientUserId, practitionerUserId };
  }

  async function cleanup(f: Awaited<ReturnType<typeof fixture>>) {
    await prisma.refund.deleteMany({ where: { sessionId: f.sessionId } });
    await prisma.session.delete({ where: { id: f.sessionId } });
    if (f.purchaseId) await prisma.patientPackagePurchase.delete({ where: { id: f.purchaseId } });
    await prisma.payment.delete({ where: { id: f.paymentId } });
    await prisma.patientProfile.delete({ where: { id: f.patientId } });
    await prisma.practitionerProfile.delete({ where: { id: f.practitionerId } });
    await prisma.user.deleteMany({ where: { id: { in: [f.patientUserId, f.practitionerUserId] } } });
  }

  it('previews direct captured amount minus prior refunds without side effects', async () => {
    const f = await fixture({ amount: 400, previousRefund: 100 });
    try {
      const before = await prisma.sessionResolution.count({ where: { sessionId: f.sessionId } });
      const plan = await policy.buildPlan({ sessionId: f.sessionId, decision: { findingCode: 'TECHNICAL_ISSUE', patientRemedy: 'CREDIT_WALLET', practitionerRemedy: 'NO_EARNING', reasonCode: 'TECHNICAL', adminNotes: 'reviewed', idempotencyKey: randomUUID() } });
      expect(plan.patient.walletCredit).toMatchObject({ amount: '300.00', currency: 'EGP' });
      const after = await prisma.sessionResolution.count({ where: { sessionId: f.sessionId } });
      expect(after).toBe(before);
      expect(plan.planHash).toHaveLength(64);
    } finally { await cleanup(f); }
  });

  it('previews discounted package allocation from immutable snapshots', async () => {
    const f = await fixture({ package: true });
    try {
      const plan = await policy.buildPlan({ sessionId: f.sessionId, decision: { findingCode: 'PATIENT_NO_SHOW', patientRemedy: 'CREDIT_WALLET', practitionerRemedy: 'CREATE_EARNING_REVIEW', reasonCode: 'GOODWILL', adminNotes: 'reviewed', idempotencyKey: randomUUID() } });
      expect(plan.patient.walletCredit).toMatchObject({ amount: '300.00', currency: 'EGP', source: 'IMMUTABLE_PACKAGE_SESSION_ALLOCATION' });
      expect(plan.practitioner.accountingReviewWillBeCreated).toBe(true);
    } finally { await cleanup(f); }
  });

  it('fails closed when package allocation facts are missing', async () => {
    const f = await fixture({ package: true });
    try {
      await prisma.patientPackagePurchase.update({ where: { id: f.purchaseId! }, data: { patientPayableTotalSnapshot: null } });
      await expect(policy.buildPlan({ sessionId: f.sessionId, decision: { findingCode: 'INSUFFICIENT_EVIDENCE', patientRemedy: 'CREDIT_WALLET', practitionerRemedy: 'NO_EARNING', reasonCode: 'MISSING', adminNotes: 'reviewed', idempotencyKey: randomUUID() } })).rejects.toMatchObject({ response: { error: 'SESSION_RESOLUTION_PACKAGE_REFUND_VALUE_UNAVAILABLE' } });
      expect(await prisma.refund.count({ where: { sessionId: f.sessionId } })).toBe(0);
    } finally { await cleanup(f); }
  });

  it('fails preview before any write when direct payment snapshots are incomplete', async () => {
    const f = await fixture({ amount: 650 });
    try {
      await prisma.payment.update({
        where: { id: f.paymentId },
        data: { commissionPlatformRatePercent: null, metadataJson: Prisma.JsonNull },
      });
      await expect(policy.buildPlan({ sessionId: f.sessionId, decision: { findingCode: 'TECHNICAL_ISSUE', patientRemedy: 'CREDIT_WALLET', practitionerRemedy: 'NO_EARNING', reasonCode: 'INCOMPLETE_PAYMENT_SNAPSHOT', adminNotes: 'reviewed', idempotencyKey: randomUUID() } })).rejects.toMatchObject({ response: { error: 'FINANCIAL_OPERATIONS_PAYMENT_SNAPSHOTS_INCOMPLETE' } });
      expect(await prisma.refund.count({ where: { sessionId: f.sessionId } })).toBe(0);
      expect(await prisma.sessionResolution.count({ where: { sessionId: f.sessionId } })).toBe(0);
    } finally { await cleanup(f); }
  });

  it('changes the preview fingerprint when a concurrent refund changes available value', async () => {
    const f = await fixture({ amount: 400 });
    try {
      const decision = { findingCode: 'TECHNICAL_ISSUE' as const, patientRemedy: 'CREDIT_WALLET' as const, practitionerRemedy: 'NO_EARNING' as const, reasonCode: 'TECHNICAL', adminNotes: 'reviewed', idempotencyKey: randomUUID() };
      const first = await policy.buildPlan({ sessionId: f.sessionId, decision });
      await prisma.refund.create({ data: { paymentId: f.paymentId, sessionId: f.sessionId, refundType: 'PARTIAL', destination: 'CUSTOMER_WALLET', status: 'SUCCEEDED', amount: 150, currencyCode: 'EGP', refundReason: 'Concurrent accountant refund', processedAt: new Date() } });
      const second = await policy.buildPlan({ sessionId: f.sessionId, decision });
      expect(second.patient.walletCredit).toMatchObject({ amount: '250.00' });
      expect(second.planHash).not.toBe(first.planHash);
    } finally { await cleanup(f); }
  });
});
