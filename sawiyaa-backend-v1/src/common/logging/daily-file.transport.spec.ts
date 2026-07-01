import { readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DailyFileTransport } from './daily-file.transport';
import { formatLocalDateFolder } from './logging-path.util';

describe('DailyFileTransport', () => {
  const baseDir = path.join(os.tmpdir(), `sawiyaa-logs-${Date.now()}`);

  async function waitForFile(filePath: string): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        return await readFile(filePath, 'utf8');
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }

    return readFile(filePath, 'utf8');
  }

  afterAll(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it('writes a JSON line into the dated file for the matching target', async () => {
    const transport = new DailyFileTransport({
      baseDir,
      fileName: 'http.log',
      target: 'http',
      retentionDays: 30,
    } as never);

    const timestamp = new Date('2026-06-28T12:00:00.000Z').toISOString();

    await new Promise<void>((resolve) => {
      transport.log(
        {
          level: 'http',
          message: 'HTTP request completed',
          timestamp,
          requestId: 'req-1',
          targets: ['app', 'http'],
          method: 'GET',
          path: '/academy',
        },
        () => resolve(),
      );
    });

    const filePath = path.join(
      baseDir,
      formatLocalDateFolder(new Date(timestamp)),
      'http.log',
    );
    const contents = await waitForFile(filePath);
    const parsed = JSON.parse(contents.trim());

    expect(parsed).toEqual(
      expect.objectContaining({
        message: 'HTTP request completed',
        requestId: 'req-1',
        method: 'GET',
        path: '/academy',
      }),
    );
  });

  it('routes handled request errors into error.log targets', async () => {
    const transport = new DailyFileTransport({
      baseDir,
      fileName: 'error.log',
      target: 'error',
      retentionDays: 30,
    } as never);

    const timestamp = new Date('2026-06-28T12:00:00.000Z').toISOString();

    await new Promise<void>((resolve) => {
      transport.log(
        {
          level: 'error',
          message: 'Request failed',
          timestamp,
          targets: ['app', 'error'],
          statusCode: 500,
          errorName: 'Error',
          errorMessage: 'Something failed',
        },
        () => resolve(),
      );
    });

    const filePath = path.join(
      baseDir,
      formatLocalDateFolder(new Date(timestamp)),
      'error.log',
    );
    const contents = await waitForFile(filePath);
    const parsed = JSON.parse(contents.trim());

    expect(parsed).toEqual(
      expect.objectContaining({
        message: 'Request failed',
        statusCode: 500,
        errorName: 'Error',
        errorMessage: 'Something failed',
      }),
    );
  });

  it('routes unhandled exceptions into exceptions.log targets', async () => {
    const transport = new DailyFileTransport({
      baseDir,
      fileName: 'exceptions.log',
      target: 'exceptions',
      retentionDays: 30,
    } as never);

    const timestamp = new Date('2026-06-28T12:00:00.000Z').toISOString();

    await new Promise<void>((resolve) => {
      transport.log(
        {
          level: 'error',
          message: 'Unhandled exception',
          timestamp,
          targets: ['app', 'exceptions'],
          errorName: 'Error',
          errorMessage: 'Boom',
        },
        () => resolve(),
      );
    });

    const filePath = path.join(
      baseDir,
      formatLocalDateFolder(new Date(timestamp)),
      'exceptions.log',
    );
    const contents = await waitForFile(filePath);
    const parsed = JSON.parse(contents.trim());

    expect(parsed).toEqual(
      expect.objectContaining({
        message: 'Unhandled exception',
        errorName: 'Error',
        errorMessage: 'Boom',
      }),
    );
  });

  it('skips non-matching targets', async () => {
    const transport = new DailyFileTransport({
      baseDir,
      fileName: 'slow-requests.log',
      target: 'slow-requests',
      retentionDays: 30,
    } as never);

    await new Promise<void>((resolve) => {
      transport.log(
        {
          level: 'info',
          message: 'HTTP request completed',
          targets: ['app', 'http'],
        },
        () => resolve(),
      );
    });

    const expectedDir = path.join(baseDir, formatLocalDateFolder(new Date()));
    const filePath = path.join(expectedDir, 'slow-requests.log');
    await expect(readFile(filePath, 'utf8')).rejects.toThrow();
  });
});
