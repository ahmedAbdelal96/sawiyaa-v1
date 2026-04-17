import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminModerationReportDetailScreen from "@/features/admin/moderation-reports/components/AdminModerationReportDetailScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-moderation-reports" });
  return {
    title: t("meta.detail.title"),
    description: t("meta.detail.description"),
  };
}

export default async function AdminModerationReportDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <AdminModerationReportDetailScreen reportId={id} />;
}
