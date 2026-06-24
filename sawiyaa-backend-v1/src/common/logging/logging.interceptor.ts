import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ConfigType } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { Request } from 'express';
import loggingConfig from '@config/logging.config';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { redactUrlForLogging, sanitizeForLogging } from './log-sanitizer.util';
import { AppLoggerService } from './app-logger.service';

/**
 * Logs HTTP request lifecycle without leaking sensitive payload fields.
 * Success logs use level `http`, failures use `warn` for 4xx and `error` for 5xx.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: AppLoggerService,
    @Inject(loggingConfig.KEY)
    private readonly loggingCfg: ConfigType<typeof loggingConfig>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http' || !this.loggingCfg.httpEnabled) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse();
    const startedAt = Date.now();

    const baseMeta = this.buildBaseMeta(request);

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        const statusCode = response.statusCode;
        const meta = {
          ...baseMeta,
          statusCode,
          durationMs,
        };

        if (statusCode >= 500) {
          this.logger.error(
            {
              message: 'HTTP request completed with server error',
              ...meta,
            },
            undefined,
            LoggingInterceptor.name,
          );
          return;
        }

        if (statusCode >= 400) {
          this.logger.warn(
            {
              message: 'HTTP request completed with client error',
              ...meta,
            },
            LoggingInterceptor.name,
          );
          return;
        }

        this.logger.http(
          {
            message: 'HTTP request completed',
            ...meta,
          },
          undefined,
          LoggingInterceptor.name,
        );
      }),
      catchError((error: unknown) => {
        const durationMs = Date.now() - startedAt;
        const statusCode =
          error instanceof HttpException ? error.getStatus() : 500;

        const meta = {
          ...baseMeta,
          statusCode,
          durationMs,
          error: sanitizeForLogging({
            name: error instanceof Error ? error.name : 'UnknownError',
            message:
              error instanceof Error
                ? error.message
                : 'Unhandled non-error exception',
          }),
        };

        if (statusCode >= 500) {
          this.logger.error(
            {
              message: 'HTTP request failed',
              ...meta,
            },
            error instanceof Error ? error.stack : undefined,
            LoggingInterceptor.name,
          );
        } else {
          this.logger.warn(
            {
              message: 'HTTP request failed',
              ...meta,
            },
            LoggingInterceptor.name,
          );
        }

        return throwError(() => error);
      }),
    );
  }

  private buildBaseMeta(
    request: AuthenticatedRequest,
  ): Record<string, unknown> {
    const expressRequest = request as Request;
    return sanitizeForLogging({
      requestId: request.requestId,
      method: request.method,
      path: redactUrlForLogging(request.originalUrl ?? request.url),
      userId: request.user?.id ?? null,
      ip: expressRequest.ip,
      userAgent: request.headers['user-agent'],
    });
  }
}
