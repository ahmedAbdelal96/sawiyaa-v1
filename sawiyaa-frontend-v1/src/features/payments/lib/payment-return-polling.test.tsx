import { describe, expect, it } from 'vitest';
import {
  PAYMENT_RETURN_MAX_POLL_DURATION_MS,
  PAYMENT_RETURN_POLL_INTERVAL_MS,
} from './payment-return-polling';

describe('payment return polling contract', () => {
  it('uses the shared bounded return window', () => {
    expect(PAYMENT_RETURN_POLL_INTERVAL_MS).toBe(3_000);
    expect(PAYMENT_RETURN_MAX_POLL_DURATION_MS).toBe(30_000);
  });
});
