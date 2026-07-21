import { registerAs } from '@nestjs/config';

export default registerAs('geoip', () => ({
  enabled: process.env.GEOIP_ENABLED === 'true',
  databasePath: process.env.GEOIP_DATABASE_PATH?.trim() || null,
  trustedProxyMode: process.env.TRUSTED_PROXY_MODE ?? 'none',
  cloudflareCountryHeaderEnabled:
    process.env.CLOUDFLARE_COUNTRY_HEADER_ENABLED === 'true',
}));
