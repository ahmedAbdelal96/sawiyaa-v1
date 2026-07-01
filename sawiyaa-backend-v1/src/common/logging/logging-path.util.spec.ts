import { buildDailyLogFilePath, formatLocalDateFolder } from './logging-path.util';

describe('logging path helpers', () => {
  it('formats a local date folder as YYYY-MM-DD', () => {
    expect(formatLocalDateFolder(new Date('2026-06-28T10:20:30.000Z'))).toBe(
      '2026-06-28',
    );
  });

  it('builds a daily file path inside the dated folder', () => {
    expect(
      buildDailyLogFilePath('logs', 'http.log', new Date('2026-06-28T10:20:30.000Z')),
    ).toBe('logs\\2026-06-28\\http.log');
  });
});

