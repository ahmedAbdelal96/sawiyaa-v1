import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-text-primary dark:text-white/95">
        {t("history.heading")}
      </h1>
      <PatientPaymentsHistoryPanel />
    </div>
  );
}
