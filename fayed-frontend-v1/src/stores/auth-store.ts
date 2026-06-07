/**
 * Auth Store (Zustand)
 * إدارة حالة المصادقة باستخدام Zustand
 *
 * ⚠️ ملاحظة أمنية:
 * - الـ tokens محفوظة في HTTP-Only cookies (لا يمكن الوصول لها من JS)
 * - هذا الـ store يحفظ فقط بيانات المستخدم العامة للـ UI
 * - كل العمليات الحساسة تتم عبر Server Actions
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { requestSensitiveCacheClear } from "@/lib/security/sensitive-cache";
import {
  loginAction,
  registerAction,
  logoutAction,
  getCurrentUserAction,
  type ActionResult,
} from "@/lib/auth/actions";

// ============================================
// Types
// ============================================

/**
 * Frontend role model — reflects the actual product areas:
 * - PATIENT       → /patient/*
 * - PRACTITIONER  → /practitioner/*
 * - ADMIN         → /admin/*
 * - SUPER_ADMIN   → /admin/* (same surface as ADMIN)
 * - SUPPORT_AGENT → /admin/* (operational sub-role)
 * - CONTENT_REVIEWER → /admin/* (operational sub-role)
 */
export type UserRole =
  | "PATIENT"
  | "PRACTITIONER"
  | "ADMIN"
  | "SUPER_ADMIN"
  | "SUPPORT_AGENT"
  | "CONTENT_REVIEWER";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string; // kept as string to avoid type-cast failures on unknown role values from the API
  avatar?: string;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
}

interface AuthState {
  // State
  user: AuthUser | null;
  tenant: AuthTenant | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface AuthActions {
  // Actions
  login: (
    email: string,
    password: string
  ) => Promise<ActionResult<{ user: AuthUser; tenant: AuthTenant }>>;
  register: (data: {
    businessName: string;
    slug: string;
    ownerName: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<ActionResult<{ user: AuthUser; tenant: AuthTenant }>>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  setTenant: (tenant: AuthTenant | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type AuthStore = AuthState & AuthActions;

// ============================================
// Initial State
// ============================================

const initialState: AuthState = {
  user: null,
  tenant: null,
  isLoading: false,
  isInitialized: false,
  error: null,
};

type AuthBootstrapPayload = {
  user: AuthUser | null;
  tenant: AuthTenant | null;
};

// ============================================
// Store
// ============================================

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,

      // ============================================
      // Login
      // ============================================
      login: async (email, password) => {
        set({ isLoading: true, error: null });

        try {
          const result = await loginAction({ email, password });

          if (result.success && result.data) {
            set({
              user: result.data.user as AuthUser,
              tenant: result.data.tenant as AuthTenant,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            set({
              error: result.error || "حدث خطأ أثناء تسجيل الدخول",
              isLoading: false,
            });
          }

          return result as ActionResult<{ user: AuthUser; tenant: AuthTenant }>;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "حدث خطأ غير متوقع";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // ============================================
      // Register
      // ============================================
      register: async (data) => {
        set({ isLoading: true, error: null });

        try {
          const result = await registerAction(data);

          if (result.success && result.data) {
            set({
              user: result.data.user as AuthUser,
              tenant: result.data.tenant as AuthTenant,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            set({
              error: result.error || "حدث خطأ أثناء التسجيل",
              isLoading: false,
            });
          }

          return result as ActionResult<{ user: AuthUser; tenant: AuthTenant }>;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "حدث خطأ غير متوقع";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // ============================================
      // Logout
      // ============================================
      logout: async () => {
        set({ isLoading: true });

        try {
          await logoutAction();
        } finally {
          if (typeof window !== "undefined") {
            requestSensitiveCacheClear("logout");
          }
          set({
            user: null,
            tenant: null,
            isLoading: false,
            error: null,
          });
        }
      },

      // ============================================
      // Refresh User
      // ============================================
      refreshUser: async () => {
        set({ isLoading: true });

        try {
          const result = await getCurrentUserAction();

          if (result.success && result.data) {
            set({
              user: result.data.user as AuthUser,
              tenant: result.data.tenant as AuthTenant,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            set({
              user: null,
              tenant: null,
              isLoading: false,
              isInitialized: true,
            });
          }
        } catch {
          set({
            user: null,
            tenant: null,
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      // ============================================
      // Setters
      // ============================================
      setUser: (user) => set({ user }),
      setTenant: (tenant) => set({ tenant }),
      setError: (error) => set({ error }),
      reset: () => set(initialState),
    }),
    {
      name: "fayed-auth",
      storage: createJSONStorage(() => sessionStorage),
      // فقط نحفظ بيانات المستخدم العامة (بدون tokens)
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        isInitialized: state.isInitialized,
      }),
      skipHydration: true, // مهم جداً لتجنب hydration mismatch
    }
  )
);

/**
 * Shared bootstrap for the active authenticated UI payload.
 * Used by SSR hydration and browser auth mutations to keep one client source of truth.
 */
export function seedAuthStore({ user, tenant }: AuthBootstrapPayload) {
  useAuthStore.setState({
    user,
    tenant,
    isInitialized: true,
    error: null,
  });
}

export function clearAuthStore() {
  useAuthStore.setState({
    user: null,
    tenant: null,
    isInitialized: true,
    error: null,
  });
}

// ============================================
// Selectors (للـ Performance - stable references)
// ============================================

export const selectUser = (state: AuthStore) => state.user;
export const selectTenant = (state: AuthStore) => state.tenant;
export const selectIsAuthenticated = (state: AuthStore) => !!state.user;
export const selectIsLoading = (state: AuthStore) => state.isLoading;
export const selectIsInitialized = (state: AuthStore) => state.isInitialized;
export const selectError = (state: AuthStore) => state.error;
export const selectLogin = (state: AuthStore) => state.login;
export const selectRegister = (state: AuthStore) => state.register;
export const selectLogout = (state: AuthStore) => state.logout;
export const selectRefreshUser = (state: AuthStore) => state.refreshUser;
export const selectSetError = (state: AuthStore) => state.setError;

// ============================================
// Helper Hooks (SSR-safe)
// ============================================

/**
 * Hook للحصول على حالة المصادقة فقط (بدون actions)
 * يستخدم للـ components اللي محتاجة تقرأ الحالة فقط
 */
export function useAuthState() {
  const user = useAuthStore(selectUser);
  const tenant = useAuthStore(selectTenant);
  const isLoading = useAuthStore(selectIsLoading);
  const isInitialized = useAuthStore(selectIsInitialized);
  const error = useAuthStore(selectError);

  return {
    user,
    tenant,
    isAuthenticated: !!user,
    isLoading,
    isInitialized,
    error,
  };
}

/**
 * Hook للحصول على الـ actions فقط
 * يستخدم في الـ forms والـ buttons
 */
export function useAuthActions() {
  const login = useAuthStore(selectLogin);
  const register = useAuthStore(selectRegister);
  const logout = useAuthStore(selectLogout);
  const refreshUser = useAuthStore(selectRefreshUser);
  const setError = useAuthStore(selectSetError);

  return {
    login,
    register,
    logout,
    refreshUser,
    setError,
  };
}
