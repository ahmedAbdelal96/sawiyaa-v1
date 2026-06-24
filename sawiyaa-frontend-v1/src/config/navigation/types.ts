import React from "react";
import type { PermissionKey } from "@/lib/auth/permissions";

export type NavigationSectionKey = string;

export type NavItem = {
  key: string;
  icon: React.ReactNode;
  path?: string;
  namespace?: string;
  subItems?: { key: string; path: string; namespace?: string }[];
  /**
   * User must have at least one of these permissions to see this nav item.
   * Empty or absent = visible to all admin-class users.
   * SUPER_ADMIN always sees all items.
   */
  requiredPermissions?: PermissionKey[];
};

export type NavigationSection = {
  key: NavigationSectionKey;
  titleKey?: string;
  namespace?: string;
  items: NavItem[];
  /**
   * If set, the entire section is hidden unless user has at least one of these permissions.
   * SUPER_ADMIN always sees all sections.
   */
  requiredPermissions?: PermissionKey[];
  collapsible?: boolean;
};

export type NavigationConfig = NavigationSection[];
