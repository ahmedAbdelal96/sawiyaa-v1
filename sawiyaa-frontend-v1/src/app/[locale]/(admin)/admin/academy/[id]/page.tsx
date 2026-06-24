import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminAcademyDetailScreen from "@/features/academy/components/AdminAcademyDetailScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "academy" });

  return {
    title: t("meta.adminDetailTitle"),
    description: t("meta.adminDetailDescription"),
  };
}

export default async function AdminAcademyDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <AdminAcademyDetailScreen courseId={id} />;
}
