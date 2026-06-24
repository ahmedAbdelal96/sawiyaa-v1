import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRoleType } from '@prisma/client';
import { AuthSessionDeviceContext } from '../types/auth-session.types';
import { AuthUserContextMapper } from '../mappers/auth-user-context.mapper';
import { AuthTokenService } from '../services/auth-token.service';
import { AuthSessionService } from '../services/auth-session.service';

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

    return {
      tokens,
      user: this.authUserContextMapper.toResponse(session.user),
    };
  }
}
