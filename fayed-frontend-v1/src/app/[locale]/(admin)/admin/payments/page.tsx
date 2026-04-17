import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import AdminPaymentsLookupScreen from "@/features/admin/payments/components/AdminPaymentsLookupScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isArabic = locale.startsWith("ar");

  return {
    title: isArabic ? "مراجعة المدفوعات — الإدارة" : "Payments review — Admin",
    description: isArabic
      ? "راجع سجلات الدفع والاسترداد وافتح سجل الدفع المرتبط عند الحاجة."
      : "Review payment and refund records and open the linked payment snapshot when needed.",
  };
}

export default async function AdminPaymentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminPaymentsLookupScreen />;
}
