import AdminPaymentsLookupScreen from "@/features/admin/payments/components/AdminPaymentsLookupScreen";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";

export default function AdminPaymentsPage() {
  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.FINANCE_EVENTS_READ, PermissionKey.REFUNDS_APPROVE, PermissionKey.REFUNDS_RETRY]}
    >
      <AdminPaymentsLookupScreen />
    </AdminPermissionGate>
  );
}

