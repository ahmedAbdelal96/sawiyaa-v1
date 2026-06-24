import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";
import AdminUserPermissionsScreen from "@/features/admin/users/components/AdminUserPermissionsScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-users" });

  return {
    title: t("permissions.page.title"),
    description: t("permissions.page.description"),
  };
}

export default async function AdminUserPermissionsPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate requiredPermissions={[PermissionKey.ADMIN_USERS_PERMISSION_OVERRIDES_READ]}>
      <AdminUserPermissionsScreen id={id} />
    </AdminPermissionGate>
  );
}
