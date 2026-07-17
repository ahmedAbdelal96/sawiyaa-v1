
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Download, RotateCcw, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import AdminOperationalListShell from "@/components/shared/admin/AdminOperationalListShell";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import Button from "@/components/ui/button/Button";
import { FormModal } from "@/components/ui/modal";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { formatSettlementDateTime, formatSettlementMoney } from "@/features/admin/finance/lib/finance-formatters";
import { useAdminStepUp } from "@/features/admin/users/hooks/use-admin-step-up";
import { isStepUpRequiredError, toAppError } from "@/lib/api/errors";
import { useDownloadAdminPractitionerRecoveriesCsv, useAdminPractitionerRecoveries, useWaiveAdminPractitionerRecovery } from "../hooks/use-admin-practitioner-recoveries";
import {
  ADMIN_PRACTITIONER_RECOVERY_STATUS_STYLES,
  getAdminPractitionerRecoveryReasonCodeKey,
  getAdminPractitionerRecoveryStatusKey,
} from "../lib/admin-practitioner-recovery-status";
import type {
  AdminPractitionerRecoveryListItem,
  ListAdminPractitionerRecoveriesParams,
  PractitionerRecoveryReasonCode,
  PractitionerRecoveryStatus,
} from "../types/admin-practitioner-recoveries.types";

type RecoveryFilterStatus = PractitionerRecoveryStatus | "ALL";
type RecoveryFilterReason = PractitionerRecoveryReasonCode | "ALL";

type BulkWaiveFeedback = {
  tone: "success" | "warning" | "error";
  message: string;
};

function shortId(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return value.length <= 14 ? value : `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function getRecoveryContextLabel(
  row: AdminPractitionerRecoveryListItem,
  t: ReturnType<typeof useTranslations>,
) {
  if (row.session?.sessionCode) {
    return `${t("practitionerRecoveries.list.columns.session")}: ${shortId(row.session.sessionCode)}`;
  }

  if (row.payoutId) {
    return `${t("practitionerRecoveries.list.columns.payout")}: ${shortId(row.payoutId)}`;
  }

  return t("practitionerRecoveries.list.columns.noSession");
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `recovery-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function isRecoverableStatus(status: PractitionerRecoveryStatus) {
  return status === "OPEN" || status === "PARTIALLY_RECOVERED";
}

function ToneNotice({
  tone,
  message,
}: {
  tone: "success" | "warning" | "error";
  message: string;
}) {
  const className =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/30 dark:bg-emerald-900/10 dark:text-emerald-300"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
        : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/10 dark:text-red-300";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${className}`}>{message}</div>;
}

function StatusPill({
  status,
  t,
}: {
  status: PractitionerRecoveryStatus;
  t: ReturnType<typeof useTranslations>;
}) {
  const className = ADMIN_PRACTITIONER_RECOVERY_STATUS_STYLES[status];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}>
      {t(getAdminPractitionerRecoveryStatusKey(status) as Parameters<typeof t>[0])}
    </span>
  );
}

export default function AdminPractitionerRecoveriesListScreen() {
  const t = useTranslations("admin-finance-operations");
  const locale = useLocale();
  const router = useRouter();
  const stepUp = useAdminStepUp();
  const exportCsvMutation = useDownloadAdminPractitionerRecoveriesCsv();
  const waiveMutation = useWaiveAdminPractitionerRecovery();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_LIMIT);
  const [practitionerId, setPractitionerId] = useState("");
  const [status, setStatus] = useState<RecoveryFilterStatus>("ALL");
  const [reasonCode, setReasonCode] = useState<RecoveryFilterReason>("ALL");
  const [currencyCode, setCurrencyCode] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [selectedRecoveryIds, setSelectedRecoveryIds] = useState<string[]>([]);
  const [bulkWaiveOpen, setBulkWaiveOpen] = useState(false);
  const [bulkWaiveReason, setBulkWaiveReason] = useState("");
  const [bulkWaiveNote, setBulkWaiveNote] = useState("");
  const [bulkFeedback, setBulkFeedback] = useState<BulkWaiveFeedback | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const bulkIdempotencyKeysRef = useRef<Map<string, string>>(new Map());

  const params = useMemo<ListAdminPractitionerRecoveriesParams>(() => {
    const next: ListAdminPractitionerRecoveriesParams = {
      page,
      limit,
    };

    if (practitionerId.trim()) {
      next.practitionerId = practitionerId.trim();
    }
    if (status !== "ALL") {
      next.status = status;
    }
    if (reasonCode !== "ALL") {
      next.reasonCode = reasonCode;
    }
    if (currencyCode.trim()) {
      next.currencyCode = currencyCode.trim().toUpperCase();
    }
    if (createdFrom.trim()) {
      next.createdFrom = createdFrom;
    }
    if (createdTo.trim()) {
      next.createdTo = createdTo;
    }

    return next;
  }, [createdFrom, createdTo, currencyCode, limit, page, practitionerId, reasonCode, status]);

  const recoveriesQuery = useAdminPractitionerRecoveries(params);
  const rows = recoveriesQuery.data?.items ?? [];
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedRecoveryIds.includes(row.recoveryId)),
    [rows, selectedRecoveryIds],
  );
  const eligibleSelectedRows = useMemo(
    () => selectedRows.filter((row) => isRecoverableStatus(row.status)),
    [selectedRows],
  );

  const selectedCount = selectedRows.length;
  const eligibleSelectedCount = eligibleSelectedRows.length;

  useEffect(() => {
    setSelectedRecoveryIds([]);
    setBulkFeedback(null);
    setBulkWaiveOpen(false);
  }, [params]);

  const columns = useMemo<ColumnDef<AdminPractitionerRecoveryListItem>[]>(() => [
    {
      id: "recovery",
      header: t("practitionerRecoveries.list.columns.recovery"),
      cell: (row) => (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-text-primary dark:text-white/95">
              {shortId(row.recoveryId)}
            </span>
            <StatusPill status={row.status} t={t} />
            <span className="rounded-full bg-surface-tertiary px-2.5 py-1 text-[11px] font-semibold text-text-secondary dark:bg-white/8 dark:text-white/70">
              {t(getAdminPractitionerRecoveryReasonCodeKey(row.reasonCode) as Parameters<typeof t>[0])}
            </span>
          </div>
          <p className="text-xs leading-5 text-text-secondary">
            {row.practitioner.displayName ?? row.practitioner.publicSlug ?? shortId(row.practitioner.practitionerId)}
          </p>
          <p className="text-xs text-text-muted">
            {row.session?.sessionCode ? `${t("practitionerRecoveries.list.columns.session")} ` : ""}
            {row.session?.sessionCode ? shortId(row.session.sessionCode) : shortId(row.payoutId)}
          </p>
        </div>
      ),
    },
    {
      id: "amount",
      header: t("practitionerRecoveries.list.columns.amount"),
      cell: (row) => (
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-text-primary dark:text-white/95">
            {formatSettlementMoney(locale, row.amount, row.currencyCode)}
          </p>
          <p className="text-xs text-text-secondary">
            {t("practitionerRecoveries.list.columns.recovered")}: {" "}
            {formatSettlementMoney(locale, row.recoveredAmount, row.currencyCode)}
          </p>
          <p className="text-xs text-text-secondary">
            {t("practitionerRecoveries.list.columns.remaining")}: {" "}
            {formatSettlementMoney(locale, row.remainingAmount, row.currencyCode)}
          </p>
        </div>
      ),
    },
    {
      id: "context",
      header: t("practitionerRecoveries.list.columns.context"),
      cell: (row) => (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-text-primary dark:text-white/95">
            {getRecoveryContextLabel(row, t)}
          </p>
          <p className="text-xs text-text-secondary">
            {row.payment?.paymentId
              ? `${t("practitionerRecoveries.list.columns.payment")}: ${shortId(row.payment.paymentId)}`
              : t("practitionerRecoveries.list.columns.noPayment")}
          </p>
          <p className="text-xs text-text-secondary">
            {row.sessionEarningReview?.sessionEarningReviewId
              ? `${t("practitionerRecoveries.list.columns.review")}: ${shortId(row.sessionEarningReview.sessionEarningReviewId)}`
              : t("practitionerRecoveries.list.columns.noReview")}
          </p>
          <p className="text-xs text-text-secondary">
            {t("practitionerRecoveries.list.columns.createdAt")}: {" "}
            {formatSettlementDateTime(locale, row.createdAt)}
          </p>
        </div>
      ),
    },
  ], [locale, t]);

  const hasFilters =
    Boolean(
      practitionerId.trim() ||
        status !== "ALL" ||
        reasonCode !== "ALL" ||
        currencyCode.trim() ||
        createdFrom.trim() ||
        createdTo.trim() ||
        page !== 1 ||
        limit !== DEFAULT_PAGE_LIMIT,
    );

  const handleExportCsv = async () => {
    if (!recoveriesQuery.data || recoveriesQuery.data.pagination.totalItems === 0) {
      toast.info(t("practitionerRecoveries.list.actions.noDataToExport"));
      return;
    }

    try {
      await exportCsvMutation.mutateAsync(params);
      toast.success(t("practitionerRecoveries.list.actions.exportSuccess"));
    } catch (error) {
      const appError = toAppError(error);
      toast.error(appError.message || t("practitionerRecoveries.list.actions.exportError"));
    }
  };

  const openBulkWaive = () => {
    if (eligibleSelectedCount === 0) {
      toast.info(t("practitionerRecoveries.list.bulkWaiveModal.noEligibleSelection"));
      return;
    }

    setBulkWaiveReason("");
    setBulkWaiveNote("");
    setBulkFeedback(null);
    bulkIdempotencyKeysRef.current = new Map(
      eligibleSelectedRows.map((row) => [row.recoveryId, createIdempotencyKey()]),
    );
    setBulkWaiveOpen(true);
  };

  const finalizeBulkWaive = (results: {
    successful: number;
    alreadyRecorded: number;
    failed: Array<{ recoveryId: string; message: string }>;
  }) => {
    setSelectedRecoveryIds([]);
    setBulkWaiveOpen(false);
    setBulkSubmitting(false);
    bulkIdempotencyKeysRef.current = new Map();

    if (results.failed.length > 0) {
      const message = t("practitionerRecoveries.list.bulkWaiveModal.partialSuccess", {
        success: results.successful + results.alreadyRecorded,
        failed: results.failed.length,
      });
      setBulkFeedback({ tone: "warning", message });
      toast.warning(message);
      return;
    }

    const summaryKey =
      results.alreadyRecorded > 0
        ? "practitionerRecoveries.list.bulkWaiveModal.alreadyRecordedSuccess"
        : "practitionerRecoveries.list.bulkWaiveModal.success";
    const message = t(summaryKey, {
      count: results.successful + results.alreadyRecorded,
    });
    setBulkFeedback({ tone: "success", message });
    toast.success(message);
  };

  const submitBulkWaive = async () => {
    if (bulkSubmitting) {
      return;
    }

    if (!bulkWaiveReason.trim()) {
      setBulkFeedback({
        tone: "error",
        message: t("practitionerRecoveries.list.bulkWaiveModal.reasonRequired"),
      });
      return;
    }

    if (eligibleSelectedCount === 0) {
      setBulkFeedback({
        tone: "warning",
        message: t("practitionerRecoveries.list.bulkWaiveModal.noEligibleSelection"),
      });
      return;
    }

    setBulkSubmitting(true);
    setBulkFeedback(null);

    const runBatch = async () => {
      const results = {
        successful: 0,
        alreadyRecorded: 0,
        failed: [] as Array<{ recoveryId: string; message: string }>,
      };

      for (const row of eligibleSelectedRows) {
        const idempotencyKey =
          bulkIdempotencyKeysRef.current.get(row.recoveryId) ?? createIdempotencyKey();
        bulkIdempotencyKeysRef.current.set(row.recoveryId, idempotencyKey);

        try {
          const result = await waiveMutation.mutateAsync({
            recoveryId: row.recoveryId,
            payload: {
              reason: bulkWaiveReason.trim(),
              idempotencyKey,
              note: bulkWaiveNote.trim() || undefined,
            },
          });

          if (result.wasAlreadyRecorded) {
            results.alreadyRecorded += 1;
          } else {
            results.successful += 1;
          }
        } catch (cause) {
          const appError = toAppError(cause);
          if (isStepUpRequiredError(appError)) {
            throw cause;
          }

          results.failed.push({
            recoveryId: row.recoveryId,
            message: appError.message || t("practitionerRecoveries.list.bulkWaiveModal.itemFailed"),
          });
        }
      }

      return results;
    };

    const handleError = (error: unknown) => {
      const appError = toAppError(error);
      const message = appError.message || t("practitionerRecoveries.list.bulkWaiveModal.error");
      setBulkFeedback({ tone: "error", message });
      setBulkSubmitting(false);
      toast.error(message);
    };

    try {
      const results = await runBatch();
      finalizeBulkWaive(results);
    } catch (error) {
      const appError = toAppError(error);
      if (isStepUpRequiredError(appError)) {
        stepUp.requestStepUp(async () => {
          try {
            const results = await runBatch();
            finalizeBulkWaive(results);
          } catch (retryError) {
            handleError(retryError);
          }
        });
        return;
      }

      handleError(error);
    }
  };

  return (
    <>
      <FormModal
        isOpen={bulkWaiveOpen}
        onClose={() => {
          if (!bulkSubmitting) {
            setBulkWaiveOpen(false);
          }
        }}
        title={t("practitionerRecoveries.list.bulkWaiveModal.title")}
        description={t("practitionerRecoveries.list.bulkWaiveModal.description")}
        eyebrow={t("practitionerRecoveries.list.bulkWaiveModal.eyebrow")}
        submitLabel={bulkSubmitting ? t("practitionerRecoveries.list.bulkWaiveModal.submitting") : t("practitionerRecoveries.list.bulkWaiveModal.submit")}
        cancelLabel={t("practitionerRecoveries.list.bulkWaiveModal.cancel")}
        onSubmit={submitBulkWaive}
        onCancel={() => setBulkWaiveOpen(false)}
        loading={bulkSubmitting}
        submitDisabled={eligibleSelectedCount === 0}
        destructive
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border-light bg-surface-tertiary/70 px-4 py-4 text-sm leading-6 text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
            {t("practitionerRecoveries.list.bulkWaiveModal.selectedCount", {
              count: eligibleSelectedCount,
            })}
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("practitionerRecoveries.list.bulkWaiveModal.reason")}
            </span>
            <textarea
              value={bulkWaiveReason}
              onChange={(event) => setBulkWaiveReason(event.target.value)}
              className="app-control min-h-[120px] w-full py-3"
              placeholder={t("practitionerRecoveries.list.bulkWaiveModal.reasonPlaceholder")}
              maxLength={1000}
              disabled={bulkSubmitting}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("practitionerRecoveries.list.bulkWaiveModal.note")}
            </span>
            <textarea
              value={bulkWaiveNote}
              onChange={(event) => setBulkWaiveNote(event.target.value)}
              className="app-control min-h-[104px] w-full py-3"
              placeholder={t("practitionerRecoveries.list.bulkWaiveModal.notePlaceholder")}
              maxLength={1000}
              disabled={bulkSubmitting}
            />
          </label>
        </div>
      </FormModal>

      <AdminOperationalListShell
        eyebrow={t("practitionerRecoveries.list.eyebrow")}
        title={t("practitionerRecoveries.list.title")}
        description={t("practitionerRecoveries.list.note")}
        filtersTitle={t("practitionerRecoveries.list.filters.title")}
        tableTitle={t("practitionerRecoveries.list.table.title")}
        tableSubtitle={t("practitionerRecoveries.list.table.subtitle")}
        tableActions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              startIcon={<Download className="h-4 w-4" />}
              onClick={handleExportCsv}
              disabled={exportCsvMutation.isPending}
            >
              {exportCsvMutation.isPending
                ? t("practitionerRecoveries.list.actions.exportingCsv")
                : t("practitionerRecoveries.list.actions.exportCsv")}
            </Button>

            <Button
              type="button"
              variant="danger"
              startIcon={<ShieldAlert className="h-4 w-4" />}
              onClick={openBulkWaive}
              disabled={eligibleSelectedCount === 0 || bulkSubmitting}
            >
              {t("practitionerRecoveries.list.actions.bulkWaive")}
            </Button>

            {selectedCount > 0 ? (
              <span className="rounded-full border border-border-light bg-surface-tertiary px-3 py-1 text-xs font-semibold text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
                {t("practitionerRecoveries.list.actions.selectedCount", {
                  count: selectedCount,
                })}
              </span>
            ) : null}
          </div>
        }
        filters={
          <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("practitionerRecoveries.list.filters.practitionerId")}
              </span>
              <input
                value={practitionerId}
                onChange={(event) => {
                  setPractitionerId(event.target.value);
                  setPage(1);
                }}
                className="app-control w-full py-3"
                placeholder={t("practitionerRecoveries.list.filters.practitionerIdPlaceholder")}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("practitionerRecoveries.list.filters.status")}
              </span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as RecoveryFilterStatus);
                  setPage(1);
                }}
                className="app-control w-full py-3"
              >
                <option value="ALL">{t("practitionerRecoveries.list.filters.allStatuses")}</option>
                {(["OPEN", "PARTIALLY_RECOVERED", "RECOVERED", "WAIVED"] as const).map((value) => (
                  <option key={value} value={value}>
                    {t(getAdminPractitionerRecoveryStatusKey(value) as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("practitionerRecoveries.list.filters.reasonCode")}
              </span>
              <select
                value={reasonCode}
                onChange={(event) => {
                  setReasonCode(event.target.value as RecoveryFilterReason);
                  setPage(1);
                }}
                className="app-control w-full py-3"
              >
                <option value="ALL">{t("practitionerRecoveries.list.filters.allReasons")}</option>
                {(["REFUND_AFTER_PAYOUT", "REFUND_AFTER_APPROVAL", "MANUAL_FINANCE_CORRECTION", "ADMIN_EXCEPTION"] as const).map((value) => (
                  <option key={value} value={value}>
                    {t(getAdminPractitionerRecoveryReasonCodeKey(value) as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("practitionerRecoveries.list.filters.currencyCode")}
              </span>
              <input
                value={currencyCode}
                onChange={(event) => {
                  setCurrencyCode(event.target.value);
                  setPage(1);
                }}
                className="app-control w-full py-3 uppercase"
                placeholder="EGP / USD"
                maxLength={3}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("practitionerRecoveries.list.filters.createdFrom")}
              </span>
              <input
                type="date"
                value={createdFrom}
                onChange={(event) => {
                  setCreatedFrom(event.target.value);
                  setPage(1);
                }}
                className="app-control w-full py-3"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("practitionerRecoveries.list.filters.createdTo")}
              </span>
              <input
                type="date"
                value={createdTo}
                onChange={(event) => {
                  setCreatedTo(event.target.value);
                  setPage(1);
                }}
                className="app-control w-full py-3"
              />
            </label>

            <div className="flex items-end gap-3 lg:col-span-3 xl:col-span-2">
              <Button
                type="button"
                variant="outline"
                startIcon={<RotateCcw className="h-4 w-4" />}
                onClick={() => {
                  setPractitionerId("");
                  setStatus("ALL");
                  setReasonCode("ALL");
                  setCurrencyCode("");
                  setCreatedFrom("");
                  setCreatedTo("");
                  setPage(1);
                }}
                disabled={!hasFilters}
              >
                {t("practitionerRecoveries.list.filters.clear")}
              </Button>
            </div>
          </div>
        }
      >
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.recoveryId}
          loading={recoveriesQuery.isLoading}
          error={recoveriesQuery.isError ? t("practitionerRecoveries.list.states.error") : null}
          errorState={{
            title: t("practitionerRecoveries.list.states.error"),
            description: t("practitionerRecoveries.list.states.errorDescription"),
            action: {
              label: t("practitionerRecoveries.list.states.retry"),
              onClick: () => recoveriesQuery.refetch(),
            },
          }}
          rowActionsHeader={t("practitionerRecoveries.list.columns.actions")}
          rowActions={(row) => (
            <Button
              type="button"
              size="sm"
              variant="outline"
              startIcon={<Search className="h-4 w-4" />}
              onClick={() => router.push(`/admin/finance/practitioner-recoveries/${row.recoveryId}` as never)}
            >
              {t("practitionerRecoveries.list.actions.viewDetails")}
            </Button>
          )}
          selectable
          selectedRows={selectedRecoveryIds}
          onSelectionChange={setSelectedRecoveryIds}
          emptyState={
            hasFilters
              ? {
                  icon: <ShieldAlert className="h-5 w-5" />,
                  title: t("practitionerRecoveries.list.states.filteredEmptyTitle"),
                  description: t("practitionerRecoveries.list.states.filteredEmptyDescription"),
                  action: {
                    label: t("practitionerRecoveries.list.filters.clear"),
                    onClick: () => {
                      setPractitionerId("");
                      setStatus("ALL");
                      setReasonCode("ALL");
                      setCurrencyCode("");
                      setCreatedFrom("");
                      setCreatedTo("");
                      setPage(1);
                    },
                  },
                }
              : {
                  icon: <ShieldAlert className="h-5 w-5" />,
                  title: t("practitionerRecoveries.list.states.emptyTitle"),
                  description: t("practitionerRecoveries.list.states.emptyDescription"),
                }
          }
          pagination={
            recoveriesQuery.data
              ? {
                  page: recoveriesQuery.data.pagination.page,
                  limit: recoveriesQuery.data.pagination.limit,
                  total: recoveriesQuery.data.pagination.totalItems,
                  totalPages: recoveriesQuery.data.pagination.totalPages,
                  hasPrevPage: recoveriesQuery.data.pagination.page > 1,
                  hasNextPage:
                    recoveriesQuery.data.pagination.page <
                    recoveriesQuery.data.pagination.totalPages,
                }
              : undefined
          }
          onPageChange={(nextPage) => setPage(nextPage)}
          onPageSizeChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
          pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
        />
      </AdminOperationalListShell>
    </>
  );
}
