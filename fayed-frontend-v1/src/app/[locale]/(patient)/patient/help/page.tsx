import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PublicHelpScreen from "@/features/help/components/PublicHelpScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "help" });

  return {
    title: t("meta.listTitle"),
    description: t("meta.listDescription"),
  };
}

export default async function PatientHelpPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PublicHelpScreen />;
}
