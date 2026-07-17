import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { PermissionKey } from "@/lib/auth/permissions";
import AdminSessionEarningReviewDetailScreen from "@/features/admin/session-earning-reviews/components/AdminSessionEarningReviewDetailScreen";

type Props = {
  params: Promise<{ locale: string; reviewId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-finance-operations" });

  return {
    title: t("meta.sessionEarningReviews.detail.title"),
    description: t("meta.sessionEarningReviews.detail.description"),
  };
}

export default async function AdminSessionEarningReviewDetailPage({ params }: Props) {
  const { locale, reviewId } = await params;
  setRequestLocale(locale);

  return (
    <AdminPermissionGate requiredPermissions={[PermissionKey.ACCOUNTING_READ]}>
      <AdminSessionEarningReviewDetailScreen reviewId={reviewId} />
    </AdminPermissionGate>
  );
}
