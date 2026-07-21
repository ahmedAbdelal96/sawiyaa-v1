import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AppLoggerService } from './common/logging/app-logger.service';
import { LoggingInterceptor } from './common/logging/logging.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  // Do not trust forwarded headers unless the operator explicitly declares
  // the deployment path. The country resolver uses the same explicit mode.
  const trustedProxyMode = process.env.TRUSTED_PROXY_MODE ?? 'none';
  app.getHttpAdapter().getInstance().set(
    'trust proxy',
    trustedProxyMode === 'none' ? false : 1,
  );

  const logger = app.get(AppLoggerService);
  app.useLogger(logger);

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // Only region-sensitive pricing responses are forced private. Unrelated
  // APIs retain their normal cache policy.
  const regionSensitivePrefixes = [
    '/api/v1/practitioners',
    '/api/v1/public/featured-practitioners',
    '/api/v1/package-plans',
    '/api/v1/academy',
    '/api/v1/patients/me',
    '/api/v1/sessions',
    '/api/v1/payments',
    '/api/v1/instant-booking',
  ];
  app.use((request, response, next) => {
    if (regionSensitivePrefixes.some((prefix) => request.path.startsWith(prefix))) {
      response.setHeader('Cache-Control', 'private, no-store, max-age=0');
      response.setHeader(
        'Vary',
        'Cookie, Authorization, CF-IPCountry',
      );
    }
    next();
  });

  const apiPrefix = 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  const defaultOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:19007',
    'http://127.0.0.1:19007',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:8082',
    'http://127.0.0.1:8082',
    'http://localhost:8083',
    'http://127.0.0.1:8083',
  ];
  const envOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = Array.from(
    new Set([...defaultOrigins, ...envOrigins]),
  );
  const allowAnyOriginForDev =
    allowedOrigins.includes('*') &&
    (process.env.NODE_ENV ?? 'development') !== 'production';

  app.enableCors({
    origin: allowAnyOriginForDev ? true : allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-csrf-token',
      'x-lang',
      'Accept-Language',
      'x-request-id',
      'x-client-platform',
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(app.get(AllExceptionsFilter));
  app.useGlobalInterceptors(
    app.get(LoggingInterceptor),
    new ResponseInterceptor(),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sawiyaa Backend API')
    .setDescription('Phase 1 backend APIs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);

  logger.info(
    {
      message: 'Application started',
      port,
      apiPrefix,
      pid: process.pid,
      swaggerPath: '/api/docs',
    },
    undefined,
    'Bootstrap',
  );
}

bootstrap().catch((error) => {
  // Fallback console only for bootstrap failures before DI is available.

  console.error('Fatal error during bootstrap', error);
  process.exit(1);
});
