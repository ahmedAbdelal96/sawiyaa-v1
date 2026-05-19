import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { AuthRequestContextService } from './auth-request-context.service';

/**
 * This middleware opportunistically hydrates request.user from access or refresh tokens.
 * Invalid tokens are ignored here so public routes keep working; guards decide when auth is mandatory.
 */
@Injectable()
export class AuthRequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthRequestContextMiddleware.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authRequestContextService: AuthRequestContextService,
  ) {}

  async use(
    request: AuthenticatedRequest,
    _response: Response,
    next: NextFunction,
  ): Promise<void> {
    const header = request.headers.authorization;
    const bearerToken = header?.startsWith('Bearer ') ? header.slice(7) : null;
    const cookieAuthEnabled =
      this.configService.get<boolean>('auth.cookieAuthEnabled') === true;
    const cookieAccessToken =
      cookieAuthEnabled &&
      typeof request.cookies?.fayed_access_token === 'string'
        ? request.cookies.fayed_access_token
        : null;
    const cookieRefreshToken =
      cookieAuthEnabled &&
      typeof request.cookies?.fayed_refresh_token === 'string'
        ? request.cookies.fayed_refresh_token
        : null;
    const bodyRefreshToken =
      typeof request.body?.refreshToken === 'string'
        ? request.body.refreshToken
        : null;
    const tokenCandidates: Array<{
      token: string;
      tokenType: 'access' | 'refresh';
      transport: 'bearer' | 'cookie' | 'body';
    }> = [];

    if (bearerToken) {
      tokenCandidates.push({
        token: bearerToken,
        tokenType: 'access',
        transport: 'bearer',
      });
    }

    if (cookieAccessToken && cookieAccessToken !== bearerToken) {
      tokenCandidates.push({
        token: cookieAccessToken,
        tokenType: 'access',
        transport: 'cookie',
      });
    }

    if (bodyRefreshToken) {
      tokenCandidates.push({
        token: bodyRefreshToken,
        tokenType: 'refresh',
        transport: 'body',
      });
    }

    if (cookieRefreshToken && cookieRefreshToken !== bodyRefreshToken) {
      tokenCandidates.push({
        token: cookieRefreshToken,
        tokenType: 'refresh',
        transport: 'cookie',
      });
    }

    if (tokenCandidates.length === 0) {
      next();
      return;
    }

    for (const candidate of tokenCandidates) {
      try {
        await this.authRequestContextService.attachUserToRequest(
          request,
          candidate.token,
          candidate.tokenType,
        );
        request.authTransport = candidate.transport;
        next();
        return;
      } catch {
        // Swallow here so public routes do not fail just because a stale token was attached.
      }
    }

    this.logger.debug(
      'Incoming auth token could not be hydrated into request.user',
    );
    next();
  }
}
