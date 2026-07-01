import { toJsonLogRecord } from './logging-record.util';

describe('logging-record util', () => {
  it('emits a valid JSON log object without noisy metadata fields', () => {
    const record = toJsonLogRecord({
      timestamp: '2026-06-28T12:06:37.312Z',
      level: 'info',
      message: 'Application started',
      context: 'Bootstrap',
      service: 'sawiyaa-backend-v1',
      env: 'development',
      targets: ['app'],
      stackEnabled: true,
      port: 7000,
      apiPrefix: 'api/v1',
      pid: 29052,
    });

    const parsed = JSON.parse(JSON.stringify(record));

    expect(parsed).toEqual(
      expect.objectContaining({
        timestamp: '2026-06-28T12:06:37.312Z',
        level: 'info',
        service: 'sawiyaa-backend-v1',
        env: 'development',
        context: 'Bootstrap',
        message: 'Application started',
        port: 7000,
        apiPrefix: 'api/v1',
        pid: 29052,
      }),
    );
    expect(parsed).not.toHaveProperty('targets');
    expect(parsed).not.toHaveProperty('stackEnabled');
  });
});
