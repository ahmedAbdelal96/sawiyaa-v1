import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

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

export default async function AdminTrainingDetailPage({ params }: Props) {
  const { locale, id } = await params;
  redirect(`/${locale}/admin/academy/${id}`);
}
