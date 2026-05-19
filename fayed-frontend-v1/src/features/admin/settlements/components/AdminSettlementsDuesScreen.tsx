"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  BadgeCheck,
  BadgeDollarSign,
  FileText,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import DataTableActionButton from "@/components/ui/data-table/DataTableActionButton";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { formatSettlementMoney } from "../lib/settlement-formatters";
import { useAdminSettlementDuesDirectory } from "../hooks/use-admin-settlements";
import type {
  PractitionerPayoutDueSummary,
  SettlementDuesDirectoryItem,
  SettlementDuesFinanceFilter,
  SettlementDuesSortBy,
  SettlementDuesVerificationFilter,
} from "../types/admin-settlements.types";
import AdminPractitionerPayoutDrawer from "./AdminPractitionerPayoutDrawer";

type CurrencyFilter = "all" | string;

type DuesDirectoryRow = SettlementDuesDirectoryItem & {
  visibleSummaries: PractitionerPayoutDueSummary[];
};

const financeFilterLabelKey: Record<
  SettlementDuesFinanceFilter,
  "all" | "withDue" | "withBalance" | "empty"
> = {
  all: "all",
  with_due: "withDue",
  with_balance: "withBalance",
  empty: "empty",
};

export default function AdminSettlementsDuesScreen() {
  const t = useTranslations("admin-settlements");
  const locale = useLocale();
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_LIMIT);
  const [query, setQuery] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>("all");
  const [financeFilter, setFinanceFilter] = useState<SettlementDuesFinanceFilter>("all");
  const [verificationFilter, setVerificationFilter] =
    useState<SettlementDuesVerificationFilter>("all");
  const [sortBy, setSortBy] = useState<SettlementDuesSortBy>("due_desc");
  const [selectedPractitioner, setSelectedPractitioner] = useState<{
    id: string;
    slug: string;
    displayName: string | null;
    practitionerType: string;
    countryCode: string | null;
    isVerified: boolean;
  } | null>(null);

  const currencyCode = currencyFilter === "all" ? undefined : currencyFilter;
  const directoryQuery = useAdminSettlementDuesDirectory({
    page,
    limit,
    search: query.trim() || undefined,
    currencyCode,
    finance: financeFilter,
    verification: verificationFilter,
    sortBy,
  });

  const pagination = directoryQuery.data?.pagination;

  useEffect(() => {
    if (!pagination) return;
    if (page <= pagination.totalPages) return;
    queueMicrotask(() => setPage(1));
  }, [page, pagination?.totalPages]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo<DuesDirectoryRow[]>(() => {
    const items = directoryQuery.data?.items ?? [];
    return items.map((item) => {
      const visibleSummaries =
        currencyFilter === "all"
          ? item.summaries
          : item.summaries.filter((summary) => summary.currency === currencyFilter);
      return { ...item, visibleSummaries };
    });
  }, [currencyFilter, directoryQuery.data]);

  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    for (const row of directoryQuery.data?.items ?? []) {
      for (const summary of row.summaries) {
        currencies.add(summary.currency);
      }
    }
    return Array.from(currencies).sort((a, b) => a.localeCompare(b));
  }, [directoryQuery.data]);

  const stats = directoryQuery.data?.stats;
  const selectedCurrencyLabel =
    currencyFilter === "all" ? t("list.filters.allCurrencies") : currencyFilter;
  const activeFinanceLabel = t(
    `list.filters.financeOptions.${financeFilterLabelKey[financeFilter]}`,
  );
  const activeVerificationLabel = t(
    `list.filters.verificationOptions.${verificationFilter}`,
  );

  const columns = useMemo<ColumnDef<DuesDirectoryRow>[]>(
    () => [
      {
        id: "practitioner",
        header: t("list.columns.practitioner"),
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
              {row.practitioner.displayName ?? row.practitioner.slug}
            </p>
            <p className="mt-1 truncate text-xs text-text-muted">{row.practitioner.slug}</p>
          </div>
        ),
      },
      {
        id: "type",
        header: t("list.columns.type"),
        cell: (row) => (
          <span className="text-sm text-text-secondary">
            {row.practitioner.professionalTitle ?? t("list.noTitle")}
          </span>
        ),
        hideBelow: "lg",
      },
      {
        id: "country",
        header: t("list.columns.country"),
        cell: (row) => (
          <span className="text-sm text-text-secondary">
            {row.practitioner.countryCode ?? t("list.noCountry")}
          </span>
        ),
        hideBelow: "lg",
      },
      {
        id: "account",
        header: t("list.columns.account"),
        cell: (row) => {
          const summaries = row.visibleSummaries.filter((summary) => {
            const value = Number(summary.walletAvailableBalance ?? 0);
            return Number.isFinite(value) && value > 0;
          });

          return (
            <div className="space-y-2">
              {summaries.length ? (
                <div className="flex flex-wrap gap-2">
                  {summaries.map((summary) => (
                    <div
                      key={`${row.practitioner.id}-${summary.currency}-wallet`}
                      className="rounded-full border border-border-light bg-surface-secondary px-3 py-1 text-xs font-semibold text-text-secondary dark:border-white/8 dark:bg-white/5 dark:text-white/70"
                    >
                      {summary.currency}{" "}
                      {formatSettlementMoney(
                        locale,
                        summary.walletAvailableBalance ?? "0.00",
                        summary.currency,
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="inline-flex rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-muted">
                  {t("list.noBalance")}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "due",
        header: t("list.columns.due"),
        cell: (row) => {
          const summaries = row.visibleSummaries.filter((summary) => summary.dueCount > 0);

          return (
            <div className="space-y-2">
              {summaries.length ? (
                <div className="flex flex-wrap gap-2">
                  {summaries.map((summary) => (
                    <div
                      key={`${row.practitioner.id}-${summary.currency}-due`}
                      className="rounded-full border border-border-light bg-primary/8 px-3 py-1 text-xs font-semibold text-primary dark:border-white/8 dark:bg-primary/15 dark:text-primary-foreground"
                    >
                      {summary.currency}{" "}
                      {formatSettlementMoney(locale, summary.dueAmountNet, summary.currency)}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="inline-flex rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-muted">
                  {t("list.noDue")}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "status",
        header: t("list.columns.status"),
        cell: (row) => (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              row.practitioner.isVerified
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-surface-tertiary text-text-secondary dark:bg-white/8 dark:text-white/70"
            }`}
          >
            {row.practitioner.isVerified ? t("list.verified") : t("list.unverified")}
          </span>
        ),
        hideBelow: "md",
      },
    ],
    [locale, t],
  );

  return (
    <>
      <AdminOperationalListShell
        eyebrow={t("list.eyebrow")}
        title={t("list.title")}
        description={t("list.note")}
        summaryCards={
          <>
            <AdminSummaryCard
              label={t("list.metrics.due")}
              value={stats?.withDueCount ?? 0}
              hint={t("list.metrics.dueHint")}
              tone="primary"
              icon={<BadgeDollarSign className="h-4 w-4" />}
            />
            <AdminSummaryCard
              label={t("list.metrics.balance")}
              value={stats?.withBalanceCount ?? 0}
              hint={t("list.metrics.balanceHint")}
              tone="neutral"
              icon={<Wallet className="h-4 w-4" />}
            />
            <AdminSummaryCard
              label={t("list.metrics.verified")}
              value={stats?.verifiedCount ?? 0}
              hint={t("list.metrics.verifiedHint")}
              tone="success"
              icon={<BadgeCheck className="h-4 w-4" />}
            />
          </>
        }
        filters={
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("list.searchLabel")}
              </span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={t("list.searchPlaceholder")}
                className="app-control w-full py-3 px-4"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("list.filters.currency")}
              </span>
              <select
                value={currencyFilter}
                onChange={(event) => {
                  setCurrencyFilter(event.target.value);
                  setPage(1);
                }}
                className="app-control w-full py-3"
              >
                <option value="all">{t("list.filters.allCurrencies")}</option>
                {availableCurrencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("list.filters.finance")}
              </span>
              <select
                value={financeFilter}
                onChange={(event) => {
                  setFinanceFilter(event.target.value as SettlementDuesFinanceFilter);
                  setPage(1);
                }}
                className="app-control w-full py-3"
              >
                <option value="all">{t("list.filters.financeOptions.all")}</option>
                <option value="with_due">{t("list.filters.financeOptions.withDue")}</option>
                <option value="with_balance">{t("list.filters.financeOptions.withBalance")}</option>
                <option value="empty">{t("list.filters.financeOptions.empty")}</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("list.filters.verification")}
              </span>
              <select
                value={verificationFilter}
                onChange={(event) => {
                  setVerificationFilter(event.target.value as SettlementDuesVerificationFilter);
                  setPage(1);
                }}
                className="app-control w-full py-3"
              >
                <option value="all">{t("list.filters.verificationOptions.all")}</option>
                <option value="verified">{t("list.filters.verificationOptions.verified")}</option>
                <option value="unverified">{t("list.filters.verificationOptions.unverified")}</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("list.filters.sortBy")}
              </span>
              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value as SettlementDuesSortBy);
                  setPage(1);
                }}
                className="app-control w-full py-3"
              >
                <option value="due_desc">{t("list.filters.sortOptions.dueDesc")}</option>
                <option value="balance_desc">{t("list.filters.sortOptions.balanceDesc")}</option>
                <option value="name_asc">{t("list.filters.sortOptions.nameAsc")}</option>
              </select>
            </label>

            <div className="hidden xl:flex items-center justify-end gap-2 rounded-xl border border-border-light bg-surface-secondary/70 px-3 py-2 text-xs font-medium text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <span className="text-text-muted">
                {[selectedCurrencyLabel, activeFinanceLabel, activeVerificationLabel].join(" | ")}
              </span>
            </div>
          </div>
        }
      >
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.practitioner.id}
          loading={directoryQuery.isLoading}
          error={directoryQuery.isError ? t("list.errorNote") : null}
          errorState={{
            title: t("list.errorHeading"),
            description: t("list.errorNote"),
            action: {
              label: t("list.retry"),
              onClick: () => directoryQuery.refetch(),
            },
          }}
          rowActionsHeader={t("list.columns.action")}
          rowActions={(row) => (
            <div className="flex flex-col items-end gap-2">
              <DataTableActionButton
                intent="outline"
                icon={<FileText className="h-4 w-4" />}
                onClick={() =>
                  router.push(`/${locale}/admin/settlements/statement/${row.practitioner.id}`)
                }
                label={t("list.statementAction")}
              />
              <DataTableActionButton
                intent="primary"
                icon={<BadgeDollarSign className="h-4 w-4" />}
                onClick={() => setSelectedPractitioner(row.practitioner)}
                label={t("list.settleAction")}
              />
            </div>
          )}
          pagination={
            pagination
              ? {
                  page: pagination.page,
                  limit: pagination.limit,
                  total: pagination.totalItems,
                  totalPages: pagination.totalPages,
                  hasPrevPage: pagination.page > 1,
                  hasNextPage: pagination.page < pagination.totalPages,
                }
              : undefined
          }
          onPageChange={(nextPage) => setPage(nextPage)}
          onPageSizeChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
          pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
          emptyState={{
            icon: <BadgeDollarSign className="h-5 w-5 text-primary" />,
            title: t("list.emptyTitle"),
            description: t("list.emptyNote"),
          }}
          ariaLabel={t("list.tableTitle")}
          caption={t("list.tableTitle")}
        />
      </AdminOperationalListShell>

      <AdminPractitionerPayoutDrawer
        key={selectedPractitioner?.id ?? "closed"}
        isOpen={Boolean(selectedPractitioner)}
        practitioner={selectedPractitioner}
        onClose={() => setSelectedPractitioner(null)}
      />
    </>
  );
}
