import { TrustedCountryResolutionService } from '@common/country-resolution/trusted-country-resolution.service';
import {
  COUNTRY_CONTEXT_KEY,
  normalizeCountryIsoCode,
  resolveCountryFromRequest,
} from './request-country-context.util';

function service(values: Record<string, unknown> = {}) {
  return new TrustedCountryResolutionService({
    get: (key: string) => values[key],
  } as never);
}

function request(headers: Record<string, string> = {}, remoteAddress = '8.8.8.8') {
  return { headers, socket: { remoteAddress } } as any;
}

describe('country normalization', () => {
  it.each([
    ['EG', 'EG'],
    ['EGY', 'EG'],
    [' eg ', 'EG'],
    ['US', 'US'],
    ['XX', null],
    ['T1', null],
    ['malformed', null],
    ['', null],
    [undefined, null],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeCountryIsoCode(input)).toBe(expected);
  });
});

describe('TrustedCountryResolutionService', () => {
  it('accepts Cloudflare country only on an explicitly trusted Cloudflare path', () => {
    const resolver = service({
      'app.nodeEnv': 'production',
      'geoip.trustedProxyMode': 'cloudflare',
      'geoip.cloudflareCountryHeaderEnabled': true,
    });
    expect(resolver.resolve(request({ 'cf-ipcountry': ' EGY ' }))).toMatchObject({
      countryCode: 'EG',
      source: 'HEADER_CF',
    });
  });

  it('ignores a spoofed Cloudflare header on an untrusted direct request', () => {
    const resolver = service({
      'app.nodeEnv': 'production',
      'geoip.trustedProxyMode': 'none',
      'geoip.cloudflareCountryHeaderEnabled': false,
    });
    expect(resolver.resolve(request({ 'cf-ipcountry': 'EG' }))).toEqual({
      countryCode: null,
      source: 'NONE',
    });
  });

  it('rejects invalid Cloudflare values and safely falls back', () => {
    const resolver = service({
      'app.nodeEnv': 'production',
      'geoip.trustedProxyMode': 'cloudflare',
      'geoip.cloudflareCountryHeaderEnabled': true,
    });
    expect(resolver.resolve(request({ 'cf-ipcountry': 'XX' }))).toEqual({
      countryCode: null,
      source: 'NONE',
    });
  });

  it('uses the rightmost forwarded client value only in explicit single-proxy mode', () => {
    const resolver = service({
      'app.nodeEnv': 'production',
      'geoip.trustedProxyMode': 'single',
      'geoip.cloudflareCountryHeaderEnabled': false,
    });
    expect(resolver.resolve(request({ 'x-forwarded-for': '8.8.8.8, 1.1.1.1' }))).toEqual({
      countryCode: null,
      source: 'NONE',
    });
  });

  it('reads development override only outside production', () => {
    process.env.SAWIYAA_DEV_COUNTRY_CODE = 'egy';
    expect(
      service({
        'app.nodeEnv': 'development',
        'geoip.trustedProxyMode': 'none',
      }).resolve(request()),
    ).toMatchObject({ countryCode: 'EG', source: 'DEV_OVERRIDE' });
    delete process.env.SAWIYAA_DEV_COUNTRY_CODE;
  });

  it('exposes the resolved context through the existing request helper', () => {
    const resolvedRequest = request();
    const resolver = service({
      'app.nodeEnv': 'production',
      'geoip.trustedProxyMode': 'none',
    });
    const context = resolver.resolve(resolvedRequest);
    resolvedRequest[COUNTRY_CONTEXT_KEY] = context;
    expect(resolveCountryFromRequest(resolvedRequest)).toEqual(context);
  });
});
