export interface PackagePlanCatalogItem {
  code: string;
  sessionCount: 4 | 6 | 8;
  discountPercent: 10 | 15 | 20;
  sortOrder: number;
  title: string;
  description: string;
  metadataJson: Record<string, unknown>;
}

export const STANDARD_PACKAGE_PLANS: PackagePlanCatalogItem[] = [
  {
    code: 'SESSIONS_4',
    sessionCount: 4,
    discountPercent: 10,
    sortOrder: 1,
    title: '4 Session Bundle',
    description: 'Four sessions with a 10% discount.',
    metadataJson: {
      planType: 'STANDARD',
      tier: 'SESSIONS_4',
    },
  },
  {
    code: 'SESSIONS_6',
    sessionCount: 6,
    discountPercent: 15,
    sortOrder: 2,
    title: '6 Session Bundle',
    description: 'Six sessions with a 15% discount.',
    metadataJson: {
      planType: 'STANDARD',
      tier: 'SESSIONS_6',
    },
  },
  {
    code: 'SESSIONS_8',
    sessionCount: 8,
    discountPercent: 20,
    sortOrder: 3,
    title: '8 Session Bundle',
    description: 'Eight sessions with a 20% discount.',
    metadataJson: {
      planType: 'STANDARD',
      tier: 'SESSIONS_8',
    },
  },
];

export function findStandardPackagePlan(code: string) {
  return STANDARD_PACKAGE_PLANS.find((item) => item.code === code);
}
