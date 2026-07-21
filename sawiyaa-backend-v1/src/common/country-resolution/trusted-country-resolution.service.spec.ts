import { ConfigService } from '@nestjs/config';
import maxmind from 'maxmind';
import { TrustedCountryResolutionService } from './trusted-country-resolution.service';

function createResolver(values: Record<string, unknown> = {}) {
  return new TrustedCountryResolutionService({
    get: (key: string) => values[key],
  } as ConfigService);
}

function request(remoteAddress: string, headers: Record<string, string> = {}) {
  return { socket: { remoteAddress }, headers } as any;
}

describe('TrustedCountryResolutionService GeoIP boundary', () => {
  it('loads one reader and maps public IPv4, IPv6, and mapped IPv4 values', async () => {
    const resolver = createResolver({
      'app.nodeEnv': 'production',
      'geoip.enabled': true,
      'geoip.databasePath': 'country.mmdb',
      'geoip.trustedProxyMode': 'none',
    });
    const reader = { get: jest.fn().mockReturnValue({ country: { iso_code: 'EGY' } }) };
    (resolver as any).reader = reader;

    expect(resolver.resolve(request('8.8.8.8'))).toMatchObject({ countryCode: 'EG' });
    expect(resolver.resolve(request('2001:4860:4860::8888'))).toMatchObject({ countryCode: 'EG' });
    expect(resolver.resolve(request('::ffff:8.8.8.8'))).toMatchObject({ countryCode: 'EG' });
    expect(reader.get).toHaveBeenCalledTimes(3);
    expect(reader.get).toHaveBeenLastCalledWith('8.8.8.8');
  });

  it.each(['127.0.0.1', '10.0.0.1', '192.168.1.2', '::1', 'fc00::1', 'not-an-ip'])(
    'does not query GeoIP for unusable IP %s',
    (ip) => {
      const resolver = createResolver({
        'app.nodeEnv': 'production',
        'geoip.trustedProxyMode': 'none',
      });
      const reader = { get: jest.fn() };
      (resolver as any).reader = reader;
      expect(resolver.resolve(request(ip))).toEqual({ countryCode: null, source: 'NONE' });
      expect(reader.get).not.toHaveBeenCalled();
    },
  );

  it('swallows reader failures and returns unknown', () => {
    const resolver = createResolver({
      'app.nodeEnv': 'production',
      'geoip.trustedProxyMode': 'none',
    });
    (resolver as any).reader = { get: jest.fn(() => { throw new Error('broken mmdb'); }) };
    expect(resolver.resolve(request('8.8.8.8'))).toEqual({ countryCode: null, source: 'NONE' });
  });

  it('starts safely when GeoIP is enabled without a database path', async () => {
    const resolver = createResolver({
      'geoip.enabled': true,
      'geoip.databasePath': null,
    });
    await expect(resolver.onModuleInit()).resolves.toBeUndefined();
    expect(resolver.resolve(request('8.8.8.8'))).toEqual({ countryCode: null, source: 'NONE' });
  });

  it('starts safely when the configured database file is missing', async () => {
    const resolver = createResolver({
      'geoip.enabled': true,
      'geoip.databasePath': 'missing-country-database.mmdb',
    });
    await expect(resolver.onModuleInit()).resolves.toBeUndefined();
    expect(resolver.resolve(request('8.8.8.8'))).toEqual({ countryCode: null, source: 'NONE' });
  });

  it('attempts database initialization only once after a failure', async () => {
    const resolver = createResolver({
      'geoip.enabled': true,
      'geoip.databasePath': 'missing-country-database.mmdb',
    });
    const openSpy = jest
      .spyOn(maxmind, 'open')
      .mockRejectedValue(new Error('missing database'));

    await resolver.onModuleInit();
    await resolver.onModuleInit();

    expect(openSpy).toHaveBeenCalledTimes(1);
    openSpy.mockRestore();
  });
});
