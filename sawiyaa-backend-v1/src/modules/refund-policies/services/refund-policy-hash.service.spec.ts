import { RefundPolicyType } from '@prisma/client';
import { RefundPolicyHashService } from './refund-policy-hash.service';

describe('RefundPolicyHashService', () => {
  it('produces deterministic hashes for equivalent content with different object key order', () => {
    const service = new RefundPolicyHashService();
    const first = service.compute({
      policyType: RefundPolicyType.SESSION,
      versionNumber: 1,
      titleByLocaleJson: { en: 'Title', ar: 'العنوان' },
      summaryByLocaleJson: { en: 'Summary', ar: 'ملخص' },
      localizedContentJson: { en: { a: 1, b: 2 } },
      clausesJson: [{ code: 'a', sortOrder: 1, nested: { z: 1, y: 2 } }],
      rulesJson: [{ code: 'r1', sortOrder: 1, triggerType: 'BEFORE' }],
    });

    const second = service.compute({
      policyType: RefundPolicyType.SESSION,
      versionNumber: 1,
      titleByLocaleJson: { ar: 'العنوان', en: 'Title' },
      summaryByLocaleJson: { ar: 'ملخص', en: 'Summary' },
      localizedContentJson: { en: { b: 2, a: 1 } },
      clausesJson: [{ sortOrder: 1, code: 'a', nested: { y: 2, z: 1 } }],
      rulesJson: [{ triggerType: 'BEFORE', sortOrder: 1, code: 'r1' }],
    });

    expect(first).toBe(second);
  });
});
