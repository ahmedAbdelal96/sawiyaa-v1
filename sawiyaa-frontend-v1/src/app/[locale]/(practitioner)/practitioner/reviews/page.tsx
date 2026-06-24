import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PractitionerReviewsScreen from "@/features/practitioner-reviews/components/PractitionerReviewsScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "practitioner-reviews" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function PractitionerReviewsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PractitionerReviewsScreen />;
}
