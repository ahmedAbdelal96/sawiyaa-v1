import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  name: process.env.APP_NAME ?? 'fayed-backend-v1',
  url: process.env.APP_URL ?? 'http://localhost:3000',
  defaultLocale: process.env.APP_DEFAULT_LOCALE ?? 'ar',
  corsOrigins: (
    process.env.CORS_ORIGINS ??
    'http://localhost:3000,http://127.0.0.1:3000,http://localhost:8081,http://127.0.0.1:8081'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
}));
