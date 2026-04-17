import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_FLAGS_KEY } from '../../constants/auth-metadata.constants';
import { AuthenticatedRequest } from '../../interfaces/authenticated-request.interface';
import { forbid } from '../../utils/auth-request.util';

/**
 * Baseline feature-flag guard.
 * It only reads normalized request/app state for now; Config Module integration can be added later without changing route decorators.
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFlags =
      this.reflector.getAllAndOverride<string[]>(FEATURE_FLAGS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredFlags.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const availableFlags = request.user?.featureFlags ?? [];
    const isAllowed = requiredFlags.every((flag) => availableFlags.includes(flag));

    if (!isAllowed) {
      forbid('Required feature flags are not enabled', 'FEATURE_FLAG_REQUIRED');
    }

    return true;
  }
}
