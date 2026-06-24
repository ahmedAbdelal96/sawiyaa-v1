import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPackageSettlementDetailScreen from "@/features/admin/package-settlements/components/AdminPackageSettlementDetailScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-package-settlements" });

  return {
    title: t("meta.detailTitle"),
    description: t("meta.detailDescription"),
  };
}

export default async function AdminPackageSettlementDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <AdminPackageSettlementDetailScreen id={id} />;
}
