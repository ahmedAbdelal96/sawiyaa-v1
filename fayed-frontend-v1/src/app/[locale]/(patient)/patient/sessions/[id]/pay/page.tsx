import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
  return <PaySessionPanel sessionId={id} />;
}
