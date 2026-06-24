import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";
import AdminUsersScreen from "@/features/admin/users/components/AdminUsersScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-users" });

  return {
    title: t("page.title"),
    description: t("page.description"),
  };
}

export default async function AdminUsersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate requiredPermissions={[PermissionKey.ADMIN_USERS_READ]}>
      <AdminUsersScreen />
    </AdminPermissionGate>
  );
}
