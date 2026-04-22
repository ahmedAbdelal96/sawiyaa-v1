import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminLedgerExplorerScreen from "@/features/admin/accounting/components/AdminLedgerExplorerScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-accounting" });

  return {
    title: t("meta.ledger.title"),
    description: t("meta.ledger.description"),
  };
}

export default async function AdminFinanceLedgerPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminLedgerExplorerScreen />;
}

