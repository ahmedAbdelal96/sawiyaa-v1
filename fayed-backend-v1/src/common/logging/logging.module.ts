import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './app-logger.service';
import { LoggingInterceptor } from './logging.interceptor';

@Global()
@Module({
  providers: [AppLoggerService, LoggingInterceptor],
  exports: [AppLoggerService, LoggingInterceptor],
})
export class LoggingModule {}
