import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UserRoleType } from '@prisma/client';
import { AuthUserContextMapper } from '../mappers/auth-user-context.mapper';
import { UserRepository } from '../repositories/user.repository';
import { AuthSessionDeviceContext } from '../types/auth-session.types';
import { AuthTokenService } from '../services/auth-token.service';
import { AuthSessionService } from '../services/auth-session.service';

/**
 * This use case is the shared token/session entry point for successful logins.
 * It creates a persisted session first-class, issues both JWTs, and returns a safe user snapshot.
 * Both tokens embed the current tokenVersion so later global invalidation can reject them.
 */
@Injectable()
export class IssueAuthTokensUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authUserContextMapper: AuthUserContextMapper,
    private readonly authTokenService: AuthTokenService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  async execute(input: {
    userId: string;
    role: UserRoleType;
    deviceContext: AuthSessionDeviceContext;
  }) {
    const sessionId = randomUUID();
    const user = await this.userRepository.findByIdWithAuthContext(
      input.userId,
    );

    if (!user) {
      throw new NotFoundException(
        `Authenticated user "${input.userId}" was not found`,
      );
    }

    const tokens = await this.authTokenService.issueTokens({
      userId: input.userId,
      sessionId,
      role: input.role,
      tokenVersion: user.tokenVersion,
    });

    await this.authSessionService.create({
      sessionId,
      userId: input.userId,
      role: input.role,
      refreshToken: tokens.refreshToken,
      refreshExpiresAt: tokens.refreshTokenExpiresAt,
      ...input.deviceContext,
    });

    return {
      tokens,
      user: this.authUserContextMapper.toResponse(user),
    };
  }
}
