/**
 * Stores Index
 * تصدير جميع الـ Stores
 */

// Auth Store
export {
  useAuthStore,
  useAuthState,
  useAuthActions,
  selectUser,
  selectTenant,
  selectIsAuthenticated,
  selectIsLoading as selectAuthLoading,
  selectError as selectAuthError,
  type AuthUser,
  type AuthTenant,
} from "./auth-store";

// Sidebar Store
export {
  useSidebarStore,
  useSidebar,
  selectIsExpanded,
  selectIsMobileOpen,
  selectIsHovered,
  selectActiveItem,
  selectOpenSubmenu,
} from "./sidebar-store";

// Theme Store
export {
  useThemeStore,
  useTheme,
  selectTheme,
  selectToggleTheme,
  selectSetTheme,
  type Theme,
} from "./theme-store";
