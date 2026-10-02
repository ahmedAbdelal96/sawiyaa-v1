import { SessionCancellationBookingType } from '@prisma/client';
import {
  ensureProductionSessionCancellationPolicies,
  PRODUCTION_SESSION_CANCELLATION_POLICIES,
} from './session-cancellation-policies.seed';

function createDatabase(existingPolicies: Record<string, any>[] = []) {
  const policies = existingPolicies.map((policy) => ({
    ...policy,
    rules: policy.rules ?? [],
  }));
  let sequence = 0;
  const db = {
    sessionCancellationPolicy: {
      findUnique: jest.fn(async ({ where }: { where: { bookingType: SessionCancellationBookingType } }) =>
        policies.find((policy) => policy.bookingType === where.bookingType) ?? null,
      ),
      create: jest.fn(async ({ data }: { data: any }) => {
        const policy = { id: `policy-${++sequence}`, ...data, rules: data.rules?.create ?? [] };
        policies.push(policy);
        return policy;
      }),
    },
    sessionCancellationPolicyRule: {
      create: jest.fn(async ({ data }: { data: any }) => {
        const policy = policies.find((item) => item.id === data.policyId);
        const rule = { id: `rule-${++sequence}`, ...data };
        policy?.rules.push(rule);
        return rule;
      }),
    },
  };
  return { db, policies };
}

describe('production session cancellation policy baseline', () => {
  it('creates the canonical STANDARD and INSTANT policies and rules', async () => {
    const { db, policies } = createDatabase();

    const summary = await ensureProductionSessionCancellationPolicies(db as any);

    expect(summary).toEqual({ createdPolicies: 2, createdRules: 3, preservedPolicies: 0, preservedRules: 0 });
    expect(policies).toEqual(expect.arrayContaining([
      expect.objectContaining({ bookingType: 'STANDARD', isActive: true }),
      expect.objectContaining({ bookingType: 'INSTANT', isActive: true }),
    ]));
    expect(db.sessionCancellationPolicy.create).toHaveBeenCalledTimes(2);
  });

  it('is idempotent and preserves existing operator policy values', async () => {
    const standard = PRODUCTION_SESSION_CANCELLATION_POLICIES.find(
      (policy) => policy.bookingType === SessionCancellationBookingType.STANDARD,
    )!;
    const instant = PRODUCTION_SESSION_CANCELLATION_POLICIES.find(
      (policy) => policy.bookingType === SessionCancellationBookingType.INSTANT,
    )!;
    const { db } = createDatabase([
      {
        id: 'standard-existing',
        bookingType: standard.bookingType,
        displayName: 'Operator Standard Policy',
        isActive: true,
        defaultRefundDestination: 'ORIGINAL_METHOD',
        version: 7,
        rules: standard.rules.map((rule) => ({ id: `existing-${rule.code}`, ...rule })),
      },
      {
        id: 'instant-existing',
        bookingType: instant.bookingType,
        displayName: instant.displayName,
        isActive: true,
        defaultRefundDestination: 'CUSTOMER_WALLET',
        version: 2,
        rules: instant.rules.map((rule) => ({ id: `existing-${rule.code}`, ...rule })),
      },
    ]);

    const summary = await ensureProductionSessionCancellationPolicies(db as any);

    expect(summary).toEqual({ createdPolicies: 0, createdRules: 0, preservedPolicies: 2, preservedRules: 3 });
    expect(db.sessionCancellationPolicy.create).not.toHaveBeenCalled();
  });

  it('fails closed when an existing required policy is inactive', async () => {
    const standard = PRODUCTION_SESSION_CANCELLATION_POLICIES.find(
      (policy) => policy.bookingType === SessionCancellationBookingType.STANDARD,
    )!;
    const { db } = createDatabase([{ id: 'standard-existing', bookingType: standard.bookingType, isActive: false, rules: [] }]);

    await expect(ensureProductionSessionCancellationPolicies(db as any)).rejects.toThrow(
      /inactive STANDARD/,
    );
  });
});
