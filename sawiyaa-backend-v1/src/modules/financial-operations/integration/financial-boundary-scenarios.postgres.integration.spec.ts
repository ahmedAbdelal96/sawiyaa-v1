/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { randomUUID } from 'node:crypto';
import {
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  PractitionerStatus,
  PractitionerType,
  Prisma,
  SessionEarningReviewStatus,
  SessionFlowType,
  SessionMode,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { LedgerRepository } from '../repositories/ledger.repository';
import { ExtractPaymentLedgerBreakdownService } from '../services/extract-payment-ledger-breakdown.service';
import { CalculatePackageSessionAllocationService } from '../services/calculate-package-session-allocation.service';
import { MoneyAmountService } from '../services/money-amount.service';
import { SessionEarningReviewService } from '../services/session-earning-review.service';
import { ApprovePractitionerSettlementService } from '../services/approve-practitioner-settlement.service';
import { RecordSettlementPayoutService } from '../services/record-settlement-payout.service';
import { WalletRepository } from '../repositories/wallet.repository';
import { PractitionerManualPayoutBalanceService } from '../services/practitioner-manual-payout-balance.service';
import { SettlementRepository } from '../repositories/settlement.repository';
import { SettlementPayoutRepository } from '../repositories/settlement-payout.repository';
import { PractitionerRecoveryService } from '../services/practitioner-recovery.service';
import { RefreshPractitionerWalletService } from '../services/refresh-practitioner-wallet.service';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { AccountingJournalPostingService } from '../services/accounting-journal-posting.service';
import { CalculatePractitionerPayoutConversionService } from '../services/calculate-practitioner-payout-conversion.service';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDatabase = databaseUrl ? describe : describe.skip;

describeIfDatabase('Financial Boundary & 3-Stage Accounting Workflow Integration Proofs (Scenarios A-G)', () => {
  const prisma = new PrismaService();
  const money = new MoneyAmountService();
  const mapper = new FinancialOperationsMapper();
  const ledgerRepository = new LedgerRepository(prisma);
  const walletRepository = new WalletRepository(prisma);
  const settlementRepository = new SettlementRepository(prisma);
  const settlementPayoutRepository = new SettlementPayoutRepository(prisma);
  const refreshWalletService = new RefreshPractitionerWalletService(
    prisma,
    ledgerRepository,
    walletRepository,
    money,
  );
  const transfer = new ApprovePractitionerSettlementService(ledgerRepository, walletRepository);
  const earningReviewService = new SessionEarningReviewService(
    prisma,
    ledgerRepository,
    new ExtractPaymentLedgerBreakdownService(money),
    new CalculatePackageSessionAllocationService(money),
    refreshWalletService,
    transfer,
    walletRepository,
  );
  const balanceService = new PractitionerManualPayoutBalanceService(walletRepository);
  const payoutService = new RecordSettlementPayoutService(
    prisma,
    settlementRepository,
    settlementPayoutRepository,
    ledgerRepository,
    { applyOpenRecoveriesToPayout: jest.fn().mockResolvedValue({ recoveredAmount: new Prisma.Decimal(0) }), applyRecoveryFromPayout: jest.fn().mockResolvedValue({ recoveredAmount: new Prisma.Decimal(0) }) } as unknown as PractitionerRecoveryService,
    refreshWalletService,
    mapper,
    { postPractitionerPayout: jest.fn().mockResolvedValue(undefined), postJournalForPayout: jest.fn().mockResolvedValue(undefined) } as unknown as AccountingJournalPostingService,
    new CalculatePractitionerPayoutConversionService(),
  );

  let egCountryId: string;
  let aeCountryId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const eg = await prisma.country.upsert({
      where: { isoCode: 'EG' },
      create: { isoCode: 'EG', name: 'Egypt', slug: 'egypt' },
      update: {},
    });
    const ae = await prisma.country.upsert({
      where: { isoCode: 'AE' },
      create: { isoCode: 'AE', name: 'UAE', slug: 'uae' },
      update: {},
    });
    egCountryId = eg.id;
    aeCountryId = ae.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Scenario A: Standard Same-Country Session Completion produces ZERO money movement', async () => {
    const suffix = randomUUID();
    const patientUserId = randomUUID();
    const practitionerUserId = randomUUID();
    const patientId = randomUUID();
    const practitionerId = randomUUID();
    const sessionId = randomUUID();
    const paymentId = randomUUID();
    const entitlementId = randomUUID();

    await prisma.user.createMany({
      data: [
        { id: patientUserId, displayName: `Patient Scenario A ${suffix}` },
        { id: practitionerUserId, displayName: `Practitioner Scenario A ${suffix}` },
      ],
    });
    await prisma.patientProfile.create({
      data: { id: patientId, userId: patientUserId, countryId: egCountryId },
    });
    await prisma.practitionerProfile.create({
      data: {
        id: practitionerId,
        userId: practitionerUserId,
        publicSlug: `prac-scen-a-${suffix}`,
        practitionerType: PractitionerType.OTHER,
        status: PractitionerStatus.DRAFT,
        countryId: egCountryId,
      },
    });
    await prisma.practitionerWallet.create({
      data: { practitionerId, currencyCode: 'EGP' },
    });

    await prisma.session.create({
      data: {
        id: sessionId,
        sessionCode: `SA-${sessionId.slice(0, 8)}`,
        patientId,
        practitionerId,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 30,
        status: SessionStatus.COMPLETED,
        scheduledStartAt: new Date('2026-08-05T09:00:00Z'),
        scheduledEndAt: new Date('2026-08-05T09:30:00Z'),
        provider: SessionProvider.DAILY,
        providerRoomId: `room-a-${suffix}`,
        earningEntitlementId: entitlementId,
        patientCountrySnapshot: 'EG',
        practitionerCountrySnapshot: 'EG',
        countryRelationshipSnapshot: 'SAME_COUNTRY',
        suggestedPractitionerPercentageSnapshot: new Prisma.Decimal(70.0),
      },
    });

    await prisma.payment.create({
      data: {
        id: paymentId,
        sessionId,
        patientId,
        practitionerId,
        paymentPurpose: PaymentPurpose.SESSION_BOOKING,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: 100,
        amountDiscount: 0,
        amountTotal: 100,
        amountFromWallet: 0,
        amountFromGateway: 100,
        currencyCode: 'EGP',
        capturedAt: new Date('2026-08-05T09:00:00Z'),
      },
    });

    const syncResult = await earningReviewService.syncForSessionCompletion({ sessionId });
    expect(syncResult).not.toBeNull();
    expect(syncResult?.reviewStatus).toBe(SessionEarningReviewStatus.PENDING_REVIEW);

    const review = await prisma.sessionEarningReview.findUniqueOrThrow({
      where: { id: syncResult!.reviewId },
    });

    expect(review.reviewStatus).toBe(SessionEarningReviewStatus.PENDING_REVIEW);
    expect(review.patientCountrySnapshot).toBe('EG');
    expect(review.practitionerCountrySnapshot).toBe('EG');
    expect(review.countryRelationshipSnapshot).toBe('SAME_COUNTRY');
    expect(review.suggestedPractitionerPercentage?.toString()).toBe('70');
    expect(review.suggestedPractitionerAmount.toString()).toBe('70');
    expect(review.suggestedPlatformAmount.toString()).toBe('30');

    // INVARIANT ASSERTION: ZERO wallet credit, ZERO earning ledger entries, ZERO payout!
    const wallet = await prisma.practitionerWallet.findFirstOrThrow({ where: { practitionerId } });
    expect(wallet.availableBalance.toString()).toBe('0');

    const ledgerCount = await prisma.ledgerEntry.count({
      where: { sessionEarningReviewId: review.id },
    });
    expect(ledgerCount).toBe(0);

    const settlementsCount = await prisma.practitionerSettlement.count({
      where: { sourceReviewId: review.id },
    });
    expect(settlementsCount).toBe(0);
  });

  it('Scenario B: Cross-Country Session Completion uses 50% split snapshot', async () => {
    const suffix = randomUUID();
    const patientUserId = randomUUID();
    const practitionerUserId = randomUUID();
    const patientId = randomUUID();
    const practitionerId = randomUUID();
    const sessionId = randomUUID();
    const paymentId = randomUUID();

    await prisma.user.createMany({
      data: [
        { id: patientUserId, displayName: `Patient Scenario B ${suffix}` },
        { id: practitionerUserId, displayName: `Practitioner Scenario B ${suffix}` },
      ],
    });
    await prisma.patientProfile.create({ data: { id: patientId, userId: patientUserId, countryId: egCountryId } });
    await prisma.practitionerProfile.create({
      data: {
        id: practitionerId,
        userId: practitionerUserId,
        publicSlug: `prac-scen-b-${suffix}`,
        practitionerType: PractitionerType.OTHER,
        status: PractitionerStatus.DRAFT,
        countryId: aeCountryId,
      },
    });

    await prisma.session.create({
      data: {
        id: sessionId,
        sessionCode: `SB-${sessionId.slice(0, 8)}`,
        patientId,
        practitionerId,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 30,
        status: SessionStatus.COMPLETED,
        scheduledStartAt: new Date('2026-08-05T10:00:00Z'),
        scheduledEndAt: new Date('2026-08-05T10:30:00Z'),
        provider: SessionProvider.DAILY,
        providerRoomId: `room-b-${suffix}`,
        earningEntitlementId: randomUUID(),
        patientCountrySnapshot: 'EG',
        practitionerCountrySnapshot: 'AE',
        countryRelationshipSnapshot: 'CROSS_COUNTRY',
        suggestedPractitionerPercentageSnapshot: new Prisma.Decimal(50.0),
      },
    });

    await prisma.payment.create({
      data: {
        id: paymentId,
        sessionId,
        patientId,
        practitionerId,
        paymentPurpose: PaymentPurpose.SESSION_BOOKING,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: 100,
        amountDiscount: 0,
        amountTotal: 100,
        amountFromWallet: 0,
        amountFromGateway: 100,
        currencyCode: 'EGP',
        capturedAt: new Date('2026-08-05T10:00:00Z'),
      },
    });

    const syncResult = await earningReviewService.syncForSessionCompletion({ sessionId });
    const review = await prisma.sessionEarningReview.findUniqueOrThrow({
      where: { id: syncResult!.reviewId },
    });

    expect(review.countryRelationshipSnapshot).toBe('CROSS_COUNTRY');
    expect(review.suggestedPractitionerPercentage?.toString()).toBe('50');
    expect(review.suggestedPractitionerAmount.toString()).toBe('50');
    expect(review.suggestedPlatformAmount.toString()).toBe('50');
  });

  it('Scenario C & D: Stage A Accountant Financial Decision & Stage B Internal Wallet Credit', async () => {
    const suffix = randomUUID();
    const patientUserId = randomUUID();
    const practitionerUserId = randomUUID();
    const accountantUserId = randomUUID();
    const patientId = randomUUID();
    const practitionerId = randomUUID();
    const sessionId = randomUUID();
    const paymentId = randomUUID();

    await prisma.user.createMany({
      data: [
        { id: patientUserId, displayName: `Patient Scenario CD ${suffix}` },
        { id: practitionerUserId, displayName: `Practitioner Scenario CD ${suffix}` },
        { id: accountantUserId, displayName: `Accountant CD ${suffix}` },
      ],
    });
    await prisma.patientProfile.create({ data: { id: patientId, userId: patientUserId, countryId: egCountryId } });
    await prisma.practitionerProfile.create({
      data: {
        id: practitionerId,
        userId: practitionerUserId,
        publicSlug: `prac-scen-cd-${suffix}`,
        practitionerType: PractitionerType.OTHER,
        status: PractitionerStatus.DRAFT,
        countryId: egCountryId,
      },
    });
    await prisma.practitionerWallet.create({
      data: { practitionerId, currencyCode: 'EGP' },
    });

    await prisma.session.create({
      data: {
        id: sessionId,
        sessionCode: `SCD-${sessionId.slice(0, 8)}`,
        patientId,
        practitionerId,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 30,
        status: SessionStatus.COMPLETED,
        scheduledStartAt: new Date('2026-08-05T11:00:00Z'),
        scheduledEndAt: new Date('2026-08-05T11:30:00Z'),
        provider: SessionProvider.DAILY,
        providerRoomId: `room-cd-${suffix}`,
        earningEntitlementId: randomUUID(),
        patientCountrySnapshot: 'EG',
        practitionerCountrySnapshot: 'EG',
        countryRelationshipSnapshot: 'SAME_COUNTRY',
        suggestedPractitionerPercentageSnapshot: new Prisma.Decimal(70.0),
      },
    });

    await prisma.payment.create({
      data: {
        id: paymentId,
        sessionId,
        patientId,
        practitionerId,
        paymentPurpose: PaymentPurpose.SESSION_BOOKING,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: 100,
        amountDiscount: 0,
        amountTotal: 100,
        amountFromWallet: 0,
        amountFromGateway: 100,
        currencyCode: 'EGP',
        capturedAt: new Date('2026-08-05T11:00:00Z'),
      },
    });

    const syncResult = await earningReviewService.syncForSessionCompletion({ sessionId });
    const reviewId = syncResult!.reviewId;

    // STAGE A: Accountant Financial Decision with Overrides & Adjustments
    const decisionInput = {
      reviewId,
      reviewerUserId: accountantUserId,
      accountantApprovedSourceAmount: '80.00',
      overrideReason: 'Higher tier rate approved by finance manager',
      adjustments: [
        {
          type: 'ADDITION',
          category: 'BONUS',
          description: 'Quality bonus',
          amount: '15.00',
          currencyCode: 'EGP',
          reason: 'Excellent patient feedback',
        },
        {
          type: 'DEDUCTION',
          category: 'PENALTY',
          description: 'Late start penalty',
          amount: '5.00',
          currencyCode: 'EGP',
          reason: 'Session started 5 minutes late',
        },
      ],
      internalReason: 'Approved with +15 bonus and -5 penalty',
    } as const;
    const [decisionResult, concurrentDecisionResult] = await Promise.all([
      earningReviewService.approveFinancialDecision(decisionInput),
      earningReviewService.approveFinancialDecision(decisionInput),
    ]);
    expect([decisionResult.wasAlreadyPosted, concurrentDecisionResult.wasAlreadyPosted].filter(Boolean)).toHaveLength(1);

    expect(decisionResult.item.reviewStatus).toBe(SessionEarningReviewStatus.DECISION_APPROVED);
    expect(decisionResult.item.accountantApprovedSourceAmount?.toString()).toBe('80');
    expect(decisionResult.item.accountingAdjustmentAmount?.toString()).toBe('10');
    expect(decisionResult.item.calculatedPractitionerAmount?.toString()).toBe('80');
    expect(decisionResult.item.finalPractitionerAmount?.toString()).toBe('80');
    expect(decisionResult.item.finalPlatformAmount?.toString()).toBe('20');

    const adjustmentRows = await prisma.practitionerEarningAdjustment.findMany({
      where: { sessionEarningReviewId: reviewId },
      orderBy: { createdAt: 'asc' },
    });
    expect(adjustmentRows).toHaveLength(2);
    expect(adjustmentRows[0].type).toBe('ADDITION');
    expect(adjustmentRows[0].amount.toString()).toBe('15');
    expect(adjustmentRows[1].type).toBe('DEDUCTION');
    expect(adjustmentRows[1].amount.toString()).toBe('5');
    expect(adjustmentRows[0].createdByUserId).toBe(accountantUserId);

    const replayedDecision = await earningReviewService.approveFinancialDecision({
      reviewId,
      reviewerUserId: accountantUserId,
    });
    expect(replayedDecision.wasAlreadyPosted).toBe(true);
    expect(await prisma.financialOperationIdempotency.count({
      where: { reviewId, operationType: 'RECORD_ACCOUNTANT_DECISION' },
    })).toBe(1);

    await expect(
      prisma.sessionEarningReview.delete({ where: { id: reviewId } }),
    ).rejects.toThrow();
    await expect(
      prisma.user.delete({ where: { id: accountantUserId } }),
    ).rejects.toThrow();

    // ASSERT STAGE A INVARIANT: ZERO wallet credit, ZERO earning ledger entry!
    const walletAfterStageA = await prisma.practitionerWallet.findFirstOrThrow({ where: { practitionerId } });
    expect(walletAfterStageA.availableBalance.toString()).toBe('0');
    const ledgerCountStageA = await prisma.ledgerEntry.count({ where: { sessionEarningReviewId: reviewId } });
    expect(ledgerCountStageA).toBe(0);

    // STAGE B: Internal Practitioner Wallet Credit
    const [walletCreditResult, concurrentWalletCreditResult] = await Promise.all([
      earningReviewService.creditPractitionerWallet({ reviewId, approvedByUserId: accountantUserId }),
      earningReviewService.creditPractitionerWallet({ reviewId, approvedByUserId: accountantUserId }),
    ]);
    expect([walletCreditResult.wasAlreadyPosted, concurrentWalletCreditResult.wasAlreadyPosted].filter(Boolean)).toHaveLength(1);

    expect(walletCreditResult.item.reviewStatus).toBe(SessionEarningReviewStatus.APPROVED);

    // ASSERT STAGE B EFFECTS: Exactly 1 PractitionerWallet credit & 1 PRACTITIONER_EARNING ledger entry!
    const walletAfterStageB = await prisma.practitionerWallet.findFirstOrThrow({ where: { practitionerId } });
    expect(walletAfterStageB.availableBalance.toString()).toBe('80');

    const ledgerEntriesStageB = await prisma.ledgerEntry.findMany({
      where: { sessionEarningReviewId: reviewId, entryType: 'PRACTITIONER_EARNING' },
    });
    expect(ledgerEntriesStageB).toHaveLength(1);
    expect(ledgerEntriesStageB[0].amount.toString()).toBe('80');
    expect(ledgerEntriesStageB[0].direction).toBe('CREDIT');
    const replayedWalletCredit = await earningReviewService.creditPractitionerWallet({
      reviewId,
      approvedByUserId: accountantUserId,
    });
    expect(replayedWalletCredit.wasAlreadyPosted).toBe(true);
    expect(await prisma.financialOperationIdempotency.count({
      where: { reviewId, operationType: 'CREDIT_PRACTITIONER_WALLET' },
    })).toBe(1);

    // ASSERT STAGE B INVARIANT: ZERO external settlement payout!
    const payoutCountStageB = await prisma.practitionerSettlementPayout.count({
      where: { practitionerId },
    });
    expect(payoutCountStageB).toBe(0);
  });

  it('Scenario E: Stage C Real-World Settlement Payout executes debit ledger entry', async () => {
    const suffix = randomUUID();
    const practitionerUserId = randomUUID();
    const practitionerId = randomUUID();
    const accountantUserId = randomUUID();

    await prisma.user.createMany({
      data: [
        { id: practitionerUserId, displayName: `Practitioner Scenario E ${suffix}` },
        { id: accountantUserId, displayName: `Accountant Scenario E ${suffix}` },
      ],
    });
    await prisma.practitionerProfile.create({
      data: {
        id: practitionerId,
        userId: practitionerUserId,
        publicSlug: `prac-scen-e-${suffix}`,
        practitionerType: PractitionerType.OTHER,
        status: PractitionerStatus.DRAFT,
      },
    });

    const wallet = await prisma.practitionerWallet.create({
      data: { practitionerId, currencyCode: 'EGP', availableBalance: new Prisma.Decimal(200), reservedBalance: new Prisma.Decimal(200), lifetimeEarned: new Prisma.Decimal(200) },
    });

    const batch = await prisma.settlementBatch.upsert({
      where: {
        periodYear_periodMonth_currencyCode: {
          periodYear: 2026,
          periodMonth: 8,
          currencyCode: 'EGP',
        },
      },
      create: {
        periodYear: 2026,
        periodMonth: 8,
        currencyCode: 'EGP',
        slug: `batch-e-${suffix}`,
        status: 'GENERATED',
      },
      update: {},
    });

    const settlement = await prisma.practitionerSettlement.create({
      data: {
        batchId: batch.id,
        practitionerId,
        walletId: wallet.id,
        amountGross: new Prisma.Decimal(200),
        amountAdjustments: new Prisma.Decimal(0),
        amountNet: new Prisma.Decimal(200),
        currencyCode: 'EGP',
        originalAmount: new Prisma.Decimal(200),
        originalCurrencyCode: 'EGP',
        walletCurrencyCode: 'EGP',
        convertedAmount: new Prisma.Decimal(200),
        finalWalletCredit: new Prisma.Decimal(200),
        status: 'CREDITED',
      },
    });

    await prisma.ledgerEntry.create({
      data: {
        practitionerId,
        settlementId: settlement.id,
        actorUserId: accountantUserId,
        actorType: 'USER',
        entryType: 'PRACTITIONER_EARNING',
        direction: 'CREDIT',
        amount: new Prisma.Decimal(200),
        currencyCode: 'EGP',
        balanceBucket: 'AVAILABLE',
        referenceType: 'SETTLEMENT',
        referenceId: settlement.id,
        description: 'Test settlement credit',
      },
    });

    const settlementWithBatch = await prisma.practitionerSettlement.findUniqueOrThrow({
      where: { id: settlement.id },
      include: {
        batch: {
          select: {
            id: true,
            slug: true,
            periodYear: true,
            periodMonth: true,
            currencyCode: true,
            status: true,
          },
        },
      },
    });

    const payoutResult = await payoutService.execute({
      settlement: settlementWithBatch,
      payoutMethod: 'MANUAL_BANK_TRANSFER',
      payoutSource: 'MANUAL_EXCEPTION',
      amountPaid: new Prisma.Decimal(200),
      processedByUserId: accountantUserId,
      externalPayoutRef: `TRX-${suffix.slice(0, 8)}`,
      notes: 'Real-world bank payout completed',
    });

    expect(payoutResult.payoutRecord.id).toBeDefined();

    const payoutLedger = await prisma.ledgerEntry.findMany({
      where: { settlementId: settlement.id, entryType: 'SETTLEMENT_PAYOUT' },
    });
    expect(payoutLedger).toHaveLength(1);
    expect(payoutLedger[0].direction).toBe('DEBIT');
    expect(payoutLedger[0].amount.toString()).toBe('200');
  });

  it('Scenario F: Unresolved Country Fallback flags review for manual accountant review', async () => {
    const suffix = randomUUID();
    const patientUserId = randomUUID();
    const practitionerUserId = randomUUID();
    const patientId = randomUUID();
    const practitionerId = randomUUID();
    const sessionId = randomUUID();
    const paymentId = randomUUID();

    await prisma.user.createMany({
      data: [
        { id: patientUserId, displayName: `Patient Scenario F ${suffix}` },
        { id: practitionerUserId, displayName: `Practitioner Scenario F ${suffix}` },
      ],
    });
    await prisma.patientProfile.create({ data: { id: patientId, userId: patientUserId, countryId: null } });
    await prisma.practitionerProfile.create({
      data: {
        id: practitionerId,
        userId: practitionerUserId,
        publicSlug: `prac-scen-f-${suffix}`,
        practitionerType: PractitionerType.OTHER,
        status: PractitionerStatus.DRAFT,
        countryId: null,
      },
    });

    await prisma.session.create({
      data: {
        id: sessionId,
        sessionCode: `SF-${sessionId.slice(0, 8)}`,
        patientId,
        practitionerId,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 30,
        status: SessionStatus.COMPLETED,
        scheduledStartAt: new Date('2026-08-05T12:00:00Z'),
        scheduledEndAt: new Date('2026-08-05T12:30:00Z'),
        provider: SessionProvider.DAILY,
        providerRoomId: `room-f-${suffix}`,
        earningEntitlementId: randomUUID(),
        patientCountrySnapshot: null,
        practitionerCountrySnapshot: null,
        countryRelationshipSnapshot: null,
      },
    });

    await prisma.payment.create({
      data: {
        id: paymentId,
        sessionId,
        patientId,
        practitionerId,
        paymentPurpose: PaymentPurpose.SESSION_BOOKING,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: 100,
        amountDiscount: 0,
        amountTotal: 100,
        amountFromWallet: 0,
        amountFromGateway: 100,
        currencyCode: 'USD',
        capturedAt: new Date('2026-08-05T12:00:00Z'),
      },
    });

    const syncResult = await earningReviewService.syncForSessionCompletion({ sessionId });
    const review = await prisma.sessionEarningReview.findUniqueOrThrow({
      where: { id: syncResult!.reviewId },
    });

    expect(review.countryRelationshipSnapshot).toBe('UNRESOLVED');
    expect(review.suggestedPractitionerPercentage).toBeNull();
    expect(review.suggestedPractitionerAmount.toString()).toBe('0');
    expect(review.reviewStatus).toBe(SessionEarningReviewStatus.PENDING_REVIEW);
  });

  it('Scenario G: Single entitlement ID preserved across replacement session lifecycle', async () => {
    const suffix = randomUUID();
    const patientUserId = randomUUID();
    const practitionerUserId = randomUUID();
    const patientId = randomUUID();
    const practitionerId = randomUUID();
    const paymentId = randomUUID();
    const originalSessionId = randomUUID();
    const replacementSessionId = randomUUID();
    const singleEntitlementId = randomUUID();

    await prisma.user.createMany({
      data: [
        { id: patientUserId, displayName: `Patient Scenario G ${suffix}` },
        { id: practitionerUserId, displayName: `Practitioner Scenario G ${suffix}` },
      ],
    });
    await prisma.patientProfile.create({ data: { id: patientId, userId: patientUserId } });
    await prisma.practitionerProfile.create({
      data: {
        id: practitionerId,
        userId: practitionerUserId,
        publicSlug: `prac-scen-g-${suffix}`,
        practitionerType: PractitionerType.OTHER,
        status: PractitionerStatus.DRAFT,
      },
    });

    const createSessionData = (id: string, originalId: string | null) => ({
      id,
      sessionCode: `SG-${id.slice(0, 8)}`,
      patientId,
      practitionerId,
      flowType: SessionFlowType.SCHEDULED,
      sessionMode: SessionMode.VIDEO,
      durationMinutes: 30,
      status: SessionStatus.COMPLETED,
      scheduledStartAt: new Date('2026-08-05T13:00:00Z'),
      scheduledEndAt: new Date('2026-08-05T13:30:00Z'),
      provider: SessionProvider.DAILY,
      providerRoomId: `room-g-${id}`,
      originalSessionId: originalId,
      earningEntitlementId: singleEntitlementId,
    });

    await prisma.session.create({ data: createSessionData(originalSessionId, null) });
    await prisma.session.create({ data: createSessionData(replacementSessionId, originalSessionId) });

    await prisma.payment.create({
      data: {
        id: paymentId,
        sessionId: originalSessionId,
        patientId,
        practitionerId,
        paymentPurpose: PaymentPurpose.SESSION_BOOKING,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: 100,
        amountDiscount: 0,
        amountTotal: 100,
        amountFromWallet: 0,
        amountFromGateway: 100,
        currencyCode: 'USD',
        capturedAt: new Date('2026-08-05T13:00:00Z'),
      },
    });

    const origSync = await earningReviewService.syncForSessionCompletion({ sessionId: originalSessionId });
    await prisma.sessionEarningReview.update({
      where: { id: origSync!.reviewId },
      data: {
        reviewStatus: SessionEarningReviewStatus.EXCLUDED_FROM_PAYOUT,
        internalReason: 'SUPERSEDED_BY_REPLACEMENT',
      },
    });

    const repSync = await earningReviewService.syncForSessionCompletion({ sessionId: replacementSessionId });
    expect(repSync?.reviewId).toBeDefined();

    const pendingReviews = await prisma.sessionEarningReview.findMany({
      where: { earningEntitlementId: singleEntitlementId, reviewStatus: SessionEarningReviewStatus.PENDING_REVIEW },
    });

    expect(pendingReviews).toHaveLength(1);
    expect(pendingReviews[0].sessionId).toBe(replacementSessionId);
    expect(pendingReviews[0].earningEntitlementId).toBe(singleEntitlementId);
  });
});
