"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatMoney as formatFinanceMoney } from "@/lib/finance-format";
import { formatViewerDate } from "@/lib/time-formatting";
import type { CustomerWalletEntryItem, CustomerWalletEntryType } from "../types/payments.types";

function formatDate(isoString: string, numLocale: string): string {
  return formatViewerDate(isoString, { locale: numLocale });
}

function resolveWalletEntryLabelKey(entryType: CustomerWalletEntryType): string {
  return `history.wallet.entries.type.${entryType}`;
}

export default function WalletActivityCard({ entry }: { entry: CustomerWalletEntryItem }) {
  const t = useTranslations("payments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const isCredit = entry.direction === "CREDIT";

  return (
    <div className="flex items-start justify-between rounded-xl border border-border-light bg-white px-4 py-3 dark:bg-white/5">
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full ${
            isCredit
              ? "bg-primary-light text-text-brand dark:bg-primary/20 dark:text-primary-light"
              : "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/70"
          }`}
        >
          {isCredit ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
        </span>
        <div>
          <p className="text-sm font-medium text-text-primary dark:text-white/90">
            {t(resolveWalletEntryLabelKey(entry.entryType) as Parameters<typeof t>[0])}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {formatDate(entry.effectiveAt, numLocale)}
          </p>
          {entry.description ? (
            <p className="mt-1 text-xs text-text-secondary">{entry.description}</p>
          ) : null}
        </div>
      </div>
      <p
        className={`text-sm font-semibold tabular-nums ${
          isCredit ? "text-text-brand dark:text-primary-light" : "text-text-primary dark:text-white/90"
        }`}
      >
        {isCredit ? "+" : "-"}
        {formatFinanceMoney(numLocale, entry.amount, entry.currencyCode, {
          fallbackText: "—",
        })}
      </p>
    </div>
  );
}
