import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";
import AdminPaymentExceptionsScreen from "@/features/admin/payments/components/AdminPaymentExceptionsScreen";

export default function AdminPaymentExceptionsPage() {
  return <AdminPermissionGate requiredPermissions={[PermissionKey.FINANCE_EVENTS_READ]}><AdminPaymentExceptionsScreen /></AdminPermissionGate>;
}
