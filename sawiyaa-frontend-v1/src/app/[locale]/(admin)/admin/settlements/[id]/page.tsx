import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminSettlementDetailScreen from "@/features/admin/settlements/components/AdminSettlementDetailScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-settlements" });

  return {
    title: t("meta.detailTitle"),
    description: t("meta.detailDescription"),
  };
}

export default async function AdminSettlementDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <AdminSettlementDetailScreen batchId={id} />;
}
