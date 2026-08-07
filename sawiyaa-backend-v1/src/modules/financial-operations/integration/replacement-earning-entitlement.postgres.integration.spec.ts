/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { randomUUID } from 'node:crypto';
import { PaymentProvider, PaymentPurpose, PaymentStatus, PractitionerStatus, PractitionerType, Prisma, SessionFlowType, SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { LedgerRepository } from '../repositories/ledger.repository';
import { ExtractPaymentLedgerBreakdownService } from '../services/extract-payment-ledger-breakdown.service';
import { CalculatePackageSessionAllocationService } from '../services/calculate-package-session-allocation.service';
import { MoneyAmountService } from '../services/money-amount.service';
import { SessionEarningReviewService } from '../services/session-earning-review.service';
import { ApprovePractitionerSettlementService } from '../services/approve-practitioner-settlement.service';
import { WalletRepository } from '../repositories/wallet.repository';

const databaseUrl = process.env.DATABASE_URL;
const databaseName = databaseUrl ? decodeURIComponent(new URL(databaseUrl).pathname.slice(1)) : '';
if (databaseName === 'fayed_db' || (databaseName && !/(phase3b1a|phase3b2a)/i.test(databaseName))) throw new Error(`Unsafe replacement earning database: ${databaseName}`);

const describeIfDatabase = databaseUrl ? describe : describe.skip;

describeIfDatabase('replacement earning entitlement PostgreSQL proof', () => {
  const prisma = new PrismaService();
  const money = new MoneyAmountService();
  const transfer = new ApprovePractitionerSettlementService(new LedgerRepository(prisma), new WalletRepository(prisma));
  const service = new SessionEarningReviewService(
    prisma,
    new LedgerRepository(prisma),
    new ExtractPaymentLedgerBreakdownService(money),
    new CalculatePackageSessionAllocationService(money),
    { refresh: jest.fn().mockResolvedValue(undefined) } as never,
    transfer,
    {} as never,
  );

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  it('creates one informational review for a replacement chain and settles only after accountant approval', async () => {
    const suffix = randomUUID();
    const patientUserId = randomUUID();
    const practitionerUserId = randomUUID();
    const patientId = randomUUID();
    const practitionerId = randomUUID();
    const paymentId = randomUUID();
    const originalId = randomUUID();
    const replacementId = randomUUID();
    const entitlementId = randomUUID();
    const batchPrefix = `replacement-proof-${suffix}`;

    await prisma.user.createMany({ data: [{ id: patientUserId, displayName: 'Replacement Proof Patient' }, { id: practitionerUserId, displayName: 'Replacement Proof Practitioner' }] });
    await prisma.patientProfile.create({ data: { id: patientId, userId: patientUserId } });
    await prisma.practitionerProfile.create({ data: { id: practitionerId, userId: practitionerUserId, publicSlug: `replacement-proof-${suffix}`, practitionerType: PractitionerType.OTHER, status: PractitionerStatus.DRAFT } });
    await prisma.practitionerWallet.create({ data: { practitionerId, currencyCode: 'EGP' } });
    const sessionData = (id: string, originalSessionId: string | null) => ({ id, sessionCode: `RP-${id.slice(0, 8)}`, patientId, practitionerId, flowType: SessionFlowType.SCHEDULED, sessionMode: SessionMode.VIDEO, durationMinutes: 30, status: SessionStatus.COMPLETED, scheduledStartAt: new Date('2026-08-02T09:00:00Z'), scheduledEndAt: new Date('2026-08-02T09:30:00Z'), provider: SessionProvider.DAILY, providerRoomId: `${batchPrefix}-${id}`, originalSessionId, earningEntitlementId: entitlementId, suggestedPractitionerPercentageSnapshot: new Prisma.Decimal(30) });
    await prisma.session.create({ data: sessionData(originalId, null) });
    await prisma.session.create({ data: sessionData(replacementId, originalId) });
    await prisma.payment.create({ data: { id: paymentId, sessionId: originalId, patientId, practitionerId, paymentPurpose: PaymentPurpose.SESSION_BOOKING, provider: PaymentProvider.STRIPE, status: PaymentStatus.CAPTURED, amountSubtotal: 100, amountDiscount: 0, amountTotal: 100, amountFromWallet: 0, amountFromGateway: 100, currencyCode: 'USD', commissionPlatformRatePercent: 20, capturedAt: new Date('2026-08-02T10:00:00Z') } });

    const original = await service.syncForSessionCompletion({ sessionId: originalId });
    expect(original?.reviewId).toBeDefined();
    await prisma.sessionEarningReview.update({ where: { id: original!.reviewId }, data: { reviewStatus: 'EXCLUDED_FROM_PAYOUT', reviewDecision: 'EXCLUDED_FROM_PAYOUT', internalReason: 'SUPERSEDED_BY_ADMIN_REPLACEMENT_SESSION' } });
    const replacement = await service.syncForSessionCompletion({ sessionId: replacementId });
    const replay = await service.syncForSessionCompletion({ sessionId: replacementId });
    expect(replay?.reviewId).toBe(replacement?.reviewId);

    const payable = await prisma.sessionEarningReview.findMany({ where: { earningEntitlementId: entitlementId, reviewStatus: 'PENDING_REVIEW' } });
    const settlements = await prisma.practitionerSettlement.findMany({ where: { sourceReview: { earningEntitlementId: entitlementId } } });
    expect(payable).toHaveLength(1);
    expect(payable[0].sessionId).toBe(replacementId);
    expect(payable[0].suggestedPractitionerPercentage?.toString()).toBe('30');
    expect(payable[0].suggestedPractitionerAmount.toString()).toBe('30');
    expect(payable[0].suggestedPlatformAmount.toString()).toBe('70');
    expect(settlements).toHaveLength(0);
    const approved = await service.approveFinancialDecision({ reviewId: replacement!.reviewId, reviewerUserId: practitionerUserId, accountantApprovedSourceAmount: '25', overrideReason: 'Approved below system suggestion for proof' });
    const credited = await service.creditPractitionerWallet({ reviewId: replacement!.reviewId, approvedByUserId: practitionerUserId, approvedWalletCreditAmount: '1250', idempotencyKey: `replacement-stage-b:${replacement!.reviewId}` });
    const replayTransfer = await service.creditPractitionerWallet({ reviewId: replacement!.reviewId, approvedByUserId: practitionerUserId, approvedWalletCreditAmount: '1250', idempotencyKey: `replacement-stage-b:${replacement!.reviewId}` });
    const settlementsAfterApproval = await prisma.practitionerSettlement.findMany({ where: { sourceReview: { earningEntitlementId: entitlementId } } });
    expect(approved.item.accountantApprovedSourceAmount?.toString()).toBe('25');
    expect(approved.item.accountingAdjustmentAmount?.toString()).toBe('-5');
    expect(credited.item.reviewStatus).toBe('APPROVED');
    expect(settlementsAfterApproval).toHaveLength(1);
    expect(settlementsAfterApproval[0].originalCurrencyCode).toBe('USD');
    expect(settlementsAfterApproval[0].walletCurrencyCode).toBe('EGP');
    expect(settlementsAfterApproval[0].exchangeRate?.toString()).toBe('50');
    const walletLedger = await prisma.ledgerEntry.findMany({ where: { sessionEarningReviewId: replacement!.reviewId, entryType: 'PRACTITIONER_EARNING' } });
    expect(replayTransfer.wasAlreadyPosted).toBe(true);
    expect(walletLedger).toHaveLength(1);
    expect(walletLedger[0].amount.toString()).toBe('1250');
    expect(walletLedger[0].currencyCode).toBe('EGP');

    // The isolated proof database is disposable; retain the rows for post-test inspection.
  });
});
