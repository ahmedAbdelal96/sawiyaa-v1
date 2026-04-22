import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PasswordHashService } from './password-hash.service';
import { UserSessionRepository } from '../repositories/user-session.repository';
import {
  CreateAuthSessionInput,
  RefreshSessionInput,
} from '../types/auth-session.types';

/**
 * Session service owns persistence and server-side refresh-token validation.
 * This is what gives refresh/logout flows revocation semantics beyond stateless JWT verification.
 */
@Injectable()
export class AuthSessionService {
  constructor(
    private readonly userSessionRepository: UserSessionRepository,
    private readonly passwordHashService: PasswordHashService,
  ) {}

  async create(input: CreateAuthSessionInput) {
    const refreshTokenHash = await this.passwordHashService.hash(
      input.refreshToken,
    );

    return this.userSessionRepository.create({
      id: input.sessionId,
      userId: input.userId,
      refreshTokenHash,
      deviceId: input.deviceId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      expiresAt: input.refreshExpiresAt,
    });
  }

  async rotate(input: RefreshSessionInput) {
    const refreshTokenHash = await this.passwordHashService.hash(
      input.refreshToken,
    );

    return this.userSessionRepository.updateRefreshSession(input.sessionId, {
      refreshTokenHash,
      deviceId: input.deviceId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      expiresAt: input.refreshExpiresAt,
      revokedAt: null,
    });
  }

  async assertRefreshTokenMatches(sessionId: string, refreshToken: string) {
    const session = await this.userSessionRepository.findActiveById(sessionId);

    if (!session || !session.refreshTokenHash) {
      throw new UnauthorizedException({
        messageKey: 'auth.errors.authSessionInvalid',
        error: 'AUTH_SESSION_INVALID',
      });
    }

    if (session.expiresAt && session.expiresAt <= new Date()) {
      throw new UnauthorizedException({
        messageKey: 'auth.errors.authSessionExpired',
        error: 'AUTH_SESSION_EXPIRED',
      });
    }

    const matches = await this.passwordHashService.verify(
      refreshToken,
      session.refreshTokenHash,
    );

    if (!matches) {
      throw new ForbiddenException({
        messageKey: 'auth.errors.refreshTokenMismatch',
        error: 'REFRESH_TOKEN_MISMATCH',
      });
    }

    return session;
  }

  revoke(sessionId: string) {
    return this.userSessionRepository.revoke(sessionId);
  }
}
