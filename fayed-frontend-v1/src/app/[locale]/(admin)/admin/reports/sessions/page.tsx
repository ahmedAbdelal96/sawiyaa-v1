import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminSessionsReportScreen from "@/features/admin/reports/components/AdminSessionsReportScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-reports" });
  return {
    title: t("meta.sessions.title"),
    description: t("meta.sessions.description"),
  };
}

export default async function AdminSessionsReportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminSessionsReportScreen />;
}

