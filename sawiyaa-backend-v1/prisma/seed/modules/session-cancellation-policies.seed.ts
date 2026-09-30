import {
  PrismaClient,
  RefundDestination,
  SessionCancellationBookingType,
  SessionCancellationRefundMode,
} from '@prisma/client';

type ProductionCancellationRule = {
  code: string;
  displayName: string;
  priority: number;
  minHoursBeforeStart: number | null;
  maxHoursBeforeStart: number | null;
  isCancellationAllowed: boolean;
  refundMode: SessionCancellationRefundMode;
  refundPercent: number | null;
  isActive: boolean;
};

type ProductionCancellationPolicy = {
  bookingType: SessionCancellationBookingType;
  displayName: string;
  defaultRefundDestination: RefundDestination;
  rules: readonly ProductionCancellationRule[];
};

// These values are the final policy contract established by the existing
// session-cancellation migrations. They are baseline defaults only; Admin may
// edit existing live values without this seed overwriting them.
export const PRODUCTION_SESSION_CANCELLATION_POLICIES: readonly ProductionCancellationPolicy[] = [
  {
    bookingType: SessionCancellationBookingType.STANDARD,
    displayName: 'Standard Booking Cancellation Policy',
    defaultRefundDestination: RefundDestination.CUSTOMER_WALLET,
    rules: [
      {
        code: 'STANDARD_24H_70',
        displayName: 'Cancel at least 24h before start: 70% refund',
        priority: 10,
        minHoursBeforeStart: 24,
        maxHoursBeforeStart: null,
        isCancellationAllowed: true,
        refundMode: SessionCancellationRefundMode.PERCENTAGE,
        refundPercent: 70,
        isActive: true,
      },
      {
        code: 'STANDARD_LATE_NO_CANCEL',
        displayName: 'Late cancellation is not allowed',
        priority: 20,
        minHoursBeforeStart: 0,
        maxHoursBeforeStart: 23,
        isCancellationAllowed: false,
        refundMode: SessionCancellationRefundMode.NONE,
        refundPercent: null,
        isActive: true,
      },
    ],
  },
  {
    bookingType: SessionCancellationBookingType.INSTANT,
    displayName: 'Instant Booking Cancellation Policy',
    defaultRefundDestination: RefundDestination.CUSTOMER_WALLET,
    rules: [
      {
        code: 'INSTANT_NO_CANCEL',
        displayName: 'Instant booking cancellation is not allowed',
        priority: 10,
        minHoursBeforeStart: null,
        maxHoursBeforeStart: null,
        isCancellationAllowed: false,
        refundMode: SessionCancellationRefundMode.NONE,
        refundPercent: null,
        isActive: true,
      },
    ],
  },
] as const;

type CancellationPolicyDatabase = {
  sessionCancellationPolicy: {
    findUnique: (args: unknown) => Promise<any>;
    create: (args: unknown) => Promise<any>;
  };
  sessionCancellationPolicyRule: {
    create: (args: unknown) => Promise<any>;
  };
};

export type ProductionCancellationPolicySummary = {
  createdPolicies: number;
  preservedPolicies: number;
  createdRules: number;
  preservedRules: number;
};

export async function ensureProductionSessionCancellationPolicies(
  prisma: PrismaClient | CancellationPolicyDatabase,
): Promise<ProductionCancellationPolicySummary> {
  let createdPolicies = 0;
  let preservedPolicies = 0;
  let createdRules = 0;
  let preservedRules = 0;
  const database = prisma as unknown as CancellationPolicyDatabase;

  for (const expectedPolicy of PRODUCTION_SESSION_CANCELLATION_POLICIES) {
    const existingPolicy = await database.sessionCancellationPolicy.findUnique({
      where: { bookingType: expectedPolicy.bookingType },
      include: { rules: true },
    });

    if (!existingPolicy) {
      await database.sessionCancellationPolicy.create({
        data: {
          bookingType: expectedPolicy.bookingType,
          displayName: expectedPolicy.displayName,
          isActive: true,
          defaultRefundDestination: expectedPolicy.defaultRefundDestination,
          version: 1,
          rules: {
            create: expectedPolicy.rules,
          },
        },
      });
      createdPolicies += 1;
      createdRules += expectedPolicy.rules.length;
      continue;
    }

    if (!existingPolicy.isActive) {
      throw new Error(
        `Production session cancellation baseline found inactive ${expectedPolicy.bookingType} policy.`,
      );
    }
    preservedPolicies += 1;

    const existingRules = new Map<string, { isActive: boolean }>(
      (existingPolicy.rules ?? []).map((rule: { code: string; isActive: boolean }) => [rule.code, rule]),
    );
    for (const expectedRule of expectedPolicy.rules) {
      const existingRule = existingRules.get(expectedRule.code);
      if (existingRule) {
        if (!existingRule.isActive) {
          throw new Error(
            `Production session cancellation baseline found inactive ${expectedPolicy.bookingType}/${expectedRule.code} rule.`,
          );
        }
        preservedRules += 1;
        continue;
      }
      await database.sessionCancellationPolicyRule.create({
        data: {
          policyId: existingPolicy.id,
          ...expectedRule,
        },
      });
      createdRules += 1;
    }
  }

  return { createdPolicies, preservedPolicies, createdRules, preservedRules };
}
