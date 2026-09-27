import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NotificationWorkerModule } from './notification-worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(
    NotificationWorkerModule,
    { bufferLogs: true },
  );
  const logger = new Logger('NotificationWorkerBootstrap');
  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.log(`Notification worker shutting down (${signal})`);
    await app.close();
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
  logger.log('Notification worker process started');
}

bootstrap().catch((error) => {
  console.error('Fatal notification worker bootstrap error', error);
  process.exitCode = 1;
});
