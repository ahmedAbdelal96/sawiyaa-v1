/**
 * Theme Store (Zustand)
 * إدارة الـ Dark/Light Mode
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useMemo } from "react";

// ============================================
// Types
// ============================================

export type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
}

interface ThemeActions {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

type ThemeStore = ThemeState & ThemeActions;

// ============================================
// Helper Functions
// ============================================

/**
 * تطبيق الـ theme على الـ DOM
 */
function applyTheme(theme: Theme) {
  if (typeof window === "undefined") return;

  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

// ============================================
// Initial State
// ============================================

const initialState: ThemeState = {
  theme: "light",
};

// ============================================
// Store
// ============================================

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },

      toggleTheme: () => {
        const newTheme = get().theme === "light" ? "dark" : "light";
        applyTheme(newTheme);
        set({ theme: newTheme });
      },
    }),
    {
      name: "fayed-theme",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // مهم جداً لتجنب hydration mismatch
    }
  )
);

// ============================================
// Selectors (stable references)
// ============================================

export const selectTheme = (state: ThemeStore) => state.theme;
export const selectToggleTheme = (state: ThemeStore) => state.toggleTheme;
export const selectSetTheme = (state: ThemeStore) => state.setTheme;

// ============================================
// Helper Hook (SSR-safe)
// ============================================

/**
 * Hook للـ theme - يستخدم selectors منفصلة لتجنب infinite loop
 */
export function useTheme() {
  const theme = useThemeStore(selectTheme);
  const toggleTheme = useThemeStore(selectToggleTheme);
  const setTheme = useThemeStore(selectSetTheme);

  return useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      isLight: theme === "light",
      toggleTheme,
      setTheme,
    }),
    [theme, toggleTheme, setTheme]
  );
}
