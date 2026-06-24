"use client";

/**
 * AdminPermissionGate - Phase 5: Permission-Aware Admin UX
 *
 * Client component that guards admin pages by permission.
 * Renders a 403 Forbidden view when the user lacks required permissions.
 *
 * Usage in admin page files (server components):
 *
 *   import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
 *   import { PermissionKey } from "@/lib/auth/permissions";
 *
 *   export default async function FinancePage() {
 *     return (
 *       <AdminPermissionGate
 *         requiredPermissions={[PermissionKey.FINANCE_EVENTS_READ, PermissionKey.ACCOUNTING_READ]}
 *       >
 *         <FinancePageContent />
 *       </AdminPermissionGate>
 *     );
 *   }
 *
 * Notes:
 * - Unauthenticated users are not handled here, requireAuthenticatedArea() in the
 *   layout already redirects them to /signin before this component renders.
 * - This component does NOT redirect, it shows a 403 view in-place so the URL
 *   remains stable and no redirect loops are created.
 * - Backend still enforces authorization on every API call. This is UX-only.
 */

import React from "react";
import { useCurrentUserPermissions } from "@/features/users/hooks/use-users";
import {
  canAccessAdminRoute,
  type PermissionKey,
} from "@/lib/auth/permissions";
import AdminForbiddenView from "./AdminForbiddenView";

interface AdminPermissionGateProps {
  /**
   * User must have at least one of these permissions to see the children.
   * Empty array = open to all admin-class users.
   */
  requiredPermissions: PermissionKey[];
  children: React.ReactNode;
}

export default function AdminPermissionGate({
  requiredPermissions,
  children,
}: AdminPermissionGateProps) {
  const {
    data: permissionData,
    isLoading,
    isError,
  } = useCurrentUserPermissions(true);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 text-sm text-text-muted">
        Loading...
      </div>
    );
  }

  if (isError) {
    return <AdminForbiddenView />;
  }

  const permissionUser = {
    permissions: permissionData?.permissions ?? [],
  };

  if (!canAccessAdminRoute(permissionUser, requiredPermissions)) {
    return <AdminForbiddenView />;
  }

  return <>{children}</>;
}
