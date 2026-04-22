import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminCareRequestsReportScreen from "@/features/admin/reports/components/AdminCareRequestsReportScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-reports" });
  return {
    title: t("meta.careRequests.title"),
    description: t("meta.careRequests.description"),
  };
}

export default async function AdminCareRequestsReportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminCareRequestsReportScreen />;
}

