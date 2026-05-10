import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PatientQuickNav } from "@/components/patient/PatientSectionFrame";
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
    <div className="app-max-content mx-auto space-y-5 px-4 py-8 sm:space-y-6">
      <section className="app-panel-soft rounded-[28px] p-4 sm:p-5">
        <PatientQuickNav />
      </section>
      <PatientReviewDetailScreen reviewId={id} />
    </div>
  );
}
