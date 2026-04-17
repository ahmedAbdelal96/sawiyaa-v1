import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminModerationReportsListScreen from "@/features/admin/moderation-reports/components/AdminModerationReportsListScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-moderation-reports" });
  return {
    title: t("meta.list.title"),
    description: t("meta.list.description"),
  };
}

export default async function AdminModerationReportsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminModerationReportsListScreen />;
}
