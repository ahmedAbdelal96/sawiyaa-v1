import { PrismaClient, RefundPolicyType } from '@prisma/client';
import { REFUND_POLICY_KEYS } from '../../../src/modules/refund-policies/refund-policy.catalog';
import { SeedModule } from '../shared/seed.types';

type RefundPolicyClauseSeedItem = {
  titleAr: string | null;
  titleEn: string | null;
  bodyAr: string;
  bodyEn: string;
  sortOrder: number;
};

type RefundPolicySeedItem = {
  policyType: RefundPolicyType;
  titleAr: string;
  titleEn: string;
  clauses: RefundPolicyClauseSeedItem[];
};

const DEVELOPMENT_SEED_PURPOSE = 'development-staging';

const REFUND_POLICY_SEEDS: RefundPolicySeedItem[] = [
  {
    policyType: RefundPolicyType.SESSION,
    titleAr: 'سياسة استرجاع الجلسات',
    titleEn: 'Session Refund Policy',
    clauses: [
      {
        titleAr: 'نطاق السياسة',
        titleEn: 'Policy Scope',
        bodyAr: 'تنطبق هذه السياسة على حجوزات الجلسات الفردية فقط.',
        bodyEn: 'This policy applies to individual session bookings only.',
        sortOrder: 1,
      },
      {
        titleAr: 'المدة المتبقية',
        titleEn: 'Time Remaining',
        bodyAr:
          'يتم تحديد أحقية الاسترجاع بناءً على المدة المتبقية قبل موعد بداية الجلسة.',
        bodyEn:
          'Refund eligibility is determined based on the time remaining before the scheduled session start time.',
        sortOrder: 2,
      },
      {
        titleAr: 'أربعون وثمانون ساعة أو أكثر',
        titleEn: 'Forty-Eight Hours Or More',
        bodyAr:
          'إذا طلب المريض الاسترجاع قبل موعد الجلسة بمدة 48 ساعة أو أكثر، فقد تكون الجلسة مؤهلة لاسترجاع كامل.',
        bodyEn:
          'If the patient requests a refund at least 48 hours before the session, the session may be eligible for a full refund.',
        sortOrder: 3,
      },
      {
        titleAr: 'من 24 إلى أقل من 48 ساعة',
        titleEn: 'Twenty-Four To Forty-Eight Hours',
        bodyAr:
          'إذا طلب المريض الاسترجاع قبل موعد الجلسة بمدة 24 ساعة أو أكثر وأقل من 48 ساعة، فقد تكون الجلسة مؤهلة لاسترجاع جزئي.',
        bodyEn:
          'If the patient requests a refund at least 24 hours and less than 48 hours before the session, the session may be eligible for a partial refund.',
        sortOrder: 4,
      },
      {
        titleAr: 'من 12 إلى أقل من 24 ساعة',
        titleEn: 'Twelve To Twenty-Four Hours',
        bodyAr:
          'إذا طلب المريض الاسترجاع قبل موعد الجلسة بمدة 12 ساعة أو أكثر وأقل من 24 ساعة، فقد تكون الجلسة مؤهلة لاسترجاع جزئي أقل.',
        bodyEn:
          'If the patient requests a refund at least 12 hours and less than 24 hours before the session, the session may be eligible for a reduced partial refund.',
        sortOrder: 5,
      },
      {
        titleAr: 'أقل من 12 ساعة',
        titleEn: 'Less Than Twelve Hours',
        bodyAr:
          'طلبات الاسترجاع التي تتم قبل الجلسة بأقل من 12 ساعة، أو بعد بداية الجلسة، أو في حالة عدم الحضور، قد يتم رفضها إلا إذا وافقت إدارة المنصة على خلاف ذلك.',
        bodyEn:
          'Refund requests made less than 12 hours before the session, after the session start time, or after a no-show may be rejected unless approved by the platform administration.',
        sortOrder: 6,
      },
      {
        titleAr: 'المراجعة اليدوية',
        titleEn: 'Manual Review',
        bodyAr: 'يحق لإدارة المنصة مراجعة الحالات الاستثنائية يدويًا.',
        bodyEn:
          'The platform administration may manually review exceptional cases.',
        sortOrder: 7,
      },
    ],
  },
  {
    policyType: RefundPolicyType.PACKAGE,
    titleAr: 'سياسة استرجاع الباقات',
    titleEn: 'Package Refund Policy',
    clauses: [
      {
        titleAr: 'نطاق السياسة',
        titleEn: 'Policy Scope',
        bodyAr:
          'تنطبق هذه السياسة على باقات الجلسات الموحدة التي يتم شراؤها من خلال المنصة.',
        bodyEn:
          'This policy applies to standardized session packages purchased through the platform.',
        sortOrder: 1,
      },
      {
        titleAr: 'الجلسات المرتبطة',
        titleEn: 'Linked Sessions',
        bodyAr:
          'تتكون الباقة من عدة جلسات مرتبطة، وقد يتم تقييم أحقية الاسترجاع لكل جلسة مرتبطة على حدة.',
        bodyEn:
          'A package consists of multiple linked sessions, and refund eligibility may be evaluated per linked session.',
        sortOrder: 2,
      },
      {
        titleAr: 'الجلسات المكتملة',
        titleEn: 'Completed Sessions',
        bodyAr: 'الجلسات المكتملة غير قابلة للاسترجاع افتراضيًا.',
        bodyEn: 'Completed sessions are not refundable by default.',
        sortOrder: 3,
      },
      {
        titleAr: 'الجلسات التي بدأت أو لم يحضرها المريض',
        titleEn: 'Started Or No-Show Sessions',
        bodyAr:
          'الجلسات التي لم يحضرها المريض أو التي بدأ وقتها بالفعل غير قابلة للاسترجاع افتراضيًا إلا بموافقة إدارة المنصة.',
        bodyEn:
          'No-show sessions or sessions that have already started are not refundable by default unless approved by the platform administration.',
        sortOrder: 4,
      },
      {
        titleAr: 'الجلسات القادمة',
        titleEn: 'Upcoming Sessions',
        bodyAr:
          'الجلسات القادمة التي لم تبدأ بعد قد تكون مؤهلة للاسترجاع حسب المدة المتبقية قبل موعد كل جلسة.',
        bodyEn:
          'Upcoming sessions that have not started may be eligible for refund according to the time remaining before each session.',
        sortOrder: 5,
      },
      {
        titleAr: 'تسعير الاسترجاع',
        titleEn: 'Refund Pricing',
        bodyAr:
          'يتم حساب قيمة استرجاع جلسات الباقة بناءً على بيانات الشراء المحفوظة وقت شراء الباقة، وليس بناءً على سعر الجلسة الحالي للممارس أو الخصم الحالي للباقة.',
        bodyEn:
          'Refund value for package sessions is calculated using the package purchase snapshot at the time of purchase, not the practitioner’s current session price or the current package discount.',
        sortOrder: 6,
      },
      {
        titleAr: 'الجلسات غير المستخدمة',
        titleEn: 'Unused Sessions',
        bodyAr:
          'إذا تم استخدام جزء من الباقة، يتم تطبيق الاسترجاع فقط على الجلسات غير المستخدمة والمؤهلة للاسترجاع.',
        bodyEn:
          'If part of the package has already been used, the refund applies only to eligible unused sessions.',
        sortOrder: 7,
      },
      {
        titleAr: 'المراجعة اليدوية',
        titleEn: 'Manual Review',
        bodyAr:
          'يحق لإدارة المنصة مراجعة طلبات استرجاع الباقات الاستثنائية يدويًا.',
        bodyEn:
          'The platform administration may manually review exceptional package refund requests.',
        sortOrder: 8,
      },
    ],
  },
];

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim().length === 0;
}

export function buildDevelopmentRefundPolicySeed(policyType: RefundPolicyType) {
  const seed = REFUND_POLICY_SEEDS.find(
    (item) => item.policyType === policyType,
  );
  if (!seed) {
    throw new Error(`Missing refund policy seed for ${policyType}`);
  }

  return {
    policyType: seed.policyType,
    key: REFUND_POLICY_KEYS[seed.policyType],
    titleAr: seed.titleAr,
    titleEn: seed.titleEn,
    clauses: seed.clauses.map((clause) => ({
      ...clause,
      metadataJson: {
        seedPurpose: DEVELOPMENT_SEED_PURPOSE,
        reviewRequiredBeforeProduction: true,
      },
    })),
  };
}

async function seedRefundPolicy(
  prisma: PrismaClient,
  seed: RefundPolicySeedItem,
) {
  const existing = await prisma.refundPolicy.findUnique({
    where: { policyType: seed.policyType },
    include: {
      clauses: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });

  if (!existing) {
    const created = await prisma.refundPolicy.create({
      data: {
        policyType: seed.policyType,
        key: REFUND_POLICY_KEYS[seed.policyType],
        titleAr: seed.titleAr,
        titleEn: seed.titleEn,
        isActive: true,
      },
    });

    await prisma.refundPolicyClause.createMany({
      data: seed.clauses.map((clause) => ({
        policyId: created.id,
        titleAr: clause.titleAr,
        titleEn: clause.titleEn,
        bodyAr: clause.bodyAr,
        bodyEn: clause.bodyEn,
        sortOrder: clause.sortOrder,
        isActive: true,
      })),
    });

    return;
  }

  const placeholderPolicy =
    isBlank(existing.titleAr) &&
    isBlank(existing.titleEn) &&
    existing.clauses.length === 0;

  if (!placeholderPolicy) {
    return;
  }

  await prisma.refundPolicy.update({
    where: { id: existing.id },
    data: {
      titleAr: seed.titleAr,
      titleEn: seed.titleEn,
      isActive: true,
    },
  });

  await prisma.refundPolicyClause.createMany({
    data: seed.clauses.map((clause) => ({
      policyId: existing.id,
      titleAr: clause.titleAr,
      titleEn: clause.titleEn,
      bodyAr: clause.bodyAr,
      bodyEn: clause.bodyEn,
      sortOrder: clause.sortOrder,
      isActive: true,
    })),
  });
}

export const refundPoliciesSeedModule: SeedModule = {
  name: 'refund-policies',
  async run(prisma) {
    for (const seed of REFUND_POLICY_SEEDS) {
      await seedRefundPolicy(prisma, seed);
    }
  },
};
