import { FinancialOperationsPaymentRepository } from '../repositories/financial-operations-payment.repository';
import { PractitionerRecoveryRepository } from '../repositories/practitioner-recovery.repository';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { PractitionerManualPayoutRepository } from '../repositories/practitioner-manual-payout.repository';
import { PractitionerManualPayoutBalanceService } from '../services/practitioner-manual-payout-balance.service';
import { PractitionerManualPayoutService } from '../services/practitioner-manual-payout.service';
import { PostRefundLedgerEntriesUseCase } from '../use-cases/post-refund-ledger-entries.use-case';
import { AccountingLedgerAccountService } from '@modules/financial-operations/services/accounting-ledger-account.service';
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
import { SettlementRepository } from '../repositories/settlement.repository';
import { SettlementPayoutRepository } from '../repositories/settlement-payout.repository';
import { PractitionerRecoveryService } from '../services/practitioner-recovery.service';
import { RefreshPractitionerWalletService } from '../services/refresh-practitioner-wallet.service';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { AccountingJournalPostingService } from '../services/accounting-journal-posting.service';
import { CalculatePractitionerPayoutConversionService } from '../services/calculate-practitioner-payout-conversion.service';
import { RequestPaymentRefundUseCase } from '@modules/payments/use-cases/request-payment-refund.use-case';
import { PaymentRepository } from '@modules/payments/repositories/payment.repository';
import { ValidatePaymentStatusTransitionService } from '@modules/payments/services/validate-payment-status-transition.service';
import { ValidateRefundEligibilityService } from '@modules/payments/services/validate-refund-eligibility.service';
import { PaymentMapper } from '@modules/payments/mappers/payment.mapper';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { CustomerWalletRepository } from '@modules/customer-wallets/repositories/customer-wallet.repository';
import { CustomerWalletEntryRepository } from '@modules/customer-wallets/repositories/customer-wallet-entry.repository';
import { CustomerWalletReservationRepository } from '@modules/customer-wallets/repositories/customer-wallet-reservation.repository';
import { RefundDestination } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
const isolated = databaseUrl ? new URL(databaseUrl) : null;
if (
  isolated &&
  (!['127.0.0.1', 'localhost'].includes(isolated.hostname) ||
    !['5432', '55438'].includes(isolated.port) ||
    !/^\/sawiyaa_(lifecycle_test|redteam_[a-z0-9_]+)$/.test(isolated.pathname))
)
  throw new Error(
    'This financial proof requires an isolated lifecycle/red-team database',
  );
const describeIfDatabase = isolated ? describe : describe.skip;

describeIfDatabase(
  'Financial Boundary & 3-Stage Accounting Workflow Integration Proofs (Scenarios A-G)',
  () => {
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
    const journals = new AccountingJournalPostingService(
      prisma,
      money,
      new AccountingLedgerAccountService(prisma),
    );
    const recovery = new PractitionerRecoveryService(
      prisma,
      new PractitionerRecoveryRepository(prisma),
    );
    const manualPayoutRepository = new PractitionerManualPayoutRepository(
      prisma,
    );
    const balances = new PractitionerManualPayoutBalanceService(
      prisma,
      new FinancialOperationsPractitionerRepository(prisma),
      manualPayoutRepository,
      recovery,
    );
    const reverseRefund = new PostRefundLedgerEntriesUseCase(
      prisma,
      new FinancialOperationsPaymentRepository(prisma),
      ledgerRepository,
      new ExtractPaymentLedgerBreakdownService(money),
      balances,
      recovery,
      refreshWalletService,
      money,
      journals,
    );
    const transfer = new ApprovePractitionerSettlementService(
      ledgerRepository,
      walletRepository,
    );
    const earningReviewService = new SessionEarningReviewService(
      prisma,
      ledgerRepository,
      new ExtractPaymentLedgerBreakdownService(money),
      new CalculatePackageSessionAllocationService(money),
      refreshWalletService,
      transfer,
      new AccountingJournalPostingService(
        prisma,
        money,
        new AccountingLedgerAccountService(prisma),
      ),
      walletRepository,
    );
    const payoutService = new RecordSettlementPayoutService(
      prisma,
      settlementRepository,
      settlementPayoutRepository,
      ledgerRepository,
      recovery,
      refreshWalletService,
      mapper,
      journals,
      new CalculatePractitionerPayoutConversionService(),
    );
    const manualPayoutService = new PractitionerManualPayoutService(
      prisma,
      manualPayoutRepository,
      balances,
      ledgerRepository,
      recovery,
      refreshWalletService,
      journals,
    );
    const customerWalletAccountingService = new CustomerWalletAccountingService(
      prisma,
      new CustomerWalletRepository(prisma),
      new CustomerWalletEntryRepository(prisma),
      new CustomerWalletReservationRepository(prisma),
    );
    const requestWalletRefund = new RequestPaymentRefundUseCase(
      prisma,
      new PaymentRepository(prisma),
      { get: () => undefined } as never,
      new ValidatePaymentStatusTransitionService(),
      new ValidateRefundEligibilityService(),
      reverseRefund,
      earningReviewService,
      customerWalletAccountingService,
      {
        markSessionRefunded: async () => undefined,
        markSessionRefundPending: async () => undefined,
      } as never,
      {
        notifyRefundSucceeded: async () => undefined,
        notifyRefundFailed: async () => undefined,
        notifyRefundRequested: async () => undefined,
      } as never,
      new PaymentMapper(),
      { info: () => undefined, warn: () => undefined } as never,
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
          {
            id: practitionerUserId,
            displayName: `Practitioner Scenario A ${suffix}`,
          },
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

      const syncResult = await earningReviewService.syncForSessionCompletion({
        sessionId,
      });
      expect(syncResult).not.toBeNull();
      expect(syncResult?.reviewStatus).toBe(
        SessionEarningReviewStatus.PENDING_REVIEW,
      );

      const review = await prisma.sessionEarningReview.findUniqueOrThrow({
        where: { id: syncResult!.reviewId },
      });

      expect(review.reviewStatus).toBe(
        SessionEarningReviewStatus.PENDING_REVIEW,
      );
      expect(review.patientCountrySnapshot).toBe('EG');
      expect(review.practitionerCountrySnapshot).toBe('EG');
      expect(review.countryRelationshipSnapshot).toBe('SAME_COUNTRY');
      expect(review.suggestedPractitionerPercentage?.toString()).toBe('70');
      expect(review.suggestedPractitionerAmount.toString()).toBe('70');
      expect(review.suggestedPlatformAmount.toString()).toBe('30');

      // INVARIANT ASSERTION: ZERO wallet credit, ZERO earning ledger entries, ZERO payout!
      const wallet = await prisma.practitionerWallet.findFirstOrThrow({
        where: { practitionerId },
      });
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
          {
            id: practitionerUserId,
            displayName: `Practitioner Scenario B ${suffix}`,
          },
        ],
      });
      await prisma.patientProfile.create({
        data: { id: patientId, userId: patientUserId, countryId: egCountryId },
      });
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

      const syncResult = await earningReviewService.syncForSessionCompletion({
        sessionId,
      });
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
          {
            id: practitionerUserId,
            displayName: `Practitioner Scenario CD ${suffix}`,
          },
          { id: accountantUserId, displayName: `Accountant CD ${suffix}` },
        ],
      });
      await prisma.patientProfile.create({
        data: { id: patientId, userId: patientUserId, countryId: egCountryId },
      });
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

      const syncResult = await earningReviewService.syncForSessionCompletion({
        sessionId,
      });
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
      expect(
        [
          decisionResult.wasAlreadyPosted,
          concurrentDecisionResult.wasAlreadyPosted,
        ].filter(Boolean),
      ).toHaveLength(1);

      expect(decisionResult.item.reviewStatus).toBe(
        SessionEarningReviewStatus.DECISION_APPROVED,
      );
      expect(
        decisionResult.item.accountantApprovedSourceAmount?.toString(),
      ).toBe('80');
      expect(decisionResult.item.accountingAdjustmentAmount?.toString()).toBe(
        '10',
      );
      expect(decisionResult.item.calculatedPractitionerAmount?.toString()).toBe(
        '80',
      );
      expect(decisionResult.item.finalPractitionerAmount?.toString()).toBe(
        '80',
      );
      expect(decisionResult.item.finalPlatformAmount?.toString()).toBe('20');

      const adjustmentRows =
        await prisma.practitionerEarningAdjustment.findMany({
          where: { sessionEarningReviewId: reviewId },
          orderBy: { createdAt: 'asc' },
        });
      expect(adjustmentRows).toHaveLength(2);
      expect(adjustmentRows[0].type).toBe('ADDITION');
      expect(adjustmentRows[0].amount.toString()).toBe('15');
      expect(adjustmentRows[1].type).toBe('DEDUCTION');
      expect(adjustmentRows[1].amount.toString()).toBe('5');
      expect(adjustmentRows[0].createdByUserId).toBe(accountantUserId);

      const replayedDecision =
        await earningReviewService.approveFinancialDecision({
          reviewId,
          reviewerUserId: accountantUserId,
        });
      expect(replayedDecision.wasAlreadyPosted).toBe(true);
      expect(
        await prisma.financialOperationIdempotency.count({
          where: { reviewId, operationType: 'RECORD_ACCOUNTANT_DECISION' },
        }),
      ).toBe(1);

      await expect(
        prisma.sessionEarningReview.delete({ where: { id: reviewId } }),
      ).rejects.toThrow();
      await expect(
        prisma.user.delete({ where: { id: accountantUserId } }),
      ).rejects.toThrow();

      // ASSERT STAGE A INVARIANT: ZERO wallet credit, ZERO earning ledger entry!
      const walletAfterStageA =
        await prisma.practitionerWallet.findFirstOrThrow({
          where: { practitionerId },
        });
      expect(walletAfterStageA.availableBalance.toString()).toBe('0');
      const ledgerCountStageA = await prisma.ledgerEntry.count({
        where: { sessionEarningReviewId: reviewId },
      });
      expect(ledgerCountStageA).toBe(0);

      // STAGE B: Internal Practitioner Wallet Credit
      const [walletCreditResult, concurrentWalletCreditResult] =
        await Promise.all([
          earningReviewService.creditPractitionerWallet({
            reviewId,
            approvedByUserId: accountantUserId,
          }),
          earningReviewService.creditPractitionerWallet({
            reviewId,
            approvedByUserId: accountantUserId,
          }),
        ]);
      expect(
        [
          walletCreditResult.wasAlreadyPosted,
          concurrentWalletCreditResult.wasAlreadyPosted,
        ].filter(Boolean),
      ).toHaveLength(1);

      expect(walletCreditResult.item.reviewStatus).toBe(
        SessionEarningReviewStatus.APPROVED,
      );

      // ASSERT STAGE B EFFECTS: Exactly 1 PractitionerWallet credit & 1 PRACTITIONER_EARNING ledger entry!
      const walletAfterStageB =
        await prisma.practitionerWallet.findFirstOrThrow({
          where: { practitionerId },
        });
      expect(walletAfterStageB.availableBalance.toString()).toBe('80');

      const ledgerEntriesStageB = await prisma.ledgerEntry.findMany({
        where: {
          sessionEarningReviewId: reviewId,
          entryType: 'PRACTITIONER_EARNING',
        },
      });
      expect(ledgerEntriesStageB).toHaveLength(1);
      expect(ledgerEntriesStageB[0].amount.toString()).toBe('80');
      expect(ledgerEntriesStageB[0].direction).toBe('CREDIT');
      const replayedWalletCredit =
        await earningReviewService.creditPractitionerWallet({
          reviewId,
          approvedByUserId: accountantUserId,
        });
      expect(replayedWalletCredit.wasAlreadyPosted).toBe(true);
      expect(
        await prisma.financialOperationIdempotency.count({
          where: { reviewId, operationType: 'CREDIT_PRACTITIONER_WALLET' },
        }),
      ).toBe(1);

      // ASSERT STAGE B INVARIANT: ZERO external settlement payout!
      const payoutCountStageB = await prisma.practitionerSettlementPayout.count(
        {
          where: { practitionerId },
        },
      );
      expect(payoutCountStageB).toBe(0);

      // A second earning in the same monthly batch must retain its own settlement.
      const oldSession = await prisma.session.findUniqueOrThrow({
        where: { id: sessionId },
      });
      const oldPayment = await prisma.payment.findUniqueOrThrow({
        where: { id: paymentId },
      });
      const secondSessionId = randomUUID();
      await prisma.session.create({
        data: {
          ...oldSession,
          id: secondSessionId,
          sessionCode: 'SECOND-' + secondSessionId.slice(0, 8),
          providerRoomId: null,
          earningEntitlementId: randomUUID(),
          schedulePolicySnapshotJson: Prisma.JsonNull,
          pricingPolicySnapshotJson: Prisma.JsonNull,
        },
      });
      await prisma.payment.create({
        data: {
          ...oldPayment,
          id: randomUUID(),
          sessionId: secondSessionId,
          metadataJson: Prisma.JsonNull,
        },
      });
      const second = await earningReviewService.syncForSessionCompletion({
        sessionId: secondSessionId,
      });
      await earningReviewService.approveFinancialDecision({
        reviewId: second!.reviewId,
        reviewerUserId: accountantUserId,
      });
      await earningReviewService.creditPractitionerWallet({
        reviewId: second!.reviewId,
        approvedByUserId: accountantUserId,
      });
      const settlements = await prisma.practitionerSettlement.findMany({
        where: {
          practitionerId,
          sourceReviewId: { in: [reviewId, second!.reviewId] },
        },
      });
      expect(settlements).toHaveLength(2);
      expect(new Set(settlements.map((item) => item.sourceReviewId)).size).toBe(
        2,
      );
      const refund = await prisma.refund.create({
        data: {
          paymentId,
          sessionId,
          refundType: 'FULL',
          status: 'SUCCEEDED',
          destination: 'CUSTOMER_WALLET',
          amount: '100',
          currencyCode: 'EGP',
          processedAt: new Date(),
        },
      });
      const results = await Promise.all([
        reverseRefund.execute({ refundId: refund.id }),
        reverseRefund.execute({ refundId: refund.id }),
      ]);
      expect(results.filter((r) => r.wasAlreadyPosted)).toHaveLength(1);
      const balanceAfterRefund =
        await prisma.practitionerWallet.findFirstOrThrow({
          where: { practitionerId },
        });
      expect(balanceAfterRefund.availableBalance.toFixed(2)).toBe('70.00');
      const reversals = await prisma.ledgerEntry.findMany({
        where: {
          referenceId: refund.id,
          entryType: 'REFUND_PRACTITIONER_REVERSAL',
        },
      });
      expect(reversals).toHaveLength(1);
      expect(reversals[0].amount.toFixed(2)).toBe('80.00');
      expect(reversals[0].settlementId).toBe(
        ledgerEntriesStageB[0].settlementId,
      );
      const posted = await prisma.journalEntry.findMany({
        where: {
          OR: [
            { sourceId: paymentId },
            { sourceId: reviewId },
            { sourceId: refund.id },
            { sourceId: refund.id + ':wallet' },
          ],
        },
        include: { lines: true },
      });
      expect(posted).toHaveLength(4);
      for (const entry of posted) {
        const signed = entry.lines.reduce(
          (sum, line) =>
            line.direction === 'DEBIT'
              ? sum.add(line.amount)
              : sum.sub(line.amount),
          new Prisma.Decimal(0),
        );
        expect(signed.toFixed(2)).toBe('0.00');
      }
    });

    it('Scenario E: Stage C Real-World Settlement Payout executes debit ledger entry', async () => {
      const suffix = randomUUID();
      const practitionerUserId = randomUUID();
      const practitionerId = randomUUID();
      const accountantUserId = randomUUID();

      await prisma.user.createMany({
        data: [
          {
            id: practitionerUserId,
            displayName: `Practitioner Scenario E ${suffix}`,
          },
          {
            id: accountantUserId,
            displayName: `Accountant Scenario E ${suffix}`,
          },
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
        data: {
          practitionerId,
          currencyCode: 'EGP',
          availableBalance: new Prisma.Decimal(200),
          reservedBalance: new Prisma.Decimal(200),
          lifetimeEarned: new Prisma.Decimal(200),
        },
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

      const settlementWithBatch =
        await prisma.practitionerSettlement.findUniqueOrThrow({
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

      const payoutInput = {
        settlement: settlementWithBatch,
        payoutMethod: 'MANUAL_BANK_TRANSFER',
        payoutSource: 'MANUAL_EXCEPTION',
        amountPaid: new Prisma.Decimal(200),
        processedByUserId: accountantUserId,
        externalPayoutRef: `TRX-${suffix.slice(0, 8)}`,
        notes: 'Real-world bank payout completed',
      } as const;
      const [payoutResult, replay] = await Promise.all([
        payoutService.execute(payoutInput),
        payoutService.execute(payoutInput),
      ]);
      expect(
        [payoutResult.wasAlreadyRecorded, replay.wasAlreadyRecorded].filter(
          Boolean,
        ),
      ).toHaveLength(1);

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
          {
            id: practitionerUserId,
            displayName: `Practitioner Scenario F ${suffix}`,
          },
        ],
      });
      await prisma.patientProfile.create({
        data: { id: patientId, userId: patientUserId, countryId: null },
      });
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

      const syncResult = await earningReviewService.syncForSessionCompletion({
        sessionId,
      });
      const review = await prisma.sessionEarningReview.findUniqueOrThrow({
        where: { id: syncResult!.reviewId },
      });

      expect(review.countryRelationshipSnapshot).toBe('UNRESOLVED');
      expect(review.suggestedPractitionerPercentage).toBeNull();
      expect(review.suggestedPractitionerAmount.toString()).toBe('0');
      expect(review.reviewStatus).toBe(
        SessionEarningReviewStatus.PENDING_REVIEW,
      );
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
          {
            id: practitionerUserId,
            displayName: `Practitioner Scenario G ${suffix}`,
          },
        ],
      });
      await prisma.patientProfile.create({
        data: { id: patientId, userId: patientUserId },
      });
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

      await prisma.session.create({
        data: createSessionData(originalSessionId, null),
      });
      await prisma.session.create({
        data: createSessionData(replacementSessionId, originalSessionId),
      });

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

      const origSync = await earningReviewService.syncForSessionCompletion({
        sessionId: originalSessionId,
      });
      await prisma.sessionEarningReview.update({
        where: { id: origSync!.reviewId },
        data: {
          reviewStatus: SessionEarningReviewStatus.EXCLUDED_FROM_PAYOUT,
          internalReason: 'SUPERSEDED_BY_REPLACEMENT',
        },
      });

      const repSync = await earningReviewService.syncForSessionCompletion({
        sessionId: replacementSessionId,
      });
      expect(repSync?.reviewId).toBeDefined();

      const pendingReviews = await prisma.sessionEarningReview.findMany({
        where: {
          earningEntitlementId: singleEntitlementId,
          reviewStatus: SessionEarningReviewStatus.PENDING_REVIEW,
        },
      });

      expect(pendingReviews).toHaveLength(1);
      expect(pendingReviews[0].sessionId).toBe(replacementSessionId);
      expect(pendingReviews[0].earningEntitlementId).toBe(singleEntitlementId);
    });

    it('Race: manual and settlement payouts cannot consume the same 400 EGP balance', async () => {
      const batch = await prisma.settlementBatch.upsert({
        where: {
          periodYear_periodMonth_currencyCode: {
            periodYear: 2099,
            periodMonth: 1,
            currencyCode: 'EGP',
          },
        },
        create: {
          periodYear: 2099,
          periodMonth: 1,
          currencyCode: 'EGP',
          slug: 'red-team-payout-collision-2099-01-egp',
          status: 'GENERATED',
        },
        update: {},
      });

      for (let iteration = 0; iteration < 10; iteration += 1) {
        const suffix = randomUUID();
        const practitionerUserId = randomUUID();
        const practitionerId = randomUUID();
        const accountantUserId = randomUUID();
        await prisma.user.createMany({
          data: [
            { id: practitionerUserId, displayName: `Payout race ${suffix}` },
            { id: accountantUserId, displayName: `Payout operator ${suffix}` },
          ],
        });
        await prisma.practitionerProfile.create({
          data: {
            id: practitionerId,
            userId: practitionerUserId,
            publicSlug: `payout-race-${suffix}`,
            practitionerType: PractitionerType.OTHER,
            status: PractitionerStatus.DRAFT,
          },
        });
        const wallet = await prisma.practitionerWallet.create({
          data: {
            practitionerId,
            currencyCode: 'EGP',
            availableBalance: new Prisma.Decimal(400),
            reservedBalance: new Prisma.Decimal(400),
            lifetimeEarned: new Prisma.Decimal(400),
          },
        });
        const settlement = await prisma.practitionerSettlement.create({
          data: {
            batchId: batch.id,
            practitionerId,
            walletId: wallet.id,
            amountGross: new Prisma.Decimal(400),
            amountAdjustments: new Prisma.Decimal(0),
            amountNet: new Prisma.Decimal(400),
            currencyCode: 'EGP',
            originalAmount: new Prisma.Decimal(400),
            originalCurrencyCode: 'EGP',
            walletCurrencyCode: 'EGP',
            convertedAmount: new Prisma.Decimal(400),
            finalWalletCredit: new Prisma.Decimal(400),
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
            amount: new Prisma.Decimal(400),
            currencyCode: 'EGP',
            balanceBucket: 'AVAILABLE',
            referenceType: 'SETTLEMENT',
            referenceId: settlement.id,
            description: 'Payout race credit',
          },
        });
        const lockedSettlement =
          await prisma.practitionerSettlement.findUniqueOrThrow({
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
        const results = await Promise.allSettled([
          manualPayoutService.record({
            practitionerId,
            settlementId: settlement.id,
            currencyCode: 'EGP',
            amountPaid: '400.00',
            transferReference: `manual-race-${suffix}`,
            recordedByUserId: accountantUserId,
          }),
          payoutService.execute({
            settlement: lockedSettlement,
            payoutMethod: 'MANUAL_BANK_TRANSFER',
            payoutSource: 'MANUAL_EXCEPTION',
            amountPaid: new Prisma.Decimal(400),
            processedByUserId: accountantUserId,
            externalPayoutRef: `settlement-race-${suffix}`,
          }),
        ]);
        expect(
          results.filter((result) => result.status === 'fulfilled'),
        ).toHaveLength(1);
        const [settlementAfter, payoutEntries] = await Promise.all([
          prisma.practitionerSettlement.findUniqueOrThrow({
            where: { id: settlement.id },
          }),
          prisma.ledgerEntry.findMany({
            where: {
              settlementId: settlement.id,
              entryType: 'SETTLEMENT_PAYOUT',
            },
          }),
        ]);
        expect(settlementAfter.amountPaidTotal.toFixed(2)).toBe('400.00');
        expect(payoutEntries).toHaveLength(1);
        expect(payoutEntries[0].amount.toFixed(2)).toBe('400.00');
      }
    });

    it('Race: 250 EGP manual and 300 EGP settlement payouts never consume more than 400 EGP', async () => {
      const batch = await prisma.settlementBatch.upsert({
        where: {
          periodYear_periodMonth_currencyCode: {
            periodYear: 2099,
            periodMonth: 2,
            currencyCode: 'EGP',
          },
        },
        create: {
          periodYear: 2099,
          periodMonth: 2,
          currencyCode: 'EGP',
          slug: 'red-team-payout-collision-2099-02-egp',
          status: 'GENERATED',
        },
        update: {},
      });
      for (let iteration = 0; iteration < 10; iteration += 1) {
        const suffix = randomUUID();
        const practitionerId = randomUUID();
        const practitionerUserId = randomUUID();
        const accountantUserId = randomUUID();
        await prisma.user.createMany({
          data: [
            {
              id: practitionerUserId,
              displayName: `Payout split race ${suffix}`,
            },
            {
              id: accountantUserId,
              displayName: `Payout split operator ${suffix}`,
            },
          ],
        });
        await prisma.practitionerProfile.create({
          data: {
            id: practitionerId,
            userId: practitionerUserId,
            publicSlug: `payout-split-race-${suffix}`,
            practitionerType: PractitionerType.OTHER,
            status: PractitionerStatus.DRAFT,
          },
        });
        const wallet = await prisma.practitionerWallet.create({
          data: {
            practitionerId,
            currencyCode: 'EGP',
            availableBalance: new Prisma.Decimal(400),
            reservedBalance: new Prisma.Decimal(400),
            lifetimeEarned: new Prisma.Decimal(400),
          },
        });
        const settlement = await prisma.practitionerSettlement.create({
          data: {
            batchId: batch.id,
            practitionerId,
            walletId: wallet.id,
            amountGross: new Prisma.Decimal(400),
            amountAdjustments: new Prisma.Decimal(0),
            amountNet: new Prisma.Decimal(400),
            currencyCode: 'EGP',
            originalAmount: new Prisma.Decimal(400),
            originalCurrencyCode: 'EGP',
            walletCurrencyCode: 'EGP',
            convertedAmount: new Prisma.Decimal(400),
            finalWalletCredit: new Prisma.Decimal(400),
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
            amount: new Prisma.Decimal(400),
            currencyCode: 'EGP',
            balanceBucket: 'AVAILABLE',
            referenceType: 'SETTLEMENT',
            referenceId: settlement.id,
            description: 'Payout split race credit',
          },
        });
        const settlementWithBatch =
          await prisma.practitionerSettlement.findUniqueOrThrow({
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
        await Promise.allSettled([
          manualPayoutService.record({
            practitionerId,
            settlementId: settlement.id,
            currencyCode: 'EGP',
            amountPaid: '250.00',
            transferReference: `manual-split-${suffix}`,
            recordedByUserId: accountantUserId,
          }),
          payoutService.execute({
            settlement: settlementWithBatch,
            payoutMethod: 'MANUAL_BANK_TRANSFER',
            payoutSource: 'MANUAL_EXCEPTION',
            amountPaid: new Prisma.Decimal(300),
            processedByUserId: accountantUserId,
            externalPayoutRef: `settlement-split-${suffix}`,
          }),
        ]);
        const [
          settlementAfter,
          ledger,
          manualPayouts,
          settlementPayouts,
          walletAfter,
          journals,
        ] = await Promise.all([
          prisma.practitionerSettlement.findUniqueOrThrow({
            where: { id: settlement.id },
          }),
          prisma.ledgerEntry.findMany({
            where: {
              settlementId: settlement.id,
              entryType: 'SETTLEMENT_PAYOUT',
            },
          }),
          prisma.practitionerManualPayout.findMany({
            where: { settlementId: settlement.id },
          }),
          prisma.practitionerSettlementPayout.findMany({
            where: { settlementId: settlement.id },
          }),
          prisma.practitionerWallet.findUniqueOrThrow({
            where: { id: wallet.id },
          }),
          prisma.journalEntry.findMany({
            where: {
              OR: [{ sourceId: settlement.id }, { sourceId: practitionerId }],
            },
            include: { lines: true },
          }),
        ]);
        const ledgerDebits = ledger.reduce(
          (sum, entry) => sum.add(entry.amount),
          new Prisma.Decimal(0),
        );
        const manualTotal = manualPayouts.reduce(
          (sum, row) => sum.add(row.amountPaid),
          new Prisma.Decimal(0),
        );
        const settlementTotal = settlementPayouts.reduce(
          (sum, row) => sum.add(row.amountPaid),
          new Prisma.Decimal(0),
        );
        expect(ledgerDebits.lte(400)).toBe(true);
        expect(manualTotal.add(settlementTotal).lte(400)).toBe(true);
        expect(settlementAfter.amountPaidTotal.lte(400)).toBe(true);
        expect(walletAfter.availableBalance.gte(0)).toBe(true);
        for (const journal of journals) {
          const signed = journal.lines.reduce(
            (sum, line) =>
              line.direction === 'DEBIT'
                ? sum.add(line.amount)
                : sum.sub(line.amount),
            new Prisma.Decimal(0),
          );
          expect(signed.toFixed(2)).toBe('0.00');
        }
      }
    });

    it('Race: wallet refund finalization and payout preserve practitioner economics in both controlled orders', async () => {
      for (let iteration = 0; iteration < 20; iteration += 1) {
      const refundWins = iteration >= 10;
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
          { id: patientUserId, displayName: `Refund payout patient ${suffix}` },
          {
            id: practitionerUserId,
            displayName: `Refund payout practitioner ${suffix}`,
          },
          {
            id: accountantUserId,
            displayName: `Refund payout operator ${suffix}`,
          },
        ],
      });
      await prisma.patientProfile.create({
        data: { id: patientId, userId: patientUserId, countryId: egCountryId },
      });
      await prisma.practitionerProfile.create({
        data: {
          id: practitionerId,
          userId: practitionerUserId,
          publicSlug: `refund-payout-race-${suffix}`,
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
          sessionCode: `RPR-${sessionId.slice(0, 8)}`,
          patientId,
          practitionerId,
          flowType: SessionFlowType.SCHEDULED,
          sessionMode: SessionMode.VIDEO,
          durationMinutes: 30,
          status: SessionStatus.COMPLETED,
          scheduledStartAt: new Date('2026-09-01T10:00:00Z'),
          scheduledEndAt: new Date('2026-09-01T10:30:00Z'),
          provider: SessionProvider.DAILY,
          providerRoomId: `refund-payout-${suffix}`,
          earningEntitlementId: randomUUID(),
          patientCountrySnapshot: 'EG',
          practitionerCountrySnapshot: 'EG',
          countryRelationshipSnapshot: 'SAME_COUNTRY',
          suggestedPractitionerPercentageSnapshot: new Prisma.Decimal(80),
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
          commissionPlatformRatePercent: 20,
          commissionPractitionerRatePercent: 80,
          capturedAt: new Date('2026-09-01T10:00:00Z'),
        },
      });
      const reviewId = (await earningReviewService.syncForSessionCompletion({
        sessionId,
      }))!.reviewId;
      await earningReviewService.approveFinancialDecision({
        reviewId,
        reviewerUserId: accountantUserId,
      });
      await earningReviewService.creditPractitionerWallet({
        reviewId,
        approvedByUserId: accountantUserId,
      });
      const settlement = await prisma.practitionerSettlement.findFirstOrThrow({
        where: { sourceReviewId: reviewId },
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
      const refundCommand = () =>
        requestWalletRefund.execute({
          paymentId,
          actorUserId: accountantUserId,
          amount: '100.00',
          destination: RefundDestination.CUSTOMER_WALLET,
        });
      const payoutCommand = () =>
        payoutService.execute({
          settlement,
          payoutMethod: 'MANUAL_BANK_TRANSFER',
          payoutSource: 'MANUAL_EXCEPTION',
          amountPaid: new Prisma.Decimal(80),
          processedByUserId: accountantUserId,
          externalPayoutRef: `refund-payout-${suffix}`,
        });
      let results: PromiseSettledResult<unknown>[];
      if (refundWins) {
        const refundResult = await refundCommand();
        results = [
          { status: 'fulfilled', value: refundResult },
          await payoutCommand().then(
            (value) => ({ status: 'fulfilled' as const, value }),
            (reason) => ({ status: 'rejected' as const, reason }),
          ),
        ];
      } else {
        results = await Promise.allSettled([refundCommand(), payoutCommand()]);
      }
      const [
        refundAfter,
        walletAfter,
        refundEntries,
        payouts,
        recoveries,
        journals,
      ] = await Promise.all([
        prisma.refund.findFirstOrThrow({
          where: { paymentId },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.practitionerWallet.findFirstOrThrow({
          where: { practitionerId },
        }),
        prisma.ledgerEntry.findMany({
          where: {
            paymentId,
            entryType: 'REFUND_PRACTITIONER_REVERSAL',
          },
        }),
        prisma.practitionerSettlementPayout.findMany({
          where: { settlementId: settlement.id },
        }),
        prisma.practitionerRecovery.findMany({
          where: { practitionerId, currencyCode: 'EGP' },
        }),
        prisma.journalEntry.findMany({
          where: {
            OR: [
              { sourceId: paymentId },
              { sourceId: settlement.id },
            ],
          },
          include: { lines: true },
        }),
      ]);
      const rejected = results.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      );
      if (rejected && !refundWins) throw rejected.reason;
      expect(results.some((result) => result.status === 'fulfilled')).toBe(
        true,
      );
      expect(refundAfter.status).toBe('SUCCEEDED');
      expect(refundAfter.amount.toFixed(2)).toBe('100.00');
      const [customerRefundCredits, refundJournals] = await Promise.all([
        prisma.customerWalletEntry.findMany({
          where: {
            refundId: refundAfter.id,
            entryType: 'REFUND_CREDIT',
            direction: 'CREDIT',
          },
        }),
        prisma.journalEntry.findMany({
          where: { sourceId: refundAfter.id },
          include: { lines: true },
        }),
      ]);
      expect(customerRefundCredits).toHaveLength(1);
      expect(customerRefundCredits[0].amount.toFixed(2)).toBe('100.00');
      expect(refundJournals).toHaveLength(1);
      expect(refundEntries.length).toBeLessThanOrEqual(1);
      expect(walletAfter.availableBalance.gte(0)).toBe(true);
      expect(payouts.length).toBeLessThanOrEqual(1);
      const practitionerRefundProtection = refundEntries
        .reduce((sum, entry) => sum.add(entry.amount), new Prisma.Decimal(0))
        .add(
          recoveries.reduce(
            (sum, recoveryRow) =>
              sum.add(recoveryRow.amount.sub(recoveryRow.recoveredAmount)),
            new Prisma.Decimal(0),
          ),
        );
      expect(practitionerRefundProtection.toFixed(2)).toBe('80.00');
      if (refundWins) {
        expect(payouts).toHaveLength(0);
        expect(recoveries).toHaveLength(0);
        expect(refundEntries).toHaveLength(1);
      } else {
        expect(payouts).toHaveLength(1);
        expect(recoveries).toHaveLength(1);
        expect(refundEntries).toHaveLength(0);
      }
      for (const journal of [...journals, ...refundJournals])
        expect(
          journal.lines
            .reduce(
              (sum, line) =>
                line.direction === 'DEBIT'
                  ? sum.add(line.amount)
                  : sum.sub(line.amount),
              new Prisma.Decimal(0),
            )
            .toFixed(2),
        ).toBe('0.00');
      }
    }, 60_000);
  },
);
