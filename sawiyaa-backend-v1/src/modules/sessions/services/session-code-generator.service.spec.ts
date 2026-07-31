import {
  formatSessionCode,
  resolveSessionCodeDateKey,
  SessionCodeGenerationError,
  SESSION_CODE_PATTERN,
} from './session-code-generator.service';

describe('session-code-generator', () => {
  it('formats the canonical public code', () => {
    expect(formatSessionCode({ dateKey: '260729', sequence: 42 })).toBe(
      'S-260729-0042',
    );
    expect(SESSION_CODE_PATTERN.test('S-260729-0042')).toBe(true);
  });

  it('uses Africa/Cairo for the creation-date boundary', () => {
    expect(resolveSessionCodeDateKey(new Date('2026-07-28T20:59:59.000Z'))).toBe(
      '260728',
    );
    expect(resolveSessionCodeDateKey(new Date('2026-07-28T21:00:00.000Z'))).toBe(
      '260729',
    );
  });

  it('returns a typed error for daily capacity overflow', () => {
    expect(() => formatSessionCode({ dateKey: '260729', sequence: 10_000 })).toThrow(
      SessionCodeGenerationError,
    );
    try {
      formatSessionCode({ dateKey: '260729', sequence: 10_000 });
    } catch (error) {
      expect(error).toMatchObject({ code: 'SESSION_CODE_DAILY_CAPACITY_EXCEEDED' });
    }
  });

  it('rejects malformed date keys instead of creating a competing format', () => {
    expect(() => formatSessionCode({ dateKey: '20260729', sequence: 1 })).toThrow(
      SessionCodeGenerationError,
    );
  });
});
