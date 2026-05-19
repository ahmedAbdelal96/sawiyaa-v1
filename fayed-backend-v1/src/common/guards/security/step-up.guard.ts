import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { STEP_UP_POLICY_KEY } from '@common/decorators/step-up.decorator';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { ensureAccessTokenUser } from '@common/utils/auth-request.util';
import { SecurityAuditOutcome } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { StepUpService } from '@modules/auth/services/step-up.service';

/**
 * Enforces @RequireStepUp('action.key') for sensitive routes.
 *
 * Design:
 * - Step-up is session-scoped (stored on UserSession) and time-bound (TTL).
 * - Guard is a no-op unless metadata is present and step-up is enabled by config.
 * - For unauthenticated requests, we no-op and let auth guards throw 401/403.
 */
@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly stepUpService: StepUpService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const action = this.reflector.getAllAndOverride<string | undefined>(
      STEP_UP_POLICY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!action) return true;

    const cfg = this.configService.get<{ enabled?: boolean }>('stepUp');
    if (!cfg?.enabled) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // If auth middleware didn't attach a user, let auth guards handle.
    if (!request.user) return true;

    const user = ensureAccessTokenUser(request);
    const sessionId = user.sessionId;
    if (!sessionId) {
      // This should never happen; access tokens include a sessionId.
      this.securityAuditService.logAsync({
        action: 'security.step_up.denied',
        outcome: SecurityAuditOutcome.DENIED,
        actorUserId: user.id,
        actorRoles: user.roles,
        reason: 'MISSING_SESSION_ID',
        metadata: { stepUpAction: action },
        ipAddress: request.ip ?? null,
        userAgent: request.headers['user-agent'],
        correlationId: request.requestId ?? null,
      });
      throw new ForbiddenException({
        messageKey: 'auth.errors.authSessionInvalid',
        error: 'AUTH_SESSION_INVALID',
      });
    }

    const status = await this.stepUpService.checkSessionStepUpStatus({
      userId: user.id,
      sessionId,
    });

    if (status.ok) return true;

    this.securityAuditService.logAsync({
      action: 'security.step_up.required',
      outcome: SecurityAuditOutcome.DENIED,
      actorUserId: user.id,
      actorRoles: user.roles,
      reason: status.reason,
      metadata: {
        stepUpAction: action,
        stepUpExpiresAt: status.expiresAt?.toISOString() ?? null,
      },
      ipAddress: request.ip ?? null,
      userAgent: request.headers['user-agent'],
      correlationId: request.requestId ?? null,
    });

    throw new ForbiddenException({
      messageKey: 'auth.errors.stepUpRequired',
      error: 'STEP_UP_REQUIRED',
    });
  }
}
