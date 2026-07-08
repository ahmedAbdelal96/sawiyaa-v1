import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminAcademyProgramLearnersScreen from "@/features/academy-programs/components/AdminAcademyProgramLearnersScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "academy" });

  return {
    title: t("meta.adminProgramsTitle"),
    description: t("meta.adminProgramsDescription"),
  };
}

export default async function AdminAcademyProgramLearnersPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <AdminAcademyProgramLearnersScreen programId={id} />;
}
