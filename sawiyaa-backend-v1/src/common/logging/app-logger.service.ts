import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as winston from 'winston';
import appConfig from '@config/app.config';
import loggingConfig from '@config/logging.config';
import { sanitizeForLogging } from './log-sanitizer.util';
import { createWinstonLogger } from './winston.config';

type LogMeta = Record<string, unknown> | undefined;

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logger: winston.Logger;

  constructor(
    @Inject(appConfig.KEY)
    private readonly appCfg: ConfigType<typeof appConfig>,
    @Inject(loggingConfig.KEY)
    private readonly loggingCfg: ConfigType<typeof loggingConfig>,
  ) {
    this.logger = createWinstonLogger({
      appName: this.appCfg.name,
      nodeEnv: this.loggingCfg.nodeEnv,
      level: this.loggingCfg.level,
      pretty: this.loggingCfg.pretty,
    });
  }

  log(message: unknown, context?: string): void {
    this.write('info', message, undefined, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    const meta = trace ? { trace } : undefined;
    this.write('error', message, meta, context);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, undefined, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, undefined, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, undefined, context);
  }

  fatal(message: unknown, trace?: string, context?: string): void {
    const meta = trace ? { trace } : undefined;
    this.write('error', message, meta, context);
  }

  http(message: unknown, meta?: LogMeta, context?: string): void {
    this.write('http', message, meta, context);
  }

  info(message: unknown, meta?: LogMeta, context?: string): void {
    this.write('info', message, meta, context);
  }

  private write(
    level: string,
    message: unknown,
    meta?: LogMeta,
    context?: string,
  ): void {
    const payload =
      typeof message === 'string'
        ? ({ message } as Record<string, unknown>)
        : sanitizeForLogging(message);

    if (payload && typeof payload === 'object' && 'message' in payload) {
      const objectPayload = payload as Record<string, unknown>;
      const text = String(objectPayload.message);
      const mergedMeta = sanitizeForLogging({
        ...objectPayload,
        ...meta,
      });
      delete mergedMeta.message;
      this.logger.log(level, text, {
        ...(context ? { context } : {}),
        ...mergedMeta,
      });
      return;
    }

    this.logger.log(level, String(message), {
      ...(context ? { context } : {}),
      ...sanitizeForLogging(meta ?? {}),
    });
  }
}
