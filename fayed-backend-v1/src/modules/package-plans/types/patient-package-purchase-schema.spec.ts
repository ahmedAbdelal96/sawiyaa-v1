import { PackageSchedulePolicy, Prisma, SessionMode } from '@prisma/client';
import { expect, describe, it } from '@jest/globals';

describe('PatientPackagePurchase schema shape', () => {
  it('allows package-plan based purchase input without a practitioner-package relation', () => {
    const purchase = {
      practitionerId: '11111111-1111-4111-8111-111111111111',
      patientId: '22222222-2222-4222-8222-222222222222',
      packagePlanId: '33333333-3333-4333-8333-333333333333',
      titleSnapshot: '4 Session Bundle',
      descriptionSnapshot: 'Four sessions with a 10% discount.',
      slugSnapshot: 'sessions-4',
      packageVersionSnapshot: 1,
      planIdSnapshot: '33333333-3333-4333-8333-333333333333',
      planCodeSnapshot: 'SESSIONS_4',
      sessionCountSnapshot: 4,
      sessionDurationMinutesSnapshot: 60,
      sessionModeSnapshot: SessionMode.VIDEO,
      schedulePolicySnapshot:
        PackageSchedulePolicy.REQUIRE_ALL_SESSIONS_AT_PURCHASE,
      priceEgpSnapshot: new Prisma.Decimal('400'),
      priceUsdSnapshot: new Prisma.Decimal('15'),
      selectedCurrencyCode: 'EGP',
      selectedAmountSnapshot: new Prisma.Decimal('360'),
    } satisfies Prisma.PatientPackagePurchaseUncheckedCreateInput;

    expect(purchase.packagePlanId).toBeDefined();
    expect((purchase as Record<string, unknown>).packageId).toBeUndefined();
  });
});
