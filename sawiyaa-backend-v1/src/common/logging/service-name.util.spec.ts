import {
  resetServiceNameCache,
  resolveServiceName,
} from './service-name.util';

describe('resolveServiceName', () => {
  const originalServiceName = process.env.SERVICE_NAME;

  afterEach(() => {
    if (originalServiceName === undefined) {
      delete process.env.SERVICE_NAME;
    } else {
      process.env.SERVICE_NAME = originalServiceName;
    }
    resetServiceNameCache();
  });

  it('prefers SERVICE_NAME when provided', () => {
    process.env.SERVICE_NAME = 'custom-service';
    resetServiceNameCache();

    expect(resolveServiceName()).toBe('custom-service');
  });

  it('falls back to the package name and not the legacy Fayed name', () => {
    delete process.env.SERVICE_NAME;
    resetServiceNameCache();

    expect(resolveServiceName()).toBe('sawiyaa-backend-v1');
    expect(resolveServiceName()).not.toBe('fayed-backend-v1');
  });
});
