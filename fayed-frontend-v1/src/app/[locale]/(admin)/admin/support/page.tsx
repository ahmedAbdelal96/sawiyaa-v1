import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminSupportListScreen from "@/features/support/components/AdminSupportListScreen";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "support" });
  return {
    title: t("admin.meta.listTitle"),
    description: t("admin.meta.listDescription"),
  };
}

export default async function AdminSupportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.SUPPORT_TICKET_NOTE_INTERNAL, PermissionKey.SUPPORT_TICKET_ASSIGN]}
    >
      <AdminSupportListScreen />
    </AdminPermissionGate>
  );
}
