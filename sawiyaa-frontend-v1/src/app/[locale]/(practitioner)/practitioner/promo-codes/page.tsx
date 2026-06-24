import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PractitionerPromoCodesScreen from "@/features/practitioners/coupons/components/PractitionerPromoCodesScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "practitioner-promo-codes" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function PractitionerPromoCodesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <PractitionerPromoCodesScreen />
    </div>
  );
}
