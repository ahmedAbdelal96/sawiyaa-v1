import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminFinanceHubScreen from "@/features/admin/finance/components/AdminFinanceHubScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-accounting" });

  return {
    title: t("hub.metaTitle"),
    description: t("hub.metaDescription"),
  };
}

export default async function AdminFinancePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminFinanceHubScreen locale={locale} />;
}
