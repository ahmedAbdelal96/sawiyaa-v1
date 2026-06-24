import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { AuthTokenService } from './auth-token.service';
import { AuthSessionService } from './auth-session.service';
import { UserSessionRepository } from '../repositories/user-session.repository';
import { AuthUserContextMapper } from '../mappers/auth-user-context.mapper';

/**
 * Request auth context service hydrates request.user from incoming JWTs.
 * It is intentionally separate from guards so the same logic can serve middleware and future websocket adapters.
 */
@Injectable()
export class AuthRequestContextService {
  constructor(
    private readonly authTokenService: AuthTokenService,
    private readonly authSessionService: AuthSessionService,
    private readonly userSessionRepository: UserSessionRepository,
    private readonly authUserContextMapper: AuthUserContextMapper,
  ) {}

  async attachUserToRequest(
    request: AuthenticatedRequest,
    token: string,
    tokenType: 'access' | 'refresh',
  ): Promise<void> {
    const payload =
      tokenType === 'access'
        ? await this.authTokenService.verifyAccessToken(token)
        : await this.authTokenService.verifyRefreshToken(token);

    if (payload.tokenType !== tokenType) {
      throw new UnauthorizedException({
        messageKey: 'auth.errors.jwtTokenTypeInvalid',
        error: 'JWT_TOKEN_TYPE_INVALID',
      });
    }

    // Refresh-token routes must validate the presented token against the persisted hash.
    // This prevents stale rotated refresh tokens from passing logout/refresh guards.
    const session =
      tokenType === 'refresh'
        ? await this.authSessionService.assertRefreshTokenMatches(
            payload.sessionId,
            token,
          )
        : await this.userSessionRepository.findActiveById(payload.sessionId);

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException({
        messageKey: 'auth.errors.authSessionInvalid',
        error: 'AUTH_SESSION_INVALID',
      });
    }

    // tokenVersion is a coarse-grained global invalidation layer.
    // If password reset/change or "logout all" bumped the version, every older JWT
    // must fail even if the session row and JWT signature still look valid.
    if (payload.tokenVersion !== session.user.tokenVersion) {
      throw new UnauthorizedException({
        messageKey: 'auth.errors.tokenVersionInvalid',
        error: 'TOKEN_VERSION_INVALID',
      });
    }

    request.user = this.authUserContextMapper.toAuthenticatedRequestUser(
      session.user,
      session.id,
      tokenType,
    );
    request.authToken = token;
    request.authTokenType = tokenType;
  }
}
