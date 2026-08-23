import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { PaymentProvider, PaymentPurpose, PaymentStatus, Prisma, SessionFlowType, SessionMode, SessionPaymentCoverageType, SessionProvider, SessionResolutionPatientRemedy, SessionResolutionPractitionerRemedy, SessionStatus } from '@prisma/client';
import { AppModule } from '../../../app.module';
import { PrismaService } from '@common/prisma/prisma.service';
import { AdminSessionResolutionService } from '../services/admin-session-resolution.service';
import { SessionEarningReviewService } from '@modules/financial-operations/services/session-earning-review.service';
import { GetCustomerWalletSummaryUseCase } from '@modules/customer-wallets/use-cases/get-customer-wallet-summary.use-case';
import { PatientPackagePurchaseRepository } from '@modules/package-plans/repositories/package-purchase.repository';
import { PackagePurchasePresenter } from '@modules/package-plans/presenters/package-purchase.presenter';

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const dbName = url ? decodeURIComponent(url.pathname.slice(1)) : '';
const authorized = process.env.NODE_ENV === 'test' && process.env.SAWIYAA_ALLOW_DESTRUCTIVE_PHASE_C === 'true' && dbName === 'fayed_db' && ['localhost', '127.0.0.1', '::1'].includes(url?.hostname ?? '');
if (!authorized && process.env.DATABASE_URL) throw new Error(`Unsafe Phase C concurrency database: ${url?.hostname}/${dbName}`);

const describeIfAuthorized = authorized ? describe : describe.skip;
describeIfAuthorized('Phase C real Admin resolution concurrency', () => {
  let prisma: PrismaService;
  let resolution: AdminSessionResolutionService;
  let earningReviews: SessionEarningReviewService;
  let walletSummary: GetCustomerWalletSummaryUseCase;
  let packagePurchases: PatientPackagePurchaseRepository;
  let packagePresenter: PackagePurchasePresenter;
  let moduleRef: Awaited<ReturnType<typeof Test.createTestingModule>>;
  const adminIds: string[] = [];

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    prisma = moduleRef.get(PrismaService);
    resolution = moduleRef.get(AdminSessionResolutionService);
    earningReviews = moduleRef.get(SessionEarningReviewService);
    walletSummary = moduleRef.get(GetCustomerWalletSummaryUseCase);
    packagePurchases = moduleRef.get(PatientPackagePurchaseRepository);
    packagePresenter = moduleRef.get(PackagePurchasePresenter);
    await prisma.$connect();
    console.log(`[Phase C concurrency authorization] env=${process.env.NODE_ENV} host=${url?.hostname} database=${dbName}`);
  });
  afterAll(async () => { await prisma.$disconnect(); await moduleRef.close(); });

  async function fixture(input: { amount?: number } = {}) {
    const patientUserId = randomUUID(); const practitionerUserId = randomUUID(); const patientId = randomUUID(); const practitionerId = randomUUID(); const sessionId = randomUUID();
    const adminA = await prisma.user.findFirst({ where: { emails: { some: { email: 'admin@hesba.local' } } } });
    if (!adminA) throw new Error('Seed admin account admin@hesba.local is required for concurrency validation');
    const adminB = await prisma.user.create({ data: { id: randomUUID(), displayName: 'Phase C Concurrent Admin B' } });
    adminIds.push(adminB.id);
    await prisma.user.createMany({ data: [{ id: patientUserId, displayName: 'Phase C Concurrent Patient' }, { id: practitionerUserId, displayName: 'Phase C Concurrent Practitioner' }] });
    await prisma.patientProfile.create({ data: { id: patientId, userId: patientUserId } });
    await prisma.practitionerProfile.create({ data: { id: practitionerId, userId: practitionerUserId, publicSlug: `phase-c-concurrency-${practitionerId}`, practitionerType: 'OTHER', status: 'DRAFT' } });
    const replacementStart = new Date(); replacementStart.setUTCDate(replacementStart.getUTCDate() + 8); replacementStart.setUTCHours(10, 0, 0, 0);
    const weekStart = new Date(Date.UTC(replacementStart.getUTCFullYear(), replacementStart.getUTCMonth(), replacementStart.getUTCDate() - replacementStart.getUTCDay()));
    const weekEnd = new Date(weekStart); weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const availabilityWeek = await prisma.practitionerAvailabilityWeek.create({ data: { practitionerId, weekStartDate: weekStart, weekEndDate: weekEnd, timezone: 'UTC', status: 'PUBLISHED', publishedAt: new Date(), slots: { create: [{ weekday: ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][replacementStart.getUTCDay()] as any, startMinuteOfDay: 9 * 60, endMinuteOfDay: 18 * 60, durationMinutes: 30, timezone: 'UTC' }] } } });
    await prisma.practitionerWallet.create({ data: { practitionerId, currencyCode: 'EGP' } });
    const paymentId = randomUUID();
    await prisma.session.create({ data: { id: sessionId, sessionCode: `PCC-${sessionId.slice(0, 8)}`, patientId, practitionerId, flowType: SessionFlowType.SCHEDULED, sessionMode: SessionMode.VIDEO, durationMinutes: 30, status: SessionStatus.AWAITING_ADMIN_RESOLUTION, paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT, provider: SessionProvider.NONE } });
    const amount = input.amount ?? 400;
    await prisma.payment.create({ data: { id: paymentId, sessionId, patientId, practitionerId, paymentPurpose: PaymentPurpose.SESSION_BOOKING, provider: PaymentProvider.STRIPE, status: PaymentStatus.CAPTURED, amountSubtotal: amount, amountDiscount: 0, amountTotal: amount, amountFromWallet: 0, amountFromGateway: amount, currencyCode: 'EGP', commissionPlatformRatePercent: 20, capturedAt: new Date() } });
    const resolutionCase = await prisma.sessionResolutionCase.create({ data: { sessionId, suggestedOutcome: SessionStatus.PATIENT_NO_SHOW, suggestedPatientRemedy: SessionResolutionPatientRemedy.KEEP_ORIGINAL, suggestedPractitionerRemedy: SessionResolutionPractitionerRemedy.NO_EARNING, evidenceSnapshotJson: { source: 'phase-c-concurrency' } } });
    return { sessionId, paymentId, resolutionCaseId: resolutionCase.id, adminA: adminA.id, adminB: adminB.id, patientId, practitionerId, patientUserId, practitionerUserId, replacementStart: replacementStart.toISOString(), availabilityWeekId: availabilityWeek.id };
  }

  async function cleanup(f: Awaited<ReturnType<typeof fixture>>) {
    await prisma.customerWalletEntry.deleteMany({ where: { sessionId: f.sessionId } });
    const refunds = await prisma.refund.findMany({ where: { sessionId: f.sessionId }, select: { id: true } });
    await prisma.refundEvent.deleteMany({ where: { refundId: { in: refunds.map((r) => r.id) } } });
    await prisma.refund.deleteMany({ where: { sessionId: f.sessionId } });
    await prisma.sessionResolution.deleteMany({ where: { sessionId: f.sessionId } });
    const reviews = await prisma.sessionEarningReview.findMany({ where: { sessionId: f.sessionId }, select: { id: true } });
    await prisma.financialOperationIdempotency.deleteMany({ where: { reviewId: { in: reviews.map((r) => r.id) } } });
    await prisma.practitionerEarningAdjustment.deleteMany({ where: { sessionEarningReviewId: { in: reviews.map((r) => r.id) } } });
    await prisma.sessionEarningReview.deleteMany({ where: { id: { in: reviews.map((r) => r.id) } } });
    await prisma.sessionResolutionCase.deleteMany({ where: { id: f.resolutionCaseId } });
    await prisma.sessionEvent.deleteMany({ where: { sessionId: f.sessionId } });
    const replacements = await prisma.session.findMany({ where: { originalSessionId: f.sessionId }, select: { id: true } });
    await prisma.sessionEvent.deleteMany({ where: { sessionId: { in: replacements.map((r) => r.id) } } });
    await prisma.session.deleteMany({ where: { id: { in: replacements.map((r) => r.id) } } });
    await prisma.session.delete({ where: { id: f.sessionId } });
    await prisma.practitionerAvailabilityWeek.deleteMany({ where: { id: f.availabilityWeekId } });
    await prisma.payment.delete({ where: { id: f.paymentId } });
    await prisma.patientProfile.delete({ where: { id: f.patientId } });
    await prisma.practitionerWallet.deleteMany({ where: { practitionerId: f.practitionerId } });
    await prisma.practitionerProfile.delete({ where: { id: f.practitionerId } });
    await prisma.user.deleteMany({ where: { id: { in: [f.patientUserId, f.practitionerUserId, f.adminB] } } });
  }

  it('executes exactly one durable resolution for two overlapping Admin requests', async () => {
    const f = await fixture();
    try {
      const command = { findingCode: 'PATIENT_NO_SHOW', patientRemedy: SessionResolutionPatientRemedy.KEEP_ORIGINAL, practitionerRemedy: SessionResolutionPractitionerRemedy.NO_EARNING, reasonCode: 'CONCURRENT_REVIEW', adminNotes: 'Phase C concurrent execution', idempotencyKey: randomUUID() };
      const results = await Promise.allSettled([
        resolution.execute({ sessionId: f.sessionId, adminId: f.adminA, actorRoles: ['ADMIN'], command: { ...command, idempotencyKey: `${command.idempotencyKey}:a` } }),
        resolution.execute({ sessionId: f.sessionId, adminId: f.adminB, actorRoles: ['ADMIN'], command: { ...command, idempotencyKey: `${command.idempotencyKey}:b` } }),
      ]);
      const successful = results.filter((r): r is PromiseFulfilledResult<unknown> => r.status === 'fulfilled');
      expect(successful).toHaveLength(1);
      const [state, durable, events] = await Promise.all([
        prisma.session.findUniqueOrThrow({ where: { id: f.sessionId }, select: { status: true } }),
        prisma.sessionResolution.findMany({ where: { sessionId: f.sessionId } }),
        prisma.sessionEvent.count({ where: { sessionId: f.sessionId, eventType: 'ADMIN_MANUAL_DECISION_CREATED' } }),
      ]);
      expect(state.status).toBe(SessionStatus.PATIENT_NO_SHOW);
      expect(durable).toHaveLength(1);
      expect(events).toBe(1);
    } finally { await cleanup(f); }
  });

  it('credits the direct-payment wallet exactly once under concurrent Admin wallet requests', async () => {
    const f = await fixture();
    try {
      const command = { findingCode: 'TECHNICAL_ISSUE', patientRemedy: SessionResolutionPatientRemedy.CREDIT_WALLET, practitionerRemedy: SessionResolutionPractitionerRemedy.NO_EARNING, reasonCode: 'CONCURRENT_REFUND', adminNotes: 'Phase C concurrent wallet', idempotencyKey: randomUUID() };
      const results = await Promise.allSettled([
        resolution.execute({ sessionId: f.sessionId, adminId: f.adminA, actorRoles: ['ADMIN'], command: { ...command, idempotencyKey: `${command.idempotencyKey}:a` } }),
        resolution.execute({ sessionId: f.sessionId, adminId: f.adminB, actorRoles: ['ADMIN'], command: { ...command, idempotencyKey: `${command.idempotencyKey}:b` } }),
      ]);
      console.log('[Phase C wallet race]', results.map((r) => r.status === 'rejected' ? String(r.reason?.response?.error ?? r.reason?.message ?? r.reason) : 'fulfilled'));
      expect(await prisma.refund.count({ where: { sessionId: f.sessionId, status: 'SUCCEEDED' } })).toBe(1);
      expect(await prisma.customerWalletEntry.count({ where: { sessionId: f.sessionId, entryType: 'REFUND_CREDIT' } })).toBe(1);
      const wallet = await prisma.customerWallet.findUniqueOrThrow({ where: { patientId_currencyCode: { patientId: f.patientId, currencyCode: 'EGP' } } });
      expect(wallet.availableBalance.toFixed(2)).toBe('400.00');
    } finally { await cleanup(f); }
  });

  it('executes a complete 650 EGP direct wallet refund and exposes it through the patient wallet summary', async () => {
    const f = await fixture({ amount: 650 });
    try {
      const command = { findingCode: 'TECHNICAL_ISSUE', patientRemedy: SessionResolutionPatientRemedy.CREDIT_WALLET, practitionerRemedy: SessionResolutionPractitionerRemedy.NO_EARNING, reasonCode: 'DIRECT_650_REFUND', adminNotes: 'complete snapshot refund', idempotencyKey: randomUUID() };
      await resolution.execute({ sessionId: f.sessionId, adminId: f.adminA, actorRoles: ['ADMIN'], command });
      expect(await prisma.refund.count({ where: { sessionId: f.sessionId, status: 'SUCCEEDED', amount: 650 } })).toBe(1);
      expect(await prisma.customerWalletEntry.count({ where: { sessionId: f.sessionId, entryType: 'REFUND_CREDIT', amount: 650 } })).toBe(1);
      expect(await prisma.ledgerEntry.count({ where: { paymentId: f.paymentId, entryType: { in: ['REFUND_PLATFORM_REVERSAL', 'REFUND_PRACTITIONER_REVERSAL'] } } })).toBe(2);
      expect((await prisma.customerWallet.findUniqueOrThrow({ where: { patientId_currencyCode: { patientId: f.patientId, currencyCode: 'EGP' } } })).availableBalance.toFixed(2)).toBe('650.00');
      expect((await walletSummary.execute({ patientId: f.patientId, currencyCode: 'EGP' })).item?.availableBalance).toBe('650');
      await resolution.execute({ sessionId: f.sessionId, adminId: f.adminA, actorRoles: ['ADMIN'], command });
      expect(await prisma.refund.count({ where: { sessionId: f.sessionId, status: 'SUCCEEDED' } })).toBe(1);
      expect(await prisma.customerWalletEntry.count({ where: { sessionId: f.sessionId, entryType: 'REFUND_CREDIT' } })).toBe(1);
    } finally { await cleanup(f); }
  });

  it('rolls back lifecycle and replacement preparation when replacement validation fails', async () => {
    const f = await fixture();
    try {
      await expect(resolution.execute({
        sessionId: f.sessionId,
        adminId: f.adminA,
        actorRoles: ['ADMIN'],
        command: { findingCode: 'PATIENT_NO_SHOW', patientRemedy: SessionResolutionPatientRemedy.CREATE_REPLACEMENT_SESSION, practitionerRemedy: SessionResolutionPractitionerRemedy.NO_EARNING, reasonCode: 'ROLLBACK_REPLACEMENT', adminNotes: 'invalid schedule must rollback', replacementStartAt: 'not-a-date', idempotencyKey: randomUUID() },
      })).rejects.toBeDefined();
      const [session, durable, replacement] = await Promise.all([
        prisma.session.findUniqueOrThrow({ where: { id: f.sessionId }, select: { status: true } }),
        prisma.sessionResolution.count({ where: { sessionId: f.sessionId } }),
        prisma.session.count({ where: { originalSessionId: f.sessionId } }),
      ]);
      expect(session.status).toBe(SessionStatus.AWAITING_ADMIN_RESOLUTION);
      expect(durable).toBe(0);
      expect(replacement).toBe(0);
    } finally { await cleanup(f); }
  });

  it('creates exactly one earning review under overlapping Admin earning decisions', async () => {
    const f = await fixture();
    try {
      const command = { findingCode: 'PATIENT_NO_SHOW', patientRemedy: SessionResolutionPatientRemedy.KEEP_ORIGINAL, practitionerRemedy: SessionResolutionPractitionerRemedy.CREATE_EARNING_REVIEW, reasonCode: 'CONCURRENT_EARNING', adminNotes: 'Phase C concurrent earning', idempotencyKey: randomUUID() };
      await Promise.allSettled([
        resolution.execute({ sessionId: f.sessionId, adminId: f.adminA, actorRoles: ['ADMIN'], command: { ...command, idempotencyKey: `${command.idempotencyKey}:a` } }),
        resolution.execute({ sessionId: f.sessionId, adminId: f.adminB, actorRoles: ['ADMIN'], command: { ...command, idempotencyKey: `${command.idempotencyKey}:b` } }),
      ]);
      expect(await prisma.sessionEarningReview.count({ where: { sessionId: f.sessionId } })).toBe(1);
      expect(await prisma.sessionResolution.count({ where: { sessionId: f.sessionId } })).toBe(1);
    } finally { await cleanup(f); }
  });

  it('rolls back a staged refund when the downstream earning collaborator fails', async () => {
    const f = await fixture();
    const service = resolution as unknown as { earningReviews: { syncForAdminResolution: (...args: any[]) => Promise<unknown> } };
    const original = service.earningReviews.syncForAdminResolution;
    service.earningReviews.syncForAdminResolution = async () => { throw new Error('deterministic Phase C rollback failure'); };
    try {
      await expect(resolution.execute({ sessionId: f.sessionId, adminId: f.adminA, actorRoles: ['ADMIN'], command: { findingCode: 'TECHNICAL_ISSUE', patientRemedy: SessionResolutionPatientRemedy.CREDIT_WALLET, practitionerRemedy: SessionResolutionPractitionerRemedy.CREATE_EARNING_REVIEW, reasonCode: 'REFUND_ROLLBACK', adminNotes: 'rollback staged refund', idempotencyKey: randomUUID() } })).rejects.toThrow('deterministic Phase C rollback failure');
      expect(await prisma.refund.count({ where: { sessionId: f.sessionId } })).toBe(0);
      expect(await prisma.customerWalletEntry.count({ where: { sessionId: f.sessionId, entryType: 'REFUND_CREDIT' } })).toBe(0);
      expect(await prisma.sessionResolution.count({ where: { sessionId: f.sessionId } })).toBe(0);
      expect((await prisma.session.findUniqueOrThrow({ where: { id: f.sessionId }, select: { status: true } })).status).toBe(SessionStatus.AWAITING_ADMIN_RESOLUTION);
    } finally { service.earningReviews.syncForAdminResolution = original; await cleanup(f); }
  });

  it('creates exactly one valid replacement under overlapping Admin requests', async () => {
    const f = await fixture();
    try {
      const command = { findingCode: 'PATIENT_NO_SHOW', patientRemedy: SessionResolutionPatientRemedy.CREATE_REPLACEMENT_SESSION, practitionerRemedy: SessionResolutionPractitionerRemedy.NO_EARNING, reasonCode: 'VALID_REPLACEMENT_RACE', adminNotes: 'valid replacement race', replacementStartAt: f.replacementStart, idempotencyKey: randomUUID() };
      const results = await Promise.allSettled([
        resolution.execute({ sessionId: f.sessionId, adminId: f.adminA, actorRoles: ['ADMIN'], command: { ...command, idempotencyKey: `${command.idempotencyKey}:a` } }),
        resolution.execute({ sessionId: f.sessionId, adminId: f.adminB, actorRoles: ['ADMIN'], command: { ...command, idempotencyKey: `${command.idempotencyKey}:b` } }),
      ]);
      expect(results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')).toHaveLength(1);
      const replacement = await prisma.session.findMany({ where: { originalSessionId: f.sessionId } });
      expect(replacement).toHaveLength(1);
      expect(replacement[0]).toMatchObject({ patientId: f.patientId, practitionerId: f.practitionerId, durationMinutes: 30, sessionMode: SessionMode.VIDEO, fundingSource: 'ADMIN_REPLACEMENT', earningEntitlementId: (await prisma.session.findUniqueOrThrow({ where: { id: f.sessionId }, select: { earningEntitlementId: true } })).earningEntitlementId });
      expect(await prisma.payment.count({ where: { sessionId: replacement[0].id } })).toBe(0);
      expect(replacement[0].packagePurchaseId).toBeNull();
      expect(await prisma.sessionResolution.count({ where: { sessionId: f.sessionId } })).toBe(1);
    } finally { await cleanup(f); }
  });

  it('restores one canonical usable package entitlement and is idempotent', async () => {
    const f = await fixture();
    const purchaseId = randomUUID();
    const packagePaymentId = randomUUID();
    try {
      await prisma.payment.create({ data: { id: packagePaymentId, patientId: f.patientId, practitionerId: f.practitionerId, paymentPurpose: PaymentPurpose.SESSION_PACKAGE_PURCHASE, provider: PaymentProvider.STRIPE, status: PaymentStatus.CAPTURED, amountSubtotal: 800, amountTotal: 800, amountFromGateway: 800, amountFromWallet: 0, currencyCode: 'EGP', capturedAt: new Date() } });
      await prisma.patientPackagePurchase.create({ data: { id: purchaseId, practitionerId: f.practitionerId, patientId: f.patientId, paymentId: packagePaymentId, status: 'ACTIVE', paidAt: new Date(), activatedAt: new Date(), titleSnapshot: 'Phase C package', descriptionSnapshot: 'Phase C package', slugSnapshot: `phase-c-${purchaseId}`, packageVersionSnapshot: 1, sessionCountSnapshot: 2, sessionDurationMinutesSnapshot: 30, sessionModeSnapshot: SessionMode.VIDEO, schedulePolicySnapshot: 'ALLOW_SCHEDULE_LATER', selectedCurrencyCode: 'EGP', selectedAmountSnapshot: 800 } });
      await prisma.session.update({ where: { id: f.sessionId }, data: { status: SessionStatus.PATIENT_NO_SHOW, paymentCoverageType: SessionPaymentCoverageType.PACKAGE, packagePurchaseId: purchaseId, packageSessionIndex: 1, packageSessionCount: 2 } });
      const before = await packagePresenter.toViewModel({ purchase: (await packagePurchases.findById(purchaseId))! });
      expect(before.progress.remainingSessions).toBe(1);
      await prisma.session.update({ where: { id: f.sessionId }, data: { status: SessionStatus.AWAITING_ADMIN_RESOLUTION } });
      const command = { findingCode: 'PATIENT_NO_SHOW', patientRemedy: SessionResolutionPatientRemedy.RESTORE_PACKAGE, practitionerRemedy: SessionResolutionPractitionerRemedy.NO_EARNING, reasonCode: 'RESTORE_CANONICAL', adminNotes: 'restore entitlement', idempotencyKey: randomUUID() };
      await resolution.execute({ sessionId: f.sessionId, adminId: f.adminA, actorRoles: ['ADMIN'], command });
      const after = await packagePresenter.toViewModel({ purchase: (await packagePurchases.findById(purchaseId))! });
      expect(after.progress.remainingSessions).toBe(2);
      expect(await prisma.sessionPackageEntitlementDecision.count({ where: { sessionId: f.sessionId, decisionType: 'RESTORE_TO_PACKAGE' } })).toBe(1);
      await resolution.execute({ sessionId: f.sessionId, adminId: f.adminA, actorRoles: ['ADMIN'], command });
      expect(await prisma.sessionPackageEntitlementDecision.count({ where: { sessionId: f.sessionId, decisionType: 'RESTORE_TO_PACKAGE' } })).toBe(1);
      const again = await packagePresenter.toViewModel({ purchase: (await packagePurchases.findById(purchaseId))! });
      expect(again.progress.remainingSessions).toBe(2);
    } finally {
      await prisma.sessionPackageEntitlementDecision.deleteMany({ where: { sessionId: f.sessionId } });
      await prisma.patientPackagePurchase.deleteMany({ where: { id: purchaseId } });
      await prisma.payment.deleteMany({ where: { id: packagePaymentId } });
      await cleanup(f);
    }
  });

  it('serializes a real Admin resolution against the canonical Accountant decision', async () => {
    const f = await fixture();
    try {
      await earningReviews.syncForAdminResolution({ sessionId: f.sessionId, allowPendingResolution: true });
      const review = await prisma.sessionEarningReview.findFirstOrThrow({ where: { sessionId: f.sessionId } });
      const results = await Promise.allSettled([
        resolution.execute({ sessionId: f.sessionId, adminId: f.adminA, actorRoles: ['ADMIN'], command: { findingCode: 'PATIENT_NO_SHOW', patientRemedy: SessionResolutionPatientRemedy.KEEP_ORIGINAL, practitionerRemedy: SessionResolutionPractitionerRemedy.CREATE_EARNING_REVIEW, reasonCode: 'ADMIN_ACCOUNTANT_RACE', adminNotes: 'concurrent admin decision', idempotencyKey: randomUUID() } }),
        earningReviews.approveFinancialDecision({ reviewId: review.id, reviewerUserId: f.adminB, actorRoles: ['ACCOUNTANT'], accountantApprovedSourceAmount: '320', overrideReason: 'race validation', idempotencyKey: randomUUID() }),
      ]);
      expect(results.some((r) => r.status === 'fulfilled')).toBe(true);
      expect(await prisma.sessionEarningReview.count({ where: { sessionId: f.sessionId } })).toBe(1);
      expect(await prisma.sessionResolution.count({ where: { sessionId: f.sessionId } })).toBeLessThanOrEqual(1);
    } finally { await cleanup(f); }
  });
});
