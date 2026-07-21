import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { isIP } from 'node:net';
import { resolve } from 'node:path';
import maxmind, { Reader, CountryResponse } from 'maxmind';
import {
  normalizeCountryIsoCode,
  ResolvedCountryContext,
} from '@modules/auth/utils/request-country-context.util';

type TrustedProxyMode = 'none' | 'single' | 'cloudflare';

function headerValue(request: Request, name: string): string | null {
  const value = request.headers[name];
  if (Array.isArray(value)) return value[0]?.trim() || null;
  return typeof value === 'string' ? value.trim() || null : null;
}

function normalizeIp(value: string | null | undefined): string | null {
  if (!value) return null;
  let ip = value.trim();
  if (ip.startsWith('[') && ip.endsWith(']')) ip = ip.slice(1, -1);
  if (isIP(ip) === 4) return isUsablePublicIpv4(ip) ? ip : null;
  if (isIP(ip) !== 6) return null;

  const mappedIpv4 = ip.toLowerCase().match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1];
  if (mappedIpv4) return isUsablePublicIpv4(mappedIpv4) ? mappedIpv4 : null;

  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::' || normalized.startsWith('fc') ||
      normalized.startsWith('fd') || normalized.startsWith('fe80') ||
      normalized.startsWith('ff')) {
    return null;
  }
  return ip;
}

function isUsablePublicIpv4(ip: string): boolean {
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = octets;
  return !(
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0)
  );
}

function parseTrustedProxyMode(value: unknown): TrustedProxyMode {
  return value === 'single' || value === 'cloudflare' ? value : 'none';
}

@Injectable()
export class TrustedCountryResolutionService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(TrustedCountryResolutionService.name);
  private reader: Reader<CountryResponse> | null = null;
  private initializationPromise: Promise<void> | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    if (this.initializationPromise) return this.initializationPromise;
    this.initializationPromise = this.initializeReader();
    return this.initializationPromise;
  }

  private async initializeReader(): Promise<void> {
    const enabled = this.config.get<boolean>('geoip.enabled') ?? false;
    const databasePath = this.config.get<string | null>('geoip.databasePath');
    if (!enabled || !databasePath) return;

    try {
      this.reader = await maxmind.open<CountryResponse>(resolve(databasePath));
    } catch {
      this.reader = null;
      this.logger.warn('GeoIP database unavailable; country resolution will fall back to USD');
    }
  }

  onApplicationShutdown(): void {
    // maxmind@5.0.6 exposes no Reader.close()/dispose() API. Its async open
    // reads the MMDB into memory, so releasing the reference is the supported
    // cleanup available to this integration.
    this.reader = null;
  }

  resolve(request: Request): ResolvedCountryContext {
    const isProduction = (this.config.get<string>('app.nodeEnv') ?? process.env.NODE_ENV) === 'production';
    if (!isProduction) {
      const override = normalizeCountryIsoCode(process.env.SAWIYAA_DEV_COUNTRY_CODE);
      if (override) return { countryCode: override, source: 'DEV_OVERRIDE' };
    }

    const mode = parseTrustedProxyMode(this.config.get<string>('geoip.trustedProxyMode'));
    const cloudflareEnabled = this.config.get<boolean>('geoip.cloudflareCountryHeaderEnabled') ?? false;
    if (mode === 'cloudflare' && cloudflareEnabled) {
      const cloudflareCountry = normalizeCountryIsoCode(headerValue(request, 'cf-ipcountry'));
      if (cloudflareCountry) return { countryCode: cloudflareCountry, source: 'HEADER_CF' };
    }

    const ip = this.resolveClientIp(request, mode);
    if (!ip || !this.reader) return { countryCode: null, source: 'NONE' };

    try {
      const result = this.reader.get(ip);
      const country = normalizeCountryIsoCode(result?.country?.iso_code);
      return { countryCode: country, source: country ? 'GEOIP' : 'NONE' };
    } catch {
      this.logger.warn('GeoIP lookup failed; country resolution will fall back to USD');
      return { countryCode: null, source: 'NONE' };
    }
  }

  private resolveClientIp(request: Request, mode: TrustedProxyMode): string | null {
    if (mode === 'cloudflare') {
      const cloudflareIp = normalizeIp(headerValue(request, 'cf-connecting-ip'));
      if (cloudflareIp) return cloudflareIp;
    }

    if (mode === 'single') {
      const forwarded = headerValue(request, 'x-forwarded-for');
      if (forwarded) {
        const chain = forwarded.split(',').map((value) => normalizeIp(value)).filter(Boolean) as string[];
        if (chain.length > 0) return chain[Math.max(0, chain.length - 2)] ?? null;
      }
      const realIp = normalizeIp(headerValue(request, 'x-real-ip'));
      if (realIp) return realIp;
    }

    return normalizeIp(request.socket?.remoteAddress);
  }
}
