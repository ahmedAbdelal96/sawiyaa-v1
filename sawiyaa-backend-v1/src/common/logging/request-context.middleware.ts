import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { REQUEST_ID_HEADER } from './logging.constants';
import { RequestContextService } from './request-context.service';

/**
 * Adds request correlation id to each request.
 * Existing x-request-id is respected; otherwise a UUID is generated.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContextService: RequestContextService) {}

  use(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const incomingId = req.headers[REQUEST_ID_HEADER];
    const incomingValue = Array.isArray(incomingId)
      ? incomingId[0]
      : incomingId;
    const requestId =
      typeof incomingValue === 'string' && incomingValue.trim().length > 0
        ? incomingValue.trim()
        : randomUUID();

    req.requestId = requestId;
    const correlationHeader = req.headers['x-correlation-id'];
    const correlationId = Array.isArray(correlationHeader)
      ? correlationHeader[0]
      : correlationHeader;
    if (typeof correlationId === 'string' && correlationId.trim()) {
      req.correlationId = correlationId.trim().slice(0, 128);
    }
    const userAgentHeader = req.headers['user-agent'];
    const userAgent =
      typeof userAgentHeader === 'string' ? userAgentHeader : undefined;
    (
      req as AuthenticatedRequest & { loggingStartedAt?: number }
    ).loggingStartedAt = Date.now();
    res.setHeader(REQUEST_ID_HEADER, requestId);
    this.requestContextService.run(
      {
        requestId,
        correlationId: req.correlationId,
        ipAddress: req.ip ?? req.socket?.remoteAddress,
        userAgent: typeof userAgent === 'string' ? userAgent : undefined,
      },
      next,
    );
  }
}
