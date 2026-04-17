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
  USER_DATA_COOKIE,
  USER_ROLE_COOKIE,
} from "./lib/auth/constants";

type AuthenticatedUser = {
  role: AppRole | null;
};

const LOGIN_PAGE = "/signin";
const intlMiddleware = createIntlMiddleware(routing);

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

  if (canonicalPath !== pathWithoutLocale) {
    const redirectUrl = new URL(localizedPath(locale, canonicalPath), request.url);
    if (search) {
      redirectUrl.search = search;
    }
    return NextResponse.redirect(redirectUrl);
  }

  const user = getUserFromRequest(request);
  const isAuthenticated = Boolean(user);
  const routeArea = classifyRouteArea(canonicalPath);

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

  const isProtectedArea =
    routeArea === "patient" ||
    routeArea === "practitioner" ||
    routeArea === "admin";

  if (isProtectedArea && !isAuthenticated) {
    const callbackUrl = `${pathname}${search || ""}`;
    const loginUrl = new URL(localizedPath(locale, LOGIN_PAGE), request.url);
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
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
