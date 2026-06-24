import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminRevenueShareRulesScreen from "@/features/settings/components/AdminRevenueShareRulesScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-settings" });
  return {
    title: t("revenueShare.meta.title"),
    description: t("revenueShare.meta.description"),
  };
}

export default async function AdminRevenueShareRulesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminRevenueShareRulesScreen />;
}

