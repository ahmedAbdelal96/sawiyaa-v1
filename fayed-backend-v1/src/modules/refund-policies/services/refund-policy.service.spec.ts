import { BadRequestException } from '@nestjs/common';
import { RefundPolicyType } from '@prisma/client';
import { RefundPolicyService } from './refund-policy.service';

type PolicyClause = {
  id: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PolicyRecord = {
  id: string;
  policyType: RefundPolicyType;
  key: string;
  titleAr: string;
  titleEn: string;
  isActive: boolean;
  clauses: PolicyClause[];
  createdAt: Date;
  updatedAt: Date;
};

type FindUniqueArgs = {
  where?: {
    id?: string;
    policyType?: RefundPolicyType;
  };
};

describe('RefundPolicyService', () => {
  function createService() {
    const policySession: PolicyRecord = {
      id: 'policy_session',
      policyType: RefundPolicyType.SESSION,
      key: 'SESSION_REFUND_POLICY',
      titleAr: 'سياسة استرجاع الجلسات',
      titleEn: 'Session Refund Policy',
      isActive: true,
      clauses: [
        {
          id: 'clause_0',
          titleAr: 'المدة المتبقية',
          titleEn: 'Time Window',
          bodyAr: 'تعتمد الأهلية على الوقت المتبقي قبل موعد الجلسة.',
          bodyEn:
            'Eligibility depends on the time remaining before the session.',
          sortOrder: 1,
          isActive: true,
          createdAt: new Date('2026-05-04T00:00:00.000Z'),
          updatedAt: new Date('2026-05-04T00:00:00.000Z'),
        },
        {
          id: 'clause_1',
          titleAr: 'نطاق السياسة',
          titleEn: 'Policy Scope',
          bodyAr: 'تنطبق هذه السياسة على الجلسات الفردية فقط.',
          bodyEn: 'This policy applies to individual session bookings only.',
          sortOrder: 2,
          isActive: true,
          createdAt: new Date('2026-05-04T00:00:00.000Z'),
          updatedAt: new Date('2026-05-04T00:00:00.000Z'),
        },
      ],
      createdAt: new Date('2026-05-04T00:00:00.000Z'),
      updatedAt: new Date('2026-05-04T00:00:00.000Z'),
    };

    const policyPackage: PolicyRecord = {
      ...policySession,
      id: 'policy_package',
      policyType: RefundPolicyType.PACKAGE,
      key: 'PACKAGE_REFUND_POLICY',
      titleAr: 'سياسة استرجاع الباقات',
      titleEn: 'Package Refund Policy',
      clauses: [
        {
          id: 'package_clause_1',
          titleAr: 'نطاق السياسة',
          titleEn: 'Policy Scope',
          bodyAr: 'تنطبق هذه السياسة على باقات الجلسات الموحدة.',
          bodyEn: 'This policy applies to standardized session packages.',
          sortOrder: 1,
          isActive: true,
          createdAt: new Date('2026-05-04T00:00:00.000Z'),
          updatedAt: new Date('2026-05-04T00:00:00.000Z'),
        },
        {
          id: 'package_clause_2',
          titleAr: 'الجلسات المكتملة',
          titleEn: 'Completed Sessions',
          bodyAr: 'الجلسات المكتملة غير قابلة للاسترجاع افتراضيًا.',
          bodyEn: 'Completed sessions are not refundable by default.',
          sortOrder: 2,
          isActive: true,
          createdAt: new Date('2026-05-04T00:00:00.000Z'),
          updatedAt: new Date('2026-05-04T00:00:00.000Z'),
        },
      ],
    };

    const refundPolicyAcceptance = {
      findUnique: jest.fn<Promise<null>, []>(() => Promise.resolve(null)),
      create: jest.fn((args: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'acceptance_1',
          ...args.data,
          acceptedAt: new Date('2026-05-04T00:00:00.000Z'),
          createdAt: new Date('2026-05-04T00:00:00.000Z'),
        }),
      ),
    };

    const refundPolicy = {
      findUnique: jest.fn<Promise<PolicyRecord | null>, [FindUniqueArgs]>(
        (args) => {
          const where = args?.where ?? {};
          if (
            where.id === 'policy_session' ||
            where.policyType === RefundPolicyType.SESSION
          ) {
            return Promise.resolve(policySession);
          }
          if (
            where.id === 'policy_package' ||
            where.policyType === RefundPolicyType.PACKAGE
          ) {
            return Promise.resolve(policyPackage);
          }
          return Promise.resolve(null);
        },
      ),
    };

    const refundPolicyRepository = {
      listPolicies: jest.fn(() =>
        Promise.resolve([policySession, policyPackage]),
      ),
      findPolicyByType: jest.fn((policyType: RefundPolicyType) => {
        if (policyType === RefundPolicyType.SESSION)
          return Promise.resolve(policySession);
        if (policyType === RefundPolicyType.PACKAGE)
          return Promise.resolve(policyPackage);
        return Promise.resolve(null);
      }),
      findClauseById: jest.fn((clauseId: string) => {
        if (clauseId !== 'clause_1') return Promise.resolve(null);
        return Promise.resolve({
          id: 'clause_1',
          policy: policySession,
          titleAr: 'نطاق السياسة',
          titleEn: 'Policy Scope',
          bodyAr: 'تنطبق هذه السياسة على الجلسات الفردية فقط.',
          bodyEn: 'This policy applies to individual session bookings only.',
          sortOrder: 2,
          isActive: true,
          createdAt: new Date('2026-05-04T00:00:00.000Z'),
          updatedAt: new Date('2026-05-04T00:00:00.000Z'),
        });
      }),
      upsertPolicy: jest.fn((input: Partial<PolicyRecord>) =>
        Promise.resolve({
          ...policySession,
          ...input,
          clauses: policySession.clauses,
        } as PolicyRecord),
      ),
      createClause: jest.fn(() => Promise.resolve(undefined)),
      updateClause: jest.fn(() => Promise.resolve(undefined)),
      deleteClause: jest.fn(() => Promise.resolve(undefined)),
      reorderClauses: jest.fn(() => Promise.resolve(undefined)),
    };

    const service = new RefundPolicyService(
      {
        refundPolicyAcceptance,
        refundPolicy,
      } as never,
      refundPolicyRepository as never,
    );

    return {
      service,
      prisma: {
        refundPolicyAcceptance,
        refundPolicy,
      },
      refundPolicyRepository,
      policySession,
      policyPackage,
    };
  }

  it('lists policies and returns active clauses in order', async () => {
    const setup = createService();

    const result = await setup.service.listPolicies();

    expect(result.items).toHaveLength(2);
    expect(result.items[0].clauses).toHaveLength(2);
    expect(result.items[0].clauses[0].sortOrder).toBe(1);
  });

  it('returns the public active policy for a type with ordered clauses', async () => {
    const setup = createService();

    const result = await setup.service.getPublicPolicy(
      RefundPolicyType.SESSION,
    );

    expect(result.policyType).toBe(RefundPolicyType.SESSION);
    expect(result.titleEn).toBe('Session Refund Policy');
    expect(result.clauses).toHaveLength(2);
    expect(result.clauses[0].sortOrder).toBe(1);
  });

  it('blocks acceptance if the policy id is missing or inactive', async () => {
    const setup = createService();

    await expect(
      setup.service.ensureAcceptedRefundPolicyForPayment({
        policyType: RefundPolicyType.SESSION,
        acceptedRefundPolicyId: '',
        acceptedByUserId: 'user_1',
        paymentId: 'payment_1',
        displayLocale: 'ar',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates an acceptance snapshot from the active policy', async () => {
    const setup = createService();

    const result = await setup.service.ensureAcceptedRefundPolicyForPayment({
      policyType: RefundPolicyType.SESSION,
      acceptedRefundPolicyId: 'policy_session',
      acceptedByUserId: 'user_1',
      paymentId: 'payment_1',
      sessionId: 'session_1',
      displayLocale: 'ar',
      metadataJson: { source: 'checkout' },
    });

    expect(result.policyId).toBe('policy_session');
    expect(result.policyTitleArSnapshot).toBe('سياسة استرجاع الجلسات');
    expect(result.policyTitleEnSnapshot).toBe('Session Refund Policy');
    expect(result.clausesSnapshotJson).toHaveLength(2);
  });

  it('rejects the wrong policy type for acceptance', async () => {
    const setup = createService();

    await expect(
      setup.service.ensureAcceptedRefundPolicyForPayment({
        policyType: RefundPolicyType.SESSION,
        acceptedRefundPolicyId: 'policy_package',
        acceptedByUserId: 'user_1',
        paymentId: 'payment_1',
        displayLocale: 'ar',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('reuses an existing acceptance on the same payment', async () => {
    const setup = createService();
    const existing = {
      id: 'acceptance_existing',
      paymentId: 'payment_1',
    };
    setup.prisma.refundPolicyAcceptance.findUnique.mockResolvedValueOnce(
      existing,
    );

    const result = await setup.service.ensureAcceptedRefundPolicyForPayment({
      policyType: RefundPolicyType.SESSION,
      acceptedRefundPolicyId: 'policy_session',
      acceptedByUserId: 'user_1',
      paymentId: 'payment_1',
      displayLocale: 'ar',
    });

    expect(result).toBe(existing);
  });
});
