import { parseLogFileSize } from './logging.config';

describe('logging file-size contract', () => {
  it.each([
    ['20mb', 20 * 1024 * 1024],
    ['512kb', 512 * 1024],
    ['1gb', 1024 ** 3],
    ['2048b', 2048],
  ])('parses %s consistently with env validation', (value, expected) => {
    expect(parseLogFileSize(value)).toBe(expected);
  });

  it('falls back for the invalid legacy unit instead of interpreting it as bytes', () => {
    expect(parseLogFileSize('20m')).toBe(20 * 1024 * 1024);
  });
});
