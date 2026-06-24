import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
    <div className="app-max-content mx-auto space-y-8 px-4 pt-4 pb-8 sm:space-y-8 sm:px-6">
      <PatientWalletScreen />
    </div>
  );
}
