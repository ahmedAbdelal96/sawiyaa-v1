jest.mock('pg', () => ({
  Client: jest.fn(),
}));

import { PostgresAdvisoryLockService } from './postgres-advisory-lock.service';

const { Client } = require('pg') as { Client: jest.Mock };

function buildClient() {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue({ rows: [{ acquired: true }] }),
    end: jest.fn().mockResolvedValue(undefined),
  };
}

describe('PostgresAdvisoryLockService', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('keeps the acquired lease on one connection until release', async () => {
    const client = buildClient();
    Client.mockImplementation(() => client);
    const service = new PostgresAdvisoryLockService();

    const lease = await service.tryAcquire('sawiyaa:test-lock');

    expect(lease).not.toBeNull();
    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('pg_try_advisory_lock'),
      ['sawiyaa:test-lock'],
    );

    await lease!.release();
    await lease!.release();

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('pg_advisory_unlock'),
      ['sawiyaa:test-lock'],
    );
    expect(client.end).toHaveBeenCalledTimes(1);
  });

  it('returns a safe unavailable result and closes the connection', async () => {
    const client = buildClient();
    client.query.mockResolvedValueOnce({ rows: [{ acquired: false }] });
    Client.mockImplementation(() => client);
    const service = new PostgresAdvisoryLockService();

    const lease = await service.tryAcquire('sawiyaa:test-lock');

    expect(lease).toBeNull();
    expect(client.end).toHaveBeenCalledTimes(1);
  });

  it('propagates acquisition errors after attempting cleanup', async () => {
    const client = buildClient();
    client.query.mockRejectedValueOnce(new Error('database unavailable'));
    Client.mockImplementation(() => client);
    const service = new PostgresAdvisoryLockService();

    await expect(service.tryAcquire('sawiyaa:test-lock')).rejects.toThrow(
      'database unavailable',
    );
    expect(client.end).toHaveBeenCalledTimes(1);
  });
});
