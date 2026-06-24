import { RefundPolicyType } from '@prisma/client';

export const REFUND_POLICY_KEYS: Record<RefundPolicyType, string> = {
  SESSION: 'SESSION_REFUND_POLICY',
  PACKAGE: 'PACKAGE_REFUND_POLICY',
};

export const REFUND_POLICY_PLACEHOLDER_TEXT = {
  titleByLocaleJson: {
    en: 'Draft refund policy placeholder',
  },
  summaryByLocaleJson: {
    en: 'This is a placeholder draft that must be reviewed and published by an admin.',
  },
  localizedContentJson: {
    en: {
      note: 'Placeholder content for initial seed and admin draft editing.',
    },
  },
  clausesJson: [] as Record<string, unknown>[],
  rulesJson: [] as Record<string, unknown>[],
};
