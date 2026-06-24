import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminSettlementsDuesScreen from "@/features/admin/settlements/components/AdminSettlementsDuesScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-settlements" });

  return {
    title: t("meta.duesTitle"),
    description: t("meta.duesDescription"),
  };
}

export default async function AdminSettlementsDuesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminSettlementsDuesScreen />;
}
