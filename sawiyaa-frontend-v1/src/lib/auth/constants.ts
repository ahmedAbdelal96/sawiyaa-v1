export const ACCESS_TOKEN_COOKIE = "sawiyaa_access_token";
export const REFRESH_TOKEN_COOKIE = "sawiyaa_refresh_token";
export const USER_DATA_COOKIE = "sawiyaa_user_data";
export const USER_ROLE_COOKIE = "sawiyaa_user_role";

export const ACCESS_TOKEN_MAX_AGE = 15 * 60;
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;
export const USER_DATA_MAX_AGE = REFRESH_TOKEN_MAX_AGE;

export const PROTECTED_ROUTES = [
  "/admin",
  "/patient",
  "/practitioner",
];

export const PUBLIC_ROUTES = ["/signin", "/signup", "/verify-email"];

export const AUTH_ROUTES = ["/signin", "/signup"];
export const DEFAULT_LOGIN_REDIRECT = "/admin/dashboard";
export const LOGIN_PAGE = "/signin";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "/api/v1";

export const AUTH_ENDPOINTS = {
  login: `${API_BASE_URL}/auth/login`,
  register: `${API_BASE_URL}/auth/register`,
  logout: `${API_BASE_URL}/auth/logout`,
  me: `${API_BASE_URL}/auth/me`,
} as const;

export const ROLE_AUTH_ENDPOINTS = {
  PATIENT: {
    refresh: `${API_BASE_URL}/auth/patient/refresh`,
    logout: `${API_BASE_URL}/auth/patient/logout`,
  },
  PRACTITIONER: {
    refresh: `${API_BASE_URL}/auth/practitioner/refresh`,
    logout: `${API_BASE_URL}/auth/practitioner/logout`,
  },
  ADMIN: {
    refresh: `${API_BASE_URL}/auth/admin/refresh`,
    logout: `${API_BASE_URL}/auth/admin/logout`,
  },
} as const;

export const SECURE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const PUBLIC_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
