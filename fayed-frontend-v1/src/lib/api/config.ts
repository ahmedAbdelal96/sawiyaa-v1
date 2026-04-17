/**
 * API configuration used by the active Fayed frontend foundation.
 */
export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:7000/api/v1",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
} as const;

export const TOKEN_CONFIG = {
  ACCESS_TOKEN_KEY: "fayed_access_token",
  REFRESH_TOKEN_KEY: "fayed_refresh_token",
  CONTEXT_ID_KEY: "fayed_context_id",
  ACCESS_TOKEN_EXPIRY: Number(process.env.NEXT_PUBLIC_TOKEN_EXPIRY_DAYS) || 7,
  REFRESH_TOKEN_EXPIRY:
    Number(process.env.NEXT_PUBLIC_REFRESH_TOKEN_EXPIRY_DAYS) || 30,
} as const;

export const API_ENDPOINTS = {
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    logout: "/auth/logout",
    logoutAll: "/auth/logout-all",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
    me: "/auth/me",
    changePassword: "/auth/change-password",
    sendVerificationEmail: "/auth/send-verification-email",
    verifyEmail: "/auth/verify-email",
    sessions: "/auth/sessions",
    revokeSession: (sessionId: string) => `/auth/sessions/${sessionId}`,
    loginHistory: "/auth/login-history",
  },
  users: {
    create: "/users",
    list: "/users",
    stats: "/users/stats",
    get: (id: string) => `/users/${id}`,
    update: (id: string) => `/users/${id}`,
    updateStatus: (id: string) => `/users/${id}/status`,
    updateRole: (id: string) => `/users/${id}/role`,
    changePassword: (id: string) => `/users/${id}/change-password`,
    uploadAvatar: (id: string) => `/users/${id}/avatar`,
    delete: (id: string) => `/users/${id}`,
  },
  settings: {
    getAll: "/settings",
    getCategory: (category: string) => `/settings/${category}`,
    updateGeneral: "/settings/general",
    updateBranding: "/settings/branding",
    uploadLogo: "/settings/branding/logo",
    uploadCover: "/settings/branding/cover",
    deleteLogo: "/settings/branding/logo",
    deleteCover: "/settings/branding/cover",
  },
} as const;
