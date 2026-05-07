import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PatientReviewsListScreen from "@/features/reviews/components/PatientReviewsListScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviews" });
  return {
    title: t("patient.meta.list.title"),
    description: t("patient.meta.list.description"),
  };
}

export default async function PatientReviewsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="app-max-content mx-auto px-4 py-8">
      <PatientReviewsListScreen />
    </div>
  );
}
