/**
 * Auth Module Exports
 * تصدير جميع عناصر المصادقة
 */

// Constants
export {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  USER_DATA_COOKIE,
  PROTECTED_ROUTES,
  PUBLIC_ROUTES,
  AUTH_ROUTES,
  DEFAULT_LOGIN_REDIRECT,
  LOGIN_PAGE,
  AUTH_ENDPOINTS,
} from "./constants";

// Server Actions
export {
  loginAction,
  registerAction,
  logoutAction,
  getCurrentUserAction,
  type ActionResult,
} from "./actions";

export {
  requireGuest,
  requireAuthenticatedArea,
} from "./access";
