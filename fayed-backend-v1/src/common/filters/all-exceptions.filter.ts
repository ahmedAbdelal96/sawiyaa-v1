import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nService } from '@common/i18n/services/i18n.service';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { sanitizeForLogging } from '@common/logging/log-sanitizer.util';

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly i18nService: I18nService,
    private readonly logger: AppLoggerService,
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
      }
    } else if (exception instanceof Error) {
      messageKey = this.resolveHttpMessageKey(status);
      errorCode = this.resolveHttpErrorCode(status);
    }

    const method = request.method;
    const path = request.originalUrl ?? request.url;
    const userId = request.user?.id ?? null;
    const requestId = request.requestId ?? null;

    const exceptionMeta = sanitizeForLogging({
      requestId,
      statusCode: status,
      method,
      path,
      userId,
      locale: request.locale,
      validationErrors: errors,
      exception:
        exception instanceof Error
          ? {
              name: exception.name,
              message: exception.message,
            }
          : {
              name: 'UnknownException',
              message: String(exception),
            },
    });

    this.logger.error(
      {
        message: 'Request failed with exception',
        ...exceptionMeta,
      },
      exception instanceof Error ? exception.stack : undefined,
      AllExceptionsFilter.name,
    );

    response.status(status).json({
      success: false,
      errorCode,
      messageKey,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
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
}
