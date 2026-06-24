import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";
import AdminRefundPoliciesScreen from "@/features/admin/refund-policies/components/AdminRefundPoliciesScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-refund-policies" });

  return {
    title: t("meta.listTitle"),
    description: t("meta.listDescription"),
  };
}

export default async function AdminRefundPoliciesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.REFUNDS_APPROVE]}
    >
      <AdminRefundPoliciesScreen />
    </AdminPermissionGate>
  );
}
