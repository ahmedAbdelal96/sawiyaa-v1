"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CalendarDays, Clock, Package, Sparkles, Search } from "lucide-react";
import Badge from "@/components/ui/badge/Badge";
import Avatar from "@/components/ui/avatar/Avatar";
import { StateCard } from "@/components/shared/ContentStates";
import {
  SurfaceCard,
  SurfaceStatCard,
  SurfaceToolbar,
} from "@/components/shared/SurfaceShell";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import { toAppError, isUnauthorizedError } from "@/lib/api/errors";
import { useMyPackagePurchases } from "../hooks/use-package-purchases";
import PackagePurchasePaymentAction from "./PackagePurchasePaymentAction";
import {
  canContinuePackagePurchasePayment,
  formatDate,
  formatDatetime,
  formatPackageDisplayTitle,
  getNextUpcomingPackageSession,
  getPackagePurchaseStatusConfig,
} from "../lib/package-purchase-display";
import type { PatientPackagePurchaseItem } from "../types/package-purchases.types";
import { MoneyText } from "@/components/money/MoneyText";
import { mapPackagePurchaseSnapshotMoney } from "../lib/package-money";
import { DataTable } from "@/components/ui/data-table/DataTable";

export default function PatientPackagePurchasesPanel() {
  const t = useTranslations("package-purchases");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_LIMIT);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data, isLoading, isError, error, refetch } = useMyPackagePurchases({
    page,
    limit: pageSize,
    search: search.trim() || undefined,
    status: statusFilter || undefined,
  });

  const purchases = data?.items ?? [];
  const pagination = data?.pagination;

  const appError = isError ? toAppError(error) : null;
  const isAuthError = appError ? isUnauthorizedError(appError) : false;

  if (isError && isAuthError) {
    return (
      <StateCard
        title={t("errors.authHeading")}
        note={t("errors.authNote")}
        action={{
          label: t("errors.authAction"),
          href: (
            <Link
              href="/signin?mode=patient"
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              {t("errors.authAction")}
            </Link>
          ),
        }}
      />
    );
  }

  // Compact Summary Metrics
  const totalCount = pagination?.totalItems ?? purchases.length;
  const pendingCount = purchases.filter((p) => p.status === "PENDING_PAYMENT").length;
  const activeCount = purchases.filter((p) => p.status === "ACTIVE").length;
  const completedCount = purchases.filter((p) => p.status === "COMPLETED").length;

  const columns = [
    {
      id: "package",
      header: t("list.table.package"),
      accessor: (row: PatientPackagePurchaseItem) =>
        formatPackageDisplayTitle({ title: row.title, sessionCount: row.sessionCount, t }),
      cell: (row: PatientPackagePurchaseItem) => {
        const titleText = formatPackageDisplayTitle({
          title: row.title,
          sessionCount: row.sessionCount,
          t,
        });
        return (
          <div className="space-y-0.5">
            <Link
              href={`/patient/package-purchases/${row.id}` as never}
              className="font-semibold text-text-primary hover:text-primary transition-colors dark:text-white"
            >
              {titleText}
            </Link>
            <p className="text-xs text-text-muted">
              {t("list.table.durationMinutes", { minutes: row.durationMinutes })}
            </p>
          </div>
        );
      },
    },
    {
      id: "practitioner",
      header: t("list.table.practitioner"),
      accessor: (row: PatientPackagePurchaseItem) =>
        row.practitioner?.displayName || "Practitioner",
      cell: (row: PatientPackagePurchaseItem) => (
        <div className="flex items-center gap-3">
          <Avatar
            src={row.practitioner?.avatarUrl}
            name={row.practitioner?.displayName || "Practitioner"}
            size="small"
            className="h-8 w-8 rounded-xl border border-border-light"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary dark:text-white">
              {row.practitioner?.displayName || "Practitioner"}
            </p>
            {row.practitioner?.professionalTitle && (
              <p className="truncate text-xs text-text-muted">
                {row.practitioner.professionalTitle}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "purchaseDate",
      header: t("list.table.purchaseDate"),
      accessor: (row: PatientPackagePurchaseItem) => row.createdAt,
      cell: (row: PatientPackagePurchaseItem) => (
        <span className="text-xs font-medium text-text-secondary">
          {formatDate(row.createdAt, numLocale)}
        </span>
      ),
    },
    {
      id: "progress",
      header: t("list.table.progress"),
      accessor: (row: PatientPackagePurchaseItem) =>
        row.progress?.completedSessions ?? 0,
      cell: (row: PatientPackagePurchaseItem) => {
        const completed = row.progress?.completedSessions ?? 0;
        const total = row.progress?.totalSessions ?? row.sessionCount;
        const percent = row.progress?.progressPercent ?? Math.min(100, Math.round((completed / Math.max(1, total)) * 100));

        return (
          <div className="space-y-1.5 min-w-[130px]">
            <div className="flex items-center justify-between text-xs font-medium text-text-secondary">
              <span>{t("detail.progressValue", { completed, total })}</span>
              <span>{percent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-tertiary dark:bg-white/10">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      id: "amount",
      header: t("list.table.amount"),
      accessor: (row: PatientPackagePurchaseItem) => row.patientPayableTotal,
      cell: (row: PatientPackagePurchaseItem) => {
        const payableMoney = mapPackagePurchaseSnapshotMoney({
          amount: row.patientPayableTotal,
          selectedCurrencyCode: row.selectedCurrencyCode,
        });
        return (
          <span className="font-bold text-primary text-sm">
            {payableMoney ? <MoneyText money={payableMoney} /> : "—"}
          </span>
        );
      },
    },
    {
      id: "status",
      header: t("list.table.status"),
      accessor: (row: PatientPackagePurchaseItem) => row.status,
      cell: (row: PatientPackagePurchaseItem) => {
        const statusConfig = getPackagePurchaseStatusConfig(row.status);
        return (
          <Badge variant="solid" color={statusConfig.tone} size="sm">
            {t(statusConfig.labelKey as any)}
          </Badge>
        );
      },
    },
    {
      id: "nextSession",
      header: t("list.table.nextSession"),
      accessor: (row: PatientPackagePurchaseItem) => row.id,
      cell: (row: PatientPackagePurchaseItem) => {
        const nextSession = getNextUpcomingPackageSession(row);
        if (!nextSession || !nextSession.scheduledStartAt) {
          return (
            <span className="text-xs text-text-muted">
              {t("list.table.noUpcomingSession")}
            </span>
          );
        }
        return (
          <span className="text-xs font-medium text-text-secondary">
            {formatDatetime(nextSession.scheduledStartAt, numLocale)}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: t("list.table.actions"),
      accessor: (row: PatientPackagePurchaseItem) => row.id,
      cell: (row: PatientPackagePurchaseItem) => {
        const canContinuePayment = canContinuePackagePurchasePayment(row);
        return (
          <div className="flex items-center gap-2">
            <Link
              href={`/patient/package-purchases/${row.id}` as never}
              className="inline-flex items-center justify-center rounded-xl border border-border-light bg-white px-3 py-1.5 text-xs font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary dark:bg-white/5"
            >
              {t("list.actions.viewDetails")}
            </Link>
            {canContinuePayment && (
              <PackagePurchasePaymentAction
                purchase={row}
                label={t("list.actions.continuePayment")}
              />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Compact Summary Metrics Bar */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SurfaceStatCard
          label={t("list.summary.total")}
          value={String(totalCount)}
          hint={t("list.summary.totalHint")}
          tone="primary"
          icon={<Package className="h-4 w-4" />}
        />
        <SurfaceStatCard
          label={t("list.summary.pending")}
          value={String(pendingCount)}
          hint={t("list.summary.pendingHint")}
          tone="warning"
          icon={<Clock className="h-4 w-4" />}
        />
        <SurfaceStatCard
          label={t("list.summary.active")}
          value={String(activeCount)}
          hint={t("list.summary.activeHint")}
          tone="success"
          icon={<Sparkles className="h-4 w-4" />}
        />
        <SurfaceStatCard
          label={t("list.summary.completed")}
          value={String(completedCount)}
          hint={t("list.summary.completedHint")}
          tone="neutral"
          icon={<CalendarDays className="h-4 w-4" />}
        />
      </div>

      {/* Filter Toolbar */}
      <SurfaceToolbar className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("list.filterSearch")}
              className="app-control h-10 w-full ps-9 pe-3 text-xs"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="app-control h-10 w-full sm:w-48 px-3 text-xs"
            aria-label={t("list.filterAllStatuses")}
          >
            <option value="">{t("list.filterAllStatuses")}</option>
            <option value="ACTIVE">{t("list.status.ACTIVE")}</option>
            <option value="PENDING_PAYMENT">{t("list.status.PENDING_PAYMENT")}</option>
            <option value="COMPLETED">{t("list.status.COMPLETED")}</option>
            <option value="CANCELLED">{t("list.status.CANCELLED")}</option>
            <option value="EXPIRED">{t("list.status.EXPIRED")}</option>
            <option value="REFUNDED">{t("list.status.REFUNDED")}</option>
          </select>
        </div>

        {/* Rows per page selector */}
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          <span>{t("list.rowsPerPage")}</span>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            className="app-control h-9 px-2 text-xs"
          >
            {[10, 20, 50].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </SurfaceToolbar>

      {/* Reusable Platform DataTable */}
      <DataTable
        data={purchases}
        columns={columns}
        getRowId={(row) => row.id}
        loading={isLoading}
        error={isError ? t("list.errorNote") : null}
        emptyState={{
          title: t("list.emptyHeading"),
          description: t("list.emptyNote"),
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
        onPageChange={(newPage) => setPage(newPage)}
      />
    </div>
  );
}
