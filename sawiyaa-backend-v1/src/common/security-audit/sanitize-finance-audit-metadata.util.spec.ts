import {
  sanitizeFinanceAuditMetadata,
  sanitizeFinanceAuditValue,
} from './sanitize-finance-audit-metadata.util';

describe('sanitizeFinanceAuditMetadata', () => {
  it('redacts sensitive keys and bounds nested payloads', () => {
    const result = sanitizeFinanceAuditMetadata({
      safe: 'value',
      password: 'secret',
      clientSecret: 'secret',
      nested: { token: 'secret', amount: 12 },
    });

    expect(result).toEqual({
      safe: 'value',
      password: '[REDACTED]',
      clientSecret: '[REDACTED]',
      nested: { token: '[REDACTED]', amount: 12 },
    });
  });

  it('does not retain an unbounded string or deep object', () => {
    expect(sanitizeFinanceAuditValue('x'.repeat(1000))).toHaveLength(500);
    expect(sanitizeFinanceAuditValue({ a: { b: { c: { d: { e: 'secret' } } } } })).toEqual({
      a: { b: { c: { d: { e: '[TRUNCATED]' } } } },
    });
  });
});
