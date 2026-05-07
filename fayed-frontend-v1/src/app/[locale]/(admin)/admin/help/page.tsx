import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminHelpScreen from "@/features/help/components/AdminHelpScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-help" });

  return {
    title: t("meta.listTitle"),
    description: t("meta.listDescription"),
  };
}

export default async function AdminHelpPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminHelpScreen />;
}
