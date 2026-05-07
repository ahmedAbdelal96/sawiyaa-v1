"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import {
  usePatientWalletEntries,
  usePatientWalletSummary,
} from "../hooks/use-payments";
import PatientMoneyClarityPanel from "./PatientMoneyClarityPanel";
import WalletActivityCard from "./WalletActivityCard";
import { usePatientProfile } from "@/features/patients/hooks/use-patients";
import { resolvePatientCurrencyCode } from "../lib/patient-currency";

function formatAmount(amount: string, currency: string, numLocale: string): string {
  return new Intl.NumberFormat(numLocale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDate(isoString: string, numLocale: string): string {
  return new Date(isoString).toLocaleDateString(numLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-light bg-white p-4 shadow-[0_12px_28px_-22px_rgba(34,52,56,0.14)] dark:border-border-light dark:bg-surface-secondary">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {label}
          </p>
          <p className="mt-2 text-xl font-bold tabular-nums text-text-primary dark:text-white/95">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-text-secondary">{hint}</p> : null}
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
          {icon}
        </span>
      </div>
    </div>
  );
}

export default function PatientWalletScreen() {
  const t = useTranslations("payments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const { data: patientProfileData, isLoading: patientProfileLoading } = usePatientProfile();

  const preferredWalletCurrencyCode = resolvePatientCurrencyCode({
    countryCode: patientProfileData?.profile.countryCode ?? null,
  });

  const {
    data: walletSummaryData,
    isLoading: walletSummaryLoading,
    isError: walletSummaryError,
    refetch: refetchWalletSummary,
  } = usePatientWalletSummary(preferredWalletCurrencyCode ?? undefined);

  const {
    data: walletEntriesData,
    isLoading: walletEntriesLoading,
    isError: walletEntriesError,
    refetch: refetchWalletEntries,
  } = usePatientWalletEntries({
    page: 1,
    limit: 8,
    currencyCode: preferredWalletCurrencyCode ?? undefined,
  });

  const wallet = walletSummaryData?.item ?? null;
  const entries = walletEntriesData?.items ?? [];
  const walletCurrency =
    resolvePatientCurrencyCode({
      currencyCode: wallet?.currencyCode ?? entries[0]?.currencyCode ?? null,
      countryCode: patientProfileData?.profile.countryCode ?? null,
    }) ?? wallet?.currencyCode ?? entries[0]?.currencyCode ?? null;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-border-light bg-white p-6 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("walletPage.eyebrow")}
            </p>
            <h1 className="mt-3 text-2xl font-bold text-text-primary dark:text-white/95 md:text-3xl">
              {t("walletPage.heading")}
            </h1>
            <p className="mt-2 text-sm leading-7 text-text-secondary">
              {t("walletPage.note")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/patient/payments"
              className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary dark:bg-white/5 dark:text-white/90"
            >
              {t("walletPage.backToPayments")}
            </Link>
            <Link
              href="/patient/sessions"
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              {t("walletPage.backToSessions")}
            </Link>
          </div>
        </div>
      </section>

      {walletSummaryLoading || patientProfileLoading ? (
        <ListStateSkeleton items={1} heightClass="h-44" />
      ) : walletSummaryError ? (
        <StateCard
          icon={<Wallet className="h-6 w-6 text-primary" />}
          title={t("walletPage.states.error.heading")}
          note={t("walletPage.states.error.note")}
          action={{
            label: t("walletPage.states.error.retry"),
            onClick: () => refetchWalletSummary(),
          }}
          className="rounded-[28px]"
        />
      ) : wallet ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={t("walletPage.metrics.available")}
            value={
              walletCurrency
                ? formatAmount(wallet.availableBalance, walletCurrency, numLocale)
                : wallet.availableBalance
            }
            hint={t("walletPage.metrics.availableHint")}
            icon={<Wallet className="h-4 w-4" />}
          />
          <MetricCard
            label={t("walletPage.metrics.reserved")}
            value={
              walletCurrency
                ? formatAmount(wallet.reservedBalance, walletCurrency, numLocale)
                : wallet.reservedBalance
            }
            hint={t("walletPage.metrics.reservedHint")}
            icon={<RefreshCw className="h-4 w-4" />}
          />
          <MetricCard
            label={t("walletPage.metrics.credited")}
            value={
              walletCurrency
                ? formatAmount(wallet.lifetimeCredited, walletCurrency, numLocale)
                : wallet.lifetimeCredited
            }
            hint={t("walletPage.metrics.creditedHint")}
            icon={<ArrowDownLeft className="h-4 w-4" />}
          />
          <MetricCard
            label={t("walletPage.metrics.debited")}
            value={
              walletCurrency
                ? formatAmount(wallet.lifetimeDebited, walletCurrency, numLocale)
                : wallet.lifetimeDebited
            }
            hint={t("walletPage.metrics.debitedHint")}
            icon={<ArrowUpRight className="h-4 w-4" />}
          />
        </div>
      ) : (
        <StateCard
          icon={<Wallet className="h-6 w-6 text-primary" />}
          title={t("walletPage.states.empty.heading")}
          note={t("walletPage.states.empty.note")}
          action={{
            label: t("walletPage.states.empty.action"),
            href: (
              <Link
                href="/patient/payments"
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                {t("walletPage.states.empty.action")}
              </Link>
            ),
          }}
          className="rounded-[28px]"
        />
      )}

      <PatientMoneyClarityPanel
        eyebrow={t("walletPage.clarity.eyebrow")}
        title={t("walletPage.clarity.heading")}
        note={t("walletPage.clarity.note")}
        facts={[
          {
            label: t("walletPage.clarity.available.label"),
            value: t("walletPage.clarity.available.value"),
            helper: t("walletPage.clarity.available.helper"),
          },
          {
            label: t("walletPage.clarity.reserved.label"),
            value: t("walletPage.clarity.reserved.value"),
            helper: t("walletPage.clarity.reserved.helper"),
          },
        ]}
        actions={[
          { label: t("walletPage.clarity.actions.payments"), href: "/patient/payments" },
          { label: t("walletPage.clarity.actions.sessions"), href: "/patient/sessions", tone: "primary" },
        ]}
        variant="soft"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-3 rounded-[32px] border border-border-light bg-white p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("walletPage.activityHeading")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                {t("walletPage.activityNote")}
              </p>
            </div>
            {walletEntriesError ? (
              <button
                type="button"
                onClick={() => refetchWalletEntries()}
                className="text-xs font-medium text-primary hover:underline"
              >
                {t("walletPage.retry")}
              </button>
            ) : null}
          </div>

          {walletEntriesLoading ? (
            <ListStateSkeleton items={3} heightClass="h-16" />
          ) : entries.length > 0 ? (
            <div className="space-y-2">
              {entries.map((entry) => (
                <WalletActivityCard key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <StateCard
              icon={<CreditCard className="h-5 w-5 text-primary" />}
              title={t("walletPage.activityEmpty.heading")}
              note={t("walletPage.activityEmpty.note")}
              action={{
                label: t("walletPage.activityEmpty.action"),
                href: (
                  <Link
                    href="/patient/payments"
                    className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
                  >
                    {t("walletPage.activityEmpty.action")}
                  </Link>
                ),
              }}
              className="rounded-[28px]"
            />
          )}
        </section>

        <aside className="space-y-4 rounded-[32px] border border-border-light bg-white p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary">
          <div>
            <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("walletPage.sidebar.heading")}
            </h3>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              {t("walletPage.sidebar.note")}
            </p>
          </div>

          <div className="rounded-2xl border border-border-light bg-surface-secondary p-4 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("walletPage.sidebar.currency")}
            </p>
            <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/90">
              {walletCurrency}
            </p>
            <p className="mt-1 text-xs text-text-secondary">{t("walletPage.sidebar.currencyNote")}</p>
          </div>

          <div className="rounded-2xl border border-border-light bg-surface-secondary p-4 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("walletPage.sidebar.updateLabel")}
            </p>
            <p className="mt-2 text-sm text-text-secondary">{t("walletPage.sidebar.updateNote")}</p>
            <p className="mt-2 text-xs text-text-muted">
              {wallet?.lastEntryAt ? (
                <>
                  {t("walletPage.sidebar.lastEntry")} {formatDate(wallet.lastEntryAt, numLocale)}
                </>
              ) : (
                t("walletPage.sidebar.noActivity")
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/patient/payments"
              className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary dark:bg-white/5 dark:text-white/90"
            >
              {t("walletPage.sidebar.openPayments")}
            </Link>
            <Link
              href="/patient/sessions"
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              {t("walletPage.sidebar.openSessions")}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
