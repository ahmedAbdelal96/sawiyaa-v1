import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Request } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import loggingConfig from '@config/logging.config';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { AppRole } from '@common/enums/app-role.enum';
import { AppLoggerService } from './app-logger.service';
import { redactUrlForLogging, sanitizeForLogging } from './log-sanitizer.util';

/**
 * Logs HTTP request lifecycle without leaking sensitive payload fields.
 * Success logs use the HTTP file target; slow requests are additionally
 * routed to the dedicated slow-requests file.
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

    const baseMeta = this.buildBaseMeta(request, context);

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        const statusCode = response.statusCode;
        const meta = {
          ...baseMeta,
          statusCode,
          durationMs,
        };

        this.logger.http(
          {
            message: 'HTTP request completed',
            ...meta,
          },
          undefined,
          LoggingInterceptor.name,
        );

        if (durationMs >= this.loggingCfg.slowRequestMs) {
          this.logger.slowRequest(
            {
              message: 'Slow HTTP request detected',
              ...meta,
            },
            undefined,
            LoggingInterceptor.name,
          );
        }
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

        this.logger.http(
          {
            message: 'HTTP request failed',
            ...meta,
          },
          undefined,
          LoggingInterceptor.name,
        );

        if (durationMs >= this.loggingCfg.slowRequestMs) {
          this.logger.slowRequest(
            {
              message: 'Slow HTTP request failed',
              ...meta,
            },
            undefined,
            LoggingInterceptor.name,
          );
        }

        return throwError(() => error);
      }),
    );
  }

  private buildBaseMeta(
    request: AuthenticatedRequest,
    context: ExecutionContext,
  ): Record<string, unknown> {
    const expressRequest = request as Request;
    const routeController = context.getClass()?.name ?? null;
    const routeHandler = context.getHandler()?.name ?? null;
    const userRole = this.resolveUserRole(request.user?.roles?.[0]);

    return sanitizeForLogging({
      requestId: request.requestId,
      method: request.method,
      path: redactUrlForLogging(request.originalUrl ?? request.url),
      routeController,
      routeHandler,
      userId: request.user?.id ?? null,
      role: userRole,
      locale: request.locale ?? null,
      ip: expressRequest.ip,
      userAgent: request.headers['user-agent'],
      query: this.safeQuerySnapshot(request.query),
      queryKeys: Object.keys(request.query ?? {}),
    });
  }

  private safeQuerySnapshot(query: Request['query']): Record<string, unknown> {
    if (!query || typeof query !== 'object') {
      return {};
    }

    return sanitizeForLogging(query as Record<string, unknown>);
  }

  private resolveUserRole(role?: AppRole): string | null {
    return role ?? null;
  }
}

