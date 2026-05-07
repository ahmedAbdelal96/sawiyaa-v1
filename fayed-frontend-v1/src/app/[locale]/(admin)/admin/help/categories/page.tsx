import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminHelpCategoriesScreen from "@/features/help/components/AdminHelpCategoriesScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-help" });

  return {
    title: t("meta.categoriesTitle"),
    description: t("meta.categoriesDescription"),
  };
}

export default async function AdminHelpCategoriesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminHelpCategoriesScreen />;
}
