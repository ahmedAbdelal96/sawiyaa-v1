import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRoleType } from '@prisma/client';
import { StringValue } from 'ms';
import { addDuration } from '../utils/auth-duration.util';
import { AuthTokenPayload } from '../types/auth-token-payload.types';
import { AuthTokensResult } from '../types/auth-user-context.types';

/**
 * Token service owns JWT signing and verification.
 * Keeping token logic here prevents use cases from duplicating issuer, secret, and expiry handling.
 */
@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async issueTokens(input: {
    userId: string;
    sessionId: string;
    role: UserRoleType;
    tokenVersion: number;
  }): Promise<AuthTokensResult> {
    const accessPayload: AuthTokenPayload = {
      sub: input.userId,
      sessionId: input.sessionId,
      role: input.role,
      tokenVersion: input.tokenVersion,
      tokenType: 'access',
    };
    const refreshPayload: AuthTokenPayload = {
      ...accessPayload,
      tokenType: 'refresh',
    };

    const accessExpiresIn = this.configService.get<string>(
      'auth.jwt.accessExpiresIn',
      '15m',
    );
    const refreshExpiresIn = this.configService.get<string>(
      'auth.jwt.refreshExpiresIn',
      '7d',
    );

    const now = new Date();
    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.configService.get<string>('auth.jwt.accessSecret'),
      expiresIn: accessExpiresIn as StringValue,
      issuer: this.configService.get<string>('auth.jwt.issuer'),
    });
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.get<string>('auth.jwt.refreshSecret'),
      expiresIn: refreshExpiresIn as StringValue,
      issuer: this.configService.get<string>('auth.jwt.issuer'),
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: addDuration(now, accessExpiresIn),
      refreshTokenExpiresAt: addDuration(now, refreshExpiresIn),
    };
  }

  async verifyAccessToken(token: string): Promise<AuthTokenPayload> {
    return this.jwtService.verifyAsync<AuthTokenPayload>(token, {
      secret: this.configService.get<string>('auth.jwt.accessSecret'),
      issuer: this.configService.get<string>('auth.jwt.issuer'),
    });
  }

  async verifyRefreshToken(token: string): Promise<AuthTokenPayload> {
    return this.jwtService.verifyAsync<AuthTokenPayload>(token, {
      secret: this.configService.get<string>('auth.jwt.refreshSecret'),
      issuer: this.configService.get<string>('auth.jwt.issuer'),
    });
  }
}
