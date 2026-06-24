import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminSettlementBatchesScreen from "@/features/admin/settlements/components/AdminSettlementBatchesScreen";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-settlements" });

  return {
    title: t("meta.batchesTitle"),
    description: t("meta.batchesDescription"),
  };
}

export default async function AdminSettlementsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.SETTLEMENTS_READ, PermissionKey.SETTLEMENTS_WRITE]}
    >
      <AdminSettlementBatchesScreen />
    </AdminPermissionGate>
  );
}
