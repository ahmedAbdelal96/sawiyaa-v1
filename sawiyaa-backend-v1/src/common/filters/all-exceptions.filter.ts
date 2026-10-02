import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Request, Response } from 'express';
import loggingConfig from '@config/logging.config';
import { I18nService } from '@common/i18n/services/i18n.service';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { AppRole } from '@common/enums/app-role.enum';
import { AppLoggerService } from '@common/logging/app-logger.service';
import {
  redactUrlForLogging,
  sanitizeForLogging,
} from '@common/logging/log-sanitizer.util';
import {
  classifyHttpException,
  classifyHttpStatus,
  inferHttpModule,
  normalizedRoute,
} from '@common/logging/http-log.util';
import {
  HTTP_LOG_METADATA_KEY,
  HttpLogMetadata,
} from '@common/logging/http-log-metadata.decorator';

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly i18nService: I18nService,
    private readonly logger: AppLoggerService,
    @Inject(loggingConfig.KEY)
    private readonly loggingCfg: ConfigType<typeof loggingConfig>,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthenticatedRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let messageKey = 'common.errors.internalServerError';
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = this.i18nService.t(messageKey, request.locale);
    let errors: unknown[] = [];
    let safeExceptionFields: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const res = exceptionResponse as Record<string, unknown>;
        const exceptionMessageKey =
          typeof res.messageKey === 'string' ? res.messageKey : null;
        const exceptionErrorCode =
          typeof res.errorCode === 'string'
            ? res.errorCode
            : typeof res.error === 'string'
              ? res.error
              : null;
        const validationFields = Array.isArray(res.validationFields)
          ? res.validationFields
          : undefined;
        const messageParams =
          typeof res.messageParams === 'object' && res.messageParams !== null
            ? (res.messageParams as Record<string, string | number>)
            : undefined;

        if (exceptionMessageKey) {
          messageKey = exceptionMessageKey;
          message = this.i18nService.t(
            exceptionMessageKey,
            request.locale,
            messageParams,
          );
        } else {
          if (typeof res.message === 'string') {
            message = res.message;
          } else {
            message = this.i18nService.t(
              this.resolveHttpMessageKey(status),
              request.locale,
            );
          }
          messageKey = this.resolveHttpMessageKey(status);
        }

        if (exceptionErrorCode) {
          errorCode = exceptionErrorCode;
        } else {
          errorCode = this.resolveHttpErrorCode(status);
        }
        errors = Array.isArray(res.message) ? (res.message as unknown[]) : [];
        safeExceptionFields = this.pickSafeExceptionFields(res);
        if (validationFields) {
          errors = validationFields;
        }
      }
    } else if (exception instanceof Error) {
      messageKey = this.resolveHttpMessageKey(status);
      errorCode = this.resolveHttpErrorCode(status);
    }

    const method = request.method;
    const path = redactUrlForLogging(request.originalUrl ?? request.url);
    const userId = request.user?.id ?? null;
    const role = this.resolveUserRole(request.user?.roles?.[0]);
    const requestId = request.requestId ?? null;
    const classification = classifyHttpStatus(status);
    const route = normalizedRoute(request);
    const metadataHost = host as ArgumentsHost & {
      getHandler?: () => unknown;
      getClass?: () => { name?: string };
    };
    const handlerTarget = metadataHost.getHandler?.();
    const controllerTarget = metadataHost.getClass?.();
    const readMetadata = (target: unknown): HttpLogMetadata | undefined =>
      target && (typeof target === 'object' || typeof target === 'function')
        ? (Reflect.getMetadata(HTTP_LOG_METADATA_KEY, target) as
            | HttpLogMetadata
            | undefined)
        : undefined;
    const handlerMetadata = readMetadata(handlerTarget);
    const controllerMetadata = readMetadata(controllerTarget);
    const requestState = request as AuthenticatedRequest & {
      __httpLogRecorded?: boolean;
      loggingStartedAt?: number;
    };

    if (this.loggingCfg.httpEnabled && !requestState.__httpLogRecorded) {
      requestState.__httpLogRecorded = true;
      const durationMs = requestState.loggingStartedAt
        ? Math.max(0, Date.now() - requestState.loggingStartedAt)
        : 0;
      const httpMeta = sanitizeForLogging({
        requestId,
        method,
        route,
        module:
          handlerMetadata?.module ??
          controllerMetadata?.module ??
          inferHttpModule(controllerTarget?.name ?? '', route),
        ...((handlerMetadata?.operation ?? controllerMetadata?.operation)
          ? {
              operation:
                handlerMetadata?.operation ?? controllerMetadata?.operation,
            }
          : {}),
        ...(request.correlationId
          ? { correlationId: request.correlationId }
          : {}),
        path,
        statusCode: status,
        durationMs,
        ...classification,
        failureClass: classifyHttpException(exception, status),
        errorCode,
        messageKey,
        actorId: userId,
        actorRole: role,
        tenantId:
          (request.user as Record<string, unknown> | undefined)?.tenantId ??
          null,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        service: this.loggingCfg.serviceName,
        environment: this.loggingCfg.nodeEnv,
        version: this.loggingCfg.version,
        ...(this.loggingCfg.deploymentId
          ? { deploymentId: this.loggingCfg.deploymentId }
          : {}),
        isSlow: durationMs >= (this.loggingCfg.slowRequestMs ?? 1000),
      });
      const optionalLogger = this.logger as unknown as {
        http?: (...args: unknown[]) => void;
        slowRequest?: (...args: unknown[]) => void;
      };
      if (typeof optionalLogger.http === 'function') {
        optionalLogger.http(
          { message: 'HTTP request failed', ...httpMeta },
          undefined,
          AllExceptionsFilter.name,
        );
      }
      if (httpMeta.isSlow && typeof optionalLogger.slowRequest === 'function') {
        optionalLogger.slowRequest(
          { message: 'Slow HTTP request failed', ...httpMeta },
          undefined,
          AllExceptionsFilter.name,
        );
      }
    }

    const logMeta = sanitizeForLogging({
      requestId,
      statusCode: status,
      statusFamily: classification.statusFamily,
      failureClass: classifyHttpException(exception, status),
      errorCode,
      messageKey,
      method,
      path,
      userId,
      role,
      locale: request.locale,
      validationErrors: errors,
      errorName:
        exception instanceof Error ? exception.name : 'UnknownException',
      errorMessage:
        exception instanceof Error
          ? exception.message
          : 'Request failed with exception',
      ...(exception instanceof Error && this.loggingCfg.stackEnabled
        ? { stack: exception.stack }
        : {}),
    });

    if (Number(status) >= 500) {
      this.logger.error(
        {
          message: 'Request failed',
          ...logMeta,
        },
        undefined,
        AllExceptionsFilter.name,
      );
    }

    response.status(status).json({
      success: false,
      errorCode,
      messageKey,
      message,
      errors,
      ...safeExceptionFields,
      timestamp: new Date().toISOString(),
      path,
      locale: request.locale,
      requestId,
    });
  }

  private resolveHttpErrorCode(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'UNPROCESSABLE_ENTITY';
      case 429:
        return 'TOO_MANY_REQUESTS';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }

  private resolveHttpMessageKey(status: number): string {
    switch (status) {
      case 400:
        return 'common.errors.badRequest';
      case 401:
        return 'common.errors.unauthorized';
      case 403:
        return 'common.errors.forbidden';
      case 404:
        return 'common.errors.notFound';
      case 409:
        return 'common.errors.conflict';
      case 422:
        return 'common.errors.unprocessableEntity';
      case 429:
        return 'common.errors.tooManyRequests';
      default:
        return 'common.errors.internalServerError';
    }
  }

  private resolveUserRole(role?: AppRole): string | null {
    return role ?? null;
  }

  private pickSafeExceptionFields(
    response: Record<string, unknown>,
  ): Record<string, unknown> {
    const allowedKeys = new Set([
      'remainingAttempts',
      'maxAttempts',
      'lockedUntil',
      'retryAfterSeconds',
      'resendAvailableAt',
      'cooldownSeconds',
      'details',
    ]);

    return Object.fromEntries(
      Object.entries(response).filter(([key]) => allowedKeys.has(key)),
    );
  }
}
