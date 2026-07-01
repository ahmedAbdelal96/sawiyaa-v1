import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as winston from 'winston';
import appConfig from '@config/app.config';
import loggingConfig from '@config/logging.config';
import { sanitizeForLogging } from './log-sanitizer.util';
import { isNestInternalContext } from './logging-policy.util';
import { createWinstonLogger } from './winston.config';
import type { LogTarget } from './logging.types';

type LogMeta = Record<string, unknown> | undefined;

@Injectable()
export class AppLoggerService implements LoggerService {
  private static processHandlersRegistered = false;

  private readonly logger: winston.Logger;

  constructor(
    @Inject(appConfig.KEY)
    private readonly appCfg: ConfigType<typeof appConfig>,
    @Inject(loggingConfig.KEY)
    private readonly loggingCfg: ConfigType<typeof loggingConfig>,
  ) {
    this.logger = createWinstonLogger({
      serviceName: this.appCfg.serviceName ?? this.appCfg.name,
      nodeEnv: this.loggingCfg.nodeEnv,
      level: this.loggingCfg.level,
      pretty: this.loggingCfg.pretty,
      fileEnabled: this.loggingCfg.fileEnabled,
      consoleEnabled: this.loggingCfg.consoleEnabled,
      nestInternalEnabled: this.loggingCfg.nestInternalEnabled,
      logDir: this.loggingCfg.logDir,
      retentionDays: this.loggingCfg.retentionDays,
      maxFileSize: this.loggingCfg.maxFileSize,
    });

    this.registerProcessHandlers();
  }

  log(message: unknown, context?: string): void {
    this.write('info', message, undefined, context, ['app']);
  }

  error(message: unknown, trace?: string, context?: string): void {
    const meta = this.withTrace(trace);
    this.write('error', message, meta, context, ['app', 'error']);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, undefined, context, ['app']);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, undefined, context, ['app']);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, undefined, context, ['app']);
  }

  fatal(message: unknown, trace?: string, context?: string): void {
    this.exception(
      {
        name: 'FatalError',
        message: this.extractMessage(message),
        stack: this.loggingCfg.stackEnabled ? trace : undefined,
      },
      context,
      ['app', 'exceptions'],
    );
  }

  http(message: unknown, meta?: LogMeta, context?: string): void {
    this.write('http', message, meta, context, ['app', 'http']);
  }

  slowRequest(message: unknown, meta?: LogMeta, context?: string): void {
    this.write('warn', message, meta, context, [
      'app',
      'http',
      'slow-requests',
    ]);
  }

  info(message: unknown, meta?: LogMeta, context?: string): void {
    this.write('info', message, meta, context, ['app']);
  }

  exception(
    error: {
      name: string;
      message: string;
      stack?: string;
      [key: string]: unknown;
    },
    context?: string,
    targets: LogTarget[] = ['app', 'exceptions'],
    meta?: LogMeta,
  ): void {
    const payload = sanitizeForLogging({
      ...error,
      ...(meta ?? {}),
      ...(this.loggingCfg.stackEnabled && error.stack
        ? { stack: error.stack }
        : {}),
    });

    this.write('error', payload, undefined, context, targets);
  }

  private write(
    level: string,
    message: unknown,
    meta?: LogMeta,
    context?: string,
    targets: LogTarget[] = ['app'],
  ): void {
    const payload =
      typeof message === 'string'
        ? ({ message } as Record<string, unknown>)
        : sanitizeForLogging(message);
    const fileEnabled = this.shouldWriteToFiles(context);

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
        targets,
        fileEnabled,
      });
      return;
    }

    this.logger.log(level, String(message), {
      ...(context ? { context } : {}),
      ...sanitizeForLogging(meta ?? {}),
      targets,
      fileEnabled,
    });
  }

  private extractMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }

    if (
      typeof message === 'object' &&
      message !== null &&
      'message' in message &&
      typeof (message as Record<string, unknown>).message === 'string'
    ) {
      return String((message as Record<string, unknown>).message);
    }

    return String(message);
  }

  private withTrace(trace?: string): LogMeta {
    if (!trace || !this.loggingCfg.stackEnabled) {
      return undefined;
    }

    return { stack: trace };
  }

  private shouldWriteToFiles(context?: string): boolean {
    if (this.loggingCfg.nestInternalEnabled) {
      return true;
    }

    return !isNestInternalContext(context);
  }

  private registerProcessHandlers(): void {
    if (AppLoggerService.processHandlersRegistered) {
      return;
    }

    AppLoggerService.processHandlersRegistered = true;

    process.once('uncaughtException', (error: Error) => {
      this.exception(
        {
          name: error.name,
          message: error.message,
          stack: error.stack,
          processPid: process.pid,
          environment: this.loggingCfg.nodeEnv,
          event: 'uncaughtException',
        },
        'Process',
        ['app', 'exceptions'],
      );
    });

    process.once('unhandledRejection', (reason: unknown) => {
      const error =
        reason instanceof Error
          ? reason
          : new Error(typeof reason === 'string' ? reason : 'Unhandled rejection');

      this.exception(
        {
          name: error.name,
          message: error.message,
          stack: error.stack,
          processPid: process.pid,
          environment: this.loggingCfg.nodeEnv,
          event: 'unhandledRejection',
        },
        'Process',
        ['app', 'exceptions'],
      );
    });
  }
}
