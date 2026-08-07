import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { analyzeDailyLogs, renderDailyReport } from './daily-log-analyzer';

describe('daily log analyzer', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'sawiyaa-logs-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('streams base and rotated files, tolerates malformed lines, and groups routes', async () => {
    await writeFile(
      path.join(directory, 'http.log'),
      [
        JSON.stringify({
          statusCode: 200,
          statusFamily: '2xx',
          route: '/items/:id',
          module: 'appointments',
          operation: 'GET_APPOINTMENT',
          durationMs: 10,
          requestId: 'safe-1',
        }),
        JSON.stringify({
          statusCode: 403,
          statusFamily: '4xx',
          route: '/items/:id',
          module: 'appointments',
          operation: 'GET_APPOINTMENT',
          durationMs: 20,
          errorCode: 'PERMISSION_DENIED',
          failureClass: 'permission',
        }),
        '{malformed',
      ].join('\n'),
    );
    await writeFile(
      path.join(directory, 'http.1.log'),
      JSON.stringify({
        statusCode: 500,
        statusFamily: '5xx',
        route: '/items/:id',
        module: 'appointments',
        operation: 'GET_APPOINTMENT',
        durationMs: 30,
        errorCode: 'INTERNAL_SERVER_ERROR',
        failureClass: 'internal',
      }) + '\n',
    );

    const report = await analyzeDailyLogs({ directory });
    expect(report.filesRead).toBe(2);
    expect(report.malformedLines).toBe(1);
    expect(report.total).toBe(3);
    expect(report.successful).toBe(1);
    expect(report.failed).toBe(2);
    expect(report.statusFamilies).toEqual({
      '2xx': 1,
      '3xx': 0,
      '4xx': 1,
      '5xx': 1,
    });
    expect(report.routes).toHaveLength(1);
    expect(report.routes[0].failures).toBe(2);
    expect(renderDailyReport(report, '2026-08-05')).toContain(
      'PERMISSION_DENIED (1)',
    );
  });

  it('calculates deterministic nearest-rank percentiles and percentages', async () => {
    const records = [10, 20, 30, 40, 50].map((durationMs) =>
      JSON.stringify({
        statusCode: 200,
        route: '/health',
        module: 'other',
        durationMs,
      }),
    );
    await writeFile(
      path.join(directory, 'http.log'),
      records.join('\n') + '\n',
    );
    const report = await analyzeDailyLogs({ directory });
    const markdown = renderDailyReport(report, '2026-08-05');
    expect(markdown).toContain('Success percentage: 100.00%');
    expect(markdown).toContain('| /health | 5 | 30.00 | 30 | 50 | 50 | 50 |');
  });
});
