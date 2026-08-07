import { classifyHttpStatus, normalizedRoute } from './http-log.util';
import {
  formatHttpConsoleSummary as formatSummary,
  httpConsoleStyle,
} from './logging-record.util';

describe('HTTP logging contract', () => {
  it.each([
    [200, 'success', '2xx', 'none'],
    [302, 'redirect', '3xx', 'none'],
    [400, 'failure', '4xx', 'validation'],
    [401, 'failure', '4xx', 'authentication'],
    [403, 'failure', '4xx', 'permission'],
    [404, 'failure', '4xx', 'not_found'],
    [409, 'failure', '4xx', 'conflict'],
    [422, 'failure', '4xx', 'validation'],
    [429, 'failure', '4xx', 'rate_limit'],
    [500, 'failure', '5xx', 'internal'],
    [503, 'failure', '5xx', 'internal'],
  ])('classifies %s', (statusCode, outcome, statusFamily, failureClass) => {
    expect(classifyHttpStatus(statusCode)).toEqual(
      expect.objectContaining({ outcome, statusFamily, failureClass }),
    );
  });

  it('normalizes a routed dynamic path', () => {
    expect(
      normalizedRoute({
        baseUrl: '/api/v1/items',
        route: { path: '/:id' },
        originalUrl: '/api/v1/items/secret',
      }),
    ).toBe('/api/v1/items/:id');
  });

  it('maps status to semantic console styling and emits no ANSI when disabled', () => {
    expect(httpConsoleStyle(200)).toBe('success');
    expect(httpConsoleStyle(403)).toBe('warning');
    expect(httpConsoleStyle(429)).toBe('rate-limit');
    expect(httpConsoleStyle(500)).toBe('error');
    expect(httpConsoleStyle(200, true)).toBe('slow-success');
    const line = formatSummary(
      {
        statusCode: 403,
        method: 'POST',
        route: '/api/v1/items/:id',
        durationMs: 42,
        requestId: 'req-test',
        errorCode: 'PERMISSION_DENIED',
      },
      false,
    );
    expect(line).toContain('403 POST');
    expect(line).not.toContain('\u001b');
  });
});
