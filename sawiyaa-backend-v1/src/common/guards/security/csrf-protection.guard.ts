import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit CSRF guard for cookie-authenticated browser requests.
 *
 * Production posture:
 * - Bearer-only API clients are not subject to CSRF checks.
 * - Cookie-authenticated unsafe methods must present the expected CSRF header.
 *
 * The guard is intentionally strict but only active when cookie auth is
 * explicitly enabled. That lets us harden production without breaking existing
 * bearer-token API clients.
 */
@Injectable()
export class CsrfProtectionGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const authCfg = this.configService.get<{
      cookieAuthEnabled?: boolean;
      csrf?: {
        enforcementEnabled?: boolean;
        cookieName?: string;
        headerName?: string;
      };
    }>('auth');

    if (!authCfg?.cookieAuthEnabled || !authCfg.csrf?.enforcementEnabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const method = request.method.toUpperCase();

    if (SAFE_METHODS.has(method)) {
      return true;
    }

    if (request.authTransport !== 'cookie') {
      return true;
    }

    const cookieName = authCfg.csrf?.cookieName ?? 'sawiyaa_csrf_token';
    const headerName = authCfg.csrf?.headerName ?? 'x-csrf-token';
    const expectedToken = this.readCookieValue(request, cookieName);
    const presentedToken = this.readHeaderValue(request, headerName);

    if (
      !expectedToken ||
      !presentedToken ||
      !this.equals(expectedToken, presentedToken)
    ) {
      throw new ForbiddenException({
        messageKey: 'auth.errors.csrfTokenRequired',
        error: 'CSRF_TOKEN_REQUIRED',
      });
    }

    return true;
  }

  private readCookieValue(
    request: AuthenticatedRequest,
    cookieName: string,
  ): string | null {
    const value = request.cookies?.[cookieName];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private readHeaderValue(
    request: AuthenticatedRequest,
    headerName: string,
  ): string | null {
    const value = request.headers?.[headerName.toLowerCase()];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private equals(left: string, right: string): boolean {
    const normalizedLeft = this.hashToken(left);
    const normalizedRight = this.hashToken(right);

    return (
      normalizedLeft.length === normalizedRight.length &&
      timingSafeEqual(normalizedLeft, normalizedRight)
    );
  }

  private hashToken(value: string): Buffer {
    return createHash('sha256').update(value, 'utf8').digest();
  }
}
