import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "academy" });

  return {
    title: t("meta.adminTitle"),
    description: t("meta.adminDescription"),
  };
}

export default async function AdminAcademyPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/admin/academy/programs`);
}
