"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import {
  SurfaceActionLink,
} from "@/components/shared/SurfaceShell";
import AdminOperationalListShell from "@/components/shared/admin/AdminOperationalListShell";
import { Link, useRouter } from "@/i18n/navigation";
import { formatSettlementDateTime, formatSettlementMoney } from "@/features/admin/finance/lib/finance-formatters";
import { cleanPersonName, formatPersonDisplayName, shortId } from "@/lib/person-name-cleaner";
import type { PayoutMethod } from "@/features/admin/finance/types/payout-method";
import DateField from "@/components/form/input/DateField";
import { useAdminPractitionerTransfers } from "../hooks/use-admin-practitioner-payouts";
import type { AdminPractitionerTransferItem } from "../api/admin-practitioner-transfers.api";

const PAGE_SIZE = DEFAULT_PAGE_LIMIT;

export default function AdminPractitionerPayoutHistoryScreen() {
  const t = useTranslations("admin-practitioner-payouts");
  const locale = useLocale();
  const router = useRouter();

  const [currencyFilter, setCurrencyFilter] = useState("");
  const [practitionerFilter, setPractitionerFilter] = useState("");
  const [payoutMethodFilter, setPayoutMethodFilter] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_LIMIT);
  const [selectedPayout, setSelectedPayout] = useState<AdminPractitionerTransferItem | null>(null);
  const deferredPractitioner = useDeferredValue(practitionerFilter);
  const deferredCurrency = useDeferredValue(currencyFilter);
  const deferredMethod = useDeferredValue(payoutMethodFilter);

  const transfersQuery = useAdminPractitionerTransfers({
    page,
    limit,
    currency: deferredCurrency || undefined,
    practitionerId: deferredPractitioner.trim() || undefined,
    payoutMethod: deferredMethod ? (deferredMethod as PayoutMethod) : undefined,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
  });

  const items = transfersQuery.data?.items ?? [];
  const pagination = transfersQuery.data?.pagination;
  const summary = transfersQuery.data?.summary;

  const formatRecordedAmount = (amount: string | null | undefined, currency: string | null | undefined) => {
    if (!amount || !currency) {
      return t("unavailable");
    }

    return formatSettlementMoney(locale, amount, currency);
  };

  const activeFilterChips = [
    currencyFilter
      ? { id: "currency", label: t(`currencies.${currencyFilter}` as Parameters<typeof t>[0]) }
      : null,
    practitionerFilter ? { id: "practitioner", label: practitionerFilter } : null,
    payoutMethodFilter
      ? { id: "method", label: t(`paymentMethods.${payoutMethodFilter}` as Parameters<typeof t>[0]) }
      : null,
    createdFrom ? { id: "from", label: `${t("history.filters.from")}: ${createdFrom}` } : null,
    createdTo ? { id: "to", label: `${t("history.filters.to")}: ${createdTo}` } : null,
  ].filter(Boolean) as Array<{ id: string; label: string }>;

  const columns = useMemo<ColumnDef<AdminPractitionerTransferItem>[]>(() => [
    {
      id: "practitioner",
      header: t("history.columns.practitioner"),
      cell: (item) => {
        const isAr = locale.startsWith("ar");
        const name = formatPersonDisplayName(item.practitionerDisplayName, item.practitionerId, isAr ? "الممارس" : "Practitioner");
        return (
          <div className="space-y-0.5 min-w-0 max-w-[200px]">
            <Link
              href={`/admin/practitioner-payouts/${item.practitionerId}`}
              className="block truncate font-bold text-xs text-text-primary transition hover:text-primary dark:text-white/95"
            >
              {name}
            </Link>
            <span className="block truncate font-mono text-[9px] text-text-muted/75 dark:text-slate-500" dir="ltr">
              {shortId(item.practitionerId, 8, 4)}
            </span>
          </div>
        );
      },
    },
    {
      id: "settlementReference",
      header: t("history.columns.settlementReference" as Parameters<typeof t>[0]),
      cell: (item) => (
        item.settlementId ? (
          <Link
            href={`/admin/settlements/${item.settlementId}`}
            className="font-mono text-xs text-primary hover:underline"
            dir="ltr"
          >
            {shortId(item.settlementId, 8, 4)}
          </Link>
        ) : "-"
      ),
    },
    {
      id: "amount",
      header: t("history.columns.amount"),
      cell: (item) => (
        <span className="font-semibold text-text-primary dark:text-white/95">
          {formatSettlementMoney(locale, item.amountPaid, item.currency)}
        </span>
      ),
    },
    {
      id: "currency",
      header: t("history.columns.currency"),
      cell: (item) => t(`currencies.${item.currency}` as Parameters<typeof t>[0]),
    },
    {
      id: "transferMethod",
      header: t("history.columns.transferMethod" as Parameters<typeof t>[0]),
      cell: (item) => t(`paymentMethods.${item.payoutMethod}` as Parameters<typeof t>[0]),
    },
    {
      id: "externalReference",
      header: t("history.columns.externalReference" as Parameters<typeof t>[0]),
      cell: (item) =>
        item.externalReference ? (
          <span className="font-mono text-xs font-semibold text-text-primary dark:text-white/90" dir="ltr">
            {shortId(item.externalReference, 14, 4)}
          </span>
        ) : (
          "-"
        ),
    },
    {
      id: "recordedBy",
      header: t("history.columns.recordedBy"),
      cell: (item) => {
        const isAr = locale.startsWith("ar");
        const recorderName = cleanPersonName(item.processedByDisplayName) || (item.processedByDisplayName && !item.processedByDisplayName.includes("-") ? item.processedByDisplayName : (isAr ? "المحاسب" : "Accountant"));
        return (
          <span className="font-medium text-xs text-text-primary dark:text-white/95 truncate">
            {recorderName}
          </span>
        );
      },
    },
    {
      id: "paidAt",
      header: t("history.columns.paidAt"),
      cell: (item) => formatSettlementDateTime(locale, item.payoutDate),
    },
    {
      id: "status",
      header: t("history.columns.status" as Parameters<typeof t>[0]),
      cell: (item) => (
        <span className="inline-flex items-center rounded-full bg-success-light/20 px-2.5 py-0.5 text-xs font-medium text-success dark:bg-success/10">
          {item.status ? t(`statuses.${item.status}` as Parameters<typeof t>[0]) : "-"}
        </span>
      ),
    },
  ], [locale, t]);

  const selectedPayoutMapped = useMemo(() => {
    if (!selectedPayout) return null;
    return {
      id: selectedPayout.id,
      practitionerId: selectedPayout.practitionerId,
      practitionerName: selectedPayout.practitionerDisplayName,
      currencyCode: selectedPayout.currency,
      amountPaid: selectedPayout.amountPaid,
      normalSessionAppliedAmount: "0",
      packageReleasedAppliedAmount: "0",
      packageHeldAmountSnapshot: "0",
      totalPayableSnapshot: "0",
      payoutMethod: selectedPayout.payoutMethod,
      transferReference: selectedPayout.externalReference,
      paidAt: selectedPayout.payoutDate,
      notes: selectedPayout.notes,
      recordedByUserId: selectedPayout.processedByUserId,
      recordedByDisplayName: selectedPayout.processedByDisplayName,
      createdAt: selectedPayout.createdAt,
      updatedAt: selectedPayout.createdAt,
      settlementId: selectedPayout.settlementId,
      proof: selectedPayout.proof,
      status: selectedPayout.status,
    };
  }, [selectedPayout]);

  return (
    <>
      <AdminOperationalListShell
        headerVariant="financial"
        eyebrow={t("history.eyebrow")}
        title={t("history.title")}
        description={t("history.description")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SurfaceActionLink href="/admin/practitioner-payouts" variant="primary">
              {t("history.backToList")}
            </SurfaceActionLink>
            <SurfaceActionLink href="/admin/finance/accounting/reconciliation">
              {t("history.actions.reconciliation")}
            </SurfaceActionLink>
          </div>
        }

        filters={
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("history.filters.practitionerLabel")}
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    value={practitionerFilter}
                    onChange={(event) => {
                      setPractitionerFilter(event.target.value);
                      setPage(1);
                    }}
                    placeholder={t("history.filters.practitionerPlaceholder")}
                    className="app-control w-full py-3 ps-11 pe-4"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("history.filters.currencyLabel")}
                </span>
                <select
                  value={currencyFilter}
                  onChange={(event) => {
                    setCurrencyFilter(event.target.value);
                    setPage(1);
                  }}
                  className="app-control w-full px-4 py-3"
                >
                  <option value="">{t("history.filters.allCurrencies")}</option>
                  <option value="EGP">{t("currencies.EGP")}</option>
                  <option value="USD">{t("currencies.USD")}</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("history.filters.methodLabel")}
                </span>
                <select
                  value={payoutMethodFilter}
                  onChange={(event) => {
                    setPayoutMethodFilter(event.target.value);
                    setPage(1);
                  }}
                  className="app-control w-full px-4 py-3"
                >
                  <option value="">{t("history.filters.allMethods")}</option>
                  <option value="MANUAL_BANK_TRANSFER">{t("paymentMethods.MANUAL_BANK_TRANSFER")}</option>
                  <option value="WALLET_TRANSFER">{t("paymentMethods.WALLET_TRANSFER")}</option>
                  <option value="CASH">{t("paymentMethods.CASH")}</option>
                  <option value="OTHER">{t("paymentMethods.OTHER")}</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <DateField
                  label={t("history.filters.from")}
                  placeholder={locale === "ar" ? "من تاريخ" : "From"}
                  value={createdFrom}
                  onChange={(val) => {
                    setCreatedFrom(val);
                    setPage(1);
                  }}
                />
                <DateField
                  label={t("history.filters.to")}
                  placeholder={locale === "ar" ? "إلى تاريخ" : "To"}
                  value={createdTo}
                  onChange={(val) => {
                    setCreatedTo(val);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeFilterChips.map((chip) => (
                <span
                  key={chip.id}
                  className="inline-flex items-center rounded-full border border-primary/15 bg-primary-light/20 px-3 py-1 text-xs font-semibold text-primary dark:border-primary/20 dark:bg-primary/10"
                >
                  {chip.label}
                </span>
              ))}
              {activeFilterChips.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setCurrencyFilter("");
                    setPractitionerFilter("");
                    setPayoutMethodFilter("");
                    setCreatedFrom("");
                    setCreatedTo("");
                    setPage(1);
                  }}
                  className="rounded-full border border-border-light px-3 py-2 text-xs font-semibold text-text-secondary transition hover:bg-surface-tertiary dark:bg-white/5"
                >
                  {t("history.filters.clear")}
                </button>
              ) : null}
            </div>
          </div>
        }
      >
        <DataTable
          data={items}
          columns={columns}
          getRowId={(row) => row.id}
          loading={transfersQuery.isLoading}
          error={transfersQuery.error}
          loadingRows={PAGE_SIZE}
          errorState={{
            title: t("history.errorTitle"),
            description: t("history.errorDescription"),
            action: {
              label: t("history.errorRetry"),
              onClick: () => transfersQuery.refetch(),
            },
          }}
          emptyState={{
            title: t("history.emptyTitle"),
            description: t("history.emptyDescription"),
          }}
          pagination={
            pagination
              ? {
                  page: pagination.page,
                  limit: pagination.limit,
                  totalItems: pagination.totalItems,
                  totalPages: pagination.totalPages,
                }
              : undefined
          }
          onPageChange={(nextPage) => setPage(nextPage)}
          onPageSizeChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
          pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
          onRowClick={(item) => router.push(`/admin/practitioner-payouts/history/${item.id}` as never)}
          rowActions={(item) => (
            <Link
              href={`/admin/practitioner-payouts/history/${item.id}`}
              className="inline-flex items-center justify-center rounded-xl border border-border-light bg-white px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/30 hover:bg-brand-25 dark:bg-surface-secondary dark:text-white dark:hover:bg-surface-tertiary"
            >
              {t("history.actions.viewDetails")}
            </Link>
          )}
          rowActionsHeader={t("history.columns.actions")}
          ariaLabel={t("history.title")}
          caption={t("history.description")}
        />
      </AdminOperationalListShell>
    </>
  );
}
