import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { THROTTLE_POLICY_KEY } from '@common/constants/auth-metadata.constants';
import { THROTTLE_POLICIES } from './throttle-policy-config';
import { ThrottleStoreService } from './throttle-store.service';

/**
 * Reads the @ThrottlePolicy('key') metadata from the current handler and enforces
 * the configured rate limit.  When no metadata is present the guard is a no-op.
 *
 * Key strategy:
 *  - Anonymous / public endpoints → keyed on client IP
 *  - Authenticated endpoints (user.id in request) → keyed on user ID (more precise)
 *
 * 429 responses carry a `Retry-After` header (seconds) and intentionally reveal
 * nothing about account existence.
 */
@Injectable()
export class ThrottlePolicyGuard implements CanActivate {
  private readonly logger = new Logger(ThrottlePolicyGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly store: ThrottleStoreService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyKey = this.reflector.getAllAndOverride<string | undefined>(
      THROTTLE_POLICY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!policyKey) return true;

    const policy = THROTTLE_POLICIES[policyKey];
    if (!policy) return true;

    const request = context.switchToHttp().getRequest<Record<string, any>>();
    const clientKey = this.resolveClientKey(request, policyKey);

    const { count, resetAt } = await this.store.increment(
      clientKey,
      policy.windowMs,
    );

    if (count > policy.limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((resetAt - Date.now()) / 1000),
      );
      const response = context
        .switchToHttp()
        .getResponse<Record<string, any>>();
      response.setHeader('Retry-After', retryAfterSeconds);
      this.logger.warn(
        `Rate limit exceeded: policy=${policyKey} key=${clientKey} count=${count}`,
      );
      throw new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private resolveClientKey(
    request: Record<string, any>,
    policyKey: string,
  ): string {
    // Prefer user ID when available (set by JwtAccessAuthGuard / JwtRefreshAuthGuard)
    const userId: string | undefined = (
      request['user'] as { id?: string } | undefined
    )?.id;
    if (userId) {
      return `${policyKey}:user:${userId}`;
    }
    const ip = this.extractIp(request);
    return `${policyKey}:ip:${ip}`;
  }

  private extractIp(request: Record<string, any>): string {
    const forwarded = request.headers?.['x-forwarded-for'] as
      | string
      | undefined;
    if (forwarded) {
      return forwarded.split(',')[0]?.trim() ?? 'unknown';
    }
    return (
      (request.socket as { remoteAddress?: string } | undefined)
        ?.remoteAddress ?? 'unknown'
    );
  }
}
