/**
 * WebResponseHardeningInterceptor
 *
 * Strips the refreshToken field from auth success response JSON bodies when
 * the client is the Fayed web browser (Next.js frontend).
 *
 * Web clients receive the refresh token as an HttpOnly cookie (set via
 * Set-Cookie response header). The JSON response body does not need to
 * contain the refreshToken for web — the HttpOnly cookie is the canonical
 * token carrier for web browser sessions.
 *
 * Detection — TWO signals checked in order:
 *   1. X-Client-Platform: web  (primary — explicit frontend signal)
 *   2. Origin header matching Fayed web origins  (fallback — catches direct
 *      browser calls, same-origin deployments, preview domains, etc.)
 *
 * If NEITHER signal is present the request is treated as native/mobile and
 * receives the full token body (SecureStore/AsyncStorage flow unchanged).
 *
 * IMPORTANT: This interceptor is applied to PatientAuthController,
 * PractitionerAuthController, and AdminAuthController at class level.
 * It intercepts login, register, google, verifyOtp, refresh, and logout responses.
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const FAYED_WEB_ORIGINS = [
  'http://localhost:3000',
  'https://fayed.app',
  'https://www.fayed.app',
] as const;

type WebOrigin = (typeof FAYED_WEB_ORIGINS)[number];

interface AuthTokensResponse {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt: string | Date;
  refreshTokenExpiresAt?: string | Date;
}

interface AuthSuccessResponse {
  message?: string;
  data?: {
    message?: string;
    tokens?: AuthTokensResponse;
    user?: unknown;
  };
  tokens?: AuthTokensResponse;
  user?: unknown;
  [key: string]: unknown;
}

/**
 * Primary web detection: explicit X-Client-Platform header sent by the
 * Next.js frontend on every API request via httpClient interceptors.
 */
function hasExplicitWebPlatformHeader(context: ExecutionContext): boolean {
  const request = context.switchToHttp().getRequest();
  return request.headers['x-client-platform'] === 'web';
}

/**
 * Fallback web detection: Origin header matching known Fayed web origins.
 * Handles direct browser calls, same-origin deployments, preview/staging
 * domains, and any future production domain — even if the explicit header
 * is absent (e.g. server-to-server calls or tools that don't forward it).
 *
 * Origin is sent automatically by all browser cross-origin fetch requests,
 * so this is reliable for any JavaScript running in a browser context.
 */
function hasKnownWebOrigin(context: ExecutionContext): boolean {
  const request = context.switchToHttp().getRequest();
  const origin = request.headers['origin'] as string | undefined;
  if (!origin) return false;
  return (FAYED_WEB_ORIGINS as readonly string[]).includes(origin);
}

function isWebClient(context: ExecutionContext): boolean {
  return hasExplicitWebPlatformHeader(context) || hasKnownWebOrigin(context);
}

/**
 * Removes the refreshToken property from tokens objects in the response.
 * Uses JSON serialization to deeply strip the field without mutating the
 * cached response object (important for RxJS pipe chaining).
 */
function deleteRefreshTokenField<T extends AuthSuccessResponse>(value: T): T {
  const cloned = JSON.parse(JSON.stringify(value)) as AuthSuccessResponse;

  // Top-level tokens: { accessToken, refreshToken, ... }
  if (cloned.tokens && typeof cloned.tokens === 'object') {
    delete cloned.tokens.refreshToken;
    delete cloned.tokens.refreshTokenExpiresAt;
  }

  // Nested data.tokens: { data: { tokens: { accessToken, refreshToken, ... } } }
  if (cloned.data?.tokens && typeof cloned.data.tokens === 'object') {
    delete cloned.data.tokens.refreshToken;
    delete cloned.data.tokens.refreshTokenExpiresAt;
  }

  return cloned as T;
}

@Injectable()
export class WebResponseHardeningInterceptor
  implements NestInterceptor<AuthSuccessResponse, AuthSuccessResponse>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<AuthSuccessResponse> {
    if (!isWebClient(context)) {
      // Native/mobile: return full token body (refreshToken included for
      // SecureStore/AsyncStorage flow — no change to mobile auth architecture)
      return next.handle() as Observable<AuthSuccessResponse>;
    }

    return next.handle().pipe(
      map((value: AuthSuccessResponse) => {
        // Only process successful auth response shapes
        if (
          value &&
          typeof value === 'object' &&
          (value.tokens || value.data?.tokens)
        ) {
          return deleteRefreshTokenField(value);
        }
        return value;
      }),
    );
  }
}
