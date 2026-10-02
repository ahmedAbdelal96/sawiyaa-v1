/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { randomUUID } from 'node:crypto';
import {
  JournalEntrySourceType,
  PackageSchedulePolicy,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  PractitionerStatus,
  PractitionerType,
  RefundDestination,
  RefundStatus,
  SessionFlowType,
  SessionMode,
  SessionPaymentCoverageType,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { PatientPackagePurchaseRepository } from '@modules/package-plans/repositories/package-purchase.repository';
import { PackageEntitlementService } from '@modules/package-plans/services/package-entitlement.service';
import { PackageRefundPolicyService } from '../services/package-refund-policy.service';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { CustomerWalletRepository } from '@modules/customer-wallets/repositories/customer-wallet.repository';
import { CustomerWalletEntryRepository } from '@modules/customer-wallets/repositories/customer-wallet-entry.repository';
import { CustomerWalletReservationRepository } from '@modules/customer-wallets/repositories/customer-wallet-reservation.repository';
import { PostRefundLedgerEntriesUseCase } from '@modules/financial-operations/use-cases/post-refund-ledger-entries.use-case';
import { FinancialOperationsPaymentRepository } from '@modules/financial-operations/repositories/financial-operations-payment.repository';
import { LedgerRepository } from '@modules/financial-operations/repositories/ledger.repository';
import { ExtractPaymentLedgerBreakdownService } from '@modules/financial-operations/services/extract-payment-ledger-breakdown.service';
import { MoneyAmountService } from '@modules/financial-operations/services/money-amount.service';
import { AccountingJournalPostingService } from '@modules/financial-operations/services/accounting-journal-posting.service';
import { AccountingLedgerAccountService } from '@modules/financial-operations/services/accounting-ledger-account.service';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
import { SessionCodeGeneratorService } from '@modules/sessions/services/session-code-generator.service';
import { SessionLifecycleService } from '@modules/sessions/services/session-lifecycle.service';
import { ValidateSessionStatusTransitionService } from '@modules/sessions/services/validate-session-status-transition.service';
import { ValidatePaymentStatusTransitionService } from '../services/validate-payment-status-transition.service';
import { BookPackageSessionUseCase } from '@modules/package-plans/use-cases/book-package-session.use-case';
import { PatientProfileRepository } from '@modules/patients/repositories/patient-profile.repository';
import { PractitionerAvailabilityWeekRepository } from '@modules/availability/repositories/practitioner-availability-week.repository';
import { AvailabilityExceptionRepository } from '@modules/availability/repositories/availability-exception.repository';
import { BuildPublishedWeekAvailabilityWindowsService } from '@modules/availability/services/build-published-week-availability-windows.service';
import { AvailabilityWeekCalendarService } from '@modules/availability/services/availability-week-calendar.service';
import { ResolvePractitionerTimezoneService } from '@modules/availability/services/resolve-practitioner-timezone.service';
import { ValidateSessionBookingRequestService } from '@modules/sessions/services/validate-session-booking-request.service';
import { ValidateSessionConflictsService } from '@modules/sessions/services/validate-session-conflicts.service';
import { ValidateSessionDurationService } from '@modules/sessions/services/validate-session-duration.service';
import { ValidateSessionScheduleCompatibilityService } from '@modules/sessions/services/validate-session-schedule-compatibility.service';
import { SessionMapper } from '@modules/sessions/mappers/session.mapper';
import { AvailabilityWeekStatus, AvailabilityWeekday } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
const parsed = databaseUrl ? new URL(databaseUrl) : null;
const hasIsolatedDatabase = Boolean(
  parsed &&
    ['127.0.0.1', 'localhost'].includes(parsed.hostname) &&
    ['5432', '55438'].includes(parsed.port) &&
    /^\/sawiyaa_redteam_[a-z0-9_]+$/.test(parsed.pathname),
);
const describeIfDatabase = hasIsolatedDatabase ? describe : describe.skip;

describeIfDatabase('Package refund policy: PostgreSQL concurrency', () => {
  const prisma = new PrismaService();
  const paymentRepository = new PaymentRepository(prisma);
  const purchaseRepository = new PatientPackagePurchaseRepository(prisma);
  const money = new MoneyAmountService();
  const journals = new AccountingJournalPostingService(
    prisma,
    money,
    new AccountingLedgerAccountService(prisma),
  );
  const lifecycle = new SessionLifecycleService(
    new SessionRepository(prisma, new SessionCodeGeneratorService(prisma)),
    new ValidateSessionStatusTransitionService(),
  );
  const wallet = new CustomerWalletAccountingService(
    prisma,
    new CustomerWalletRepository(prisma),
    new CustomerWalletEntryRepository(prisma),
    new CustomerWalletReservationRepository(prisma),
  );
  const postRefund = new PostRefundLedgerEntriesUseCase(
    prisma,
    new FinancialOperationsPaymentRepository(prisma),
    new LedgerRepository(prisma),
    new ExtractPaymentLedgerBreakdownService(money),
    {} as never,
    {} as never,
    {} as never,
    money,
    journals,
  );
  const policy = new PackageRefundPolicyService(
    prisma,
    purchaseRepository,
    paymentRepository,
    new PackageEntitlementService(),
    wallet,
    postRefund,
    lifecycle,
    new ValidatePaymentStatusTransitionService(),
  );
  const booking = new BookPackageSessionUseCase(
    prisma,
    new PatientProfileRepository(prisma),
    purchaseRepository,
    new SessionRepository(prisma, new SessionCodeGeneratorService(prisma)),
    new SessionMapper(),
    lifecycle,
    new ValidateSessionBookingRequestService(),
    new ValidateSessionDurationService(),
    new ValidateSessionScheduleCompatibilityService(
      new PractitionerAvailabilityWeekRepository(prisma),
      new AvailabilityExceptionRepository(prisma),
      new AvailabilityWeekCalendarService(),
      new ResolvePractitionerTimezoneService(),
      new BuildPublishedWeekAvailabilityWindowsService(),
      new SessionRepository(prisma, new SessionCodeGeneratorService(prisma)),
    ),
    new ValidateSessionConflictsService(prisma, new SessionRepository(prisma, new SessionCodeGeneratorService(prisma)), lifecycle),
    { resolve: async () => ({ version: 1, scheduleRevision: 1, capturedAt: new Date().toISOString(), reminder: { reminderOffsetsMinutes: [], lateReminderEnabled: false, lateReminderMinutesAfterStart: 15, inAppRemindersEnabled: false, emailRemindersEnabled: false }, join: { joinEarlyMinutes: 15, joinAfterEndGraceMinutes: 15 } }), withScheduleRevision: (policy: unknown) => policy } as never,
    new PackageEntitlementService(),
    { notifySessionConfirmed: async () => undefined } as never,
  );

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  it('runs ten isolated finalization races with exact wallet/journal/closure effects', async () => {
    const eg = await prisma.country.upsert({
      where: { isoCode: 'EG' },
      create: { isoCode: 'EG', name: 'Egypt', slug: 'egypt' },
      update: {},
    });

    for (let iteration = 0; iteration < 10; iteration += 1) {
      const suffix = `${iteration}-${randomUUID()}`;
      const patientUserId = randomUUID();
      const practitionerUserId = randomUUID();
      const patientId = randomUUID();
      const practitionerId = randomUUID();
      const planId = randomUUID();
      const purchaseId = randomUUID();
      const paymentId = randomUUID();
      const sessionIds = [randomUUID(), randomUUID(), randomUUID()];

      await prisma.user.createMany({
        data: [
          { id: patientUserId, displayName: `Refund patient ${suffix}` },
          { id: practitionerUserId, displayName: `Refund practitioner ${suffix}` },
        ],
      });
      await prisma.patientProfile.create({
        data: { id: patientId, userId: patientUserId, countryId: eg.id },
      });
      await prisma.practitionerProfile.create({
        data: {
          id: practitionerId,
          userId: practitionerUserId,
          publicSlug: `refund-${suffix}`,
          practitionerType: PractitionerType.OTHER,
          status: PractitionerStatus.APPROVED,
          countryId: eg.id,
          acceptsPackages: true,
        },
      });
      await prisma.packagePlan.create({
        data: {
          id: planId,
          code: `REFUND_${suffix.replace(/-/g, '').slice(0, 70)}`,
          sessionCount: 3,
          discountPercent: 10,
          title: 'Three session package',
          description: 'Refund policy proof',
        },
      });
      await prisma.patientPackagePurchase.create({
        data: {
          id: purchaseId,
          packagePlanId: planId,
          practitionerId,
          patientId,
          status: 'ACTIVE',
          paidAt: new Date(),
          activatedAt: new Date(),
          titleSnapshot: 'Three session package',
          descriptionSnapshot: 'Refund policy proof',
          slugSnapshot: `refund-${suffix}`,
          packageVersionSnapshot: 1,
          planIdSnapshot: planId,
          planCodeSnapshot: `REFUND_${suffix}`,
          sessionCountSnapshot: 3,
          discountPercentSnapshot: 10,
          baseSessionPriceEgpSnapshot: 100,
          currencyCodeSnapshot: 'EGP',
          selectedBaseSessionPriceSnapshot: 100,
          undiscountedTotalSnapshot: 300,
          discountAmountSnapshot: 30,
          patientPayableTotalSnapshot: 270,
          platformDiscountShareSnapshot: 15,
          practitionerDiscountShareSnapshot: 15,
          commissionModeSnapshot: 'SNAPSHOT',
          platformOriginalShareSnapshot: 150,
          practitionerOriginalShareSnapshot: 150,
          platformFinalShareSnapshot: 135,
          practitionerFinalShareSnapshot: 135,
          sessionDurationMinutesSnapshot: 30,
          sessionModeSnapshot: SessionMode.VIDEO,
          schedulePolicySnapshot: PackageSchedulePolicy.ALLOW_SCHEDULE_LATER,
          priceEgpSnapshot: 100,
          selectedCurrencyCode: 'EGP',
          selectedAmountSnapshot: 270,
        },
      });
      const used = iteration % 4;
      for (const [index, sessionId] of sessionIds.entries()) {
        const start = new Date(Date.now() + (index + 2) * 86_400_000);
        await prisma.session.create({
          data: {
            id: sessionId,
            sessionCode: `RFD-${sessionId.slice(0, 8)}`,
            patientId,
            practitionerId,
            flowType: SessionFlowType.SCHEDULED,
            sessionMode: SessionMode.VIDEO,
            durationMinutes: 30,
            status: index < used ? SessionStatus.COMPLETED : SessionStatus.UPCOMING,
            requestedStartAt: start,
            scheduledStartAt: start,
            scheduledEndAt: new Date(start.getTime() + 30 * 60_000),
            expiresAt: new Date(start.getTime() + 60 * 60_000),
            packagePurchaseId: purchaseId,
            packageSessionIndex: index + 1,
            packageSessionCount: 3,
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
          status: PaymentStatus.CAPTURED,
          amountSubtotal: 300,
          amountDiscount: 30,
          amountTotal: 270,
          amountFromWallet: 0,
          amountFromGateway: 270,
          currencyCode: 'EGP',
          capturedAt: new Date(),
          providerPaymentRef: `refund-payment-${suffix}`,
          metadataJson: { packagePurchaseId: purchaseId },
        },
      });
      await prisma.patientPackagePurchase.update({
        where: { id: purchaseId },
        data: { paymentId },
      });
      await prisma.packageSettlement.create({
        data: {
          purchaseId,
          practitionerId,
          patientId,
          currencyCode: 'EGP',
          status: 'HELD',
          sessionCount: 3,
          heldPractitionerAmount: 135,
          heldPlatformAmount: 135,
        },
      });

      const preview = await policy.previewByPurchaseId(purchaseId);
      expect(preview.usedSessions).toBe(used);
      expect(preview.suggestedRefundAmount).toBe(
        `${Math.max(270 - used * 100, 0).toFixed(2)}`,
      );
      if (iteration === 0) {
        await expect(
          policy.finalize({
            purchaseId,
            actorUserId: practitionerUserId,
            finalAmount: '-1',
            reason: 'Invalid negative amount',
            idempotencyKey: `invalid-negative-${purchaseId}`,
          }),
        ).rejects.toBeDefined();
      }
      if (iteration === 1) {
        await expect(
          policy.finalize({
            purchaseId,
            actorUserId: practitionerUserId,
            finalAmount: '9999',
            reason: 'Invalid excess amount',
            idempotencyKey: `invalid-excess-${purchaseId}`,
          }),
        ).rejects.toBeDefined();
      }
      const overrideAmount =
        iteration === 4 ? '100.00' : iteration === 5 ? '260.00' : null;
      const expected = overrideAmount
        ? Number(overrideAmount)
        : Math.max(270 - used * 100, 0);
      const attempts = await Promise.allSettled([
        policy.finalize({
          purchaseId,
          actorUserId: practitionerUserId,
          finalAmount: overrideAmount,
          reason: 'Concurrent package refund review',
          idempotencyKey: `refund-race-${purchaseId}`,
        }),
        policy.finalize({
          purchaseId,
          actorUserId: practitionerUserId,
          finalAmount: overrideAmount,
          reason: 'Concurrent package refund review',
          idempotencyKey: `refund-race-other-${purchaseId}`,
        }),
      ]);
      expect(attempts.every((attempt) => attempt.status === 'fulfilled')).toBe(true);
      await expect(
        policy.finalize({
          purchaseId,
          actorUserId: practitionerUserId,
          finalAmount: overrideAmount,
          reason: 'Retry package refund review',
          idempotencyKey: `refund-race-${purchaseId}`,
        }),
      ).resolves.toBeDefined();

      const [purchase, payment, refunds, walletEntries, journalsForRefund, sessions, settlement] = await Promise.all([
        prisma.patientPackagePurchase.findUniqueOrThrow({ where: { id: purchaseId } }),
        prisma.payment.findUniqueOrThrow({ where: { id: paymentId } }),
        prisma.refund.findMany({ where: { paymentId: paymentId, metadataJson: { path: ['packagePurchaseId'], equals: purchaseId } } }),
        prisma.customerWalletEntry.findMany({ where: { patientId, entryType: 'REFUND_CREDIT' } }),
        prisma.journalEntry.findMany({ where: { sourceType: JournalEntrySourceType.REFUND_SUCCEEDED, sourceId: { contains: '' } } }),
        prisma.session.findMany({ where: { packagePurchaseId: purchaseId } }),
        prisma.packageSettlement.findUniqueOrThrow({ where: { purchaseId } }),
      ]);
      expect(purchase.status).toBe('REFUNDED');
      expect(payment.status).toBe(
        expected === 270
          ? PaymentStatus.REFUNDED
          : expected === 0
            ? PaymentStatus.CAPTURED
            : PaymentStatus.PARTIALLY_REFUNDED,
      );
      expect(refunds).toHaveLength(expected > 0 ? 1 : 0);
      if (expected > 0) {
        expect(refunds[0].destination).toBe(RefundDestination.CUSTOMER_WALLET);
        expect(refunds[0].status).toBe(RefundStatus.SUCCEEDED);
        expect(refunds[0].amount.toString()).toBe(String(expected));
      }
      expect(walletEntries).toHaveLength(expected > 0 ? 1 : 0);
      expect(sessions.filter((session) => session.status === SessionStatus.CANCELLED)).toHaveLength(3 - used);
      expect(settlement.status).toBe('REFUNDED_OR_ADJUSTED');
      if (expected > 0) {
        const refundId = refunds[0].id;
        const refundJournals = journalsForRefund.filter((entry) => entry.sourceId === refundId);
        expect(refundJournals).toHaveLength(1);
        const lines = await prisma.journalLine.findMany({ where: { journalEntryId: refundJournals[0].id } });
        const debit = lines.filter((line) => line.direction === 'DEBIT').reduce((sum, line) => sum + Number(line.amount), 0);
        const credit = lines.filter((line) => line.direction === 'CREDIT').reduce((sum, line) => sum + Number(line.amount), 0);
        expect(debit).toBeCloseTo(credit, 2);
      }
    }
  });

  it('serializes the last entitlement booking against package refund closure', async () => {
    const eg = await prisma.country.upsert({
      where: { isoCode: 'EG' },
      create: { isoCode: 'EG', name: 'Egypt', slug: 'egypt' },
      update: {},
    });
    for (let iteration = 0; iteration < 10; iteration += 1) {
      const suffix = `booking-refund-${iteration}-${randomUUID()}`;
      const patientUserId = randomUUID();
      const practitionerUserId = randomUUID();
      const patientId = randomUUID();
      const practitionerId = randomUUID();
      const planId = randomUUID();
      const purchaseId = randomUUID();
      const paymentId = randomUUID();
      const start = new Date(Date.now() + 4 * 86_400_000);
      start.setUTCHours(10, 0, 0, 0);
      const weekStart = new Date(start);
      weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
      weekStart.setUTCHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
      const weekdays = [
        AvailabilityWeekday.SUNDAY,
        AvailabilityWeekday.MONDAY,
        AvailabilityWeekday.TUESDAY,
        AvailabilityWeekday.WEDNESDAY,
        AvailabilityWeekday.THURSDAY,
        AvailabilityWeekday.FRIDAY,
        AvailabilityWeekday.SATURDAY,
      ];
      await prisma.user.createMany({ data: [
        { id: patientUserId, displayName: `Race patient ${suffix}` },
        { id: practitionerUserId, displayName: `Race practitioner ${suffix}` },
      ] });
      await prisma.patientProfile.create({ data: { id: patientId, userId: patientUserId, countryId: eg.id } });
      await prisma.practitionerProfile.create({ data: { id: practitionerId, userId: practitionerUserId, publicSlug: `race-${suffix}`, practitionerType: PractitionerType.OTHER, status: PractitionerStatus.APPROVED, countryId: eg.id, acceptsPackages: true } });
      await prisma.practitionerAvailabilityWeek.create({
        data: {
          id: randomUUID(), practitionerId, weekStartDate: weekStart, weekEndDate: weekEnd,
          timezone: 'UTC', status: AvailabilityWeekStatus.PUBLISHED, publishedAt: new Date(),
          slots: { create: { weekday: weekdays[start.getUTCDay()], startMinuteOfDay: 9 * 60, endMinuteOfDay: 18 * 60, durationMinutes: 30, timezone: 'UTC' } },
        },
      });
      await prisma.packagePlan.create({ data: { id: planId, code: `RACE_${suffix.replace(/-/g, '').slice(0, 70)}`, sessionCount: 1, discountPercent: 0, title: 'Race package', description: 'Booking versus refund' } });
      await prisma.patientPackagePurchase.create({
        data: {
          id: purchaseId, packagePlanId: planId, practitionerId, patientId, status: 'ACTIVE', paidAt: new Date(), activatedAt: new Date(),
          titleSnapshot: 'Race package', descriptionSnapshot: 'Booking versus refund', slugSnapshot: suffix, packageVersionSnapshot: 1, planIdSnapshot: planId, planCodeSnapshot: `RACE_${suffix}`,
          sessionCountSnapshot: 1, discountPercentSnapshot: 0, baseSessionPriceEgpSnapshot: 100, currencyCodeSnapshot: 'EGP', selectedBaseSessionPriceSnapshot: 100, undiscountedTotalSnapshot: 100, discountAmountSnapshot: 0, patientPayableTotalSnapshot: 100,
          platformDiscountShareSnapshot: 0, practitionerDiscountShareSnapshot: 0, commissionModeSnapshot: 'SNAPSHOT', platformOriginalShareSnapshot: 50, practitionerOriginalShareSnapshot: 50, platformFinalShareSnapshot: 50, practitionerFinalShareSnapshot: 50,
          sessionDurationMinutesSnapshot: 30, sessionModeSnapshot: SessionMode.VIDEO, schedulePolicySnapshot: PackageSchedulePolicy.ALLOW_SCHEDULE_LATER, priceEgpSnapshot: 100, selectedCurrencyCode: 'EGP', selectedAmountSnapshot: 100,
        },
      });
      await prisma.payment.create({ data: { id: paymentId, patientId, practitionerId, paymentPurpose: PaymentPurpose.SESSION_PACKAGE_PURCHASE, provider: PaymentProvider.PAYMOB, status: PaymentStatus.CAPTURED, amountSubtotal: 100, amountDiscount: 0, amountTotal: 100, amountFromWallet: 0, amountFromGateway: 100, currencyCode: 'EGP', capturedAt: new Date(), providerPaymentRef: `race-payment-${suffix}`, metadataJson: { packagePurchaseId: purchaseId } } });
      await prisma.patientPackagePurchase.update({ where: { id: purchaseId }, data: { paymentId } });
      const attempts = await Promise.allSettled([
        booking.execute({ userId: patientUserId, locale: 'en', purchaseId, scheduledStartAt: start.toISOString() }),
        policy.finalize({ purchaseId, actorUserId: practitionerUserId, reason: 'Concurrent booking/refund review', idempotencyKey: `race-command-${purchaseId}` }),
      ]);
      expect(attempts.filter((attempt) => attempt.status === 'fulfilled').length).toBeGreaterThanOrEqual(1);
      const [purchaseAfter, sessions] = await Promise.all([
        prisma.patientPackagePurchase.findUniqueOrThrow({ where: { id: purchaseId } }),
        prisma.session.findMany({ where: { packagePurchaseId: purchaseId } }),
      ]);
      if (purchaseAfter.status === 'REFUNDED') {
        expect(sessions.every((session) => session.status !== SessionStatus.UPCOMING && session.status !== SessionStatus.PENDING_PAYMENT && session.status !== SessionStatus.PENDING_PRACTITIONER_CONFIRMATION)).toBe(true);
      } else {
        expect(purchaseAfter.status).toBe('ACTIVE');
        expect(sessions).toHaveLength(1);
      }
    }
  });
});
