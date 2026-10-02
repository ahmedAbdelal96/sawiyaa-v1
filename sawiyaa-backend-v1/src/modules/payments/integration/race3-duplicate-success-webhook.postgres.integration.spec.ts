/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { randomUUID } from 'node:crypto';
import {
  CouponScope,
  CouponStatus,
  DiscountType,
  PaymentEventType,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  PractitionerStatus,
  PractitionerType,
  SessionEventType,
  SessionFlowType,
  SessionMode,
  SessionProvider,
  SessionStatus,
  CustomerWalletEntryType,
  CustomerWalletReservationStatus,
  JournalEntrySourceType,
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
import { CouponRepository } from '@modules/financial-rules/repositories/coupon.repository';
import { CouponRedemptionRepository } from '@modules/financial-rules/repositories/coupon-redemption.repository';
import { RedeemCouponService } from '@modules/financial-rules/services/redeem-coupon.service';
import { RedeemCouponUseCase } from '@modules/financial-rules/use-cases/redeem-coupon.use-case';
import { MoneyMathService } from '@modules/financial-rules/services/money-math.service';
import { SecurityAuditRepository } from '@common/security-audit/security-audit.repository';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { RequestContextService } from '@common/logging/request-context.service';
import { SessionEarningReviewService } from '@modules/financial-operations/services/session-earning-review.service';
import { LedgerRepository } from '@modules/financial-operations/repositories/ledger.repository';
import { ExtractPaymentLedgerBreakdownService } from '@modules/financial-operations/services/extract-payment-ledger-breakdown.service';
import { CalculatePackageSessionAllocationService } from '@modules/financial-operations/services/calculate-package-session-allocation.service';
import { AccountingJournalPostingService } from '@modules/financial-operations/services/accounting-journal-posting.service';
import { AccountingLedgerAccountService } from '@modules/financial-operations/services/accounting-ledger-account.service';
import { MoneyAmountService } from '@modules/financial-operations/services/money-amount.service';
import { RefreshPractitionerWalletService } from '@modules/financial-operations/services/refresh-practitioner-wallet.service';
import { ApprovePractitionerSettlementService } from '@modules/financial-operations/services/approve-practitioner-settlement.service';
import { WalletRepository } from '@modules/financial-operations/repositories/wallet.repository';

const databaseUrl = process.env.DATABASE_URL;
const parsed = databaseUrl ? new URL(databaseUrl) : null;
const describeIfDatabase = parsed ? describe : describe.skip;
if (
  parsed &&
  (!['127.0.0.1', 'localhost'].includes(parsed.hostname) ||
    !['5432', '55438'].includes(parsed.port) ||
    !/^\/sawiyaa_redteam_[a-z0-9_]+$/.test(parsed.pathname))
)
  throw new Error('Race 3 requires an isolated red-team PostgreSQL database');

describeIfDatabase('Race 3: duplicate successful Paymob webhook', () => {
  const prisma = new PrismaService();
  const paymentRepository = new PaymentRepository(prisma);
  const walletAccounting = new CustomerWalletAccountingService(
    prisma,
    new CustomerWalletRepository(prisma),
    new CustomerWalletEntryRepository(prisma),
    new CustomerWalletReservationRepository(prisma),
  );
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
  const earningReview = new SessionEarningReviewService(
    prisma,
    new LedgerRepository(prisma),
    new ExtractPaymentLedgerBreakdownService(money),
    new CalculatePackageSessionAllocationService(money),
    {} as RefreshPractitionerWalletService,
    {} as ApprovePractitionerSettlementService,
    journals,
    {} as WalletRepository,
  );
  const securityAudit = new SecurityAuditService(
    new SecurityAuditRepository(prisma),
    new RequestContextService(),
  );
  const redeemCoupon = new RedeemCouponUseCase(
    new RedeemCouponService(
      prisma,
      new CouponRepository(prisma),
      new CouponRedemptionRepository(prisma),
      new MoneyMathService(),
      securityAudit,
    ),
  );
  const markSucceeded = new MarkPaymentSucceededUseCase(
    prisma,
    paymentRepository,
    new ValidatePaymentStatusTransitionService(),
    orchestrateSession,
    {} as never,
    new PaymentMapper(),
    earningReview,
    walletAccounting,
    redeemCoupon,
    notifications as never,
    {} as never,
    {} as never,
    { info: () => undefined, warn: () => undefined } as never,
    journals,
  );

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  function buildHandler(webhook: {
    providerEventRef: string;
    providerPaymentRef: string;
    payload: Record<string, unknown>;
  }) {
    const registry = {
      get: () => ({
        parseAndVerifyWebhook: () => ({
          handled: true as const,
          providerEventRef: webhook.providerEventRef,
          providerPaymentRef: webhook.providerPaymentRef,
          outcome: 'SUCCEEDED' as const,
          amountMinor: 7000,
          currencyCode: 'EGP',
          payload: webhook.payload,
        }),
      }),
    };
    return new HandlePaymobWebhookUseCase(
      registry as never,
      paymentRepository,
      markSucceeded,
      { execute: async () => undefined } as never,
      { execute: async () => undefined } as never,
      { warn: () => undefined, debug: () => undefined } as never,
    );
  }

  it('captures one event exactly once across ten isolated concurrent iterations', async () => {
    for (let iteration = 0; iteration < 10; iteration += 1) {
      const suffix = `${iteration}-${randomUUID()}`;
      const patientUserId = randomUUID();
      const practitionerUserId = randomUUID();
      const patientId = randomUUID();
      const practitionerId = randomUUID();
      const sessionId = randomUUID();
      const paymentId = randomUUID();
      const couponId = randomUUID();
      const providerPaymentRef = `race3-payment-${suffix}`;
      const providerEventRef = `race3-event-${suffix}`;

      await prisma.user.createMany({
        data: [
          { id: patientUserId, displayName: `Race3 patient ${suffix}` },
          { id: practitionerUserId, displayName: `Race3 practitioner ${suffix}` },
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
          publicSlug: `race3-${suffix}`,
          practitionerType: PractitionerType.OTHER,
          status: PractitionerStatus.DRAFT,
          countryId: eg.id,
        },
      });
      await prisma.customerWallet.create({
        data: {
          patientId,
          currencyCode: 'EGP',
          availableBalance: 20,
        },
      });
      await prisma.coupon.create({
        data: {
          id: couponId,
          code: `R3${iteration}${suffix.replace(/-/g, '').slice(0, 20)}`,
          slug: `race3-${suffix}`,
          createdByUserId: practitionerUserId,
          ownerPractitionerId: practitionerId,
          couponScope: CouponScope.PRACTITIONER_SESSIONS,
          status: CouponStatus.ACTIVE,
          discountType: DiscountType.FIXED_AMOUNT,
          discountValue: 10,
          platformSharePercent: 50,
          practitionerSharePercent: 50,
          requiresApproval: false,
          isActive: true,
        },
      });
      await prisma.session.create({
        data: {
          id: sessionId,
          sessionCode: `R3-${sessionId.slice(0, 8)}`,
          patientId,
          practitionerId,
          flowType: SessionFlowType.SCHEDULED,
          sessionMode: SessionMode.VIDEO,
          durationMinutes: 30,
          status: SessionStatus.PENDING_PAYMENT,
          scheduledStartAt: new Date('2026-12-01T09:00:00Z'),
          scheduledEndAt: new Date('2026-12-01T09:30:00Z'),
          provider: SessionProvider.DAILY,
          providerRoomId: `race3-room-${suffix}`,
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
          status: PaymentStatus.PENDING,
          amountSubtotal: 100,
          amountDiscount: 10,
          amountTotal: 90,
          amountFromWallet: 20,
          amountFromGateway: 70,
          currencyCode: 'EGP',
          couponId,
          couponCodeSnapshot: `R3${iteration}${suffix.replace(/-/g, '').slice(0, 20)}`,
          couponDiscountSnapshot: 10,
          couponPlatformShareSnapshot: 50,
          couponPractitionerShareSnapshot: 50,
          providerPaymentRef,
        },
      });
      const reservation = await walletAccounting.reserveForSessionPayment({
        patientId,
        paymentId,
        sessionId,
        currencyCode: 'EGP',
        amount: '20.00',
      });
      expect(reservation).not.toBeNull();

      const handler = buildHandler({
        providerEventRef,
        providerPaymentRef,
        payload: { success: true, id: providerPaymentRef, amount_cents: 7000 },
      });
      const results = await Promise.allSettled([
        handler.execute({ rawBody: Buffer.from('{}'), headers: {}, query: {} }),
        handler.execute({ rawBody: Buffer.from('{}'), headers: {}, query: {} }),
      ]);
      expect(results.every((result) => result.status === 'fulfilled')).toBe(true);

      const [payment, receipts, paymentEvents, wallet, entries, savedReservation, redemptions, session, sessionEvents, journal, reviews] = await Promise.all([
        prisma.payment.findUniqueOrThrow({ where: { id: paymentId } }),
        prisma.paymentWebhookReceipt.findMany({ where: { paymentId, providerEventRef } }),
        prisma.paymentEvent.findMany({ where: { paymentId, providerEventRef } }),
        prisma.customerWallet.findUniqueOrThrow({ where: { patientId_currencyCode: { patientId, currencyCode: 'EGP' } } }),
        prisma.customerWalletEntry.findMany({ where: { paymentId } }),
        prisma.customerWalletReservation.findUniqueOrThrow({ where: { paymentId } }),
        prisma.couponRedemption.findMany({ where: { paymentId } }),
        prisma.session.findUniqueOrThrow({ where: { id: sessionId } }),
        prisma.sessionEvent.findMany({ where: { sessionId, eventType: { in: [SessionEventType.PAYMENT_CONFIRMED, SessionEventType.SESSION_CONFIRMED] } } }),
        prisma.journalEntry.findMany({ where: { sourceType: JournalEntrySourceType.PAYMENT_CAPTURED, sourceId: paymentId } }),
        prisma.sessionEarningReview.findMany({ where: { sessionId } }),
      ]);

      expect(payment.status).toBe(PaymentStatus.CAPTURED);
      expect(receipts).toHaveLength(1);
      expect(paymentEvents.filter((event) => event.eventType === PaymentEventType.PROVIDER_WEBHOOK_RECEIVED)).toHaveLength(1);
      expect(paymentEvents.filter((event) => event.eventType === PaymentEventType.PAYMENT_CAPTURED)).toHaveLength(1);
      expect(savedReservation.status).toBe(CustomerWalletReservationStatus.CAPTURED);
      expect(entries.filter((entry) => entry.entryType === CustomerWalletEntryType.SESSION_PAYMENT_RESERVE)).toHaveLength(1);
      expect(entries.filter((entry) => entry.entryType === CustomerWalletEntryType.SESSION_PAYMENT_CAPTURE)).toHaveLength(1);
      expect(wallet.availableBalance.toString()).toBe('0');
      expect(wallet.reservedBalance.toString()).toBe('0');
      expect(wallet.lifetimeDebited.toString()).toBe('20');
      expect(redemptions).toHaveLength(1);
      expect(session.status).toBe(SessionStatus.UPCOMING);
      expect(sessionEvents).toHaveLength(2);
      expect(journal).toHaveLength(1);
      expect(reviews).toHaveLength(0);
    }
  }, 120_000);
});
