import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { REQUEST_ID_HEADER } from './logging.constants';

/**
 * Adds request correlation id to each request.
 * Existing x-request-id is respected; otherwise a UUID is generated.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
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
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
