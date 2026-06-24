import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminAccountingDashboardScreen from "@/features/admin/accounting/components/AdminAccountingDashboardScreen";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-accounting" });

  return {
    title: t("meta.dashboard.title"),
    description: t("meta.dashboard.description"),
  };
}

export default async function AdminFinanceDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.ACCOUNTING_READ, PermissionKey.FINANCE_EVENTS_READ]}
    >
      <AdminAccountingDashboardScreen />
    </AdminPermissionGate>
  );
}

