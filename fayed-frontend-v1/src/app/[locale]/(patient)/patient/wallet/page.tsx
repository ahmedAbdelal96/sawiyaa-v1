import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PatientQuickNav } from "@/components/patient/PatientSectionFrame";
import PatientWalletScreen from "@/features/payments/components/PatientWalletScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "payments" });
  return {
    title: t("meta.walletTitle"),
    description: t("meta.walletDescription"),
  };
}

export default async function PatientWalletPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="app-max-content mx-auto space-y-5 px-4 py-6 sm:space-y-6">
      <section className="app-panel-soft rounded-[28px] p-4 sm:p-5">
        <PatientQuickNav />
      </section>
      <PatientWalletScreen />
    </div>
  );
}
