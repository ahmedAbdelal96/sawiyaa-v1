import { requireAuthenticatedArea } from "@/lib/auth/access";
import { getServerCurrentUserPermissions } from "@/lib/server-api-client";
import DashboardLayout from "@/layout/DashboardLayout";
import { adminNavigation, filterAdminNavigation } from "@/config/navigation";

export const dynamic = "force-dynamic";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  const [user, permissions] = await Promise.all([
    requireAuthenticatedArea(locale, "admin"),
    getServerCurrentUserPermissions(),
  ]);

  // Real permissions come from /users/me/permissions. The role fields are kept
  // for fallback compatibility via ROLE_PERMISSION_MAP in case permissions[] is empty.
  const permissionUser = { role: user.role, roles: [user.role], permissions };
  const filteredNavigation = filterAdminNavigation(adminNavigation, permissionUser);

  return (
    <DashboardLayout
      navigation={filteredNavigation}
      basePathPrefix="/admin"
      layoutVariant="admin"
      messagingRole="admin"
    >
      {children}
    </DashboardLayout>
  );
}
