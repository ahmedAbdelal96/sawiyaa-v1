"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { BadgeDollarSign, CheckCircle2, Clock3, FileSearch, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import Button from "@/components/ui/button/Button";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import {
  ADMIN_PACKAGE_SETTLEMENT_STATUS_STYLES,
  canReleasePackageSettlement,
  canReviewPackageSettlement,
  getAdminPackageSettlementErrorKey,
} from "../lib/admin-package-settlement-status";
import { formatSettlementDateTime, formatSettlementMoney } from "@/features/admin/finance/lib/finance-formatters";
import {
  useAdminPackageSettlements,
  useReleaseAdminPackageSettlement,
} from "../hooks/use-admin-package-settlements";
import type {
  AdminPackageSettlementDetail,
  AdminPackageSettlementListItem,
  ListAdminPackageSettlementsParams,
  PackageSettlementStatus,
} from "../types/admin-package-settlements.types";
import AdminPackageSettlementReleaseModal from "./AdminPackageSettlementReleaseModal";

type CurrencyFilter = "all" | string;

type Feedback = {
  tone: "success" | "warning" | "error";
  message: string;
};

function shortId(value: string | null) {
  if (!value) return "-";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function PackageSettlementStatusChip({
  status,
  t,
}: {
  status: PackageSettlementStatus;
  t: ReturnType<typeof useTranslations>;
}) {
  const className =
    ADMIN_PACKAGE_SETTLEMENT_STATUS_STYLES[status] ??
    "bg-surface-tertiary text-text-secondary dark:bg-white/8 dark:text-white/70";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {t(`statuses.${status}` as Parameters<typeof t>[0])}
    </span>
  );
}

function PackageSettlementRowActionsMenu({
  item,
  onViewDetails,
  onRelease,
  onReview,
  t,
}: {
  item: AdminPackageSettlementListItem;
  onViewDetails: () => void;
  onRelease: () => void;
  onReview: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [open, setOpen] = useState(false);
  const canRelease = canReleasePackageSettlement(item.status);
  const canReview = canReviewPackageSettlement(item.status);

  return (
    <div className="relative flex justify-end">
      <Button
        size="sm"
        variant="outline"
        endIcon={<MoreHorizontal className="h-4 w-4" />}
        onClick={() => setOpen((value) => !value)}
        className="min-w-28"
      >
        {t("table.actions")}
      </Button>
      <Dropdown isOpen={open} onClose={() => setOpen(false)} className="w-56 overflow-hidden">
        <div className="py-2">
          <DropdownItem
            tag="button"
            onClick={onViewDetails}
            onItemClick={() => setOpen(false)}
            baseClassName="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-text-primary transition hover:bg-surface-tertiary dark:text-white/85 dark:hover:bg-white/6"
          >
            {t("actions.viewDetails")}
          </DropdownItem>
          {canRelease ? (
            <DropdownItem
              tag="button"
              onClick={onRelease}
              onItemClick={() => setOpen(false)}
              baseClassName="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-text-primary transition hover:bg-surface-tertiary dark:text-white/85 dark:hover:bg-white/6"
            >
              {t("actions.release")}
            </DropdownItem>
          ) : null}
          {canReview ? (
            <DropdownItem
              tag="button"
              onClick={onReview}
              onItemClick={() => setOpen(false)}
              baseClassName="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-text-primary transition hover:bg-surface-tertiary dark:text-white/85 dark:hover:bg-white/6"
            >
              {t("actions.review")}
            </DropdownItem>
          ) : null}
        </div>
      </Dropdown>
    </div>
  );
}

export default function AdminPackageSettlementsScreen() {
  const t = useTranslations("admin-package-settlements");
  const tNav = useTranslations("navigation");
  const locale = useLocale();
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_LIMIT);
  const [status, setStatus] = useState<PackageSettlementStatus | "ALL">("ALL");
  const [currency, setCurrency] = useState<CurrencyFilter>("all");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [selectedSettlement, setSelectedSettlement] =
    useState<AdminPackageSettlementDetail | null>(null);
  const [isReleaseOpen, setIsReleaseOpen] = useState(false);

  const listParams = useMemo<ListAdminPackageSettlementsParams>(() => {
    const next: ListAdminPackageSettlementsParams = { page, limit };
    if (status !== "ALL") next.status = status;
    if (currency !== "all") next.currencyCode = currency;
    return next;
  }, [currency, limit, page, status]);

  const summaryParams = useMemo<ListAdminPackageSettlementsParams>(() => {
    const next: ListAdminPackageSettlementsParams = { page: 1, limit: 1 };
    if (currency !== "all") next.currencyCode = currency;
    return next;
  }, [currency]);

  const listQuery = useAdminPackageSettlements(listParams);
  const heldQuery = useAdminPackageSettlements({ ...summaryParams, status: "HELD" });
  const readyQuery = useAdminPackageSettlements({
    ...summaryParams,
    status: "READY_TO_RELEASE",
  });
  const reviewQuery = useAdminPackageSettlements({
    ...summaryParams,
    status: "NEEDS_REVIEW",
  });
  const releasedQuery = useAdminPackageSettlements({
    ...summaryParams,
    status: "RELEASED",
  });

  const releaseMutation = useReleaseAdminPackageSettlement();
  const rows = useMemo(() => listQuery.data?.items ?? [], [listQuery.data]);

  const currencies = useMemo(() => {
    const values = new Set<string>();
    rows.forEach((row) => values.add(row.currency));
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const summary = {
    held: heldQuery.data?.pagination.totalItems ?? null,
    ready: readyQuery.data?.pagination.totalItems ?? null,
    review: reviewQuery.data?.pagination.totalItems ?? null,
    released: releasedQuery.data?.pagination.totalItems ?? null,
  };

  const handleOpenRelease = (item: AdminPackageSettlementDetail) => {
    setFeedback(null);
    setSelectedSettlement(item);
    setIsReleaseOpen(true);
  };

  const handleConfirmRelease = async () => {
    if (!selectedSettlement) return;
    setFeedback(null);

    try {
      const result = await releaseMutation.mutateAsync(selectedSettlement.id);
      setIsReleaseOpen(false);

      if (result.item.status === "NEEDS_REVIEW") {
        setFeedback({
          tone: "warning",
          message: t("errors.needsReview"),
        });
        toast.warning(t("errors.needsReview"));
      } else {
        setFeedback({
          tone: "success",
          message: t("modal.success"),
        });
        toast.success(t("modal.success"));
      }
    } catch (error) {
      const messageKey = getAdminPackageSettlementErrorKey(error);
      const safeMessage = t(messageKey as Parameters<typeof t>[0]);
      setFeedback({ tone: "error", message: safeMessage });
      toast.error(safeMessage);
    }
  };

  const columns = useMemo<ColumnDef<AdminPackageSettlementListItem>[]>(
    () => [
      {
        id: "practitioner",
        header: t("table.practitioner"),
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
              {row.practitionerDisplayName ?? row.practitionerSlug ?? shortId(row.practitionerId)}
            </p>
            <p className="mt-1 truncate text-xs text-text-muted">
              {row.practitionerSlug ?? shortId(row.practitionerId)}
              {row.packagePlanTitle ? ` - ${row.packagePlanTitle}` : ""}
            </p>
          </div>
        ),
      },
      {
        id: "patient",
        header: t("table.patient"),
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
              {row.patientDisplayName ?? shortId(row.patientId)}
            </p>
            <p className="mt-1 truncate text-xs text-text-muted">
              {t("table.purchaseRef")}: {shortId(row.purchaseId)}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        header: t("table.status"),
        cell: (row) => <PackageSettlementStatusChip status={row.status} t={t} />,
      },
      {
        id: "currency",
        header: t("table.currency"),
        accessor: (row) => row.currency,
        hideBelow: "md",
      },
      {
        id: "heldPractitionerAmount",
        header: t("table.heldPractitionerAmount"),
        cell: (row) => (
          <span className="text-sm font-semibold text-text-primary dark:text-white/95">
            {formatSettlementMoney(locale, row.heldPractitionerAmount, row.currency)}
          </span>
        ),
        hideBelow: "lg",
      },
      {
        id: "releasablePractitionerAmount",
        header: t("table.releasablePractitionerAmount"),
        cell: (row) => (
          <span className="text-sm font-semibold text-text-primary dark:text-white/95">
            {formatSettlementMoney(locale, row.releasablePractitionerAmount, row.currency)}
          </span>
        ),
        hideBelow: "xl",
      },
      {
        id: "releasedPractitionerAmount",
        header: t("table.releasedPractitionerAmount"),
        cell: (row) => (
          <span className="text-sm font-semibold text-text-primary dark:text-white/95">
            {formatSettlementMoney(locale, row.releasedPractitionerAmount, row.currency)}
          </span>
        ),
        hideBelow: "xl",
      },
      {
        id: "sessions",
        header: t("table.sessions"),
        cell: (row) => (
          <span className="text-sm text-text-secondary">
            {t("table.sessionsValue", {
              completed: row.completedSessionsCount,
              total: row.sessionCount,
            })}
          </span>
        ),
      },
      {
        id: "updatedAt",
        header: t("table.updatedAt"),
        cell: (row) => (
          <span className="text-sm text-text-secondary">
            {formatSettlementDateTime(locale, row.updatedAt)}
          </span>
        ),
        hideBelow: "xl",
      },
    ],
    [locale, t],
  );

  return (
    <>
      <AdminOperationalListShell
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("note")}
        summaryCards={
          <>
            <AdminSummaryCard
              label={t("summary.held")}
              value={heldQuery.isLoading ? "..." : String(summary.held ?? 0)}
              tone="warning"
              icon={<Clock3 className="h-4 w-4" />}
            />
            <AdminSummaryCard
              label={t("summary.ready")}
              value={readyQuery.isLoading ? "..." : String(summary.ready ?? 0)}
              tone="success"
              icon={<BadgeDollarSign className="h-4 w-4" />}
            />
            <AdminSummaryCard
              label={t("summary.review")}
              value={reviewQuery.isLoading ? "..." : String(summary.review ?? 0)}
              tone="warning"
              icon={<FileSearch className="h-4 w-4" />}
            />
            <AdminSummaryCard
              label={t("summary.released")}
              value={releasedQuery.isLoading ? "..." : String(summary.released ?? 0)}
              tone="primary"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
          </>
        }
        filters={
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("filters.status")}
              </span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as PackageSettlementStatus | "ALL");
                  setPage(1);
                }}
                className="app-control w-full py-3"
              >
                <option value="ALL">{t("filters.allStatuses")}</option>
                {(
                  [
                    "HELD",
                    "READY_TO_RELEASE",
                    "PARTIALLY_RELEASED",
                    "RELEASED",
                    "NEEDS_REVIEW",
                    "REFUNDED_OR_ADJUSTED",
                  ] as const
                ).map((value) => (
                  <option key={value} value={value}>
                    {t(`statuses.${value}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("filters.currency")}
              </span>
              <select
                value={currency}
                onChange={(event) => {
                  setCurrency(event.target.value as CurrencyFilter);
                  setPage(1);
                }}
                className="app-control w-full py-3"
              >
                <option value="all">{t("filters.allCurrencies")}</option>
                {currencies.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end justify-end lg:col-span-2">
              <Button
                type="button"
                variant="outline"
                startIcon={<FileSearch className="h-4 w-4" />}
                onClick={() => {
                  setStatus("ALL");
                  setCurrency("all");
                  setPage(1);
                }}
                disabled={listQuery.isLoading}
              >
                {t("filters.clear")}
              </Button>
            </div>
          </div>
        }
      >
        {feedback ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              feedback.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/30 dark:bg-emerald-900/10 dark:text-emerald-300"
                : feedback.tone === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/10 dark:text-red-300"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          loading={listQuery.isLoading}
          error={listQuery.isError ? t("states.listError") : null}
          errorState={{
            title: t("states.listError"),
            description: t("states.listError"),
            action: {
              label: t("states.retry"),
              onClick: () => listQuery.refetch(),
            },
          }}
          rowActionsHeader={t("table.actions")}
          rowActions={(row) => (
            <PackageSettlementRowActionsMenu
              item={row}
              t={t}
              onViewDetails={() => router.push(`/${locale}/admin/package-settlements/${row.id}`)}
              onRelease={() => handleOpenRelease(row)}
              onReview={() => router.push(`/${locale}/admin/package-settlements/${row.id}`)}
            />
          )}
          pagination={
            listQuery.data
              ? {
                  page: listQuery.data.pagination.page,
                  limit: listQuery.data.pagination.limit,
                  total: listQuery.data.pagination.totalItems,
                  totalPages: listQuery.data.pagination.totalPages,
                  hasPrevPage: listQuery.data.pagination.page > 1,
                  hasNextPage: listQuery.data.pagination.page < listQuery.data.pagination.totalPages,
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
            title: t("states.emptyTitle"),
            description: t("states.emptyNote"),
          }}
          ariaLabel={t("title")}
          caption={tNav("main.settlements")}
        />
      </AdminOperationalListShell>

      <AdminPackageSettlementReleaseModal
        isOpen={isReleaseOpen}
        onClose={() => setIsReleaseOpen(false)}
        settlement={selectedSettlement}
        loading={releaseMutation.isPending}
        onConfirm={handleConfirmRelease}
      />
    </>
  );
}
