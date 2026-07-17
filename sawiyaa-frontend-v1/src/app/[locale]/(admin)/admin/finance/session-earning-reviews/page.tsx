import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";
import AdminSessionEarningReviewsListScreen from "@/features/admin/session-earning-reviews/components/AdminSessionEarningReviewsListScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-finance-operations" });

  return {
    title: t("meta.sessionEarningReviews.list.title"),
    description: t("meta.sessionEarningReviews.list.description"),
  };
}

export default async function AdminSessionEarningReviewsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate requiredPermissions={[PermissionKey.ACCOUNTING_READ]}>
      <AdminSessionEarningReviewsListScreen />
    </AdminPermissionGate>
  );
}
