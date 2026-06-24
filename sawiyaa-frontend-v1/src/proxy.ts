import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import {
  classifyRouteArea,
  getDefaultRouteByRole,
  isRoleAllowedInArea,
  resolveRole,
  normalizeToCanonicalPath,
  type AppRole,
} from "./config/route-access";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  USER_DATA_COOKIE,
  USER_ROLE_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  PUBLIC_COOKIE_OPTIONS,
  ROLE_AUTH_ENDPOINTS,
  SECURE_COOKIE_OPTIONS,
} from "./lib/auth/constants";

type AuthenticatedUser = {
  role: AppRole | null;
};

const LOGIN_PAGE = "/signin";
const intlMiddleware = createIntlMiddleware(routing);
const TOKEN_REFRESH_LEEWAY_SECONDS = 45;

type RefreshedAuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
};

function getCurrentLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return locale;
    }
  }

  return routing.defaultLocale;
}

function getPathWithoutLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.substring(locale.length + 1);
    }
    if (pathname === `/${locale}`) {
      return "/";
    }
  }
  return pathname;
}

function localizedPath(locale: string, pathWithoutLocale: string): string {
  if (pathWithoutLocale === "/") {
    return `/${locale}`;
  }
  return `/${locale}${pathWithoutLocale}`;
}

function isPublicPaymentReturnRoute(pathWithoutLocale: string): boolean {
  return /^\/patient\/sessions\/[^/]+\/payment-return$/.test(pathWithoutLocale);
}

function parseRoleFromUserDataCookie(rawValue: string | undefined): AppRole | null {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as {
      role?: string;
      roles?: string[];
      user?: { role?: string; roles?: string[] };
    };

    return (
      resolveRole(parsed.role) ??
      resolveRole(parsed.user?.role) ??
      resolveRole(parsed.roles?.[0]) ??
      resolveRole(parsed.user?.roles?.[0]) ??
      null
    );
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const payload = parts[1];
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded = atob(normalized + padding);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getUserFromRequest(request: NextRequest): AuthenticatedUser | null {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return null;
  }

  const roleFromUserDataCookie = parseRoleFromUserDataCookie(
    request.cookies.get(USER_DATA_COOKIE)?.value
  );

  const roleFromRoleCookie = resolveRole(request.cookies.get(USER_ROLE_COOKIE)?.value);

  const decoded = decodeJwtPayload(accessToken);
  const roleFromToken =
    resolveRole(typeof decoded?.role === "string" ? decoded.role : undefined) ??
    resolveRole(Array.isArray(decoded?.roles) ? String(decoded.roles[0]) : undefined);

  return {
    role: roleFromUserDataCookie ?? roleFromRoleCookie ?? roleFromToken ?? null,
  };
}

function getRoleFromRequest(request: NextRequest): AppRole | null {
  const roleFromUserDataCookie = parseRoleFromUserDataCookie(
    request.cookies.get(USER_DATA_COOKIE)?.value
  );
  const roleFromRoleCookie = resolveRole(request.cookies.get(USER_ROLE_COOKIE)?.value);
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const decoded = accessToken ? decodeJwtPayload(accessToken) : null;
  const roleFromToken =
    resolveRole(typeof decoded?.role === "string" ? decoded.role : undefined) ??
    resolveRole(Array.isArray(decoded?.roles) ? String(decoded.roles[0]) : undefined);

  return roleFromUserDataCookie ?? roleFromRoleCookie ?? roleFromToken ?? null;
}

function isAccessTokenFreshEnough(token: string | undefined): boolean {
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number") {
    return true;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return exp - nowInSeconds > TOKEN_REFRESH_LEEWAY_SECONDS;
}

function resolveRefreshEndpointForRole(role: AppRole | null): string | null {
  if (!role) return null;
  if (role === "PATIENT") return ROLE_AUTH_ENDPOINTS.PATIENT.refresh;
  if (role === "PRACTITIONER") return ROLE_AUTH_ENDPOINTS.PRACTITIONER.refresh;
  return ROLE_AUTH_ENDPOINTS.ADMIN.refresh;
}

function resolveProxyAuthUrl(request: NextRequest, endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  return new URL(endpoint.startsWith("/") ? endpoint : `/${endpoint}`, request.url).toString();
}

function toMaxAgeFromIso(isoValue: string | undefined, fallback: number): number {
  if (!isoValue) return fallback;
  const expiryMs = new Date(isoValue).getTime();
  if (Number.isNaN(expiryMs)) return fallback;
  return Math.max(1, Math.floor((expiryMs - Date.now()) / 1000));
}

async function requestRefreshedTokens(
  request: NextRequest,
  refreshToken: string,
  role: AppRole | null
): Promise<RefreshedAuthTokens | null> {
  const refreshEndpoint = resolveRefreshEndpointForRole(role);
  if (!refreshEndpoint) {
    return null;
  }

  try {
    const response = await fetch(resolveProxyAuthUrl(request, refreshEndpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const tokens = data?.tokens;
    if (!tokens?.accessToken || !tokens?.refreshToken) {
      return null;
    }

    return tokens;
  } catch {
    return null;
  }
}

function setRefreshedAuthCookies(
  response: NextResponse,
  tokens: RefreshedAuthTokens,
  role: AppRole | null
): void {
  const accessMaxAge = toMaxAgeFromIso(
    tokens.accessTokenExpiresAt,
    ACCESS_TOKEN_MAX_AGE
  );
  const refreshMaxAge = toMaxAgeFromIso(
    tokens.refreshTokenExpiresAt,
    REFRESH_TOKEN_MAX_AGE
  );

  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...PUBLIC_COOKIE_OPTIONS,
    maxAge: accessMaxAge,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...SECURE_COOKIE_OPTIONS,
    maxAge: refreshMaxAge,
  });
  if (role) {
    response.cookies.set(USER_ROLE_COOKIE, role, {
      ...PUBLIC_COOKIE_OPTIONS,
      maxAge: refreshMaxAge,
    });
  }
}

function clearAuthCookiesOnResponse(response: NextResponse): void {
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  response.cookies.delete(USER_DATA_COOKIE);
  response.cookies.delete(USER_ROLE_COOKIE);
}

export default async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const locale = getCurrentLocale(pathname);
  const pathWithoutLocale = getPathWithoutLocale(pathname);
  const canonicalPath = normalizeToCanonicalPath(pathWithoutLocale);

  if (isPublicPaymentReturnRoute(canonicalPath)) {
    return intlMiddleware(request);
  }

  if (canonicalPath !== pathWithoutLocale) {
    const redirectUrl = new URL(localizedPath(locale, canonicalPath), request.url);
    if (search) {
      redirectUrl.search = search;
    }
    return NextResponse.redirect(redirectUrl);
  }

  const user = getUserFromRequest(request);
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const hasFreshAccessToken = isAccessTokenFreshEnough(accessToken);
  const isAuthenticated = Boolean(user && hasFreshAccessToken);
  const routeArea = classifyRouteArea(canonicalPath);
  const isProtectedArea =
    routeArea === "patient" ||
    routeArea === "practitioner" ||
    routeArea === "admin";

  if (isProtectedArea && !hasFreshAccessToken) {
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
    const role = getRoleFromRequest(request);
    if (refreshToken && role) {
      const refreshedTokens = await requestRefreshedTokens(request, refreshToken, role);
      if (refreshedTokens) {
        const retryResponse = NextResponse.redirect(request.nextUrl);
        setRefreshedAuthCookies(retryResponse, refreshedTokens, role);
        return retryResponse;
      }
    }
  }

  if (isAuthenticated && canonicalPath === "/" && user?.role) {
    return NextResponse.redirect(
      new URL(localizedPath(locale, getDefaultRouteByRole(user.role)), request.url)
    );
  }

  if (routeArea === "auth" && isAuthenticated) {
    if (user?.role) {
      return NextResponse.redirect(
        new URL(localizedPath(locale, getDefaultRouteByRole(user.role)), request.url)
      );
    }

    return NextResponse.redirect(
      new URL(localizedPath(locale, "/"), request.url)
    );
  }

  if (isProtectedArea && !isAuthenticated) {
    const callbackUrl = `${canonicalPath}${search || ""}`;
    const loginUrl = new URL(localizedPath(locale, LOGIN_PAGE), request.url);
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    const signinResponse = NextResponse.redirect(loginUrl);
    clearAuthCookiesOnResponse(signinResponse);
    return signinResponse;
  }

  if (
    isAuthenticated &&
    isProtectedArea &&
    user?.role &&
    !isRoleAllowedInArea(user.role, routeArea)
  ) {
    return NextResponse.redirect(
      new URL(localizedPath(locale, getDefaultRouteByRole(user.role)), request.url)
    );
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/", "/(ar|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
