import AdminPatientsDirectory from "@/features/admin/patients/components/AdminPatientsDirectory";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";

export default function AdminPatientsPage() {
  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.PATIENTS_READ_ADMIN, PermissionKey.PATIENTS_SENSITIVE_READ]}
    >
      <AdminPatientsDirectory />
    </AdminPermissionGate>
  );
}

