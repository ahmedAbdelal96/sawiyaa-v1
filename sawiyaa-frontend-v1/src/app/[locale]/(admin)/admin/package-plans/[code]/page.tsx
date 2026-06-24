import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPackagePlanDetailScreen from "@/features/admin/package-plans/components/AdminPackagePlanDetailScreen";

type Props = {
  params: Promise<{ locale: string; code: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, code } = await params;
  const t = await getTranslations({ locale, namespace: "admin-package-plans" });

  return {
    title: `${code} · ${t("meta.detailTitle")}`,
    description: t("meta.detailDescription"),
  };
}

export default async function AdminPackagePlanDetailPage({ params }: Props) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  return <AdminPackagePlanDetailScreen code={code} />;
}
