import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";
import AdminPractitionerRecoveriesListScreen from "@/features/admin/practitioner-recoveries/components/AdminPractitionerRecoveriesListScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-finance-operations" });

  return {
    title: t("practitionerRecoveries.meta.list.title"),
    description: t("practitionerRecoveries.meta.list.description"),
  };
}

export default async function AdminPractitionerRecoveriesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate requiredPermissions={[PermissionKey.ACCOUNTING_READ]}>
      <AdminPractitionerRecoveriesListScreen />
    </AdminPermissionGate>
  );
}
