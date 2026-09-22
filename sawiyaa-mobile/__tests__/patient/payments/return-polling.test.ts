import {
  PAYMENT_RETURN_MAX_POLL_DURATION_MS,
  PAYMENT_RETURN_POLL_INTERVAL_MS,
} from '../../../src/features/patient/payments/return-polling';

describe('mobile payment return polling contract', () => {
  it('uses the same bounded return window as Web', () => {
    expect(PAYMENT_RETURN_POLL_INTERVAL_MS).toBe(3_000);
    expect(PAYMENT_RETURN_MAX_POLL_DURATION_MS).toBe(30_000);
  });
});
