import { registerAs } from '@nestjs/config';
import { resolveServiceName } from '@common/logging/service-name.util';

export default registerAs('app', () => {
  const defaultCorsOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:8082',
    'http://127.0.0.1:8082',
    'http://localhost:8083',
    'http://127.0.0.1:8083',
  ];
  const envCorsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const serviceName = resolveServiceName();

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    serviceName,
    name: serviceName,
    // APP_URL is validated by env.schema.ts at startup - will throw if missing/invalid
    url: process.env.APP_URL!,
    defaultLocale: process.env.APP_DEFAULT_LOCALE ?? 'ar',
    corsOrigins: Array.from(
      new Set([...defaultCorsOrigins, ...envCorsOrigins]),
    ),
  };
});
