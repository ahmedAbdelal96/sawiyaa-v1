/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { randomUUID } from 'node:crypto';
import {
  JournalEntrySourceType,
  LedgerDirection,
  LedgerEntryType,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  PractitionerStatus,
  PractitionerType,
  RefundDestination,
  RefundEventType,
  RefundStatus,
  RefundType,
  SessionEarningReviewDecision,
  SessionEarningReviewSourceType,
  SessionEarningReviewStatus,
  SessionFlowType,
  SessionMode,
  SessionProvider,
  SessionStatus,
  WalletBalanceBucket,
  SecurityAuditActorType,
  SettlementBatchStatus,
  PractitionerSettlementStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentMapper } from '../mappers/payment.mapper';
import { RequestPaymentRefundUseCase } from '../use-cases/request-payment-refund.use-case';
import { RetryPaymentRefundUseCase } from '../use-cases/retry-payment-refund.use-case';
import { ValidatePaymentStatusTransitionService } from '../services/validate-payment-status-transition.service';
import { ValidateRefundEligibilityService } from '../services/validate-refund-eligibility.service';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { CustomerWalletRepository } from '@modules/customer-wallets/repositories/customer-wallet.repository';
import { CustomerWalletEntryRepository } from '@modules/customer-wallets/repositories/customer-wallet-entry.repository';
import { CustomerWalletReservationRepository } from '@modules/customer-wallets/repositories/customer-wallet-reservation.repository';
import { SessionEarningReviewService } from '@modules/financial-operations/services/session-earning-review.service';
import { LedgerRepository } from '@modules/financial-operations/repositories/ledger.repository';
import { FinancialOperationsPaymentRepository } from '@modules/financial-operations/repositories/financial-operations-payment.repository';
import { ExtractPaymentLedgerBreakdownService } from '@modules/financial-operations/services/extract-payment-ledger-breakdown.service';
import { CalculatePackageSessionAllocationService } from '@modules/financial-operations/services/calculate-package-session-allocation.service';
import { MoneyAmountService } from '@modules/financial-operations/services/money-amount.service';
import { AccountingJournalPostingService } from '@modules/financial-operations/services/accounting-journal-posting.service';
import { AccountingLedgerAccountService } from '@modules/financial-operations/services/accounting-ledger-account.service';
import { PractitionerRecoveryService } from '@modules/financial-operations/services/practitioner-recovery.service';
import { PractitionerRecoveryRepository } from '@modules/financial-operations/repositories/practitioner-recovery.repository';
import { PractitionerManualPayoutBalanceService } from '@modules/financial-operations/services/practitioner-manual-payout-balance.service';
import { PractitionerManualPayoutRepository } from '@modules/financial-operations/repositories/practitioner-manual-payout.repository';
import { FinancialOperationsPractitionerRepository } from '@modules/financial-operations/repositories/financial-operations-practitioner.repository';
import { RefreshPractitionerWalletService } from '@modules/financial-operations/services/refresh-practitioner-wallet.service';
import { WalletRepository } from '@modules/financial-operations/repositories/wallet.repository';
import { PostRefundLedgerEntriesUseCase } from '@modules/financial-operations/use-cases/post-refund-ledger-entries.use-case';

const databaseUrl = process.env.DATABASE_URL;
const parsed = databaseUrl ? new URL(databaseUrl) : null;
const describeIfDatabase = parsed ? describe : describe.skip;
let settlementBatchSequence = 0;
if (
  parsed &&
  (!['127.0.0.1', 'localhost'].includes(parsed.hostname) ||
    !['5432', '55438'].includes(parsed.port) ||
    !/^\/sawiyaa_redteam_[a-z0-9_]+$/.test(parsed.pathname))
)
  throw new Error('Paymob refund proof requires an isolated red-team PostgreSQL database');

describeIfDatabase('Paymob refund finalization concurrency (PostgreSQL)', () => {
  const prisma = new PrismaService();
  const paymentRepository = new PaymentRepository(prisma);
  const money = new MoneyAmountService();
  const ledgerRepository = new LedgerRepository(prisma);
  const walletRepository = new WalletRepository(prisma);
  const journals = new AccountingJournalPostingService(
    prisma,
    money,
    new AccountingLedgerAccountService(prisma),
  );
  const recovery = new PractitionerRecoveryService(
    prisma,
    new PractitionerRecoveryRepository(prisma),
  );
  const manualPayoutRepository = new PractitionerManualPayoutRepository(prisma);
  const balances = new PractitionerManualPayoutBalanceService(
    prisma,
    new FinancialOperationsPractitionerRepository(prisma),
    manualPayoutRepository,
    recovery,
  );
  const refreshWallet = new RefreshPractitionerWalletService(
    prisma,
    ledgerRepository,
    walletRepository,
    money,
  );
  const extract = new ExtractPaymentLedgerBreakdownService(money);
  const earningReview = new SessionEarningReviewService(
    prisma,
    ledgerRepository,
    extract,
    new CalculatePackageSessionAllocationService(money),
    refreshWallet,
    {} as never,
    journals,
    walletRepository,
  );
  const reverseRefund = new PostRefundLedgerEntriesUseCase(
    prisma,
    new FinancialOperationsPaymentRepository(prisma),
    ledgerRepository,
    extract,
    balances,
    recovery,
    refreshWallet,
    money,
    journals,
  );
  const walletAccounting = new CustomerWalletAccountingService(
    prisma,
    new CustomerWalletRepository(prisma),
    new CustomerWalletEntryRepository(prisma),
    new CustomerWalletReservationRepository(prisma),
  );
  const notifications = {
    notifyRefundSucceeded: async () => undefined,
    notifyRefundFailed: async () => undefined,
    notifyRefundRequested: async () => undefined,
  };
  const sessionOrchestration = {
    markSessionRefunded: async () => undefined,
    markSessionRefundPending: async () => undefined,
  };
  const refundEligibility = new ValidateRefundEligibilityService();
  const providerRegistry = {
    get: () => ({
      reconcileRefund: async () => ({
        outcome: 'SUCCEEDED' as const,
        providerRefundRef: `paymob-refund-evidence-${randomUUID()}`,
        amountMinor: 10000,
        currencyCode: 'EGP',
        evidence: { source: 'paymob-refund-inquiry', inquiryOutcome: 'SUCCEEDED' },
      }),
    }),
  };
  const refundUseCase = new RequestPaymentRefundUseCase(
    prisma,
    paymentRepository,
    providerRegistry as never,
    new ValidatePaymentStatusTransitionService(),
    refundEligibility,
    reverseRefund,
    earningReview,
    walletAccounting,
    sessionOrchestration as never,
    notifications as never,
    new PaymentMapper(),
    { info: () => undefined, warn: () => undefined } as never,
  );

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  async function createFixture() {
    const suffix = randomUUID();
    const patientUserId = randomUUID();
    const practitionerUserId = randomUUID();
    const operatorUserId = randomUUID();
    const patientId = randomUUID();
    const practitionerId = randomUUID();
    const sessionId = randomUUID();
    const paymentId = randomUUID();
    const refundId = randomUUID();
    const reviewId = randomUUID();
    const batchId = randomUUID();
    const settlementId = randomUUID();
    const batchNumber = settlementBatchSequence++;
    const paymentReference = `paymob-txn-${suffix}`;

    const eg = await prisma.country.upsert({
      where: { isoCode: 'EG' },
      create: { isoCode: 'EG', name: 'Egypt', slug: 'egypt' },
      update: {},
    });
    await prisma.user.createMany({
      data: [
        { id: patientUserId, displayName: `Paymob refund patient ${suffix}` },
        { id: practitionerUserId, displayName: `Paymob refund practitioner ${suffix}` },
        { id: operatorUserId, displayName: `Paymob refund operator ${suffix}` },
      ],
    });
    await prisma.patientProfile.create({
      data: { id: patientId, userId: patientUserId, countryId: eg.id },
    });
    await prisma.practitionerProfile.create({
      data: {
        id: practitionerId,
        userId: practitionerUserId,
        publicSlug: `paymob-refund-${suffix}`,
        practitionerType: PractitionerType.OTHER,
        status: PractitionerStatus.DRAFT,
        countryId: eg.id,
      },
    });
    await prisma.practitionerWallet.create({
      data: {
        practitionerId,
        currencyCode: 'EGP',
        availableBalance: 70,
        lifetimeEarned: 70,
      },
    });
    await prisma.session.create({
      data: {
        id: sessionId,
        sessionCode: `PR-${sessionId.slice(0, 8)}`,
        patientId,
        practitionerId,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 30,
        status: SessionStatus.COMPLETED,
        scheduledStartAt: new Date('2026-10-01T09:00:00Z'),
        scheduledEndAt: new Date('2026-10-01T09:30:00Z'),
        provider: SessionProvider.DAILY,
        earningEntitlementId: randomUUID(),
        patientCountrySnapshot: 'EG',
        practitionerCountrySnapshot: 'EG',
        countryRelationshipSnapshot: 'SAME_COUNTRY',
        suggestedPractitionerPercentageSnapshot: 70,
      },
    });
    await prisma.payment.create({
      data: {
        id: paymentId,
        sessionId,
        patientId,
        practitionerId,
        paymentPurpose: PaymentPurpose.SESSION_BOOKING,
        provider: PaymentProvider.PAYMOB,
        status: PaymentStatus.REFUND_PENDING,
        amountSubtotal: 100,
        amountDiscount: 0,
        amountTotal: 100,
        amountFromWallet: 0,
        amountFromGateway: 100,
        currencyCode: 'EGP',
        providerPaymentRef: paymentReference,
        capturedAt: new Date('2026-10-01T09:00:00Z'),
        metadataJson: {
          financialBreakdown: {
            practitionerShareAmount: '70.00',
            platformCommissionAmount: '30.00',
          },
        },
      },
    });
    await prisma.sessionEarningReview.create({
      data: {
        id: reviewId,
        sessionId,
        earningEntitlementId: (await prisma.session.findUniqueOrThrow({ where: { id: sessionId }, select: { earningEntitlementId: true } })).earningEntitlementId,
        paymentId,
        practitionerId,
        patientId,
        sourceType: SessionEarningReviewSourceType.DIRECT_SESSION,
        reviewStatus: SessionEarningReviewStatus.APPROVED,
        reviewDecision: SessionEarningReviewDecision.APPROVED_AS_IS,
        paymentAmount: 100,
        paymentCurrencyCode: 'EGP',
        suggestedPractitionerAmount: 70,
        suggestedPlatformAmount: 30,
        suggestedCurrencyCode: 'EGP',
        suggestedPractitionerPercentage: 70,
        patientCountrySnapshot: 'EG',
        practitionerCountrySnapshot: 'EG',
        countryRelationshipSnapshot: 'SAME_COUNTRY',
        accountantApprovedSourceAmount: 70,
        calculatedPractitionerAmount: 70,
        finalPractitionerAmount: 70,
        finalPlatformAmount: 30,
        finalCurrencyCode: 'EGP',
        approvedByUserId: operatorUserId,
        approvedAt: new Date('2026-10-01T10:00:00Z'),
        idempotencyKey: `paymob-refund-review-${suffix}`,
      },
    });
    await prisma.settlementBatch.create({
      data: {
        id: batchId,
        periodYear: 2500 + (Date.now() % 100000) + batchNumber,
        periodMonth: 1,
        currencyCode: 'EGP',
        status: SettlementBatchStatus.DRAFT,
        slug: `paymob-refund-batch-${suffix}`,
      },
    });
    await prisma.practitionerSettlement.create({
      data: {
        id: settlementId,
        batchId,
        practitionerId,
        walletId: (await prisma.practitionerWallet.findUniqueOrThrow({ where: { practitionerId_currencyCode: { practitionerId, currencyCode: 'EGP' } }, select: { id: true } })).id,
        sourceReviewId: reviewId,
        amountGross: 70,
        amountNet: 70,
        currencyCode: 'EGP',
        originalAmount: 70,
        originalCurrencyCode: 'EGP',
        walletCurrencyCode: 'EGP',
        convertedAmount: 70,
        finalWalletCredit: 70,
        status: PractitionerSettlementStatus.APPROVED,
        approvedByUserId: operatorUserId,
        approvedAt: new Date('2026-10-01T10:00:00Z'),
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        practitionerId,
        sessionId,
        paymentId,
        sessionEarningReviewId: reviewId,
        settlementId,
        actorUserId: operatorUserId,
        actorType: SecurityAuditActorType.USER,
        entryType: LedgerEntryType.PRACTITIONER_EARNING,
        direction: LedgerDirection.CREDIT,
        amount: 70,
        currencyCode: 'EGP',
        balanceBucket: WalletBalanceBucket.AVAILABLE,
        referenceType: 'session-earning-review',
        referenceId: reviewId,
        description: 'Approved practitioner earning for refund reversal proof.',
      },
    });
    await prisma.refund.create({
      data: {
        id: refundId,
        paymentId,
        sessionId,
        refundType: RefundType.FULL,
        status: RefundStatus.PROCESSING,
        destination: RefundDestination.ORIGINAL_METHOD,
        amount: 100,
        currencyCode: 'EGP',
        metadataJson: {
          providerReconciliation: {
            attempts: 1,
            outcome: 'UNKNOWN',
            evidence: { source: 'paymob-refund-inquiry', pending: false },
          },
        },
      },
    });
    await prisma.refundEvent.create({
      data: {
        refundId,
        paymentId,
        sessionId,
        eventType: RefundEventType.PROVIDER_PENDING,
        previousStatus: RefundStatus.REQUESTED,
        newStatus: RefundStatus.PROCESSING,
        destination: RefundDestination.ORIGINAL_METHOD,
        amount: 100,
        currencyCode: 'EGP',
        reason: 'Fixture: latest Paymob inquiry is UNKNOWN.',
      },
    });
    return { suffix, patientId, practitionerId, operatorUserId, paymentId, refundId };
  }

  async function assertSucceededEconomics(fixture: Awaited<ReturnType<typeof createFixture>>) {
    const [refund, payment, refundEvents, paymentEvents, reversals, recoveries, journalsForRefund, lines, allRefunds] = await Promise.all([
      prisma.refund.findUniqueOrThrow({ where: { id: fixture.refundId } }),
      prisma.payment.findUniqueOrThrow({ where: { id: fixture.paymentId } }),
      prisma.refundEvent.findMany({ where: { refundId: fixture.refundId } }),
      prisma.paymentEvent.findMany({ where: { paymentId: fixture.paymentId, eventType: 'REFUND_PROCESSED' } }),
      prisma.ledgerEntry.findMany({ where: { referenceId: fixture.refundId, entryType: LedgerEntryType.REFUND_PRACTITIONER_REVERSAL } }),
      prisma.practitionerRecovery.findMany({ where: { refundId: fixture.refundId } }),
      prisma.journalEntry.findMany({ where: { sourceType: JournalEntrySourceType.REFUND_SUCCEEDED, sourceId: fixture.refundId } }),
      prisma.journalLine.findMany({ where: { journalEntry: { sourceType: JournalEntrySourceType.REFUND_SUCCEEDED, sourceId: fixture.refundId } } }),
      prisma.refund.findMany({ where: { paymentId: fixture.paymentId, status: RefundStatus.SUCCEEDED } }),
    ]);
    expect(refund.status).toBe(RefundStatus.SUCCEEDED);
    expect(payment.status).toBe(PaymentStatus.REFUNDED);
    expect(refundEvents.filter((event) => event.eventType === RefundEventType.SUCCEEDED)).toHaveLength(1);
    expect(paymentEvents).toHaveLength(1);
    expect(reversals).toHaveLength(1);
    expect(reversals[0].amount.toFixed(2)).toBe('70.00');
    expect(recoveries).toHaveLength(0);
    expect(journalsForRefund).toHaveLength(1);
    expect(allRefunds).toHaveLength(1);
    expect((await prisma.refund.aggregate({ where: { paymentId: fixture.paymentId, status: RefundStatus.SUCCEEDED }, _sum: { amount: true } }))._sum.amount?.toFixed(2)).toBe('100.00');
    const signed = lines.reduce((sum, line) => line.direction === LedgerDirection.DEBIT ? sum.add(line.amount) : sum.sub(line.amount), new Prisma.Decimal(0));
    expect(signed.toFixed(2)).toBe('0.00');
    const wallet = await prisma.practitionerWallet.findUniqueOrThrow({ where: { practitionerId_currencyCode: { practitionerId: fixture.practitionerId, currencyCode: 'EGP' } } });
    expect(wallet.availableBalance.toFixed(2)).toBe('0.00');
    expect(wallet.availableBalance.gte(0)).toBe(true);
  }

  it('automatic SUCCEEDED vs manual SUCCEEDED finalizes one refund across ten races', async () => {
    for (let i = 0; i < 10; i += 1) {
      const fixture = await createFixture();
      const results = await Promise.allSettled([
        refundUseCase.reconcileProviderRefund(fixture.refundId),
        refundUseCase.manuallyFinalizeProviderRefund({
          paymentId: fixture.paymentId,
          refundId: fixture.refundId,
          actorUserId: fixture.operatorUserId,
          outcome: 'SUCCEEDED',
          evidenceReference: `manual-evidence-${fixture.suffix}`,
          reason: 'Verified Paymob evidence.',
        }),
      ]);
      expect(results.some((result) => result.status === 'fulfilled')).toBe(true);
      await assertSucceededEconomics(fixture);
    }
  }, 180_000);

  it('two concurrent authorized manual SUCCEEDED finalizations post one refund', async () => {
    for (let i = 0; i < 10; i += 1) {
      const fixture = await createFixture();
      const command = {
        paymentId: fixture.paymentId,
        refundId: fixture.refundId,
        actorUserId: fixture.operatorUserId,
        outcome: 'SUCCEEDED' as const,
        evidenceReference: `manual-dual-evidence-${fixture.suffix}`,
        reason: 'Verified duplicate operator evidence.',
      };
      const results = await Promise.allSettled([
        refundUseCase.manuallyFinalizeProviderRefund(command),
        refundUseCase.manuallyFinalizeProviderRefund({ ...command, evidenceReference: `${command.evidenceReference}-2` }),
      ]);
      expect(results.some((result) => result.status === 'fulfilled')).toBe(true);
      await assertSucceededEconomics(fixture);
    }
  }, 180_000);

  it('automatic finalization wins and a later manual command is already-finalized safe', async () => {
    const fixture = await createFixture();
    await refundUseCase.reconcileProviderRefund(fixture.refundId);
    const manual = await refundUseCase.manuallyFinalizeProviderRefund({
      paymentId: fixture.paymentId,
      refundId: fixture.refundId,
      actorUserId: fixture.operatorUserId,
      outcome: 'SUCCEEDED',
      evidenceReference: `late-manual-evidence-${fixture.suffix}`,
      reason: 'Late verified evidence.',
    });
    expect(manual.status).toBe(RefundStatus.SUCCEEDED);
    await assertSucceededEconomics(fixture);
  });

  it('manual FAILED finalization creates no refund economics and remains retry-safe', async () => {
    const fixture = await createFixture();
    const failed = await refundUseCase.manuallyFinalizeProviderRefund({
      paymentId: fixture.paymentId,
      refundId: fixture.refundId,
      actorUserId: fixture.operatorUserId,
      outcome: 'FAILED',
      evidenceReference: `failed-evidence-${fixture.suffix}`,
      reason: 'Verified failed Paymob evidence.',
    });
    expect(failed.status).toBe(RefundStatus.FAILED);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: fixture.paymentId } })).status).toBe(PaymentStatus.CAPTURED);
    expect(await prisma.ledgerEntry.count({ where: { referenceId: fixture.refundId, entryType: { in: [LedgerEntryType.REFUND_PRACTITIONER_REVERSAL, LedgerEntryType.REFUND_PLATFORM_REVERSAL] } } })).toBe(0);
    expect(await prisma.practitionerRecovery.count({ where: { refundId: fixture.refundId } })).toBe(0);
    expect(await prisma.journalEntry.count({ where: { sourceType: JournalEntrySourceType.REFUND_SUCCEEDED, sourceId: fixture.refundId } })).toBe(0);
    expect((await prisma.refund.aggregate({ where: { paymentId: fixture.paymentId, status: RefundStatus.SUCCEEDED }, _sum: { amount: true } }))._sum.amount).toBeNull();
    expect(() => refundEligibility.assertRetryableRefundStatus(failed.status)).not.toThrow();
    const retry = new RetryPaymentRefundUseCase(paymentRepository, refundUseCase);
    expect(retry).toBeDefined();
  });
});
