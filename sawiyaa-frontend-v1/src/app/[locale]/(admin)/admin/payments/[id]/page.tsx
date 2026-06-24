import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminPaymentOpsScreen from "@/features/admin/payments/components/AdminPaymentOpsScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-area" });
  return {
    title: t("payments.meta.detailTitle"),
    description: t("payments.meta.detailDescription"),
  };
}

export default async function AdminPaymentDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <AdminPaymentOpsScreen paymentId={id} />;
}
