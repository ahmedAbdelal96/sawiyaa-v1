"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  UserRound,
  Wallet,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import AvatarText from "@/components/ui/avatar/AvatarText";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { formatViewerDate } from "@/lib/time-formatting";
import { useCurrentUser } from "@/features/users/hooks/use-users";
import { usePatientProfile } from "@/features/patients/hooks/use-patients";
import { usePatientWalletEntries, usePatientWalletSummary } from "../hooks/use-payments";
import { formatPatientMoney } from "../lib/patient-money-format";
import type { CustomerWalletEntryItem, CustomerWalletSummaryItem } from "../types/payments.types";

function formatDate(isoString: string, numLocale: string): string {
  return formatViewerDate(isoString, { locale: numLocale });
}

function resolveWalletEntryStatusKey(entry: CustomerWalletEntryItem): string {
  if (entry.entryType === "SESSION_PAYMENT_RESERVE") {
    return "walletPage.activityStatus.processing";
  }

  if (entry.entryType === "REFUND_CREDIT") {
    return "walletPage.activityStatus.refunded";
  }

  return "walletPage.activityStatus.completed";
}

function WalletSummaryCard({
  summary,
  currencyLabel,
  title,
  locale,
}: {
  summary: CustomerWalletSummaryItem;
  currencyLabel: string;
  title: string;
  locale: string;
}) {
  const t = useTranslations("payments");
  const available = formatPatientMoney(locale, summary.availableBalance, summary.currencyCode, {
    fallbackText: "?",
  });
  const reserved = formatPatientMoney(locale, summary.reservedBalance, summary.currencyCode, {
    fallbackText: "?",
  });
  const lastActivity = summary.lastEntryAt ? formatDate(summary.lastEntryAt, locale) : null;

  return (
    <article className="relative flex min-h-[250px] flex-col justify-between overflow-hidden rounded-[32px] border border-border-light bg-white p-7 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <span className="inline-flex rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-secondary dark:bg-white/8 dark:text-white/70">
            {currencyLabel}
          </span>
          <div>
            <p className="text-sm font-medium text-text-secondary">{title}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-text-primary dark:text-white/95 sm:text-[2.3rem]">
              {available}
            </p>
          </div>
        </div>

        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
          <Wallet className="h-6 w-6" />
        </span>
      </div>

      <div className="mt-6 border-t border-border-light pt-4 dark:border-white/10">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-text-secondary">{t("walletPage.balanceReserved")}</span>
          <span className="font-semibold tabular-nums text-text-primary dark:text-white/90">
            {reserved}
          </span>
        </div>
        {lastActivity ? (
          <p className="mt-3 text-xs text-text-muted">
            {t("walletPage.balanceLastActivity")} {lastActivity}
          </p>
        ) : (
          <p className="mt-3 text-xs text-text-muted">{t("walletPage.balanceNoActivity")}</p>
        )}
      </div>
    </article>
  );
}

function WalletProfileCard({
  displayName,
  email,
  avatarUrl,
  activeSummary,
  locale,
}: {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  activeSummary: CustomerWalletSummaryItem | null;
  locale: string;
}) {
  const t = useTranslations("payments");
  const currencyLabel =
    activeSummary?.currencyCode === "USD"
      ? t("walletPage.currencyLabels.international")
      : t("walletPage.currencyLabels.local");
  const available = activeSummary
    ? formatPatientMoney(locale, activeSummary.availableBalance, activeSummary.currencyCode, {
        fallbackText: "?",
      })
    : null;
  const reserved = activeSummary
    ? formatPatientMoney(locale, activeSummary.reservedBalance, activeSummary.currencyCode, {
        fallbackText: "?",
      })
    : null;

  return (
    <aside className="rounded-[32px] border border-border-light bg-white p-7 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary dark:bg-primary/15 dark:text-primary-light">
          {t("walletPage.profileCard.badge")}
        </span>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-tertiary text-text-muted dark:bg-white/8 dark:text-white/70">
          <UserRound className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-8 flex flex-col items-center text-center">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-24 w-24 rounded-full object-cover ring-4 ring-primary-light/40 dark:ring-primary/15"
          />
        ) : (
          <AvatarText name={displayName} className="h-24 w-24 text-xl" />
        )}

        <p className="mt-5 text-xl font-semibold text-text-primary dark:text-white/95">{displayName}</p>
        {email ? <p className="mt-1 text-sm text-text-secondary">{email}</p> : null}

        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-surface-tertiary px-4 py-2 text-xs font-medium text-text-secondary dark:bg-white/8 dark:text-white/75">
          <span>{t("walletPage.profileCard.walletLabel")}</span>
          <span className="text-text-primary dark:text-white/90">•</span>
          <span>{currencyLabel}</span>
        </div>
      </div>

      <div className="mt-7 space-y-3 rounded-[26px] border border-border-light bg-surface-tertiary/45 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-text-secondary">{t("walletPage.profileCard.availableLabel")}</span>
          <span className="text-sm font-semibold tabular-nums text-text-primary dark:text-white/90">
            {available ?? "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-text-secondary">{t("walletPage.profileCard.reservedLabel")}</span>
          <span className="text-sm font-semibold tabular-nums text-text-primary dark:text-white/90">
            {reserved ?? "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-text-secondary">{t("walletPage.profileCard.lastActivityLabel")}</span>
          <span className="text-sm font-medium text-text-primary dark:text-white/90">
            {activeSummary?.lastEntryAt ? formatDate(activeSummary.lastEntryAt, locale) : "—"}
          </span>
        </div>
      </div>
    </aside>
  );
}

function WalletActivityRow({ entry }: { entry: CustomerWalletEntryItem }) {
  const t = useTranslations("payments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const isCredit = entry.direction === "CREDIT";

  return (
    <tr className="border-t border-border-light/80 transition-colors hover:bg-surface-tertiary/40 dark:border-white/10 dark:hover:bg-white/5">
      <td className="px-4 py-4">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              isCredit
                ? "bg-primary-light text-text-brand dark:bg-primary/20 dark:text-primary-light"
                : "bg-error-light text-error dark:bg-error/15 dark:text-error"
            }`}
          >
            {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
              {t(`history.wallet.entries.type.${entry.entryType}` as Parameters<typeof t>[0])}
            </p>
            {entry.description ? (
              <p className="mt-1 line-clamp-1 text-xs text-text-secondary">{entry.description}</p>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-text-secondary">
        {formatDate(entry.effectiveAt, numLocale)}
      </td>
      <td
        className={`px-4 py-4 text-sm font-semibold tabular-nums ${
          isCredit ? "text-text-brand" : "text-error"
        }`}
      >
        {isCredit ? "+" : "-"}
        {formatPatientMoney(numLocale, entry.amount, entry.currencyCode, {
          fallbackText: "?",
        })}
      </td>
      <td className="px-4 py-4">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
            entry.entryType === "SESSION_PAYMENT_RESERVE"
              ? "bg-warning-light text-warning"
              : entry.entryType === "REFUND_CREDIT"
                ? "bg-success-light text-success"
                : "bg-primary-light text-text-brand"
          }`}
        >
          {t(resolveWalletEntryStatusKey(entry) as Parameters<typeof t>[0])}
        </span>
      </td>
    </tr>
  );
}

export default function PatientWalletScreen() {
  const t = useTranslations("payments");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const {
    data: currentUserData,
    isLoading: currentUserLoading,
  } = useCurrentUser();

  const {
    data: patientProfileData,
    isLoading: patientProfileLoading,
  } = usePatientProfile();

  const {
    data: egpWalletSummaryData,
    isLoading: egpWalletSummaryLoading,
    isError: egpWalletSummaryError,
    refetch: refetchEgpWalletSummary,
  } = usePatientWalletSummary("EGP");

  const {
    data: usdWalletSummaryData,
    isLoading: usdWalletSummaryLoading,
    isError: usdWalletSummaryError,
    refetch: refetchUsdWalletSummary,
  } = usePatientWalletSummary("USD");

  const {
    data: walletEntriesData,
    isLoading: walletEntriesLoading,
    isError: walletEntriesError,
    refetch: refetchWalletEntries,
  } = usePatientWalletEntries({
    page: 1,
    limit: 10,
  });

  const displayName =
    patientProfileData?.profile.displayName?.trim() ||
    currentUserData?.displayName?.trim() ||
    currentUserData?.identitySummary.primaryEmailMasked ||
    currentUserData?.identitySummary.primaryEmail ||
    t("walletPage.profileCard.fallbackName");

  const email =
    currentUserData?.identitySummary.primaryEmailMasked ||
    currentUserData?.identitySummary.primaryEmail ||
    "";

  const avatarUrl =
    patientProfileData?.profile.avatarDataUrl ??
    patientProfileData?.profile.avatarUrl ??
    currentUserData?.avatarDataUrl ??
    currentUserData?.avatarUrl ??
    null;

  const walletSummaries = [
    {
      currencyCode: "EGP",
      currencyLabel: t("walletPage.currencyLabels.local"),
      title: t("walletPage.balanceTitle"),
      summary: egpWalletSummaryData?.item ?? null,
    },
    {
      currencyCode: "USD",
      currencyLabel: t("walletPage.currencyLabels.international"),
      title: t("walletPage.balanceTitle"),
      summary: usdWalletSummaryData?.item ?? null,
    },
  ].filter((item) => item.summary);

  const activeSummary = walletSummaries[0]?.summary ?? null;
  const entries = walletEntriesData?.items ?? [];
  const topError = !walletSummaries.length && (egpWalletSummaryError || usdWalletSummaryError);
  const pageLoading =
    currentUserLoading || patientProfileLoading || egpWalletSummaryLoading || usdWalletSummaryLoading;

  if (pageLoading) {
    return (
      <div className="space-y-8">
        <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3 text-right">
            <div className="h-4 w-28 rounded-full bg-surface-tertiary" />
            <div className="h-10 w-72 rounded-2xl bg-surface-tertiary" />
            <div className="h-4 w-full max-w-2xl rounded-full bg-surface-tertiary" />
          </div>
          <div className="h-12 w-44 rounded-2xl bg-surface-tertiary" />
        </section>

        <div className="flex flex-col gap-6 xl:flex-row">
          <div className="h-[372px] rounded-[32px] border border-border-light bg-white/70 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary xl:w-[300px] xl:shrink-0" />
          <div className="min-w-0 flex-1 space-y-6">
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="h-[250px] rounded-[32px] border border-border-light bg-white/70 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary" />
              <div className="h-[250px] rounded-[32px] border border-border-light bg-white/70 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary" />
            </div>
            <div className="h-[360px] rounded-[32px] border border-border-light bg-white/70 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl text-right">
          <p className="text-sm font-medium text-primary">{t("walletPage.eyebrow")}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary dark:text-white/95 md:text-4xl">
            {t("walletPage.heading")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">{t("walletPage.note")}</p>
        </div>

        <Link
          href="/patient/payments"
          className="inline-flex w-fit items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
        >
          <ArrowLeft className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0 rtl:rotate-180" />
          {t("walletPage.actions.payments")}
        </Link>
      </section>

      {pageLoading ? (
        <ListStateSkeleton items={1} heightClass="h-60" />
      ) : topError ? (
        <StateCard
          icon={<Wallet className="h-6 w-6 text-primary" />}
          title={t("walletPage.states.error.heading")}
          note={t("walletPage.states.error.note")}
          action={{
            label: t("walletPage.states.error.retry"),
            onClick: () => {
              void refetchEgpWalletSummary();
              void refetchUsdWalletSummary();
            },
          }}
          className="rounded-[28px]"
        />
      ) : null}

      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="xl:w-[300px] xl:shrink-0">
          <WalletProfileCard
            displayName={displayName}
            email={email}
            avatarUrl={avatarUrl}
            activeSummary={activeSummary}
            locale={numLocale}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-6">
          {walletSummaries.length > 0 ? (
            <div className={`grid gap-4 ${walletSummaries.length > 1 ? "xl:grid-cols-2" : ""}`}>
              {walletSummaries.map((item) => (
                <WalletSummaryCard
                  key={item.currencyCode}
                  summary={item.summary as CustomerWalletSummaryItem}
                  currencyLabel={item.currencyLabel}
                  title={item.title}
                  locale={numLocale}
                />
              ))}
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

          <section className="rounded-[32px] border border-border-light bg-white p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
                  {t("walletPage.activityHeading")}
                </h2>
                <p className="mt-1 text-sm leading-6 text-text-secondary">{t("walletPage.activityNote")}</p>
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
              <div className="mt-4">
                <ListStateSkeleton items={3} heightClass="h-16" />
              </div>
            ) : entries.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-[24px] border border-border-light">
                <table className="min-w-full divide-y divide-border-light text-right">
                  <thead className="bg-surface-tertiary dark:bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                        {t("walletPage.activityColumns.type")}
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                        {t("walletPage.activityColumns.date")}
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                        {t("walletPage.activityColumns.amount")}
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                        {t("walletPage.activityColumns.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light bg-white dark:divide-white/8 dark:bg-surface-secondary">
                    {entries.map((entry) => (
                      <WalletActivityRow key={entry.id} entry={entry} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <StateCard
                icon={<ArrowDownLeft className="h-6 w-6 text-primary" />}
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
                className="mt-4 rounded-[28px]"
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
