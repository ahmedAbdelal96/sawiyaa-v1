"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowUpRight,
  BadgeDollarSign,
  Clock3,
  ShieldCheck,
  Wallet,
  WalletCards,
} from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard, SurfaceStatCard } from "@/components/shared/SurfaceShell";
import { getPractitionerWalletErrorKey } from "../lib/financial-operations-errors";
import { usePractitionerWallet } from "../hooks/use-financial-operations";

function formatMoney(value: string, currency: string, locale: string) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return `${value} ${currency}`;

  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function formatDateTime(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: locale !== "ar",
  });
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "neutral" | "brand" | "primary" | "success" | "warning";
  icon: React.ReactNode;
}) {
  return (
    <SurfaceStatCard label={label} value={value} tone={tone} icon={icon} />
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border-light py-3 last:border-b-0 dark:border-white/8">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <span className="text-sm text-text-primary dark:text-white/90">{value}</span>
    </div>
  );
}

export default function PractitionerWalletSummaryScreen() {
  const t = useTranslations("practitioner-finance");
  const locale = useLocale();
  const walletQuery = usePractitionerWallet();

  const balances = useMemo(() => {
    if (!walletQuery.data) return null;
    const wallet = walletQuery.data;
    return {
      currency: wallet.currency,
      available: formatMoney(wallet.availableBalance, wallet.currency, locale),
      pending: formatMoney(wallet.pendingBalance, wallet.currency, locale),
      reserved: formatMoney(wallet.reservedBalance, wallet.currency, locale),
      totalEarned: formatMoney(wallet.totalEarned, wallet.currency, locale),
      lifetimePaidOut: formatMoney(wallet.lifetimePaidOut, wallet.currency, locale),
      lastLedgerEntryAt: formatDateTime(wallet.lastLedgerEntryAt, locale),
      updatedAt: formatDateTime(wallet.updatedAt, locale),
    };
  }, [locale, walletQuery.data]);

  if (walletQuery.isLoading) {
    return <ListStateSkeleton items={3} heightClass="h-28" />;
  }

  if (walletQuery.isError) {
    return (
      <StateCard
        icon={<Wallet className="h-5 w-5 text-primary" />}
        title={t("states.error.heading")}
        note={t(getPractitionerWalletErrorKey(walletQuery.error))}
        action={{ label: t("states.error.retry"), onClick: () => walletQuery.refetch() }}
        className="rounded-[28px]"
      />
    );
  }

  if (!balances) {
    return (
      <StateCard
        icon={<Wallet className="h-5 w-5 text-primary" />}
        title={t("states.empty.heading")}
        note={t("states.empty.note")}
        className="rounded-[28px]"
      />
    );
  }

  return (
    <div className="space-y-6">
      <SurfaceCard variant="page" className="rounded-[32px]">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("summary.eyebrow")}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("summary.title")}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary sm:text-base">
              {t("summary.note")}
            </p>
          </div>
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {t("summary.currency", { currency: balances.currency })}
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[24px] bg-surface-secondary px-5 py-4 dark:bg-white/5">
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("summary.scopeHeading")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-text-secondary">
              <li>{t("summary.scopeItems.balances")}</li>
              <li>{t("summary.scopeItems.totals")}</li>
              <li>{t("summary.scopeItems.timestamps")}</li>
            </ul>
          </div>

          <div className="rounded-[24px] border border-border-light bg-surface-primary px-5 py-4 dark:bg-white/5">
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("summary.boundaryHeading")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-text-secondary">
              <li>{t("summary.boundaryItems.noLedger")}</li>
              <li>{t("summary.boundaryItems.noSettlements")}</li>
              <li>{t("summary.boundaryItems.noPayouts")}</li>
            </ul>
          </div>
        </div>
      </SurfaceCard>

      <section className="grid gap-4 lg:grid-cols-3">
        <SummaryCard
          label={t("summary.cards.available")}
          value={balances.available}
          tone="brand"
          icon={<Wallet className="h-4 w-4" />}
        />
        <SummaryCard
          label={t("summary.cards.pending")}
          value={balances.pending}
          tone="warning"
          icon={<Clock3 className="h-4 w-4" />}
        />
        <SummaryCard
          label={t("summary.cards.reserved")}
          value={balances.reserved}
          tone="primary"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <SummaryCard
          label={t("summary.cards.totalEarned")}
          value={balances.totalEarned}
          tone="neutral"
          icon={<BadgeDollarSign className="h-4 w-4" />}
        />
        <SummaryCard
          label={t("summary.cards.lifetimePaidOut")}
          value={balances.lifetimePaidOut}
          tone="success"
          icon={<ArrowUpRight className="h-4 w-4" />}
        />
      </section>

      <SurfaceCard variant="section" className="rounded-[28px] p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-white/95">
          <WalletCards className="h-4 w-4 text-primary" />
          {t("summary.detailsHeading")}
        </div>
        <div className="mt-4">
          <DetailRow label={t("summary.details.lastLedgerEntryAt")} value={balances.lastLedgerEntryAt} />
          <DetailRow label={t("summary.details.updatedAt")} value={balances.updatedAt} />
        </div>
      </SurfaceCard>
    </div>
  );
}
