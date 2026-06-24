import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminSpecialtiesCatalogScreen from "@/features/admin/specialties/components/AdminSpecialtiesCatalogScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-area" });
  return {
    title: t("specialtiesAdmin.meta.title"),
    description: t("specialtiesAdmin.meta.description"),
  };
}

export default async function AdminSpecialtiesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminSpecialtiesCatalogScreen />;
}
