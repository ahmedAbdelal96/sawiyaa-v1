import {
  CouponScope,
  CouponStatus,
  DiscountType,
  LedgerDirection,
  LedgerEntryType,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  PrismaClient,
  PractitionerSettlementStatus,
  SessionFlowType,
  SessionMode,
  SessionProvider,
  SessionStatus,
  SessionPaymentCoverageType,
  SettlementBatchStatus,
  SettlementPayoutMethod,
  SettlementPayoutSource,
  WalletBalanceBucket,
} from '@prisma/client';
import { createHash } from 'crypto';
import { seedIds } from '../shared/seed.constants';
import { SeedModule } from '../shared/seed.types';
import { daysAgo, daysFromNow } from '../shared/seed.utils';

type BalanceState = {
  available: number;
  pending: number;
  reserved: number;
  lifetimeEarned: number;
  lifetimePaidOut: number;
  lastLedgerEntryAt: Date | null;
};

type BatchPlan = {
  key: string;
  periodYear: number;
  periodMonth: number;
  status: SettlementBatchStatus;
  slug: string;
  generatedAt: Date;
  finalizedAt: Date | null;
};

type SettlementPlan = {
  key: string;
  batchKey: string;
  status: PractitionerSettlementStatus;
  amountGross: number;
  amountAdjustments: number;
  amountNet: number;
  amountPaidTotal: number;
  paidAt: Date | null;
  failedAt: Date | null;
  notes: string;
  externalPayoutRef: string | null;
  payoutMethodSnapshot: Prisma.InputJsonValue | null;
  processedByUserId: string | null;
};

type SessionPaymentPlan = {
  key: string;
  patientId: string;
  daysAgo: number;
  grossAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountFromWallet: number;
  amountFromGateway: number;
  ledgerEntries: Array<{
    key: string;
    entryType: LedgerEntryType;
    direction: LedgerDirection;
    bucket: WalletBalanceBucket;
    amount: number;
    description: string;
    referenceType: string;
    referenceId: string;
    settlementKey?: string | null;
    couponKey?: string | null;
  }>;
};

type CouponPlan = {
  key: string;
  code: string;
  slug: string;
  status: CouponStatus;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  platformSharePercent: number;
  practitionerSharePercent: number;
  usageLimitTotal: number | null;
  usageLimitPerPatient: number | null;
  currentUsageCount: number;
  requiresApproval: boolean;
  approvedAt: Date | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
};

function uuid(seed: string): string {
  const h = createHash('md5').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(
    17,
    20,
  )}-${h.slice(20, 32)}`;
}

function monthKey(date: Date): { year: number; month: number } {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

function shiftMonth(date: Date, offset: number): Date {
  const shifted = new Date(date);
  shifted.setMonth(shifted.getMonth() + offset);
  return shifted;
}

function money(value: number): string {
  return value.toFixed(2);
}

function createState(): BalanceState {
  return {
    available: 0,
    pending: 0,
    reserved: 0,
    lifetimeEarned: 0,
    lifetimePaidOut: 0,
    lastLedgerEntryAt: null,
  };
}

function applyLedgerState(
  state: BalanceState,
  entry: {
    bucket: WalletBalanceBucket;
    direction: LedgerDirection;
    entryType: LedgerEntryType;
    amount: number;
    effectiveAt: Date;
  },
): void {
  const signed =
    entry.direction === LedgerDirection.CREDIT ? entry.amount : -entry.amount;

  if (entry.bucket === WalletBalanceBucket.AVAILABLE) {
    state.available += signed;
  } else if (entry.bucket === WalletBalanceBucket.PENDING) {
    state.pending += signed;
  } else if (entry.bucket === WalletBalanceBucket.RESERVED) {
    state.reserved += signed;
  }

  if (
    entry.entryType === LedgerEntryType.PRACTITIONER_EARNING &&
    entry.direction === LedgerDirection.CREDIT
  ) {
    state.lifetimeEarned += entry.amount;
  }

  if (
    entry.entryType === LedgerEntryType.SETTLEMENT_PAYOUT &&
    entry.direction === LedgerDirection.DEBIT
  ) {
    state.lifetimePaidOut += entry.amount;
  }

  if (!state.lastLedgerEntryAt || entry.effectiveAt > state.lastLedgerEntryAt) {
    state.lastLedgerEntryAt = entry.effectiveAt;
  }
}

export const practitionerFinanceSeedModule: SeedModule = {
  name: 'practitioner-finance',
  async run(prisma: PrismaClient): Promise<void> {
    const practitionerId = seedIds.practitionerProfiles.practitionerB;
    const practitionerUserId = seedIds.users.practitionerB;
    const marker = 'DEV_FINANCE_SEED | dr.mohamed finance QA';
    const currencyCode = 'EGP';
    const now = new Date();
    const currentPeriod = monthKey(now);
    const previousPeriod = monthKey(shiftMonth(now, -1));
    const olderPeriod = monthKey(shiftMonth(now, -2));

    let walletId = uuid(
      `practitioner-finance-wallet-${practitionerId}-${currencyCode}`,
    );

    const batches: BatchPlan[] = [
      {
        key: 'current',
        periodYear: currentPeriod.year,
        periodMonth: currentPeriod.month,
        status: SettlementBatchStatus.PROCESSING,
        slug: `practitioner-finance-${currentPeriod.year}-${String(
          currentPeriod.month,
        ).padStart(2, '0')}-${currencyCode.toLowerCase()}`,
        generatedAt: daysAgo(2),
        finalizedAt: null,
      },
      {
        key: 'previous',
        periodYear: previousPeriod.year,
        periodMonth: previousPeriod.month,
        status: SettlementBatchStatus.COMPLETED,
        slug: `practitioner-finance-${previousPeriod.year}-${String(
          previousPeriod.month,
        ).padStart(2, '0')}-${currencyCode.toLowerCase()}-history`,
        generatedAt: daysAgo(33),
        finalizedAt: daysAgo(4),
      },
      {
        key: 'older',
        periodYear: olderPeriod.year,
        periodMonth: olderPeriod.month,
        status: SettlementBatchStatus.FAILED,
        slug: `practitioner-finance-${olderPeriod.year}-${String(
          olderPeriod.month,
        ).padStart(2, '0')}-${currencyCode.toLowerCase()}-failed`,
        generatedAt: daysAgo(61),
        finalizedAt: daysAgo(44),
      },
    ];

    const settlements: SettlementPlan[] = [
      {
        key: 'current-ready',
        batchKey: 'current',
        status: PractitionerSettlementStatus.READY,
        amountGross: 920,
        amountAdjustments: -120,
        amountNet: 800,
        amountPaidTotal: 0,
        paidAt: null,
        failedAt: null,
        notes: `${marker} | pending payout queue`,
        externalPayoutRef: null,
        payoutMethodSnapshot: null,
        processedByUserId: null,
      },
      {
        key: 'previous-paid',
        batchKey: 'previous',
        status: PractitionerSettlementStatus.PAID,
        amountGross: 560,
        amountAdjustments: -60,
        amountNet: 500,
        amountPaidTotal: 500,
        paidAt: daysAgo(4),
        failedAt: null,
        notes: `${marker} | paid settlement history`,
        externalPayoutRef: 'DEV-FIN-PAID-2026-0001',
        payoutMethodSnapshot: {
          method: SettlementPayoutMethod.MANUAL_BANK_TRANSFER,
          source: SettlementPayoutSource.BATCH_CLOSEOUT,
          externalPayoutRef: 'DEV-FIN-PAID-2026-0001',
          notes: `${marker} | paid settlement history`,
          effectiveAt: daysAgo(4).toISOString(),
          processedByUserId: seedIds.users.superAdmin,
        },
        processedByUserId: seedIds.users.superAdmin,
      },
      {
        key: 'older-failed',
        batchKey: 'older',
        status: PractitionerSettlementStatus.FAILED,
        amountGross: 120,
        amountAdjustments: 0,
        amountNet: 120,
        amountPaidTotal: 0,
        paidAt: null,
        failedAt: daysAgo(44),
        notes: `${marker} | failed payout history`,
        externalPayoutRef: 'DEV-FIN-FAILED-2026-0001',
        payoutMethodSnapshot: null,
        processedByUserId: seedIds.users.superAdmin,
      },
    ];

    const activeCouponKey = 'active';
    const activeCouponId = uuid(`practitioner-finance-coupon-${activeCouponKey}`);
    const expiredCouponId = uuid('practitioner-finance-coupon-expired');
    const disabledCouponId = uuid('practitioner-finance-coupon-disabled');

    const coupons: Array<CouponPlan & { id: string }> = [
      {
        id: activeCouponId,
        key: activeCouponKey,
        code: 'MOHAMED10',
        slug: 'dev-finance-seed-dr-mohamed-10',
        status: CouponStatus.ACTIVE,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        maxDiscountAmount: 75,
        platformSharePercent: 50,
        practitionerSharePercent: 50,
        usageLimitTotal: 100,
        usageLimitPerPatient: 1,
        currentUsageCount: 1,
        requiresApproval: false,
        approvedAt: daysAgo(10),
        startsAt: daysAgo(10),
        endsAt: daysFromNow(30),
        isActive: true,
      },
      {
        id: expiredCouponId,
        key: 'expired',
        code: 'MOHAMED20',
        slug: 'dev-finance-seed-dr-mohamed-expired-20',
        status: CouponStatus.EXPIRED,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 20,
        maxDiscountAmount: null,
        platformSharePercent: 60,
        practitionerSharePercent: 40,
        usageLimitTotal: 25,
        usageLimitPerPatient: 1,
        currentUsageCount: 2,
        requiresApproval: false,
        approvedAt: daysAgo(40),
        startsAt: daysAgo(40),
        endsAt: daysAgo(5),
        isActive: false,
      },
      {
        id: disabledCouponId,
        key: 'disabled',
        code: 'MOHAMED15',
        slug: 'dev-finance-seed-dr-mohamed-disabled-15',
        status: CouponStatus.DISABLED,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
        maxDiscountAmount: 60,
        platformSharePercent: 45,
        practitionerSharePercent: 55,
        usageLimitTotal: 50,
        usageLimitPerPatient: 2,
        currentUsageCount: 0,
        requiresApproval: false,
        approvedAt: daysAgo(20),
        startsAt: daysAgo(20),
        endsAt: daysFromNow(15),
        isActive: false,
      },
    ];

    const sessionPlans: SessionPaymentPlan[] = [
      {
        key: 'available',
        patientId: seedIds.patientProfiles.patientA,
        daysAgo: 18,
        grossAmount: 650,
        discountAmount: 65,
        totalAmount: 585,
        amountFromWallet: 0,
        amountFromGateway: 585,
        ledgerEntries: [
          {
            key: 'available-earning',
            entryType: LedgerEntryType.PRACTITIONER_EARNING,
            direction: LedgerDirection.CREDIT,
            bucket: WalletBalanceBucket.AVAILABLE,
            amount: 585,
            description: `${marker} | دخل جلسة مكتملة`,
            referenceType: 'payment',
            referenceId: uuid('practitioner-finance-payment-available'),
          },
          {
            key: 'available-coupon-share',
            entryType: LedgerEntryType.COUPON_PRACTITIONER_SHARE,
            direction: LedgerDirection.CREDIT,
            bucket: WalletBalanceBucket.AVAILABLE,
            amount: 32.5,
            description: `${marker} | خصم كود ترويجي`,
            referenceType: 'coupon',
            referenceId: activeCouponId,
            couponKey: activeCouponKey,
          },
          {
            key: 'available-adjustment',
            entryType: LedgerEntryType.MANUAL_ADJUSTMENT,
            direction: LedgerDirection.CREDIT,
            bucket: WalletBalanceBucket.AVAILABLE,
            amount: 90,
            description: `${marker} | تعديل يدوي موجب`,
            referenceType: 'manual-adjustment',
            referenceId: uuid('practitioner-finance-adjustment-positive'),
          },
          {
            key: 'available-refund-reversal',
            entryType: LedgerEntryType.REFUND_PRACTITIONER_REVERSAL,
            direction: LedgerDirection.DEBIT,
            bucket: WalletBalanceBucket.AVAILABLE,
            amount: 100,
            description: `${marker} | عكس استرداد`,
            referenceType: 'refund',
            referenceId: uuid('practitioner-finance-refund-reversal'),
          },
        ],
      },
      {
        key: 'pending',
        patientId: seedIds.patientProfiles.patientA,
        daysAgo: 11,
        grossAmount: 300,
        discountAmount: 0,
        totalAmount: 300,
        amountFromWallet: 0,
        amountFromGateway: 300,
        ledgerEntries: [
          {
            key: 'pending-earning',
            entryType: LedgerEntryType.PRACTITIONER_EARNING,
            direction: LedgerDirection.CREDIT,
            bucket: WalletBalanceBucket.PENDING,
            amount: 300,
            description: `${marker} | دخل جلسة معلقة`,
            referenceType: 'payment',
            referenceId: uuid('practitioner-finance-payment-pending'),
          },
        ],
      },
      {
        key: 'reserved',
        patientId: seedIds.patientProfiles.patientA,
        daysAgo: 5,
        grossAmount: 800,
        discountAmount: 0,
        totalAmount: 800,
        amountFromWallet: 0,
        amountFromGateway: 800,
        ledgerEntries: [
          {
            key: 'reserved-earning',
            entryType: LedgerEntryType.PRACTITIONER_EARNING,
            direction: LedgerDirection.CREDIT,
            bucket: WalletBalanceBucket.RESERVED,
            amount: 800,
            description: `${marker} | دخل محجوز للتسوية`,
            referenceType: 'payment',
            referenceId: uuid('practitioner-finance-payment-reserved'),
            settlementKey: 'current-ready',
          },
          {
            key: 'reserved-payout',
            entryType: LedgerEntryType.SETTLEMENT_PAYOUT,
            direction: LedgerDirection.DEBIT,
            bucket: WalletBalanceBucket.RESERVED,
            amount: 500,
            description: `${marker} | صرف تسوية`,
            referenceType: 'settlement',
            referenceId: uuid('practitioner-finance-settlement-previous-paid'),
            settlementKey: 'previous-paid',
          },
          {
            key: 'reserved-reversal',
            entryType: LedgerEntryType.SETTLEMENT_REVERSAL,
            direction: LedgerDirection.DEBIT,
            bucket: WalletBalanceBucket.RESERVED,
            amount: 120,
            description: `${marker} | عكس تسوية`,
            referenceType: 'settlement',
            referenceId: uuid('practitioner-finance-settlement-older-failed'),
            settlementKey: 'older-failed',
          },
        ],
      },
    ];

    const walletStateByCurrency = new Map<string, BalanceState>();
    walletStateByCurrency.set(currencyCode, createState());

    const batchIdByKey = new Map<string, string>();
    const settlementIdByKey = new Map<string, string>();
    const couponIdByKey = new Map<string, string>([
      [activeCouponKey, activeCouponId],
      ['expired', expiredCouponId],
      ['disabled', disabledCouponId],
    ]);

    await prisma.$transaction(async (tx) => {
      const wallet = await tx.practitionerWallet.upsert({
        where: {
          practitionerId_currencyCode: {
            practitionerId,
            currencyCode,
          },
        },
        create: {
          id: walletId,
          practitionerId,
          currencyCode,
          availableBalance: '0.00',
          pendingBalance: '0.00',
          reservedBalance: '0.00',
          lifetimeEarned: '0.00',
          lifetimePaidOut: '0.00',
          lastLedgerEntryAt: null,
        },
        update: {
          availableBalance: '0.00',
          pendingBalance: '0.00',
          reservedBalance: '0.00',
          lifetimeEarned: '0.00',
          lifetimePaidOut: '0.00',
          lastLedgerEntryAt: null,
        },
      });
      walletId = wallet.id;

      for (const batch of batches) {
        const id = uuid(`practitioner-finance-batch-${batch.key}`);
        const batchRecord = await tx.settlementBatch.upsert({
          where: {
            periodYear_periodMonth_currencyCode: {
              periodYear: batch.periodYear,
              periodMonth: batch.periodMonth,
              currencyCode,
            },
          },
          create: {
            id,
            periodYear: batch.periodYear,
            periodMonth: batch.periodMonth,
            currencyCode,
            status: batch.status,
            slug: batch.slug,
            generatedAt: batch.generatedAt,
            finalizedAt: batch.finalizedAt,
          },
          update: {
            status: batch.status,
            slug: batch.slug,
            generatedAt: batch.generatedAt,
            finalizedAt: batch.finalizedAt,
          },
        });
        batchIdByKey.set(batch.key, batchRecord.id);
      }

      for (const settlement of settlements) {
        const batchId = batchIdByKey.get(settlement.batchKey);
        if (!batchId) {
          throw new Error(
            `[seed:practitioner-finance] missing batch id for settlement ${settlement.key}`,
          );
        }

        const settlementId = uuid(
          `practitioner-finance-settlement-${settlement.key}`,
        );

        const settlementRecord = await tx.practitionerSettlement.upsert({
          where: {
            batchId_practitionerId: {
              batchId,
              practitionerId,
            },
          },
          create: {
            id: settlementId,
            batchId,
            practitionerId,
            walletId,
            amountGross: money(settlement.amountGross),
            amountAdjustments: money(settlement.amountAdjustments),
            amountNet: money(settlement.amountNet),
            amountPaidTotal: money(settlement.amountPaidTotal),
            currencyCode,
            payoutMethodSnapshot:
              settlement.payoutMethodSnapshot ?? Prisma.JsonNull,
            externalPayoutRef: settlement.externalPayoutRef,
            status: settlement.status,
            paidAt: settlement.paidAt,
            failedAt: settlement.failedAt,
            notes: settlement.notes,
          },
          update: {
            walletId,
            amountGross: money(settlement.amountGross),
            amountAdjustments: money(settlement.amountAdjustments),
            amountNet: money(settlement.amountNet),
            amountPaidTotal: money(settlement.amountPaidTotal),
            currencyCode,
            payoutMethodSnapshot:
              settlement.payoutMethodSnapshot ?? Prisma.JsonNull,
            externalPayoutRef: settlement.externalPayoutRef,
            status: settlement.status,
            paidAt: settlement.paidAt,
            failedAt: settlement.failedAt,
            notes: settlement.notes,
          },
        });
        settlementIdByKey.set(settlement.key, settlementRecord.id);
      }

      for (const coupon of coupons) {
        const couponRecord = await tx.coupon.upsert({
          where: { code: coupon.code },
          create: {
            id: coupon.id,
            code: coupon.code,
            slug: coupon.slug,
            createdByUserId: practitionerUserId,
            ownerPractitionerId: practitionerId,
            approvedByUserId: seedIds.users.superAdmin,
            couponScope: CouponScope.PRACTITIONER_SESSIONS,
            status: coupon.status,
            discountType: coupon.discountType,
            discountValue: money(coupon.discountValue),
            maxDiscountAmount:
              coupon.maxDiscountAmount === null
                ? null
                : money(coupon.maxDiscountAmount),
            platformSharePercent: money(coupon.platformSharePercent),
            practitionerSharePercent: money(coupon.practitionerSharePercent),
            usageLimitTotal: coupon.usageLimitTotal,
            usageLimitPerPatient: coupon.usageLimitPerPatient,
            currentUsageCount: coupon.currentUsageCount,
            requiresApproval: coupon.requiresApproval,
            approvedAt: coupon.approvedAt,
            startsAt: coupon.startsAt,
            endsAt: coupon.endsAt,
            isActive: coupon.isActive,
          },
          update: {
            slug: coupon.slug,
            createdByUserId: practitionerUserId,
            ownerPractitionerId: practitionerId,
            approvedByUserId: seedIds.users.superAdmin,
            couponScope: CouponScope.PRACTITIONER_SESSIONS,
            status: coupon.status,
            discountType: coupon.discountType,
            discountValue: money(coupon.discountValue),
            maxDiscountAmount:
              coupon.maxDiscountAmount === null
                ? null
                : money(coupon.maxDiscountAmount),
            platformSharePercent: money(coupon.platformSharePercent),
            practitionerSharePercent: money(coupon.practitionerSharePercent),
            usageLimitTotal: coupon.usageLimitTotal,
            usageLimitPerPatient: coupon.usageLimitPerPatient,
            currentUsageCount: coupon.currentUsageCount,
            requiresApproval: coupon.requiresApproval,
            approvedAt: coupon.approvedAt,
            startsAt: coupon.startsAt,
            endsAt: coupon.endsAt,
            isActive: coupon.isActive,
          },
        });
        couponIdByKey.set(coupon.key, couponRecord.id);
      }

      for (const plan of sessionPlans) {
        const sessionId = uuid(`practitioner-finance-session-${plan.key}`);
        const paymentId = uuid(`practitioner-finance-payment-${plan.key}`);
        const sessionStartAt = daysAgo(plan.daysAgo);
        const sessionEndAt = new Date(sessionStartAt.getTime() + 60 * 60 * 1000);
        const paymentDate = daysAgo(plan.daysAgo);
        const activeCoupon = couponIdByKey.get(activeCouponKey)!;
        const couponSnapshot =
          plan.key === 'available'
            ? {
                couponId: activeCoupon,
                couponCodeSnapshot: 'MOHAMED10',
                couponDiscountSnapshot: money(plan.discountAmount),
                couponPlatformShareSnapshot: money(50),
                couponPractitionerShareSnapshot: money(50),
              }
            : {
                couponId: null,
                couponCodeSnapshot: null,
                couponDiscountSnapshot: null,
                couponPlatformShareSnapshot: null,
                couponPractitionerShareSnapshot: null,
              };

        await tx.session.upsert({
          where: { id: sessionId },
          create: {
            id: sessionId,
            sessionCode: `QA-FIN-${plan.key.toUpperCase()}-${practitionerId.slice(-4)}`,
            patientId: plan.patientId,
            practitionerId,
            flowType: SessionFlowType.SCHEDULED,
            sessionMode: SessionMode.VIDEO,
            durationMinutes: 60,
            status: SessionStatus.COMPLETED,
            requestedStartAt: sessionStartAt,
            scheduledStartAt: sessionStartAt,
            scheduledEndAt: sessionEndAt,
            joinOpenAt: new Date(sessionStartAt.getTime() - 10 * 60 * 1000),
            completedAt: sessionEndAt,
            cancelledAt: null,
            timezoneSnapshot: 'Africa/Cairo',
            provider: SessionProvider.DAILY,
            providerRoomId: `dev-finance-room-${plan.key}`,
            providerSessionRef: `dev-finance-provider-${plan.key}`,
            notesInternal: `${marker} | session ${plan.key}`,
            paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT,
          },
          update: {
            sessionCode: `QA-FIN-${plan.key.toUpperCase()}-${practitionerId.slice(-4)}`,
            patientId: plan.patientId,
            practitionerId,
            flowType: SessionFlowType.SCHEDULED,
            sessionMode: SessionMode.VIDEO,
            durationMinutes: 60,
            status: SessionStatus.COMPLETED,
            requestedStartAt: sessionStartAt,
            scheduledStartAt: sessionStartAt,
            scheduledEndAt: sessionEndAt,
            joinOpenAt: new Date(sessionStartAt.getTime() - 10 * 60 * 1000),
            completedAt: sessionEndAt,
            cancelledAt: null,
            timezoneSnapshot: 'Africa/Cairo',
            provider: SessionProvider.DAILY,
            providerRoomId: `dev-finance-room-${plan.key}`,
            providerSessionRef: `dev-finance-provider-${plan.key}`,
            notesInternal: `${marker} | session ${plan.key}`,
            paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT,
          },
        });

        await tx.payment.upsert({
          where: { id: paymentId },
          create: {
            id: paymentId,
            sessionId,
            patientId: plan.patientId,
            practitionerId,
            paymentPurpose: PaymentPurpose.SESSION_BOOKING,
            provider: PaymentProvider.PAYMOB,
            status: PaymentStatus.CAPTURED,
            amountSubtotal: money(plan.grossAmount),
            amountDiscount: money(plan.discountAmount),
            amountTotal: money(plan.totalAmount),
            amountFromWallet: money(plan.amountFromWallet),
            amountFromGateway: money(plan.amountFromGateway),
            currencyCode,
            ...couponSnapshot,
            providerPaymentRef: `dev-finance-payment-${plan.key}`,
            providerOrderRef: `dev-finance-order-${plan.key}`,
            providerCustomerRef: `dev-finance-customer-${plan.patientId.slice(-6)}`,
            initiatedAt: paymentDate,
            authorizedAt: paymentDate,
            capturedAt: paymentDate,
            failedAt: null,
            cancelledAt: null,
            expiredAt: null,
            metadataJson: {
              seed: 'DEV_FINANCE_SEED',
              scenario: 'dr.mohamed finance QA',
              plan: plan.key,
            },
          },
          update: {
            sessionId,
            patientId: plan.patientId,
            practitionerId,
            paymentPurpose: PaymentPurpose.SESSION_BOOKING,
            provider: PaymentProvider.PAYMOB,
            status: PaymentStatus.CAPTURED,
            amountSubtotal: money(plan.grossAmount),
            amountDiscount: money(plan.discountAmount),
            amountTotal: money(plan.totalAmount),
            amountFromWallet: money(plan.amountFromWallet),
            amountFromGateway: money(plan.amountFromGateway),
            currencyCode,
            ...couponSnapshot,
            providerPaymentRef: `dev-finance-payment-${plan.key}`,
            providerOrderRef: `dev-finance-order-${plan.key}`,
            providerCustomerRef: `dev-finance-customer-${plan.patientId.slice(-6)}`,
            initiatedAt: paymentDate,
            authorizedAt: paymentDate,
            capturedAt: paymentDate,
            failedAt: null,
            cancelledAt: null,
            expiredAt: null,
            metadataJson: {
              seed: 'DEV_FINANCE_SEED',
              scenario: 'dr.mohamed finance QA',
              plan: plan.key,
            },
          },
        });

        for (const ledgerEntry of plan.ledgerEntries) {
          const ledgerId = uuid(`practitioner-finance-ledger-${ledgerEntry.key}`);
          const paymentRefId = paymentId;
          const settlementId = ledgerEntry.settlementKey
            ? (settlementIdByKey.get(ledgerEntry.settlementKey) ?? null)
            : null;

          const createdEntry = {
            id: ledgerId,
            practitionerId,
            sessionId,
            paymentId: paymentRefId,
            settlementId,
            entryType: ledgerEntry.entryType,
            direction: ledgerEntry.direction,
            amount: money(ledgerEntry.amount),
            currencyCode,
            balanceBucket: ledgerEntry.bucket,
            referenceType: ledgerEntry.referenceType,
            referenceId: ledgerEntry.referenceId,
            description: ledgerEntry.description,
            effectiveAt: sessionStartAt,
            metadataJson: {
              seed: 'DEV_FINANCE_SEED',
              scenario: 'dr.mohamed finance QA',
              ledgerKey: ledgerEntry.key,
              plan: plan.key,
            },
          };

          await tx.ledgerEntry.upsert({
            where: { id: ledgerId },
            create: createdEntry,
            update: createdEntry,
          });

          applyLedgerState(walletStateByCurrency.get(currencyCode)!, {
            bucket: ledgerEntry.bucket,
            direction: ledgerEntry.direction,
            entryType: ledgerEntry.entryType,
            amount: ledgerEntry.amount,
            effectiveAt: sessionStartAt,
          });
        }

        if (plan.key === 'available') {
          const redemptionId = uuid('practitioner-finance-coupon-redemption-active');
          await tx.couponRedemption.upsert({
            where: { id: redemptionId },
            create: {
              id: redemptionId,
              couponId: activeCoupon,
              sessionId,
              paymentId,
              patientId: plan.patientId,
              practitionerId,
              currencyCode,
              grossAmount: money(plan.grossAmount),
              discountAmount: money(plan.discountAmount),
              platformDiscountShare: money(32.5),
              practitionerDiscountShare: money(32.5),
              redeemedAt: daysAgo(plan.daysAgo),
            },
            update: {
              couponId: activeCoupon,
              sessionId,
              paymentId,
              patientId: plan.patientId,
              practitionerId,
              currencyCode,
              grossAmount: money(plan.grossAmount),
              discountAmount: money(plan.discountAmount),
              platformDiscountShare: money(32.5),
              practitionerDiscountShare: money(32.5),
              redeemedAt: daysAgo(plan.daysAgo),
            },
          });
        }
      }

    const paidSettlement = settlementIdByKey.get('previous-paid');
      const paidBatchId = batchIdByKey.get('previous');
      if (!paidSettlement || !paidBatchId) {
        throw new Error(
          '[seed:practitioner-finance] missing paid settlement or batch id',
        );
      }

      const payoutId = uuid('practitioner-finance-settlement-payout-paid');
      await tx.practitionerSettlementPayout.upsert({
        where: { id: payoutId },
        create: {
          id: payoutId,
          batchId: paidBatchId,
          settlementId: paidSettlement,
          practitionerId,
          amountPaid: money(500),
          currencyCode,
          payoutMethod: SettlementPayoutMethod.MANUAL_BANK_TRANSFER,
          payoutSource: SettlementPayoutSource.BATCH_CLOSEOUT,
          payoutMethodSnapshot: {
            method: SettlementPayoutMethod.MANUAL_BANK_TRANSFER,
            source: SettlementPayoutSource.BATCH_CLOSEOUT,
            externalPayoutRef: 'DEV-FIN-PAID-2026-0001',
            notes: `${marker} | paid settlement history`,
            effectiveAt: daysAgo(4).toISOString(),
            processedByUserId: seedIds.users.superAdmin,
          },
          externalPayoutRef: 'DEV-FIN-PAID-2026-0001',
          notes: `${marker} | paid settlement history`,
          effectiveAt: daysAgo(4),
          processedByUserId: seedIds.users.superAdmin,
        },
        update: {
          batchId: paidBatchId,
          settlementId: paidSettlement,
          practitionerId,
          amountPaid: money(500),
          currencyCode,
          payoutMethod: SettlementPayoutMethod.MANUAL_BANK_TRANSFER,
          payoutSource: SettlementPayoutSource.BATCH_CLOSEOUT,
          payoutMethodSnapshot: {
            method: SettlementPayoutMethod.MANUAL_BANK_TRANSFER,
            source: SettlementPayoutSource.BATCH_CLOSEOUT,
            externalPayoutRef: 'DEV-FIN-PAID-2026-0001',
            notes: `${marker} | paid settlement history`,
            effectiveAt: daysAgo(4).toISOString(),
            processedByUserId: seedIds.users.superAdmin,
          },
          externalPayoutRef: 'DEV-FIN-PAID-2026-0001',
          notes: `${marker} | paid settlement history`,
          effectiveAt: daysAgo(4),
          processedByUserId: seedIds.users.superAdmin,
        },
      });

      const walletState = walletStateByCurrency.get(currencyCode)!;
      await tx.practitionerWallet.upsert({
        where: {
          practitionerId_currencyCode: {
            practitionerId,
            currencyCode,
          },
        },
        create: {
          id: walletId,
          practitionerId,
          currencyCode,
          availableBalance: money(walletState.available),
          pendingBalance: money(walletState.pending),
          reservedBalance: money(walletState.reserved),
          lifetimeEarned: money(walletState.lifetimeEarned),
          lifetimePaidOut: money(walletState.lifetimePaidOut),
          lastLedgerEntryAt: walletState.lastLedgerEntryAt,
        },
        update: {
          availableBalance: money(walletState.available),
          pendingBalance: money(walletState.pending),
          reservedBalance: money(walletState.reserved),
          lifetimeEarned: money(walletState.lifetimeEarned),
          lifetimePaidOut: money(walletState.lifetimePaidOut),
          lastLedgerEntryAt: walletState.lastLedgerEntryAt,
        },
      });
    });

    console.log(
      '[seed:practitioner-finance] seeded dr.mohamed finance QA wallet, ledger, settlements, and promo codes',
    );
  },
};
