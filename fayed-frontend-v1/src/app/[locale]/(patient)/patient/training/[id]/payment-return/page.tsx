import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PatientQuickNav } from "@/components/patient/PatientSectionFrame";
import TrainingEnrollmentPaymentReturnPanel from "@/features/training/components/TrainingEnrollmentPaymentReturnPanel";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{
    redirect_status?: string;
    success?: string;
    pending?: string;
    order?: string;
    id?: string;
    payment_intent?: string;
    payment_intent_client_secret?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "training" });
  return {
    title: t("meta.patientPaymentReturnTitle"),
    description: t("meta.patientPaymentReturnDescription"),
  };
}

export default async function PatientTrainingPaymentReturnPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const { redirect_status, success, pending } = await searchParams;
  setRequestLocale(locale);

  const normalizedRedirectStatus =
    redirect_status ??
    (success === "true" && pending === "false"
      ? "succeeded"
      : success === "false" && pending === "false"
        ? "failed"
        : null);

  return (
    <div className="app-max-content mx-auto space-y-5 px-4 py-6 sm:space-y-6">
      <section className="app-panel-soft rounded-[28px] p-4 sm:p-5">
        <PatientQuickNav />
      </section>
      <TrainingEnrollmentPaymentReturnPanel
        enrollmentId={id}
        redirectStatus={normalizedRedirectStatus}
      />
    </div>
  );
}
