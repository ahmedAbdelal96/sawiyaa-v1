/**
 * Sidebar Store (Zustand)
 * إدارة حالة الـ Sidebar
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useMemo } from "react";

// ============================================
// Types
// ============================================

interface SidebarState {
  isExpanded: boolean;
  isMobileOpen: boolean;
  isHovered: boolean;
  activeItem: string | null;
  openSubmenu: string | null;
}

interface SidebarActions {
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  setIsHovered: (isHovered: boolean) => void;
  setActiveItem: (item: string | null) => void;
  toggleSubmenu: (item: string) => void;
  setOpenSubmenu: (item: string | null) => void;
  reset: () => void;
}

type SidebarStore = SidebarState & SidebarActions;

// ============================================
// Initial State
// ============================================

const initialState: SidebarState = {
  isExpanded: true,
  isMobileOpen: false,
  isHovered: false,
  activeItem: null,
  openSubmenu: null,
};

// ============================================
// Store
// ============================================

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      ...initialState,

      toggleSidebar: () => {
        set((state) => ({ isExpanded: !state.isExpanded }));
      },

      toggleMobileSidebar: () => {
        set((state) => ({ isMobileOpen: !state.isMobileOpen }));
      },

      closeMobileSidebar: () => {
        set({ isMobileOpen: false });
      },

      setIsHovered: (isHovered) => {
        set({ isHovered });
      },

      setActiveItem: (item) => {
        set({ activeItem: item });
      },

      toggleSubmenu: (item) => {
        set((state) => ({
          openSubmenu: state.openSubmenu === item ? null : item,
        }));
      },

      setOpenSubmenu: (item) => {
        set({ openSubmenu: item });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: "sawiyaa-sidebar",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isExpanded: state.isExpanded,
      }),
      skipHydration: true, // مهم جدًا لتجنب hydration mismatch
    }
  )
);

// ============================================
// Selectors (stable references)
// ============================================

export const selectIsExpanded = (state: SidebarStore) => state.isExpanded;
export const selectIsMobileOpen = (state: SidebarStore) => state.isMobileOpen;
export const selectIsHovered = (state: SidebarStore) => state.isHovered;
export const selectActiveItem = (state: SidebarStore) => state.activeItem;
export const selectOpenSubmenu = (state: SidebarStore) => state.openSubmenu;
export const selectToggleSidebar = (state: SidebarStore) => state.toggleSidebar;
export const selectToggleMobileSidebar = (state: SidebarStore) => state.toggleMobileSidebar;
export const selectCloseMobileSidebar = (state: SidebarStore) => state.closeMobileSidebar;
export const selectSetIsHovered = (state: SidebarStore) => state.setIsHovered;
export const selectSetActiveItem = (state: SidebarStore) => state.setActiveItem;
export const selectToggleSubmenu = (state: SidebarStore) => state.toggleSubmenu;
export const selectSetOpenSubmenu = (state: SidebarStore) => state.setOpenSubmenu;

// ============================================
// Helper Hook (SSR-safe)
// ============================================

/**
 * Hook يراعي SSR
 */
export function useSidebar() {
  const isExpanded = useSidebarStore(selectIsExpanded);
  const isMobileOpen = useSidebarStore(selectIsMobileOpen);
  const isHovered = useSidebarStore(selectIsHovered);
  const activeItem = useSidebarStore(selectActiveItem);
  const openSubmenu = useSidebarStore(selectOpenSubmenu);
  const toggleSidebar = useSidebarStore(selectToggleSidebar);
  const toggleMobileSidebar = useSidebarStore(selectToggleMobileSidebar);
  const closeMobileSidebar = useSidebarStore(selectCloseMobileSidebar);
  const setIsHovered = useSidebarStore(selectSetIsHovered);
  const setActiveItem = useSidebarStore(selectSetActiveItem);
  const toggleSubmenu = useSidebarStore(selectToggleSubmenu);
  const setOpenSubmenu = useSidebarStore(selectSetOpenSubmenu);

  return useMemo(
    () => ({
      isExpanded,
      isMobileOpen,
      isHovered,
      activeItem,
      openSubmenu,
      toggleSidebar,
      toggleMobileSidebar,
      closeMobileSidebar,
      setIsHovered,
      setActiveItem,
      toggleSubmenu,
      setOpenSubmenu,
    }),
    [
      isExpanded,
      isMobileOpen,
      isHovered,
      activeItem,
      openSubmenu,
      toggleSidebar,
      toggleMobileSidebar,
      closeMobileSidebar,
      setIsHovered,
      setActiveItem,
      toggleSubmenu,
      setOpenSubmenu,
    ]
  );
}
