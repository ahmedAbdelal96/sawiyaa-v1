import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PatientReviewDetailScreen from "@/features/reviews/components/PatientReviewDetailScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviews" });
  return {
    title: t("patient.meta.detail.title"),
    description: t("patient.meta.detail.description"),
  };
}

export default async function PatientReviewDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return (
    <div className="app-max-content mx-auto px-4 py-8">
      <PatientReviewDetailScreen reviewId={id} />
    </div>
  );
}
