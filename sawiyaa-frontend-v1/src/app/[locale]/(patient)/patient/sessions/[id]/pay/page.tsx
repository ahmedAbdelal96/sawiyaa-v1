import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PatientQuickNav } from "@/components/patient/PatientSectionFrame";
import PaySessionPanel from "@/features/payments/components/PaySessionPanel";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "payments" });
  return {
    title: t("meta.payTitle"),
  };
}

export default async function PatientSessionPayPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return (
    <div className="app-max-content mx-auto space-y-5 px-4 py-6 sm:space-y-6">
      <PaySessionPanel sessionId={id} />
    </div>
  );
}
