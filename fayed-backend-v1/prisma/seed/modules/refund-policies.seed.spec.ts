import { PrismaClient, RefundPolicyType } from '@prisma/client';
import {
  buildDevelopmentRefundPolicySeed,
  refundPoliciesSeedModule,
} from './refund-policies.seed';

type SeededClauseRecord = {
  id: string;
  titleAr: string | null;
  titleEn: string | null;
  bodyAr: string;
  bodyEn: string;
  sortOrder: number;
  isActive: boolean;
};

type SeededPolicyRecord = {
  id: string;
  policyType: RefundPolicyType;
  key: string;
  titleAr: string | null;
  titleEn: string | null;
  isActive: boolean;
  clauses: SeededClauseRecord[];
};

type PolicyFindUniqueArgs = {
  where?: {
    policyType?: RefundPolicyType;
  };
};

type PolicyCreateArgs = {
  data: {
    policyType: RefundPolicyType;
    key: string;
    titleAr: string | null;
    titleEn: string | null;
    isActive: boolean;
  };
};

type PolicyUpdateArgs = {
  where: {
    id: string;
  };
  data: {
    titleAr?: string | null;
    titleEn?: string | null;
    isActive?: boolean;
  };
};

type ClauseCreateManyArgs = {
  data: Array<{
    policyId: string;
    titleAr: string | null;
    titleEn: string | null;
    bodyAr: string;
    bodyEn: string;
    sortOrder: number;
    isActive: boolean;
  }>;
};

describe('refundPoliciesSeedModule', () => {
  function createPrismaMock(initialPolicies: SeededPolicyRecord[] = []) {
    const policies = new Map<RefundPolicyType, SeededPolicyRecord>(
      initialPolicies.map((policy) => [
        policy.policyType,
        structuredClone(policy),
      ]),
    );
    let clauseCounter = 0;

    const findUnique = jest.fn<
      Promise<SeededPolicyRecord | null>,
      [PolicyFindUniqueArgs]
    >(({ where }) => {
      if (!where?.policyType) return Promise.resolve(null);
      const policy = policies.get(where.policyType);
      return Promise.resolve(policy ? structuredClone(policy) : null);
    });

    const create = jest.fn<Promise<SeededPolicyRecord>, [PolicyCreateArgs]>(
      ({ data }) => {
        const policy: SeededPolicyRecord = {
          id: `${data.policyType}_policy`,
          policyType: data.policyType,
          key: data.key,
          titleAr: data.titleAr,
          titleEn: data.titleEn,
          isActive: data.isActive,
          clauses: [],
        };
        policies.set(data.policyType, policy);
        return Promise.resolve(structuredClone(policy));
      },
    );

    const update = jest.fn<Promise<SeededPolicyRecord>, [PolicyUpdateArgs]>(
      ({ where, data }) => {
        const entry = Array.from(policies.values()).find(
          (policy) => policy.id === where.id,
        );
        if (!entry) {
          return Promise.reject(new Error('Missing policy'));
        }

        const updated: SeededPolicyRecord = {
          ...entry,
          titleAr: data.titleAr ?? entry.titleAr,
          titleEn: data.titleEn ?? entry.titleEn,
          isActive: data.isActive ?? entry.isActive,
        };
        policies.set(updated.policyType, updated);
        return Promise.resolve(structuredClone(updated));
      },
    );

    const createMany = jest.fn<Promise<void>, [ClauseCreateManyArgs]>(
      ({ data }) => {
        for (const clause of data) {
          const entry = Array.from(policies.values()).find(
            (policy) => policy.id === clause.policyId,
          );
          if (!entry) {
            return Promise.reject(new Error('Missing policy for clause'));
          }

          entry.clauses.push({
            id: `clause_${++clauseCounter}`,
            titleAr: clause.titleAr,
            titleEn: clause.titleEn,
            bodyAr: clause.bodyAr,
            bodyEn: clause.bodyEn,
            sortOrder: clause.sortOrder,
            isActive: clause.isActive,
          });
        }

        return Promise.resolve();
      },
    );

    const prisma = {
      refundPolicy: { findUnique, create, update },
      refundPolicyClause: { createMany },
    };

    return {
      prisma,
      mocks: { findUnique, create, update, createMany },
      policies,
    };
  }

  function placeholderPolicy(policyType: RefundPolicyType): SeededPolicyRecord {
    return {
      id: `${policyType}_policy`,
      policyType,
      key: `${policyType}_REFUND_POLICY`,
      titleAr: null,
      titleEn: null,
      isActive: true,
      clauses: [],
    };
  }

  function editedPolicy(policyType: RefundPolicyType): SeededPolicyRecord {
    return {
      id: `${policyType}_policy`,
      policyType,
      key: `${policyType}_REFUND_POLICY`,
      titleAr:
        policyType === RefundPolicyType.SESSION ? 'سياسة خاصة' : 'Policy Title',
      titleEn: 'Admin Policy',
      isActive: true,
      clauses: [
        {
          id: 'clause_existing',
          titleAr: 'عنوان',
          titleEn: 'Heading',
          bodyAr: 'محتوى',
          bodyEn: 'Content',
          sortOrder: 1,
          isActive: true,
        },
      ],
    };
  }

  it('populates empty placeholder policies with the development seed', async () => {
    const { prisma, mocks, policies } = createPrismaMock([
      placeholderPolicy(RefundPolicyType.SESSION),
    ]);

    await refundPoliciesSeedModule.run(prisma as unknown as PrismaClient);

    const policy = policies.get(RefundPolicyType.SESSION);

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.createMany).toHaveBeenCalledTimes(1);
    expect(policy?.titleAr).toBe('سياسة استرجاع الجلسات');
    expect(policy?.titleEn).toBe('Session Refund Policy');
    expect(policy?.clauses).toHaveLength(7);
  });

  it('does not overwrite an admin-edited policy', async () => {
    const { prisma, mocks, policies } = createPrismaMock([
      editedPolicy(RefundPolicyType.PACKAGE),
    ]);

    await refundPoliciesSeedModule.run(prisma as unknown as PrismaClient);

    const policy = policies.get(RefundPolicyType.PACKAGE);

    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.createMany).not.toHaveBeenCalled();
    expect(policy?.titleAr).toBe('Policy Title');
    expect(policy?.clauses).toHaveLength(1);
  });

  it('is idempotent when run twice on a placeholder policy', async () => {
    const { prisma, mocks, policies } = createPrismaMock([
      placeholderPolicy(RefundPolicyType.SESSION),
    ]);

    await refundPoliciesSeedModule.run(prisma as unknown as PrismaClient);
    await refundPoliciesSeedModule.run(prisma as unknown as PrismaClient);

    const policy = policies.get(RefundPolicyType.SESSION);

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.createMany).toHaveBeenCalledTimes(1);
    expect(policy?.clauses).toHaveLength(7);
  });

  it('builds deterministic bilingual development seed data', () => {
    const sessionSeed = buildDevelopmentRefundPolicySeed(
      RefundPolicyType.SESSION,
    );
    const packageSeed = buildDevelopmentRefundPolicySeed(
      RefundPolicyType.PACKAGE,
    );

    expect(sessionSeed.titleAr).toBe('سياسة استرجاع الجلسات');
    expect(sessionSeed.titleEn).toBe('Session Refund Policy');
    expect(sessionSeed.clauses).toHaveLength(7);
    expect(packageSeed.titleAr).toBe('سياسة استرجاع الباقات');
    expect(packageSeed.titleEn).toBe('Package Refund Policy');
    expect(packageSeed.clauses).toHaveLength(8);
    expect(sessionSeed).toEqual(
      buildDevelopmentRefundPolicySeed(RefundPolicyType.SESSION),
    );
  });
});
