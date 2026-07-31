import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPaymentGatewayControlScreen from "@/features/admin/payment-gateway-control/components/AdminPaymentGatewayControlScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "finance" });
  return {
    title: t("paymentGateways.title"),
    description: t("paymentGateways.description"),
  };
}

export default async function AdminPaymentGatewayControlPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminPaymentGatewayControlScreen />;
}
