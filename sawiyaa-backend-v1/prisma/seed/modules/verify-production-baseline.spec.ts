import { classifyPaymentRouting, collectSessionCancellationPolicyBlockers } from '../../scripts/verify-production-baseline';

describe('production payment routing readiness', () => {
  it('classifies missing routing as operator setup instead of a fatal deployment blocker', () => {
    expect(classifyPaymentRouting(undefined)).toBe('OPERATOR_SETUP_REQUIRED');
  });

  it('keeps malformed or incomplete routing fatal', () => {
    expect(classifyPaymentRouting([])).toBe('INVALID');
    expect(classifyPaymentRouting([{ currencyCode: 'EGP', paymentMethod: 'CARD' }])).toBe('INVALID');
  });

  it('accepts the canonical enabled EGP Paymob card route', () => {
    expect(classifyPaymentRouting([{
      currencyCode: 'EGP',
      paymentMethod: 'CARD',
      provider: 'PAYMOB',
      integrationKey: 'paymob-egp-card',
      enabled: true,
    }])).toBe('READY');
  });
});

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
