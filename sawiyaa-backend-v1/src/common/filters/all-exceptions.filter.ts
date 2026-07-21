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

    const logMeta = sanitizeForLogging({
      requestId,
      statusCode: status,
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

    if (status >= 500) {
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
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }

  private resolveHttpMessageKey(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'common.errors.badRequest';
      case HttpStatus.UNAUTHORIZED:
        return 'common.errors.unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'common.errors.forbidden';
      case HttpStatus.NOT_FOUND:
        return 'common.errors.notFound';
      case HttpStatus.CONFLICT:
        return 'common.errors.conflict';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'common.errors.unprocessableEntity';
      case HttpStatus.TOO_MANY_REQUESTS:
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
