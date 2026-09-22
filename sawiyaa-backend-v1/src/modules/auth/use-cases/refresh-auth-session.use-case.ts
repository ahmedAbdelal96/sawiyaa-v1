import {
  ForbiddenException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import {
  SecurityAuditOutcome,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import { AuthSessionDeviceContext } from '../types/auth-session.types';
import { AuthUserContextMapper } from '../mappers/auth-user-context.mapper';
import { AuthTokenService } from '../services/auth-token.service';
import { AuthSessionService } from '../services/auth-session.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';

/**
 * Refresh flow is shared because patient, practitioner, and admin all rotate sessions the same way.
 * The caller passes the expected role so a refresh token cannot silently cross actor boundaries.
 * It also re-checks tokenVersion against the current user row before rotating the session.
 */
@Injectable()
export class RefreshAuthSessionUseCase {
  constructor(
    private readonly authTokenService: AuthTokenService,
    private readonly authSessionService: AuthSessionService,
    private readonly authUserContextMapper: AuthUserContextMapper,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async execute(input: {
    refreshToken: string;
    expectedRoles: UserRoleType[];
    deviceContext: AuthSessionDeviceContext;
  }) {
    const payload = await this.authTokenService.verifyRefreshToken(
      input.refreshToken,
    );

    if (!input.expectedRoles.includes(payload.role)) {
      throw new ForbiddenException({
        messageKey: 'auth.errors.authFlowRoleMismatch',
        error: 'AUTH_FLOW_ROLE_MISMATCH',
      });
    }

    const session = await this.authSessionService.assertRefreshTokenMatches(
      payload.sessionId,
      input.refreshToken,
    );

    const userHasExpectedRole = session.user.roles.some((role) =>
      input.expectedRoles.includes(role.role),
    );

    if (payload.tokenVersion !== session.user.tokenVersion) {
      throw new UnauthorizedException({
        messageKey: 'auth.errors.tokenVersionInvalid',
        error: 'TOKEN_VERSION_INVALID',
      });
    }

    if (!userHasExpectedRole) {
      throw new UnauthorizedException({
        messageKey: 'auth.errors.authRoleRevoked',
        error: 'AUTH_ROLE_REVOKED',
      });
    }

    const practitionerIsIneligible =
      payload.role === UserRoleType.PRACTITIONER &&
      ((!session.user.practitionerProfile && !session.user.practitionerApplications?.[0]) ||
      (Boolean(session.user.practitionerProfile) &&
        [
          'REJECTED',
          'SUSPENDED',
          'INACTIVE',
        ].includes(
          session.user.practitionerProfile?.status as
            | 'REJECTED'
            | 'SUSPENDED'
            | 'INACTIVE',
        )));

    if (session.user.status !== UserStatus.ACTIVE || practitionerIsIneligible) {
      throw new UnauthorizedException({
        messageKey: 'auth.errors.accountNotActive',
        error: 'ACCOUNT_NOT_ACTIVE',
      });
    }

    const tokens = await this.authTokenService.issueTokens({
      userId: payload.sub,
      sessionId: payload.sessionId,
      role: payload.role,
      tokenVersion: session.user.tokenVersion,
    });

    await this.authSessionService.rotate({
      sessionId: payload.sessionId,
      refreshToken: tokens.refreshToken,
      refreshExpiresAt: tokens.refreshTokenExpiresAt,
      ...input.deviceContext,
    });

    this.securityAuditService?.logAsync({
      action: 'auth.session.refresh.success',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: session.user.id,
      actorRoles: session.user.roles.map((role) => role.role),
      resourceType: 'Session',
      resourceId: payload.sessionId,
      reason: 'REFRESH_TOKEN_ROTATED',
    });

    return {
      tokens,
      user: this.authUserContextMapper.toResponse(session.user),
    };
  }
}
