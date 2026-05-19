/**
 * Admin navigation filtering — Phase 5: Permission-Aware Admin UX
 *
 * Filters the static adminNavigation config down to only the items
 * the current user has permission to see.
 *
 * This is UX-only. Backend still enforces authorization on every request.
 */

import type { NavigationConfig, NavigationSection, NavItem } from "./types";
import {
  hasAnyPermission,
  isSuperAdmin,
  type PermissionCheckUser,
} from "@/lib/auth/permissions";

/**
 * Filters a single nav item.
 * Returns null if the user cannot see it.
 */
function filterNavItem(
  item: NavItem,
  user: PermissionCheckUser
): NavItem | null {
  if (isSuperAdmin(user)) return item;

  if (
    item.requiredPermissions &&
    item.requiredPermissions.length > 0 &&
    !hasAnyPermission(user, item.requiredPermissions)
  ) {
    return null;
  }

  return item;
}

/**
 * Filters a navigation section.
 * Returns null if the section has requiredPermissions and user lacks all of them.
 * Items within the section are also individually filtered.
 */
function filterSection(
  section: NavigationSection,
  user: PermissionCheckUser
): NavigationSection | null {
  if (!isSuperAdmin(user)) {
    if (
      section.requiredPermissions &&
      section.requiredPermissions.length > 0 &&
      !hasAnyPermission(user, section.requiredPermissions)
    ) {
      return null;
    }
  }

  const filteredItems = section.items
    .map((item) => filterNavItem(item, user))
    .filter((item): item is NavItem => item !== null);

  if (filteredItems.length === 0) return null;

  return { ...section, items: filteredItems };
}

/**
 * Returns a filtered copy of the admin navigation config for the given user.
 * Empty sections are removed. If all sections are empty, returns [].
 *
 * Pass a null/undefined user to get an empty navigation (unauthenticated state).
 */
export function filterAdminNavigation(
  navigation: NavigationConfig,
  user: PermissionCheckUser | null | undefined
): NavigationConfig {
  if (!user) return [];

  return navigation
    .map((section) => filterSection(section, user))
    .filter((section): section is NavigationSection => section !== null);
}
