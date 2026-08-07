import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './app-logger.service';
import { LoggingInterceptor } from './logging.interceptor';
import { RequestContextService } from './request-context.service';

@Global()
@Module({
  providers: [AppLoggerService, LoggingInterceptor, RequestContextService],
  exports: [AppLoggerService, LoggingInterceptor, RequestContextService],
})
export class LoggingModule {}
