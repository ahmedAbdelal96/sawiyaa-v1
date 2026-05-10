import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PatientSectionFrame from "@/components/patient/PatientSectionFrame";
import PatientPaymentsHistoryPanel from "@/features/payments/components/PatientPaymentsHistoryPanel";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "payments" });
  return {
    title: t("meta.historyTitle"),
    description: t("meta.historyDescription"),
  };
}

export default async function PatientPaymentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "payments" });

  return (
    <PatientSectionFrame
      eyebrow={t("history.heading")}
      title={t("history.heading")}
      description={t("meta.historyDescription")}
      className="max-w-4xl"
    >
      <PatientPaymentsHistoryPanel />
    </PatientSectionFrame>
  );
}
