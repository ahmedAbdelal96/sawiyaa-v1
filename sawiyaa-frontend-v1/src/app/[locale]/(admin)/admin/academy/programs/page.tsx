import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminAcademyProgramsCatalogScreen from "@/features/academy-programs/components/AdminAcademyProgramsCatalogScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "academy" });

  return {
    title: t("meta.adminProgramsTitle"),
    description: t("meta.adminProgramsDescription"),
  };
}

export default async function AdminAcademyProgramsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminAcademyProgramsCatalogScreen />;
}
