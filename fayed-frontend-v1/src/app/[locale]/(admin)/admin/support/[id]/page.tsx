import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminSupportTicketScreen from "@/features/support/components/AdminSupportTicketScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "support" });
  return {
    title: t("admin.meta.detailTitle"),
    description: t("admin.meta.detailDescription"),
  };
}

export default async function AdminSupportTicketPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <AdminSupportTicketScreen ticketId={id} />;
}
