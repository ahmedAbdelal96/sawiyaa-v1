import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PractitionerWalletSummaryScreen from "@/features/financial-operations/components/PractitionerWalletSummaryScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "practitioner-finance" });

  return {
    title: t("meta.walletTitle"),
    description: t("meta.walletDescription"),
  };
}

export default async function PractitionerWalletPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="px-4 py-8">
      <PractitionerWalletSummaryScreen />
    </div>
  );
}
