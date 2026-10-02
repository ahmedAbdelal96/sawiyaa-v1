import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPackagePlanDetailScreen from "@/features/admin/package-plans/components/AdminPackagePlanDetailScreen";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";

type Props = {
  params: Promise<{ locale: string; code: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, code } = await params;
  const t = await getTranslations({ locale, namespace: "admin-package-plans" });

  return {
    title: `${code} · ${t("meta.detailTitle")}`,
    description: t("meta.detailDescription"),
  };
}

export default async function AdminPackagePlanDetailPage({ params }: Props) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate
      requiredPermissions={[PermissionKey.PACKAGE_PLANS_READ]}
    >
      <AdminPackagePlanDetailScreen code={code} />
    </AdminPermissionGate>
  );
}
