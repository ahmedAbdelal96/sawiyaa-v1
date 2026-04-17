import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminFinanceOperationDetailScreen from "@/features/admin/finance-operations/components/AdminFinanceOperationDetailScreen";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-finance-operations" });
  return {
    title: t("meta.detail.title"),
    description: t("meta.detail.description"),
  };
}

export default async function AdminFinanceOperationDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <AdminFinanceOperationDetailScreen eventId={id} />;
}
