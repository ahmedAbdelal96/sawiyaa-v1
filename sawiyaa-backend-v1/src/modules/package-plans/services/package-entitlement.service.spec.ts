import { PackageEntitlementService } from './package-entitlement.service';

describe('PackageEntitlementService', () => {
  const service = new PackageEntitlementService();

  it('keeps available, reserved, and consumed entitlements conserved', () => {
    const result = service.summarize(4, [
      { status: 'UPCOMING' },
      { status: 'COMPLETED' },
      {
        status: 'PATIENT_NO_SHOW',
        packageEntitlementDecision: { decisionType: 'COUNT_AS_USED' },
      },
    ]);

    expect(result).toEqual({
      totalSessions: 4,
      consumedSessions: 2,
      completedSessions: 2,
      reservedSessions: 1,
      availableSessions: 1,
    });
    expect(
      result.availableSessions +
        result.reservedSessions +
        result.consumedSessions,
    ).toBe(result.totalSessions);
  });

  it('returns a restored cancellation to availability and ignores it as consumed', () => {
    const result = service.summarize(1, [
      {
        status: 'CANCELLED',
        packageEntitlementDecision: {
          decisionType: 'RESTORE_TO_PACKAGE',
        },
      },
    ]);

    expect(result.availableSessions).toBe(1);
    expect(result.reservedSessions).toBe(0);
    expect(result.consumedSessions).toBe(0);
  });

  it('does not consume restored or no-show sessions without an explicit decision', () => {
    const result = service.summarize(3, [
      { status: 'PATIENT_NO_SHOW' },
      { status: 'PRACTITIONER_NO_SHOW' },
      { status: 'COMPLETED' },
    ]);

    expect(result.consumedSessions).toBe(1);
    expect(result.availableSessions).toBe(2);
  });
});
