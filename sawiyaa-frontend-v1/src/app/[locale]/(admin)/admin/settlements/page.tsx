import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import AdminSessionEarningReviewsListScreen from "@/features/admin/session-earning-reviews/components/AdminSessionEarningReviewsListScreen";
import { PermissionKey } from "@/lib/auth/permissions";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-settlements" });
  return { title: t("meta.title"), description: t("meta.description") };
}

export default async function AdminSettlementsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AdminPermissionGate requiredPermissions={[PermissionKey.ACCOUNTING_READ]}>
      <AdminSessionEarningReviewsListScreen basePath="/admin/settlements" />
    </AdminPermissionGate>
  );
}
