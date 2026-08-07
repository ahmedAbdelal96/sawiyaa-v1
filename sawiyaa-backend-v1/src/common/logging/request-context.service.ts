import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  requestId?: string;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Carries request metadata through the asynchronous execution chain.
 * Background jobs simply run without a store and therefore receive no fake
 * request context.
 */
@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  run<T>(context: RequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  getContext(): RequestContext {
    return this.storage.getStore() ?? {};
  }
}
