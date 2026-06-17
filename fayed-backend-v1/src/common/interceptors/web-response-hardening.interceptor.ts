/**
 * WebResponseHardeningInterceptor
 *
 * Strips refreshToken from auth success response bodies when the client is
 * a web browser. Web clients receive the refresh token as an HttpOnly cookie
 * (set via Set-Cookie response header) and do not need it in the JSON body.
 *
 * Native/mobile clients (React Native, etc.) are NOT identified by Origin header
 * (they call from non-browser contexts) and continue to receive refreshToken
 * in the response body for their SecureStore/AsyncStorage flow.
 *
 * Detection: if request Origin matches known Fayed web origins, the response
 * body refreshToken is stripped. All other callers (native apps, server-to-server,
 * API consumers) receive the full response with refreshToken in body.
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
];

interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string | Date;
  refreshTokenExpiresAt: string | Date;
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

function isWebClient(context: ExecutionContext): boolean {
  const request = context.switchToHttp().getRequest();
  const origin = request.headers['origin'];
  if (!origin) return false;
  return FAYED_WEB_ORIGINS.includes(origin);
}

function stripRefreshToken<T extends AuthSuccessResponse>(value: T): T {
  // Deep clone to avoid mutating the cached response object
  const cloned = JSON.parse(JSON.stringify(value)) as AuthSuccessResponse;

  if (cloned.tokens && typeof cloned.tokens.refreshToken === 'string') {
    cloned.tokens.refreshToken = '[redacted_by_server]';
  }

  if (cloned.data?.tokens && typeof cloned.data.tokens.refreshToken === 'string') {
    cloned.data.tokens.refreshToken = '[redacted_by_server]';
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
      return next.handle() as Observable<AuthSuccessResponse>;
    }

    return next.handle().pipe(
      map((value: AuthSuccessResponse) => {
        // Only strip from successful auth response shapes
        if (value && typeof value === 'object' && (value.tokens || value.data?.tokens)) {
          return stripRefreshToken(value);
        }
        return value;
      }),
    );
  }
}