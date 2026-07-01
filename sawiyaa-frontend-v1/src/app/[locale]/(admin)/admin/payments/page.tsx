import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPaymentsLookupScreen from "@/features/admin/payments/components/AdminPaymentsLookupScreen";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-finance-operations" });
  return {
    title: t("meta.list.title"),
    description: t("meta.list.description"),
  };
}

export default async function AdminPaymentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.FINANCE_EVENTS_READ, PermissionKey.REFUNDS_APPROVE, PermissionKey.REFUNDS_RETRY]}
    >
      <AdminPaymentsLookupScreen />
    </AdminPermissionGate>
  );
}

