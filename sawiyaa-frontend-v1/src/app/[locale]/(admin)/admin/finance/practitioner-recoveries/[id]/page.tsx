import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";
import AdminPractitionerRecoveryDetailScreen from "@/features/admin/practitioner-recoveries/components/AdminPractitionerRecoveryDetailScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-finance-operations" });

  return {
    title: t("practitionerRecoveries.meta.detail.title"),
    description: t("practitionerRecoveries.meta.detail.description"),
  };
}

export default async function AdminPractitionerRecoveryDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate requiredPermissions={[PermissionKey.ACCOUNTING_READ]}>
      <AdminPractitionerRecoveryDetailScreen id={id} />
    </AdminPermissionGate>
  );
}
