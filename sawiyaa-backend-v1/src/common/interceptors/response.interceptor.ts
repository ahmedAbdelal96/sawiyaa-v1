import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

function isAlreadySuccessEnvelope(
  value: unknown,
): value is SuccessResponse<unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const maybeEnvelope = value as Record<string, unknown>;
  return maybeEnvelope.success === true && 'data' in maybeEnvelope;
}

function shouldBypassEnvelope(value: unknown): boolean {
  return value instanceof StreamableFile;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) =>
        shouldBypassEnvelope(data)
          ? (data as SuccessResponse<T>)
          : isAlreadySuccessEnvelope(data)
            ? (data as SuccessResponse<T>)
            : ({
                success: true as const,
                data,
              } as SuccessResponse<T>),
      ),
    );
  }
}
