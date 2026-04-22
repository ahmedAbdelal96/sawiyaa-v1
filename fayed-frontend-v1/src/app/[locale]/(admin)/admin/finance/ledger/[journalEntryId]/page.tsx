import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminLedgerJournalEntryScreen from "@/features/admin/accounting/components/AdminLedgerJournalEntryScreen";

type Props = {
  params: Promise<{ locale: string; journalEntryId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin-accounting" });

  return {
    title: t("meta.journal.title"),
    description: t("meta.journal.description"),
  };
}

export default async function AdminFinanceJournalEntryPage({ params }: Props) {
  const { locale, journalEntryId } = await params;
  setRequestLocale(locale);

  return <AdminLedgerJournalEntryScreen journalEntryId={journalEntryId} />;
}

