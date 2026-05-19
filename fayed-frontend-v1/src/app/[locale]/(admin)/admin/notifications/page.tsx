import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminNotificationsListScreen from "@/features/admin/notifications/components/AdminNotificationsListScreen";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-notifications" });

  return {
    title: t("notifications.meta.listTitle"),
    description: t("notifications.meta.listDescription"),
  };
}

export default async function AdminNotificationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate requiredPermissions={[PermissionKey.NOTIFICATION_OPS_READ]}>
      <AdminNotificationsListScreen />
    </AdminPermissionGate>
  );
}
