jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

import {
  PRODUCTION_API_URL,
  resolveMobileApiUrl,
} from '../../src/config/mobile-environment';

describe('mobile API environment', () => {
  it('uses the committed production endpoint when release env is absent', () => {
    expect(
      resolveMobileApiUrl({ isDevelopment: false, platform: 'android' }),
    ).toBe(PRODUCTION_API_URL);
    expect(PRODUCTION_API_URL).toBe('https://sawiyaa.com/api/v1');
  });

  it('keeps local development endpoints explicit', () => {
    expect(
      resolveMobileApiUrl({ isDevelopment: true, platform: 'android' }),
    ).toBe('http://10.0.2.2:7000/api/v1');
  });

  it('rejects an insecure release override before the app starts', () => {
    expect(() =>
      resolveMobileApiUrl({
        configuredUrl: 'http://example.test/api/v1',
        isDevelopment: false,
        platform: 'android',
      }),
    ).toThrow('must use https://');
  });
});
