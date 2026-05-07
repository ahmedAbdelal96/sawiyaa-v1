import {
  LedgerDirection,
  LedgerEntryType,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  PrismaClient,
  SessionFlowType,
  SessionMode,
  SessionProvider,
  SessionStatus,
  SettlementBatchStatus,
  SettlementPayoutMethod,
  SettlementPayoutSource,
  PractitionerSettlementStatus,
  WalletBalanceBucket,
} from '@prisma/client';
import { createHash } from 'crypto';
import { seedIds } from '../shared/seed.constants';
import { SeedModule } from '../shared/seed.types';
import { daysAgo } from '../shared/seed.utils';

type BalanceState = {
  available: number;
  reserved: number;
  lifetimeEarned: number;
  lifetimePaidOut: number;
  lastLedgerEntryAt: Date | null;
};

type PractitionerLabSettlement = {
  key: string;
  practitionerId: string;
  status: PractitionerSettlementStatus;
  amountNet: number;
  effectiveAt: Date;
  paidAt: Date | null;
  externalPayoutRef: string | null;
  notes: string;
  payoutMethodSnapshot: Prisma.InputJsonValue | null;
  processedByUserId: string | null;
};

type PractitionerLabSession = {
  patientId: string;
  sessionSuffix: string;
  daysAgo: number;
  subtotal: number;
  discount: number;
  bucket: WalletBalanceBucket;
  settlementKey?: string;
};

type PractitionerLabPlan = {
  practitionerId: string;
  walletId: string;
  currentSettlement: PractitionerLabSettlement;
  historicalSettlement?: PractitionerLabSettlement;
  sessions: PractitionerLabSession[];
};

function uuid(seed: string): string {
  const h = createHash('md5').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
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

export const settlementsLabSeedModule: SeedModule = {
  name: 'settlements-lab',
  async run(prisma: PrismaClient): Promise<void> {
    const currencyCode = 'USD';
    const now = new Date();
    const currentPeriod = monthKey(now);
    const previousPeriod = monthKey(shiftMonth(now, -1));

    const currentBatchId = uuid(
      `settlements-lab-batch-${currentPeriod.year}-${currentPeriod.month}-${currencyCode}`,
    );
    const historicalBatchId = uuid(
      `settlements-lab-historical-batch-${previousPeriod.year}-${previousPeriod.month}-${currencyCode}`,
    );

    const currentBatchSlug = `settlement-lab-${currentPeriod.year}-${String(currentPeriod.month).padStart(2, '0')}-${currencyCode.toLowerCase()}`;
    const historicalBatchSlug = `settlement-lab-${previousPeriod.year}-${String(previousPeriod.month).padStart(2, '0')}-${currencyCode.toLowerCase()}-history`;

    const practitionerPlans: PractitionerLabPlan[] = [
      {
        practitionerId: seedIds.practitionerProfiles.practitionerB,
        walletId: uuid(
          `settlements-lab-wallet-${seedIds.practitionerProfiles.practitionerB}-${currencyCode}`,
        ),
        currentSettlement: {
          key: 'b-current',
          practitionerId: seedIds.practitionerProfiles.practitionerB,
          status: PractitionerSettlementStatus.READY,
          amountNet: 750,
          effectiveAt: daysAgo(9),
          paidAt: null,
          externalPayoutRef: null,
          notes: 'Seed due settlement for payout testing.',
          payoutMethodSnapshot: null,
          processedByUserId: null,
        },
        sessions: [
          {
            patientId: seedIds.patientProfiles.patientA,
            sessionSuffix: 'b-1',
            daysAgo: 12,
            subtotal: 1000,
            discount: 0,
            bucket: WalletBalanceBucket.RESERVED,
            settlementKey: 'b-current',
          },
          {
            patientId: seedIds.patientProfiles.patientB,
            sessionSuffix: 'b-2',
            daysAgo: 8,
            subtotal: 800,
            discount: 0,
            bucket: WalletBalanceBucket.AVAILABLE,
          },
          {
            patientId: seedIds.patientProfiles.patientA,
            sessionSuffix: 'b-3',
            daysAgo: 6,
            subtotal: 1200,
            discount: 0,
            bucket: WalletBalanceBucket.AVAILABLE,
          },
        ],
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerE,
        walletId: uuid(
          `settlements-lab-wallet-${seedIds.practitionerProfiles.practitionerE}-${currencyCode}`,
        ),
        currentSettlement: {
          key: 'e-current',
          practitionerId: seedIds.practitionerProfiles.practitionerE,
          status: PractitionerSettlementStatus.READY,
          amountNet: 675,
          effectiveAt: daysAgo(11),
          paidAt: null,
          externalPayoutRef: null,
          notes: 'Seed due settlement for payout testing.',
          payoutMethodSnapshot: null,
          processedByUserId: null,
        },
        historicalSettlement: {
          key: 'e-history',
          practitionerId: seedIds.practitionerProfiles.practitionerE,
          status: PractitionerSettlementStatus.PAID,
          amountNet: 750,
          effectiveAt: daysAgo(33),
          paidAt: daysAgo(2),
          externalPayoutRef: 'LAB-USD-PAID-0001',
          notes: 'Seed payout history for settlement testing.',
          payoutMethodSnapshot: {
            method: SettlementPayoutMethod.MANUAL_BANK_TRANSFER,
            source: SettlementPayoutSource.BATCH_CLOSEOUT,
            externalPayoutRef: 'LAB-USD-PAID-0001',
            notes: 'Seed payout history for settlement testing.',
            effectiveAt: daysAgo(2).toISOString(),
            processedByUserId: seedIds.users.superAdmin,
          },
          processedByUserId: seedIds.users.superAdmin,
        },
        sessions: [
          {
            patientId: seedIds.patientProfiles.patientA,
            sessionSuffix: 'e-1',
            daysAgo: 33,
            subtotal: 1000,
            discount: 0,
            bucket: WalletBalanceBucket.RESERVED,
            settlementKey: 'e-history',
          },
          {
            patientId: seedIds.patientProfiles.patientB,
            sessionSuffix: 'e-2',
            daysAgo: 11,
            subtotal: 900,
            discount: 0,
            bucket: WalletBalanceBucket.RESERVED,
            settlementKey: 'e-current',
          },
          {
            patientId: seedIds.patientProfiles.patientA,
            sessionSuffix: 'e-3',
            daysAgo: 7,
            subtotal: 800,
            discount: 0,
            bucket: WalletBalanceBucket.AVAILABLE,
          },
          {
            patientId: seedIds.patientProfiles.patientB,
            sessionSuffix: 'e-4',
            daysAgo: 5,
            subtotal: 1200,
            discount: 0,
            bucket: WalletBalanceBucket.AVAILABLE,
          },
        ],
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerF,
        walletId: uuid(
          `settlements-lab-wallet-${seedIds.practitionerProfiles.practitionerF}-${currencyCode}`,
        ),
        currentSettlement: {
          key: 'f-current',
          practitionerId: seedIds.practitionerProfiles.practitionerF,
          status: PractitionerSettlementStatus.READY,
          amountNet: 900,
          effectiveAt: daysAgo(10),
          paidAt: null,
          externalPayoutRef: null,
          notes: 'Seed due settlement for payout testing.',
          payoutMethodSnapshot: null,
          processedByUserId: null,
        },
        sessions: [
          {
            patientId: seedIds.patientProfiles.patientA,
            sessionSuffix: 'f-1',
            daysAgo: 10,
            subtotal: 1200,
            discount: 0,
            bucket: WalletBalanceBucket.RESERVED,
            settlementKey: 'f-current',
          },
          {
            patientId: seedIds.patientProfiles.patientB,
            sessionSuffix: 'f-2',
            daysAgo: 8,
            subtotal: 900,
            discount: 0,
            bucket: WalletBalanceBucket.AVAILABLE,
          },
          {
            patientId: seedIds.patientProfiles.patientA,
            sessionSuffix: 'f-3',
            daysAgo: 4,
            subtotal: 1000,
            discount: 0,
            bucket: WalletBalanceBucket.AVAILABLE,
          },
        ],
      },
    ];

    const walletStates = new Map<string, BalanceState>();
    const planByPractitionerId = new Map<string, PractitionerLabPlan>();
    const settlementByKey = new Map<string, PractitionerLabSettlement>();
    const settlementIdByKey = new Map<string, string>();
    const walletIdByPractitionerId = new Map<string, string>();

    for (const plan of practitionerPlans) {
      walletStates.set(plan.practitionerId, createState());
      planByPractitionerId.set(plan.practitionerId, plan);
      settlementByKey.set(plan.currentSettlement.key, plan.currentSettlement);
      if (plan.historicalSettlement) {
        settlementByKey.set(
          plan.historicalSettlement.key,
          plan.historicalSettlement,
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const plan of practitionerPlans) {
        const wallet = await tx.practitionerWallet.upsert({
          where: {
            practitionerId_currencyCode: {
              practitionerId: plan.practitionerId,
              currencyCode,
            },
          },
          create: {
            practitionerId: plan.practitionerId,
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
        walletIdByPractitionerId.set(plan.practitionerId, wallet.id);
      }

      const currentBatch = await tx.settlementBatch.upsert({
        where: {
          periodYear_periodMonth_currencyCode: {
            periodYear: currentPeriod.year,
            periodMonth: currentPeriod.month,
            currencyCode,
          },
        },
        create: {
          id: currentBatchId,
          periodYear: currentPeriod.year,
          periodMonth: currentPeriod.month,
          currencyCode,
          status: SettlementBatchStatus.PROCESSING,
          slug: currentBatchSlug,
          generatedAt: daysAgo(3),
          finalizedAt: null,
        },
        update: {
          status: SettlementBatchStatus.PROCESSING,
          slug: currentBatchSlug,
          generatedAt: daysAgo(3),
          finalizedAt: null,
        },
      });

      const historicalBatch = await tx.settlementBatch.upsert({
        where: {
          periodYear_periodMonth_currencyCode: {
            periodYear: previousPeriod.year,
            periodMonth: previousPeriod.month,
            currencyCode,
          },
        },
        create: {
          id: historicalBatchId,
          periodYear: previousPeriod.year,
          periodMonth: previousPeriod.month,
          currencyCode,
          status: SettlementBatchStatus.COMPLETED,
          slug: historicalBatchSlug,
          generatedAt: daysAgo(36),
          finalizedAt: daysAgo(2),
        },
        update: {
          status: SettlementBatchStatus.COMPLETED,
          slug: historicalBatchSlug,
          generatedAt: daysAgo(36),
          finalizedAt: daysAgo(2),
        },
      });

      for (const plan of practitionerPlans) {
        const currentSettlementSnapshot =
          plan.currentSettlement.payoutMethodSnapshot ?? Prisma.JsonNull;
        const walletId = walletIdByPractitionerId.get(plan.practitionerId);
        if (!walletId) {
          throw new Error(
            '[seed:settlements-lab] missing wallet id for current settlement',
          );
        }
        const currentSettlement = await tx.practitionerSettlement.upsert({
          where: {
            batchId_practitionerId: {
              batchId: currentBatch.id,
              practitionerId: plan.practitionerId,
            },
          },
          create: {
            batchId: currentBatch.id,
            practitionerId: plan.practitionerId,
            walletId,
            amountGross: money(plan.currentSettlement.amountNet),
            amountAdjustments: '0.00',
            amountNet: money(plan.currentSettlement.amountNet),
            currencyCode,
            status: plan.currentSettlement.status,
            paidAt: plan.currentSettlement.paidAt,
            failedAt: null,
            notes: plan.currentSettlement.notes,
            externalPayoutRef: plan.currentSettlement.externalPayoutRef,
            payoutMethodSnapshot: currentSettlementSnapshot,
          },
          update: {
            walletId,
            amountGross: money(plan.currentSettlement.amountNet),
            amountAdjustments: '0.00',
            amountNet: money(plan.currentSettlement.amountNet),
            status: plan.currentSettlement.status,
            paidAt: plan.currentSettlement.paidAt,
            failedAt: null,
            notes: plan.currentSettlement.notes,
            externalPayoutRef: plan.currentSettlement.externalPayoutRef,
            payoutMethodSnapshot: currentSettlementSnapshot,
          },
        });
        settlementIdByKey.set(plan.currentSettlement.key, currentSettlement.id);

        if (plan.historicalSettlement) {
          const historicalSettlementSnapshot =
            plan.historicalSettlement.payoutMethodSnapshot ?? Prisma.JsonNull;
          const historicalWalletId = walletIdByPractitionerId.get(
            plan.practitionerId,
          );
          if (!historicalWalletId) {
            throw new Error(
              '[seed:settlements-lab] missing wallet id for historical settlement',
            );
          }
          const historicalSettlement = await tx.practitionerSettlement.upsert({
            where: {
              batchId_practitionerId: {
                batchId: historicalBatch.id,
                practitionerId: plan.practitionerId,
              },
            },
            create: {
              batchId: historicalBatch.id,
              practitionerId: plan.practitionerId,
              walletId: historicalWalletId,
              amountGross: money(plan.historicalSettlement.amountNet),
              amountAdjustments: '0.00',
              amountNet: money(plan.historicalSettlement.amountNet),
              currencyCode,
              status: plan.historicalSettlement.status,
              paidAt: plan.historicalSettlement.paidAt,
              failedAt: null,
              notes: plan.historicalSettlement.notes,
              externalPayoutRef: plan.historicalSettlement.externalPayoutRef,
              payoutMethodSnapshot: historicalSettlementSnapshot,
            },
            update: {
              walletId: historicalWalletId,
              amountGross: money(plan.historicalSettlement.amountNet),
              amountAdjustments: '0.00',
              amountNet: money(plan.historicalSettlement.amountNet),
              status: plan.historicalSettlement.status,
              paidAt: plan.historicalSettlement.paidAt,
              failedAt: null,
              notes: plan.historicalSettlement.notes,
              externalPayoutRef: plan.historicalSettlement.externalPayoutRef,
              payoutMethodSnapshot: historicalSettlementSnapshot,
            },
          });
          settlementIdByKey.set(
            plan.historicalSettlement.key,
            historicalSettlement.id,
          );
        }
      }

      for (const plan of practitionerPlans) {
        for (const sessionPlan of plan.sessions) {
          const sessionId = uuid(
            `settlements-lab-session-${plan.practitionerId}-${sessionPlan.sessionSuffix}`,
          );
          const paymentId = uuid(
            `settlements-lab-payment-${plan.practitionerId}-${sessionPlan.sessionSuffix}`,
          );
          const sessionDate = daysAgo(sessionPlan.daysAgo);
          const endAt = new Date(sessionDate.getTime() + 45 * 60 * 1000);
          const subtotal = sessionPlan.subtotal;
          const discount = sessionPlan.discount;
          const total = subtotal - discount;
          const earnings = Math.round(total * 0.75);
          const settlementId = sessionPlan.settlementKey
            ? (settlementIdByKey.get(sessionPlan.settlementKey) ?? null)
            : null;

          await tx.session.upsert({
            where: { id: sessionId },
            create: {
              id: sessionId,
              sessionCode: `SES-LAB-${plan.practitionerId.slice(-4)}-${sessionPlan.sessionSuffix.toUpperCase()}`,
              patientId: sessionPlan.patientId,
              practitionerId: plan.practitionerId,
              flowType: SessionFlowType.SCHEDULED,
              sessionMode: SessionMode.VIDEO,
              durationMinutes: 45,
              status: SessionStatus.COMPLETED,
              requestedStartAt: sessionDate,
              scheduledStartAt: sessionDate,
              scheduledEndAt: endAt,
              joinOpenAt: new Date(sessionDate.getTime() - 10 * 60 * 1000),
              completedAt: endAt,
              cancelledAt: null,
              timezoneSnapshot: 'Africa/Cairo',
              provider: SessionProvider.DAILY,
              providerRoomId: `lab-room-${plan.practitionerId.slice(-6)}-${sessionPlan.sessionSuffix}`,
              providerSessionRef: `lab-provider-session-${plan.practitionerId.slice(-6)}-${sessionPlan.sessionSuffix}`,
            },
            update: {
              sessionCode: `SES-LAB-${plan.practitionerId.slice(-4)}-${sessionPlan.sessionSuffix.toUpperCase()}`,
              patientId: sessionPlan.patientId,
              practitionerId: plan.practitionerId,
              flowType: SessionFlowType.SCHEDULED,
              sessionMode: SessionMode.VIDEO,
              durationMinutes: 45,
              status: SessionStatus.COMPLETED,
              requestedStartAt: sessionDate,
              scheduledStartAt: sessionDate,
              scheduledEndAt: endAt,
              joinOpenAt: new Date(sessionDate.getTime() - 10 * 60 * 1000),
              completedAt: endAt,
              cancelledAt: null,
              timezoneSnapshot: 'Africa/Cairo',
              provider: SessionProvider.DAILY,
              providerRoomId: `lab-room-${plan.practitionerId.slice(-6)}-${sessionPlan.sessionSuffix}`,
              providerSessionRef: `lab-provider-session-${plan.practitionerId.slice(-6)}-${sessionPlan.sessionSuffix}`,
            },
          });

          await tx.payment.upsert({
            where: { id: paymentId },
            create: {
              id: paymentId,
              sessionId,
              patientId: sessionPlan.patientId,
              practitionerId: plan.practitionerId,
              paymentPurpose: PaymentPurpose.SESSION_BOOKING,
              provider: PaymentProvider.STRIPE,
              status: PaymentStatus.CAPTURED,
              amountSubtotal: money(subtotal),
              amountDiscount: money(discount),
              amountTotal: money(total),
              currencyCode,
              providerPaymentRef: `lab-payment-ref-${plan.practitionerId.slice(-6)}-${sessionPlan.sessionSuffix}`,
              providerOrderRef: `lab-order-ref-${plan.practitionerId.slice(-6)}-${sessionPlan.sessionSuffix}`,
              providerCustomerRef: `lab-customer-ref-${plan.practitionerId.slice(-6)}`,
              initiatedAt: sessionDate,
              authorizedAt: sessionDate,
              capturedAt: sessionDate,
              failedAt: null,
              cancelledAt: null,
              expiredAt: null,
            },
            update: {
              sessionId,
              patientId: sessionPlan.patientId,
              practitionerId: plan.practitionerId,
              paymentPurpose: PaymentPurpose.SESSION_BOOKING,
              provider: PaymentProvider.STRIPE,
              status: PaymentStatus.CAPTURED,
              amountSubtotal: money(subtotal),
              amountDiscount: money(discount),
              amountTotal: money(total),
              currencyCode,
              providerPaymentRef: `lab-payment-ref-${plan.practitionerId.slice(-6)}-${sessionPlan.sessionSuffix}`,
              providerOrderRef: `lab-order-ref-${plan.practitionerId.slice(-6)}-${sessionPlan.sessionSuffix}`,
              providerCustomerRef: `lab-customer-ref-${plan.practitionerId.slice(-6)}`,
              initiatedAt: sessionDate,
              authorizedAt: sessionDate,
              capturedAt: sessionDate,
              failedAt: null,
              cancelledAt: null,
              expiredAt: null,
            },
          });

          await tx.paymentEvent.upsert({
            where: {
              id: uuid(
                `settlements-lab-payment-event-${plan.practitionerId}-${sessionPlan.sessionSuffix}`,
              ),
            },
            create: {
              id: uuid(
                `settlements-lab-payment-event-${plan.practitionerId}-${sessionPlan.sessionSuffix}`,
              ),
              paymentId,
              eventType: 'PAYMENT_CAPTURED',
              providerEventRef: `lab-provider-event-${plan.practitionerId.slice(-6)}-${sessionPlan.sessionSuffix}`,
            },
            update: {
              paymentId,
              eventType: 'PAYMENT_CAPTURED',
              providerEventRef: `lab-provider-event-${plan.practitionerId.slice(-6)}-${sessionPlan.sessionSuffix}`,
            },
          });

          const ledgerId = uuid(
            `settlements-lab-ledger-${plan.practitionerId}-${sessionPlan.sessionSuffix}`,
          );
          const createdEntry = {
            id: ledgerId,
            practitionerId: plan.practitionerId,
            sessionId,
            paymentId,
            settlementId,
            entryType: LedgerEntryType.PRACTITIONER_EARNING,
            direction: LedgerDirection.CREDIT,
            amount: money(earnings),
            currencyCode,
            balanceBucket: sessionPlan.bucket,
            referenceType: 'PAYMENT',
            referenceId: paymentId,
            description: 'Settlement lab seed earning entry.',
            effectiveAt: sessionDate,
          };
          await tx.ledgerEntry.upsert({
            where: { id: ledgerId },
            create: createdEntry,
            update: createdEntry,
          });

          applyLedgerState(walletStates.get(plan.practitionerId)!, {
            bucket: sessionPlan.bucket,
            direction: LedgerDirection.CREDIT,
            entryType: LedgerEntryType.PRACTITIONER_EARNING,
            amount: earnings,
            effectiveAt: sessionDate,
          });
        }
      }

      const ePaidSettlement = settlementByKey.get('e-history');
      if (ePaidSettlement) {
        const paidPlan = planByPractitionerId.get(
          ePaidSettlement.practitionerId,
        );
        const paidSettlementId = settlementIdByKey.get(ePaidSettlement.key);
        if (!paidPlan || !paidSettlementId) {
          throw new Error(
            '[seed:settlements-lab] missing paid settlement plan data',
          );
        }
        const paidWalletId = walletIdByPractitionerId.get(
          ePaidSettlement.practitionerId,
        );
        if (!paidWalletId) {
          throw new Error(
            '[seed:settlements-lab] missing wallet id for payout settlement',
          );
        }
        const payoutId = uuid(
          `settlements-lab-payout-${historicalBatch.id}-${ePaidSettlement.key}`,
        );
        const payoutDate = ePaidSettlement.paidAt ?? daysAgo(2);

        await tx.practitionerSettlementPayout.upsert({
          where: { id: payoutId },
          create: {
            id: payoutId,
            batchId: historicalBatch.id,
            settlementId: paidSettlementId,
            practitionerId: ePaidSettlement.practitionerId,
            amountPaid: money(ePaidSettlement.amountNet),
            currencyCode,
            payoutMethod: SettlementPayoutMethod.MANUAL_BANK_TRANSFER,
            payoutSource: SettlementPayoutSource.BATCH_CLOSEOUT,
            payoutMethodSnapshot:
              ePaidSettlement.payoutMethodSnapshot ?? Prisma.JsonNull,
            externalPayoutRef: ePaidSettlement.externalPayoutRef,
            notes: ePaidSettlement.notes,
            effectiveAt: payoutDate,
            processedByUserId: ePaidSettlement.processedByUserId,
          },
          update: {
            batchId: historicalBatch.id,
            settlementId: paidSettlementId,
            practitionerId: ePaidSettlement.practitionerId,
            amountPaid: money(ePaidSettlement.amountNet),
            currencyCode,
            payoutMethod: SettlementPayoutMethod.MANUAL_BANK_TRANSFER,
            payoutSource: SettlementPayoutSource.BATCH_CLOSEOUT,
            payoutMethodSnapshot:
              ePaidSettlement.payoutMethodSnapshot ?? Prisma.JsonNull,
            externalPayoutRef: ePaidSettlement.externalPayoutRef,
            notes: ePaidSettlement.notes,
            effectiveAt: payoutDate,
            processedByUserId: ePaidSettlement.processedByUserId,
          },
        });

        const payoutLedgerId = uuid(
          `settlements-lab-ledger-payout-${historicalBatch.id}-${ePaidSettlement.key}`,
        );
        await tx.ledgerEntry.upsert({
          where: { id: payoutLedgerId },
          create: {
            id: payoutLedgerId,
            practitionerId: ePaidSettlement.practitionerId,
            settlementId: paidSettlementId,
            entryType: LedgerEntryType.SETTLEMENT_PAYOUT,
            direction: LedgerDirection.DEBIT,
            amount: money(ePaidSettlement.amountNet),
            currencyCode,
            balanceBucket: WalletBalanceBucket.RESERVED,
            referenceType: 'settlement',
            referenceId: paidSettlementId,
            description: 'Settlement lab seed payout entry.',
            effectiveAt: payoutDate,
          },
          update: {
            practitionerId: ePaidSettlement.practitionerId,
            settlementId: paidSettlementId,
            entryType: LedgerEntryType.SETTLEMENT_PAYOUT,
            direction: LedgerDirection.DEBIT,
            amount: money(ePaidSettlement.amountNet),
            currencyCode,
            balanceBucket: WalletBalanceBucket.RESERVED,
            referenceType: 'settlement',
            referenceId: paidSettlementId,
            description: 'Settlement lab seed payout entry.',
            effectiveAt: payoutDate,
          },
        });

        applyLedgerState(walletStates.get(ePaidSettlement.practitionerId)!, {
          bucket: WalletBalanceBucket.RESERVED,
          direction: LedgerDirection.DEBIT,
          entryType: LedgerEntryType.SETTLEMENT_PAYOUT,
          amount: ePaidSettlement.amountNet,
          effectiveAt: payoutDate,
        });

        await tx.practitionerSettlement.upsert({
          where: {
            batchId_practitionerId: {
              batchId: historicalBatch.id,
              practitionerId: ePaidSettlement.practitionerId,
            },
          },
          create: {
            id: paidSettlementId,
            batchId: historicalBatch.id,
            practitionerId: ePaidSettlement.practitionerId,
            walletId: paidWalletId,
            amountGross: money(ePaidSettlement.amountNet),
            amountAdjustments: '0.00',
            amountNet: money(ePaidSettlement.amountNet),
            currencyCode,
            status: ePaidSettlement.status,
            paidAt: ePaidSettlement.paidAt,
            failedAt: null,
            notes: ePaidSettlement.notes,
            externalPayoutRef: ePaidSettlement.externalPayoutRef,
            payoutMethodSnapshot:
              ePaidSettlement.payoutMethodSnapshot ?? Prisma.JsonNull,
          },
          update: {
            walletId: paidWalletId,
            amountGross: money(ePaidSettlement.amountNet),
            amountAdjustments: '0.00',
            amountNet: money(ePaidSettlement.amountNet),
            currencyCode,
            status: ePaidSettlement.status,
            paidAt: ePaidSettlement.paidAt,
            failedAt: null,
            notes: ePaidSettlement.notes,
            externalPayoutRef: ePaidSettlement.externalPayoutRef,
            payoutMethodSnapshot:
              ePaidSettlement.payoutMethodSnapshot ?? Prisma.JsonNull,
          },
        });
      }

      for (const [practitionerId, state] of walletStates.entries()) {
        const plan = practitionerPlans.find(
          (item) => item.practitionerId === practitionerId,
        );
        if (!plan) {
          continue;
        }

        const wallet = await tx.practitionerWallet.upsert({
          where: {
            practitionerId_currencyCode: {
              practitionerId,
              currencyCode,
            },
          },
          create: {
            practitionerId,
            currencyCode,
            availableBalance: money(state.available),
            pendingBalance: '0.00',
            reservedBalance: money(state.reserved),
            lifetimeEarned: money(state.lifetimeEarned),
            lifetimePaidOut: money(state.lifetimePaidOut),
            lastLedgerEntryAt: state.lastLedgerEntryAt,
          },
          update: {
            availableBalance: money(state.available),
            pendingBalance: '0.00',
            reservedBalance: money(state.reserved),
            lifetimeEarned: money(state.lifetimeEarned),
            lifetimePaidOut: money(state.lifetimePaidOut),
            lastLedgerEntryAt: state.lastLedgerEntryAt,
          },
        });
        walletIdByPractitionerId.set(practitionerId, wallet.id);
      }
    });

    console.log(
      `[seed:settlements-lab] seeded practitioners B/E/F with USD wallets, due settlements, and payout history`,
    );
  },
};
