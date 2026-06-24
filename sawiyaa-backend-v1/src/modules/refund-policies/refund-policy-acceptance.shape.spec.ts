import { Prisma, RefundPolicyType } from '@prisma/client';

describe('RefundPolicyAcceptance schema readiness', () => {
  it('supports phase 2 consent linkage fields and nullable payment/session/package references', () => {
    const acceptance = {
      policyId: 'policy_1',
      refundPolicyType: RefundPolicyType.SESSION,
      acceptedByUserId: 'user_1',
      paymentId: null,
      sessionId: null,
      packagePurchaseId: null,
      policyVersionNumberSnapshot: 1,
      policyTitleSnapshotJson: { en: 'Title' },
      policySummarySnapshotJson: { en: 'Summary' },
      clausesSnapshotJson: [],
      rulesSnapshotJson: [],
      contentHashSnapshot: 'hash_1',
      displayLocale: 'en',
      userAgent: null,
      ipAddress: null,
      consentTextHash: null,
      metadataJson: null,
    } satisfies Prisma.RefundPolicyAcceptanceUncheckedCreateInput;

    expect(acceptance.policyId).toBe('policy_1');
    expect(acceptance.acceptedByUserId).toBe('user_1');
    expect(acceptance.paymentId).toBeNull();
    expect(acceptance.sessionId).toBeNull();
    expect(acceptance.packagePurchaseId).toBeNull();
  });
});
