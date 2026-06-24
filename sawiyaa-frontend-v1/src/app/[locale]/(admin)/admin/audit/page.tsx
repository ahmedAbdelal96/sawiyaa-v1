import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminAuditLogListScreen from "@/features/admin/audit/components/AdminAuditLogListScreen";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-audit" });

  return {
    title: t("audit.meta.listTitle"),
    description: t("audit.meta.listDescription"),
  };
}

export default async function AdminAuditLogPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate requiredPermissions={[PermissionKey.AUDIT_LOG_READ]}>
      <AdminAuditLogListScreen />
    </AdminPermissionGate>
  );
}
