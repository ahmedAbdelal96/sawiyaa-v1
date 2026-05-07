import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPackageSettlementsScreen from "@/features/admin/package-settlements/components/AdminPackageSettlementsScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-package-settlements" });

  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function AdminPackageSettlementsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminPackageSettlementsScreen />;
}
