import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPackagePlansScreen from "@/features/admin/package-plans/components/AdminPackagePlansScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-package-plans" });

  return {
    title: t("meta.listTitle"),
    description: t("meta.listDescription"),
  };
}

export default async function AdminPackagePlansPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminPackagePlansScreen />;
}
