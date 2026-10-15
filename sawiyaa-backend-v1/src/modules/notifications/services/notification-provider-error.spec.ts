import {
  classifyNetworkError,
  classifyProviderHttpStatus,
  parseRetryAfterMs,
} from './notification-provider-error';

describe('notification provider error taxonomy helpers', () => {
  it.each([
    [429, 'RATE_LIMITED'],
    [408, 'TRANSIENT'],
    [503, 'TRANSIENT'],
    [401, 'CONFIGURATION'],
    [422, 'PERMANENT'],
  ] as const)('classifies HTTP %s as %s', (status, category) => {
    expect(classifyProviderHttpStatus(status)).toBe(category);
  });

  it('parses Retry-After seconds and HTTP dates', () => {
    const now = Date.parse('2026-06-01T10:00:00.000Z');
    expect(parseRetryAfterMs('30', now)).toBe(30_000);
    expect(
      parseRetryAfterMs('Mon, 01 Jun 2026 10:01:00 GMT', now),
    ).toBe(60_000);
  });

  it('only classifies DNS failures as known pre-acceptance transient errors', () => {
    expect(classifyNetworkError({ code: 'ENOTFOUND' })).toBe('TRANSIENT');
    expect(classifyNetworkError({ code: 'ECONNRESET' })).toBeUndefined();
  });
});
