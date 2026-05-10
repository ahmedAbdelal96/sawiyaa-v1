import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PatientQuickNav } from "@/components/patient/PatientSectionFrame";
import TrainingEnrollmentPayPanel from "@/features/training/components/TrainingEnrollmentPayPanel";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "training" });
  return {
    title: t("meta.patientPayTitle"),
    description: t("meta.patientPayDescription"),
  };
}

export default async function PatientTrainingPayPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return (
    <div className="app-max-content mx-auto space-y-5 px-4 py-6 sm:space-y-6">
      <section className="app-panel-soft rounded-[28px] p-4 sm:p-5">
        <PatientQuickNav />
      </section>
      <TrainingEnrollmentPayPanel enrollmentId={id} />
    </div>
  );
}
