/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { randomUUID } from 'node:crypto';
import {
  JournalEntrySourceType,
  PackageSchedulePolicy,
  PackageSettlementStatus,
  PaymentEventType,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  PractitionerStatus,
  PractitionerType,
  SessionEventType,
  SessionFlowType,
  SessionMode,
  SessionPaymentCoverageType,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentMapper } from '../mappers/payment.mapper';
import { HandlePaymobWebhookUseCase } from '../use-cases/handle-paymob-webhook.use-case';
import { MarkPaymentSucceededUseCase } from '../use-cases/mark-payment-succeeded.use-case';
import { ValidatePaymentStatusTransitionService } from '../services/validate-payment-status-transition.service';
import { OrchestrateSessionPaymentStatusService } from '../services/orchestrate-session-payment-status.service';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
import { SessionCodeGeneratorService } from '@modules/sessions/services/session-code-generator.service';
import { SessionLifecycleService } from '@modules/sessions/services/session-lifecycle.service';
import { ValidateSessionStatusTransitionService } from '@modules/sessions/services/validate-session-status-transition.service';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { CustomerWalletRepository } from '@modules/customer-wallets/repositories/customer-wallet.repository';
import { CustomerWalletEntryRepository } from '@modules/customer-wallets/repositories/customer-wallet-entry.repository';
import { CustomerWalletReservationRepository } from '@modules/customer-wallets/repositories/customer-wallet-reservation.repository';
import { SessionEarningReviewService } from '@modules/financial-operations/services/session-earning-review.service';
import { LedgerRepository } from '@modules/financial-operations/repositories/ledger.repository';
import { ExtractPaymentLedgerBreakdownService } from '@modules/financial-operations/services/extract-payment-ledger-breakdown.service';
import { CalculatePackageSessionAllocationService } from '@modules/financial-operations/services/calculate-package-session-allocation.service';
import { AccountingJournalPostingService } from '@modules/financial-operations/services/accounting-journal-posting.service';
import { AccountingLedgerAccountService } from '@modules/financial-operations/services/accounting-ledger-account.service';
import { MoneyAmountService } from '@modules/financial-operations/services/money-amount.service';
import { PackageSettlementService } from '@modules/financial-operations/services/package-settlement.service';
import { PackageSettlementRepository } from '@modules/financial-operations/repositories/package-settlement.repository';
import { RefreshPractitionerWalletService } from '@modules/financial-operations/services/refresh-practitioner-wallet.service';
import { ApprovePractitionerSettlementService } from '@modules/financial-operations/services/approve-practitioner-settlement.service';
import { WalletRepository } from '@modules/financial-operations/repositories/wallet.repository';
import { PatientPackagePurchaseRepository } from '@modules/package-plans/repositories/package-purchase.repository';
import { HandlePackagePurchasePaymentSuccessUseCase } from '@modules/package-plans/use-cases/handle-package-purchase-payment-success.use-case';

const databaseUrl = process.env.DATABASE_URL;
const parsed = databaseUrl ? new URL(databaseUrl) : null;
const hasIsolatedDatabase = Boolean(
  parsed &&
    ['127.0.0.1', 'localhost'].includes(parsed.hostname) &&
    ['5432', '55438'].includes(parsed.port) &&
    /^\/sawiyaa_redteam_[a-z0-9_]+$/.test(parsed.pathname),
);
const describeIfDatabase = hasIsolatedDatabase ? describe : describe.skip;

describeIfDatabase('Package lifecycle: duplicate successful webhook', () => {
  const prisma = new PrismaService();
  const paymentRepository = new PaymentRepository(prisma);
  const packagePurchaseRepository = new PatientPackagePurchaseRepository(prisma);
  const money = new MoneyAmountService();
  const journals = new AccountingJournalPostingService(
    prisma,
    money,
    new AccountingLedgerAccountService(prisma),
  );
  const sessionRepository = new SessionRepository(
    prisma,
    new SessionCodeGeneratorService(prisma),
  );
  const sessionLifecycle = new SessionLifecycleService(
    sessionRepository,
    new ValidateSessionStatusTransitionService(),
  );
  const notifications = {
    notifyPaymentSucceeded: async () => undefined,
    notifySessionConfirmed: async () => undefined,
  };
  const packageSettlement = new PackageSettlementService(
    prisma,
    new LedgerRepository(prisma),
    new PackageSettlementRepository(prisma),
    {} as RefreshPractitionerWalletService,
    {} as SessionEarningReviewService,
  );
  const packageSuccess = new HandlePackagePurchasePaymentSuccessUseCase(
    prisma,
    paymentRepository,
    packagePurchaseRepository,
    sessionRepository,
    sessionLifecycle,
    notifications as never,
    packageSettlement,
    {
      resolve: async () => ({
        version: 1,
        scheduleRevision: 1,
        capturedAt: new Date().toISOString(),
        reminder: {
          reminderOffsetsMinutes: [],
          lateReminderEnabled: false,
          lateReminderMinutesAfterStart: 15,
          inAppRemindersEnabled: false,
          emailRemindersEnabled: false,
        },
        join: { joinEarlyMinutes: 15, joinAfterEndGraceMinutes: 15 },
      }),
      withScheduleRevision: (policy: unknown) => policy,
    } as never,
  );
  const orchestrateSession = new OrchestrateSessionPaymentStatusService(
    prisma,
    sessionRepository,
    sessionLifecycle,
    {} as never,
    notifications as never,
    {
      resolve: async () => ({
        version: 1,
        scheduleRevision: 1,
        capturedAt: new Date().toISOString(),
        reminder: {
          reminderOffsetsMinutes: [],
          lateReminderEnabled: false,
          lateReminderMinutesAfterStart: 15,
          inAppRemindersEnabled: false,
          emailRemindersEnabled: false,
        },
        join: { joinEarlyMinutes: 15, joinAfterEndGraceMinutes: 15 },
      }),
      withScheduleRevision: (policy: unknown) => policy,
    } as never,
  );
  const markSucceeded = new MarkPaymentSucceededUseCase(
    prisma,
    paymentRepository,
    new ValidatePaymentStatusTransitionService(),
    orchestrateSession,
    {} as never,
    new PaymentMapper(),
    new SessionEarningReviewService(
      prisma,
      new LedgerRepository(prisma),
      new ExtractPaymentLedgerBreakdownService(money),
      new CalculatePackageSessionAllocationService(money),
      {} as RefreshPractitionerWalletService,
      {} as ApprovePractitionerSettlementService,
      journals,
      {} as WalletRepository,
    ),
    new CustomerWalletAccountingService(
      prisma,
      new CustomerWalletRepository(prisma),
      new CustomerWalletEntryRepository(prisma),
      new CustomerWalletReservationRepository(prisma),
    ),
    { execute: async () => undefined } as never,
    notifications as never,
    { execute: packageSuccess.execute.bind(packageSuccess) } as never,
    {} as never,
    { info: () => undefined, warn: () => undefined } as never,
    journals,
  );

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  it('activates one package and confirms each linked session once across ten iterations', async () => {
    for (let iteration = 0; iteration < 10; iteration += 1) {
      const suffix = `${iteration}-${randomUUID()}`;
      const patientUserId = randomUUID();
      const practitionerUserId = randomUUID();
      const patientId = randomUUID();
      const practitionerId = randomUUID();
      const planId = randomUUID();
      const purchaseId = randomUUID();
      const paymentId = randomUUID();
      const sessionIds = [randomUUID(), randomUUID()];
      const providerPaymentRef = `package-payment-${suffix}`;
      const providerEventRef = `package-event-${suffix}`;

      await prisma.user.createMany({
        data: [
          { id: patientUserId, displayName: `Package patient ${suffix}` },
          { id: practitionerUserId, displayName: `Package practitioner ${suffix}` },
        ],
      });
      const eg = await prisma.country.upsert({
        where: { isoCode: 'EG' },
        create: { isoCode: 'EG', name: 'Egypt', slug: 'egypt' },
        update: {},
      });
      await prisma.patientProfile.create({
        data: { id: patientId, userId: patientUserId, countryId: eg.id },
      });
      await prisma.practitionerProfile.create({
        data: {
          id: practitionerId,
          userId: practitionerUserId,
          publicSlug: `package-${suffix}`,
          practitionerType: PractitionerType.OTHER,
          status: PractitionerStatus.DRAFT,
          countryId: eg.id,
          acceptsPackages: true,
        },
      });
      await prisma.packagePlan.create({
        data: {
          id: planId,
          code: `PACKAGE_${suffix.replace(/-/g, '').slice(0, 80)}`,
          sessionCount: 2,
          discountPercent: 12.5,
          title: 'Two session package',
          description: 'Post-capture package proof',
        },
      });
      await prisma.patientPackagePurchase.create({
        data: {
          id: purchaseId,
          packagePlanId: planId,
          practitionerId,
          patientId,
          status: 'PENDING_PAYMENT',
          paymentExpiresAt: new Date('2026-12-01T00:00:00Z'),
          titleSnapshot: 'Two session package',
          descriptionSnapshot: 'Post-capture package proof',
          slugSnapshot: `package-${suffix}`,
          packageVersionSnapshot: 1,
          planIdSnapshot: planId,
          planCodeSnapshot: `PACKAGE_${suffix.replace(/-/g, '').slice(0, 80)}`,
          sessionCountSnapshot: 2,
          discountPercentSnapshot: 12.5,
          baseSessionPriceEgpSnapshot: 40,
          currencyCodeSnapshot: 'EGP',
          selectedBaseSessionPriceSnapshot: 40,
          undiscountedTotalSnapshot: 80,
          discountAmountSnapshot: 10,
          patientPayableTotalSnapshot: 70,
          platformDiscountShareSnapshot: 5,
          practitionerDiscountShareSnapshot: 5,
          commissionModeSnapshot: 'SNAPSHOT',
          platformOriginalShareSnapshot: 35,
          practitionerOriginalShareSnapshot: 45,
          platformFinalShareSnapshot: 30,
          practitionerFinalShareSnapshot: 40,
          sessionDurationMinutesSnapshot: 30,
          sessionModeSnapshot: SessionMode.VIDEO,
          schedulePolicySnapshot: PackageSchedulePolicy.REQUIRE_ALL_SESSIONS_AT_PURCHASE,
          priceEgpSnapshot: 40,
          selectedCurrencyCode: 'EGP',
          selectedAmountSnapshot: 70,
        },
      });
      for (const [index, sessionId] of sessionIds.entries()) {
        const hour = String(9 + index).padStart(2, '0');
        const start = new Date(`2026-12-01T${hour}:00:00Z`);
        await prisma.session.create({
          data: {
            id: sessionId,
            sessionCode: `PKG-${sessionId.slice(0, 8)}`,
            patientId,
            practitionerId,
            flowType: SessionFlowType.SCHEDULED,
            sessionMode: SessionMode.VIDEO,
            durationMinutes: 30,
            status: SessionStatus.PENDING_PAYMENT,
            requestedStartAt: start,
            scheduledStartAt: start,
            scheduledEndAt: new Date(start.getTime() + 30 * 60_000),
            expiresAt: new Date('2026-12-01T00:00:00Z'),
            packagePurchaseId: purchaseId,
            packageSessionIndex: index + 1,
            packageSessionCount: 2,
            paymentCoverageType: SessionPaymentCoverageType.PACKAGE,
            provider: SessionProvider.DAILY,
          },
        });
      }
      await prisma.payment.create({
        data: {
          id: paymentId,
          patientId,
          practitionerId,
          paymentPurpose: PaymentPurpose.SESSION_PACKAGE_PURCHASE,
          provider: PaymentProvider.PAYMOB,
          status: PaymentStatus.PENDING,
          amountSubtotal: 80,
          amountDiscount: 10,
          amountTotal: 70,
          amountFromWallet: 0,
          amountFromGateway: 70,
          currencyCode: 'EGP',
          providerPaymentRef,
          metadataJson: { packagePurchaseId: purchaseId },
        },
      });
      await prisma.patientPackagePurchase.update({
        where: { id: purchaseId },
        data: { paymentId },
      });

      const handler = new HandlePaymobWebhookUseCase(
        {
          get: () => ({
            parseAndVerifyWebhook: () => ({
              handled: true as const,
              providerEventRef,
              providerPaymentRef,
              outcome: 'SUCCEEDED' as const,
              amountMinor: 7000,
              currencyCode: 'EGP',
              payload: { success: true, id: providerPaymentRef, amount_cents: 7000 },
            }),
          }),
        } as never,
        paymentRepository,
        markSucceeded,
        { execute: async () => undefined } as never,
        { execute: async () => undefined } as never,
        { warn: () => undefined, debug: () => undefined } as never,
      );

      const results = await Promise.allSettled([
        handler.execute({ rawBody: Buffer.from('{}'), headers: {}, query: {} }),
        handler.execute({ rawBody: Buffer.from('{}'), headers: {}, query: {} }),
      ]);
      expect(results.every((result) => result.status === 'fulfilled')).toBe(true);

      const [purchase, payment, receipts, webhookEvents, capturedEvents, sessions, sessionEvents, settlement, journals, earningReviews] = await Promise.all([
        prisma.patientPackagePurchase.findUniqueOrThrow({ where: { id: purchaseId } }),
        prisma.payment.findUniqueOrThrow({ where: { id: paymentId } }),
        prisma.paymentWebhookReceipt.findMany({ where: { paymentId, providerEventRef } }),
        prisma.paymentEvent.findMany({ where: { paymentId, providerEventRef, eventType: PaymentEventType.PROVIDER_WEBHOOK_RECEIVED } }),
        prisma.paymentEvent.findMany({ where: { paymentId, providerEventRef, eventType: PaymentEventType.PAYMENT_CAPTURED } }),
        prisma.session.findMany({ where: { packagePurchaseId: purchaseId }, orderBy: { packageSessionIndex: 'asc' } }),
        prisma.sessionEvent.findMany({ where: { sessionId: { in: sessionIds }, eventType: { in: [SessionEventType.PAYMENT_CONFIRMED, SessionEventType.SESSION_CONFIRMED] } } }),
        prisma.packageSettlement.findUniqueOrThrow({ where: { purchaseId } }),
        prisma.journalEntry.findMany({ where: { sourceType: JournalEntrySourceType.PAYMENT_CAPTURED, sourceId: paymentId } }),
        prisma.sessionEarningReview.findMany({ where: { packagePurchaseId: purchaseId } }),
      ]);

      expect(purchase.status).toBe('ACTIVE');
      expect(payment.status).toBe(PaymentStatus.CAPTURED);
      expect(payment.providerPaymentRef).toBe(providerPaymentRef);
      expect(payment.amountTotal.toString()).toBe('70');
      expect(payment.amountFromGateway.toString()).toBe('70');
      expect(payment.amountFromWallet.toString()).toBe('0');
      expect(payment.currencyCode).toBe('EGP');
      expect(receipts).toHaveLength(1);
      expect(webhookEvents).toHaveLength(1);
      expect(capturedEvents).toHaveLength(1);
      expect(sessions).toHaveLength(2);
      expect(sessions.every((session) => session.status === SessionStatus.UPCOMING)).toBe(true);
      expect(sessionEvents.filter((event) => event.eventType === SessionEventType.PAYMENT_CONFIRMED)).toHaveLength(2);
      expect(sessionEvents.filter((event) => event.eventType === SessionEventType.SESSION_CONFIRMED)).toHaveLength(2);
      expect(settlement.status).toBe(PackageSettlementStatus.HELD);
      expect(journals).toHaveLength(1);
      expect(earningReviews).toHaveLength(0);
    }
  }, 120_000);
});
