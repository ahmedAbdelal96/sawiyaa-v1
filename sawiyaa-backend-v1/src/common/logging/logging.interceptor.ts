import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import loggingConfig from '@config/logging.config';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { AppRole } from '@common/enums/app-role.enum';
import { AppLoggerService } from './app-logger.service';
import { redactUrlForLogging, sanitizeForLogging } from './log-sanitizer.util';
import {
  classifyHttpException,
  classifyHttpStatus,
  inferHttpModule,
  normalizedRoute,
} from './http-log.util';
import {
  HTTP_LOG_METADATA_KEY,
  HttpLogMetadata,
} from './http-log-metadata.decorator';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: AppLoggerService,
    @Inject(loggingConfig.KEY)
    private readonly loggingCfg: ConfigType<typeof loggingConfig>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http' || !this.loggingCfg.httpEnabled)
      return next.handle();
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();
    const baseMeta = this.buildBaseMeta(request, context);
    const record = (
      statusCode: number,
      extra: Record<string, unknown> = {},
    ) => {
      const state = request as unknown as Record<string, unknown>;
      if (state.__httpLogRecorded === true) return;
      state.__httpLogRecorded = true;
      const classification = classifyHttpStatus(statusCode);
      const durationMs = Date.now() - startedAt;
      const meta = {
        ...baseMeta,
        ...classification,
        statusCode,
        durationMs,
        ...extra,
      };
      this.logger.http(
        {
          message:
            classification.outcome === 'failure'
              ? 'HTTP request failed'
              : 'HTTP request completed',
          ...meta,
        },
        undefined,
        LoggingInterceptor.name,
      );
      if (durationMs >= this.loggingCfg.slowRequestMs)
        this.logger.slowRequest(
          {
            message:
              classification.outcome === 'failure'
                ? 'Slow HTTP request failed'
                : 'Slow HTTP request detected',
            ...meta,
            isSlow: true,
          },
          undefined,
          LoggingInterceptor.name,
        );
    };

    response.once?.('close', () => {
      if (
        (request as unknown as Record<string, unknown>).__httpLogRecorded !==
          true &&
        !response.writableFinished
      )
        record(response.statusCode || 499, {
          outcome: 'aborted',
          failureClass: 'aborted',
        });
    });

    return next.handle().pipe(
      tap(() => record(response.statusCode)),
      catchError((error: unknown) => {
        const statusCode =
          error instanceof HttpException ? error.getStatus() : 500;
        record(statusCode, {
          ...this.safeHttpExceptionMeta(error),
          failureClass: classifyHttpException(error, statusCode),
          error: sanitizeForLogging({
            name: error instanceof Error ? error.name : 'UnknownError',
            message:
              error instanceof Error
                ? error.message
                : 'Unhandled non-error exception',
          }),
        });
        return throwError(() => error);
      }),
    );
  }

  private safeHttpExceptionMeta(error: unknown): Record<string, unknown> {
    if (!(error instanceof HttpException)) return {};
    const response = error.getResponse();
    if (typeof response !== 'object' || response === null) return {};
    const value = response as Record<string, unknown>;
    const validationFields = Array.isArray(value.validationFields)
      ? value.validationFields
      : undefined;
    return sanitizeForLogging({
      errorCode:
        typeof value.errorCode === 'string'
          ? value.errorCode
          : typeof value.error === 'string'
            ? value.error
            : undefined,
      messageKey:
        typeof value.messageKey === 'string' ? value.messageKey : undefined,
      ...(validationFields ? { validationFields } : {}),
    });
  }

  private buildBaseMeta(
    request: AuthenticatedRequest,
    context: ExecutionContext,
  ): Record<string, unknown> {
    const expressRequest = request as Request;
    const userRole = this.resolveUserRole(request.user?.roles?.[0]);
    const metadata = this.resolveHttpMetadata(request, context);
    return sanitizeForLogging({
      requestId: request.requestId,
      method: request.method,
      route: normalizedRoute(request),
      module: metadata.module,
      ...(metadata.operation ? { operation: metadata.operation } : {}),
      ...(request.correlationId
        ? { correlationId: request.correlationId }
        : {}),
      path: redactUrlForLogging(request.originalUrl ?? request.url),
      routeController: context.getClass()?.name ?? null,
      routeHandler: context.getHandler()?.name ?? null,
      userId: request.user?.id ?? null,
      role: userRole,
      actorUserId: request.user?.id ?? null,
      actorRole: userRole,
      tenantId:
        (request.user as Record<string, unknown> | undefined)?.tenantId ?? null,
      locale: request.locale ?? null,
      ip: expressRequest.ip,
      userAgent: request.headers['user-agent'],
      query: this.safeQuerySnapshot(request.query),
      queryKeys: Object.keys(request.query ?? {}),
      service: this.loggingCfg.serviceName,
      environment: this.loggingCfg.nodeEnv,
      version: this.loggingCfg.version,
      ...(this.loggingCfg.deploymentId
        ? { deploymentId: this.loggingCfg.deploymentId }
        : {}),
    });
  }

  private resolveHttpMetadata(
    request: AuthenticatedRequest,
    context: ExecutionContext,
  ): Required<Pick<HttpLogMetadata, 'module'>> &
    Pick<HttpLogMetadata, 'operation'> {
    const handler = context.getHandler();
    const controller = context.getClass();
    const handlerMetadata = Reflect.getMetadata(
      HTTP_LOG_METADATA_KEY,
      handler,
    ) as HttpLogMetadata | undefined;
    const controllerMetadata = Reflect.getMetadata(
      HTTP_LOG_METADATA_KEY,
      controller,
    ) as HttpLogMetadata | undefined;
    const controllerName = controller?.name ?? '';
    const route = normalizedRoute(request).toLowerCase();
    const module =
      handlerMetadata?.module ??
      controllerMetadata?.module ??
      inferHttpModule(controllerName, route);
    return {
      module,
      operation: handlerMetadata?.operation ?? controllerMetadata?.operation,
    };
  }

  private safeQuerySnapshot(query: Request['query']): Record<string, unknown> {
    return query && typeof query === 'object'
      ? sanitizeForLogging(query as Record<string, unknown>)
      : {};
  }

  private resolveUserRole(role?: AppRole): string | null {
    return role ?? null;
  }
}
