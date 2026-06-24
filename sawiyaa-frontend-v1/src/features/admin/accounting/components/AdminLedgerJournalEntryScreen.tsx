"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { BookText } from "lucide-react";
import { StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard, SurfaceHeader } from "@/components/shared/SurfaceShell";
import Button from "@/components/ui/button/Button";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import { formatUtcAuditDateTime } from "@/lib/time-formatting";
import { useAdminLedgerJournalEntry } from "../hooks/use-admin-accounting";

function normalizeLocale(locale: string) {
  return locale === "ar" ? "ar-EG" : "en-US";
}

function formatMoney(locale: string, value: string, currencyCode: string) {
  return new Intl.NumberFormat(normalizeLocale(locale), {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || "0"));
}

function formatDateTime(locale: string, value: string) {
  return `UTC: ${formatUtcAuditDateTime(value, { locale })}`;
}

function shortId(value: string) {
  return value.length <= 16 ? value : `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export default function AdminLedgerJournalEntryScreen({
  journalEntryId,
}: {
  journalEntryId: string;
}) {
  const t = useTranslations("admin-accounting");
  const locale = useLocale();
  const router = useRouter();
  const query = useAdminLedgerJournalEntry(journalEntryId);
  const item = query.data?.item;

  const totals = useMemo(() => {
    const lines = item?.lines ?? [];
    const debit = lines
      .filter((line) => line.direction === "DEBIT")
      .reduce((sum, line) => sum + Number(line.amount), 0);
    const credit = lines
      .filter((line) => line.direction === "CREDIT")
      .reduce((sum, line) => sum + Number(line.amount), 0);

    return { debit, credit };
  }, [item?.lines]);

  if (query.isLoading) {
    return (
      <StateCard
        icon={<BookText className="h-5 w-5 text-primary" />}
        title={t("journal.states.loadingTitle")}
        note={t("journal.states.loadingNote")}
        className="rounded-[28px]"
      />
    );
  }

  if (query.isError || !item) {
    return (
      <StateCard
        icon={<BookText className="h-5 w-5 text-primary" />}
        title={t("journal.states.errorTitle")}
        note={t("journal.states.errorNote")}
        action={{
          label: t("journal.states.back"),
          onClick: () => router.push("/admin/finance/ledger"),
        }}
        className="rounded-[28px]"
      />
    );
  }

  return (
    <div className="space-y-6">
      <SurfaceCard as="section" variant="page" className="rounded-[30px] p-6 sm:p-7">
        <SurfaceHeader
          eyebrow={t("journal.eyebrow")}
          title={t("journal.title")}
          description={t("journal.note")}
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              startIcon={<DirectionalArrowIcon direction="back" className="h-4 w-4" />}
              onClick={() => router.push("/admin/finance/ledger")}
            >
              {t("journal.back")}
            </Button>
          }
        />

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border-light bg-surface p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("journal.fields.entryId")}
            </p>
            <p className="mt-2 font-mono text-sm font-semibold text-text-primary dark:text-white/95">
              {shortId(item.id)}
            </p>
          </div>
          <div className="rounded-2xl border border-border-light bg-surface p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("journal.fields.source")}
            </p>
            <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
              {t(`common.sourceType.${item.sourceType}`)}
            </p>
          </div>
          <div className="rounded-2xl border border-border-light bg-surface p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("journal.fields.occurredAt")}
            </p>
            <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
              {formatDateTime(locale, item.occurredAt)}
            </p>
          </div>
          <div className="rounded-2xl border border-border-light bg-surface p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("journal.fields.currency")}
            </p>
            <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
              {item.currencyCode}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-border-light bg-surface p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("journal.fields.debitTotal")}
            </p>
            <p className="mt-2 text-lg font-semibold text-blue-700 dark:text-blue-300">
              {formatMoney(locale, totals.debit.toFixed(2), item.currencyCode)}
            </p>
          </div>
          <div className="rounded-2xl border border-border-light bg-surface p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("journal.fields.creditTotal")}
            </p>
            <p className="mt-2 text-lg font-semibold text-orange-700 dark:text-orange-300">
              {formatMoney(locale, totals.credit.toFixed(2), item.currencyCode)}
            </p>
          </div>
        </div>
      </SurfaceCard>

      <section className="app-panel rounded-[28px] p-5">
        <div className="overflow-x-auto rounded-2xl border border-border-light dark:border-white/10">
          <table className="min-w-full divide-y divide-border-light dark:divide-white/10">
            <thead className="bg-surface-tertiary dark:bg-white/[0.03]">
              <tr>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("journal.table.account")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("journal.table.direction")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("journal.table.amount")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("journal.table.reference")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("journal.table.memo")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light bg-surface dark:divide-white/10 dark:bg-surface-secondary/30">
              {item.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-4 text-sm">
                    <p className="font-semibold text-text-primary dark:text-white/95">
                      {line.ledgerAccountName}
                    </p>
                    <p className="mt-1 font-mono text-xs text-text-muted">{line.ledgerAccountCode}</p>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        line.direction === "DEBIT"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                          : "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"
                      }`}
                    >
                      {t(`common.direction.${line.direction}`)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-text-primary dark:text-white/95">
                    {formatMoney(locale, line.amount, line.currencyCode)}
                  </td>
                  <td className="px-4 py-4 text-sm text-text-secondary">
                    <p>{line.referenceType ?? "-"}</p>
                    <p className="mt-1 font-mono text-xs text-text-muted">
                      {line.referenceId ? shortId(line.referenceId) : "-"}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm text-text-secondary">
                    {line.memo || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
