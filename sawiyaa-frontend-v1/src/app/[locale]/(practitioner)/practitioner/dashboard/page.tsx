import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PractitionerDashboard from "@/features/practitioners/components/PractitionerDashboard";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "practitioner-area" });
  return {
    title: t("dashboard.meta.title"),
    description: t("dashboard.meta.description"),
  };
}

export default async function PractitionerDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PractitionerDashboard />;
}
