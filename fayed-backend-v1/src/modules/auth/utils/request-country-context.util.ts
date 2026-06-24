import { Request } from 'express';

export interface ResolvedCountryContext {
  countryCode: string | null;
  source: 'HEADER_CF' | 'HEADER_VERCEL' | 'DEV_OVERRIDE' | 'NONE';
}

/**
 * Extracts the visitor's country code from trusted request headers.
 *
 * Trusted headers:
 * - `cf-ipcountry` – Cloudflare Worker / Krabs metadata header (most reliable, CF-proxied requests only)
 * - `x-vercel-ip-country` – Vercel Edge header (when deployed behind Vercel Edge)
 *
 * SAWIYAA_DEV_COUNTRY_CODE env var is local-development only and is completely
 * ignored in production to prevent accidental country override in live environments.
 *
 * Returns null if no trusted signal is available, letting the payment resolver
 * default to INTERNATIONAL (USD) for unknown origins. Unknown country never
 * defaults to Egypt.
 *
 * @param request Express Request object
 * @returns ResolvedCountryContext with country code and detection source
 */
export function resolveCountryFromRequest(
  request: Request,
): ResolvedCountryContext {
  const isProduction = process.env.NODE_ENV === 'production';

  // Dev override — local development only, completely disabled in production
  if (!isProduction) {
    const devOverride = process.env.SAWIYAA_DEV_COUNTRY_CODE;
    if (devOverride && devOverride.trim().length > 0) {
      return {
        countryCode: devOverride.trim().toUpperCase(),
        source: 'DEV_OVERRIDE',
      };
    }
  }

  // Cloudflare (cf-ipcountry is set by Cloudflare edge for proxied requests)
  const cfCountry = request.headers['cf-ipcountry'];
  if (typeof cfCountry === 'string' && cfCountry.trim().length > 0) {
    return {
      countryCode: cfCountry.trim().toUpperCase(),
      source: 'HEADER_CF',
    };
  }

  // Vercel Edge (x-vercel-ip-country is set when deployed behind Vercel Edge)
  const vercelCountry = request.headers['x-vercel-ip-country'];
  if (typeof vercelCountry === 'string' && vercelCountry.trim().length > 0) {
    return {
      countryCode: vercelCountry.trim().toUpperCase(),
      source: 'HEADER_VERCEL',
    };
  }

  return {
    countryCode: null,
    source: 'NONE',
  };
}

const EGYPT_ISO_CODES = new Set(['EG', 'EGY']);

export function isEgyptCountryCode(
  countryCode: string | null | undefined,
): boolean {
  if (!countryCode) return false;
  const normalized = countryCode.toUpperCase();
  return EGYPT_ISO_CODES.has(normalized);
}

export function normalizeCountryIsoCode(
  code: string | null | undefined,
): string | null {
  if (!code) return null;
  const trimmed = code.trim().toUpperCase();
  return trimmed.length >= 2 && trimmed.length <= 3 ? trimmed : null;
}
