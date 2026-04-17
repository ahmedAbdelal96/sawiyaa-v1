"use server";

import { revalidatePath } from "next/cache";
import {
  clearAuthCookies,
  getRefreshToken,
  getLogoutEndpointForCurrentRole,
  setAuthCookies,
  type AuthSession,
  type LoginCredentials,
  type RegisterData,
} from "./server";
import { AUTH_ENDPOINTS } from "./constants";

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface ApiTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: string;
  refreshExpiresIn?: string;
}

interface ApiUser {
  id: string;
  email: string;
  role: string;
  fullName?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  companyId?: string | null;
}

interface ApiTenant {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
}

interface RawAuthBody {
  user: ApiUser;
  tokens: ApiTokens;
  tenant?: ApiTenant;
  company?: ApiTenant;
}

interface ProcessedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface ProcessedTenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
}

export type AuthActionResult = ActionResult<{
  user: ProcessedUser;
  tenant: ProcessedTenant;
}>;

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return Boolean(value && typeof value === "object" && "data" in (value as Record<string, unknown>));
}

function splitName(user: ApiUser): { firstName: string; lastName: string } {
  const value =
    user.fullName ||
    user.name ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    "";

  const parts = value.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function normalizeAuthPayload(
  raw: unknown
): { user: ProcessedUser; tenant: ProcessedTenant; session: AuthSession } | null {
  const body = isApiEnvelope<RawAuthBody>(raw) ? raw.data : (raw as RawAuthBody);

  if (!body?.user || !body?.tokens?.accessToken || !body?.tokens?.refreshToken) {
    return null;
  }

  const { firstName, lastName } = splitName(body.user);

  const tenantSource = body.tenant || body.company;
  const tenantId = tenantSource?.id || body.user.companyId || "platform";
  const tenantName = tenantSource?.name || "Platform";
  const tenantSlug = tenantSource?.slug || String(tenantId);

  const user: ProcessedUser = {
    id: body.user.id,
    email: body.user.email,
    firstName,
    lastName,
    role: body.user.role,
  };

  const tenant: ProcessedTenant = {
    id: tenantId,
    name: tenantName,
    slug: tenantSlug,
    logo: tenantSource?.logo,
  };

  const session: AuthSession = {
    accessToken: body.tokens.accessToken,
    refreshToken: body.tokens.refreshToken,
    expiresIn: body.tokens.expiresIn,
    refreshExpiresIn: body.tokens.refreshExpiresIn,
    user,
    tenant,
  };

  return { user, tenant, session };
}

export async function loginAction(
  credentials: LoginCredentials
): Promise<AuthActionResult> {
  try {
    const response = await fetch(AUTH_ENDPOINTS.login, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || "Invalid credentials",
      };
    }

    const raw = await response.json();
    const normalized = normalizeAuthPayload(raw);

    if (!normalized) {
      return {
        success: false,
        error: "Unexpected login response format",
      };
    }

    await setAuthCookies(normalized.session);

    return {
      success: true,
      data: {
        user: normalized.user,
        tenant: normalized.tenant,
      },
    };
  } catch (error) {
    console.error("[Auth] Login error:", error);
    return {
      success: false,
      error: "An error occurred during login",
    };
  }
}

export async function registerAction(
  data: RegisterData
): Promise<AuthActionResult> {
  try {
    const response = await fetch(AUTH_ENDPOINTS.register, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || "Registration failed",
      };
    }

    const raw = await response.json();
    const normalized = normalizeAuthPayload(raw);

    if (!normalized) {
      return {
        success: false,
        error: "Unexpected registration response format",
      };
    }

    await setAuthCookies(normalized.session);

    return {
      success: true,
      data: {
        user: normalized.user,
        tenant: normalized.tenant,
      },
    };
  } catch (error) {
    console.error("[Auth] Register error:", error);
    return {
      success: false,
      error: "An error occurred during registration",
    };
  }
}

export async function logoutAction(): Promise<ActionResult> {
  try {
    const refreshToken = await getRefreshToken();
    const logoutEndpoint = await getLogoutEndpointForCurrentRole();

    if (refreshToken && logoutEndpoint) {
      fetch(logoutEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshToken}`,
        },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {
        // We clear cookies locally regardless of API result.
      });
    }

    await clearAuthCookies();
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("[Auth] Logout error:", error);
    await clearAuthCookies();
    return { success: true };
  }
}

export async function getCurrentUserAction(): Promise<
  ActionResult<{ user: ProcessedUser; tenant: ProcessedTenant } | null>
> {
  try {
    const { getUserData } = await import("./server");
    const userData = await getUserData();

    if (!userData) {
      return {
        success: true,
        data: null,
      };
    }

    return {
      success: true,
      data: {
        user: {
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
        },
        tenant: userData.tenant,
      },
    };
  } catch (error) {
    console.error("[Auth] Get current user error:", error);
    return {
      success: false,
      error: "Failed to fetch user data",
    };
  }
}
