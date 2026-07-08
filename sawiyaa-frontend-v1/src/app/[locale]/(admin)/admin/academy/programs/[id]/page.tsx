import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminAcademyProgramDetailScreen from "@/features/academy-programs/components/AdminAcademyProgramDetailScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "academy" });

  return {
    title: t("meta.adminProgramDetailTitle"),
    description: t("meta.adminProgramDetailDescription"),
  };
}

export default async function AdminAcademyProgramDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <AdminAcademyProgramDetailScreen programId={id} />;
}
