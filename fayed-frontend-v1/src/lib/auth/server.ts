import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  USER_DATA_COOKIE,
  USER_ROLE_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  SECURE_COOKIE_OPTIONS,
  PUBLIC_COOKIE_OPTIONS,
  ROLE_AUTH_ENDPOINTS,
} from "./constants";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
}

export interface AuthSession {
  user: AuthUser;
  tenant: AuthTenant;
  accessToken: string;
  refreshToken: string;
  expiresIn?: string;
  refreshExpiresIn?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  businessName: string;
  slug: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
}

export async function setAuthCookies(session: AuthSession): Promise<void> {
  const cookieStore = await cookies();

  const parseExpiry = (expiry?: string): number => {
    if (!expiry) return ACCESS_TOKEN_MAX_AGE;

    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case "d":
        return value * 24 * 60 * 60;
      case "h":
        return value * 60 * 60;
      case "m":
        return value * 60;
      case "s":
        return value;
      default:
        return ACCESS_TOKEN_MAX_AGE;
    }
  };

  const accessMaxAge = parseExpiry(session.expiresIn);
  const refreshMaxAge = parseExpiry(session.refreshExpiresIn);

  cookieStore.set(ACCESS_TOKEN_COOKIE, session.accessToken, {
    ...PUBLIC_COOKIE_OPTIONS,
    maxAge: accessMaxAge,
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, session.refreshToken, {
    ...SECURE_COOKIE_OPTIONS,
    maxAge: refreshMaxAge,
  });

  const publicUserData = {
    id: session.user.id,
    email: session.user.email,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    role: session.user.role,
    avatar: session.user.avatar,
    context: {
      id: session.tenant.id,
      name: session.tenant.name,
      slug: session.tenant.slug,
      logo: session.tenant.logo,
    },
    tenant: {
      id: session.tenant.id,
      name: session.tenant.name,
      slug: session.tenant.slug,
      logo: session.tenant.logo,
    },
  };

  cookieStore.set(USER_DATA_COOKIE, JSON.stringify(publicUserData), {
    ...PUBLIC_COOKIE_OPTIONS,
    maxAge: refreshMaxAge,
  });

  cookieStore.set(USER_ROLE_COOKIE, session.user.role, {
    ...PUBLIC_COOKIE_OPTIONS,
    // Keep role available for refresh/logout endpoint resolution
    // throughout the refresh token lifetime.
    maxAge: refreshMaxAge,
  });
}

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value || null;
}

export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value || null;
}

export async function getUserData(): Promise<
  (AuthUser & { tenant: AuthTenant; context?: AuthTenant }) | null
> {
  const cookieStore = await cookies();
  const userData = cookieStore.get(USER_DATA_COOKIE)?.value;

  if (!userData) return null;

  try {
    const parsed = JSON.parse(userData);
    if (parsed.context && !parsed.tenant) {
      parsed.tenant = parsed.context;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  cookieStore.delete(USER_DATA_COOKIE);
  cookieStore.delete(USER_ROLE_COOKIE);
}

async function getSessionRole(): Promise<string | null> {
  const cookieStore = await cookies();
  const roleFromCookie = cookieStore.get(USER_ROLE_COOKIE)?.value;
  if (roleFromCookie) {
    return roleFromCookie;
  }

  // Fallback when short-lived role cookie expires with access token.
  // user_data cookie survives with refresh-token lifetime.
  const userDataRaw = cookieStore.get(USER_DATA_COOKIE)?.value;
  if (!userDataRaw) {
    return null;
  }

  try {
    const parsed = JSON.parse(userDataRaw) as {
      role?: string;
      roles?: string[];
    };
    if (typeof parsed.role === "string" && parsed.role.length > 0) {
      return parsed.role;
    }
    if (Array.isArray(parsed.roles) && typeof parsed.roles[0] === "string") {
      return parsed.roles[0];
    }
    return null;
  } catch {
    return null;
  }
}

function resolveRoleRefreshEndpoint(role: string | null): string | null {
  if (!role) return null;

  if (role === "PATIENT") {
    return ROLE_AUTH_ENDPOINTS.PATIENT.refresh;
  }

  if (role === "PRACTITIONER") {
    return ROLE_AUTH_ENDPOINTS.PRACTITIONER.refresh;
  }

  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    return ROLE_AUTH_ENDPOINTS.ADMIN.refresh;
  }

  return null;
}

export async function getLogoutEndpointForCurrentRole(): Promise<string | null> {
  const role = await getSessionRole();

  if (role === "PATIENT") {
    return ROLE_AUTH_ENDPOINTS.PATIENT.logout;
  }

  if (role === "PRACTITIONER") {
    return ROLE_AUTH_ENDPOINTS.PRACTITIONER.logout;
  }

  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    return ROLE_AUTH_ENDPOINTS.ADMIN.logout;
  }

  return null;
}

export async function hasValidSession(): Promise<boolean> {
  const accessToken = await getAccessToken();
  return !!accessToken;
}

export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  const refreshEndpoint = resolveRoleRefreshEndpoint(await getSessionRole());

  if (!refreshToken || !refreshEndpoint) {
    return false;
  }

  try {
    const response = await fetch(refreshEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      await clearAuthCookies();
      return false;
    }

    const data = await response.json();
    const tokens = data?.tokens;

    if (!tokens?.accessToken || !tokens?.refreshToken) {
      await clearAuthCookies();
      return false;
    }

    const cookieStore = await cookies();
    const now = Date.now();
    const toMaxAgeFromIso = (isoValue?: string, fallback = ACCESS_TOKEN_MAX_AGE) => {
      if (!isoValue) return fallback;
      const expiryMs = new Date(isoValue).getTime();
      if (Number.isNaN(expiryMs)) return fallback;
      return Math.max(1, Math.floor((expiryMs - now) / 1000));
    };

    const accessMaxAge = toMaxAgeFromIso(tokens.accessTokenExpiresAt, ACCESS_TOKEN_MAX_AGE);

    cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      ...PUBLIC_COOKIE_OPTIONS,
      maxAge: accessMaxAge,
    });

    const refreshMaxAge = toMaxAgeFromIso(
      tokens.refreshTokenExpiresAt,
      REFRESH_TOKEN_MAX_AGE
    );
    cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...SECURE_COOKIE_OPTIONS,
      maxAge: refreshMaxAge,
    });

    const role = await getSessionRole();
    if (role) {
      cookieStore.set(USER_ROLE_COOKIE, role, {
        ...PUBLIC_COOKIE_OPTIONS,
        maxAge: refreshMaxAge,
      });
    }

    return true;
  } catch (error) {
    console.error("[Auth] Error refreshing token:", error);
    return false;
  }
}

export async function getSession(): Promise<{
  user: AuthUser & { tenant: AuthTenant };
  accessToken: string;
} | null> {
  const accessToken = await getAccessToken();
  const userData = await getUserData();

  if (!accessToken || !userData) {
    return null;
  }

  return {
    user: {
      ...userData,
      tenant: userData.tenant || userData.context!,
    },
    accessToken,
  };
}

export async function requireSession(): Promise<{
  user: AuthUser & { tenant: AuthTenant };
  accessToken: string;
}> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized: No valid session");
  }

  return session;
}
