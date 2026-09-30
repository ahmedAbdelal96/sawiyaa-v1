import { collectSessionCancellationPolicyBlockers } from '../../scripts/verify-production-baseline';

describe('production cancellation policy verification', () => {
  it('requires both policies and every canonical active rule code', () => {
    expect(collectSessionCancellationPolicyBlockers([])).toEqual([
      'MISSING_SESSION_CANCELLATION_POLICY:STANDARD',
      'MISSING_SESSION_CANCELLATION_POLICY:INSTANT',
    ]);
  });

  it('accepts the canonical structure without enforcing mutable operator values', () => {
    expect(collectSessionCancellationPolicyBlockers([
      { bookingType: 'STANDARD', rules: [{ code: 'STANDARD_24H_70' }, { code: 'STANDARD_LATE_NO_CANCEL' }] },
      { bookingType: 'INSTANT', rules: [{ code: 'INSTANT_NO_CANCEL' }] },
    ])).toEqual([]);
  });
});
