"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  XCircle,
  Zap,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import { DestructiveConfirmModal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/data-table/DataTable";
import type { ColumnDef } from "@/components/ui/data-table/types";
import PractitionerOperationalListShell, {
  PractitionerSummaryCard,
} from "@/components/shared/practitioner/PractitionerOperationalListShell";
import { usePractitionerProfile } from "@/features/practitioners/hooks/use-practitioners";
import { formatPractitionerOrViewerDateTime, formatTimeZoneLabel } from "@/lib/time-formatting";
import { cn } from "@/lib/utils";
import { useNowTick } from "../hooks/use-now-tick";
import {
  useAcceptInstantBookingRequest,
  usePractitionerInstantBookingRequests,
  useRejectInstantBookingRequest,
} from "../hooks/use-instant-booking";
import { getPractitionerInstantBookingErrorKey } from "../lib/instant-booking-errors";
import type { InstantBookingRequest } from "../types/instant-booking.types";

function formatRelativeExpiry(
  expiresAt: string,
  nowMs: number,
  format: (key: string, values?: Record<string, number>) => string,
): string {
  const diffMs = new Date(expiresAt).getTime() - nowMs;
  if (diffMs <= 0) {
    return format("queue.expiredShort");
  }

  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return format("queue.summary.nearestExpiryInHours", {
      hours,
      minutes: remainingMinutes,
    });
  }

  return format("queue.summary.nearestExpiryInMinutes", {
    minutes,
    seconds,
  });
}

function getInitials(name: string | null | undefined): string {
  const clean = name?.trim() ?? "";
  if (!clean) return "PR";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

type StatusFilter = "ALL" | "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";

export default function PractitionerInstantBookingRequestsScreen() {
  const t = useTranslations("sessions.practitioner.instantBooking");
  const locale = useLocale();
  const nowMs = useNowTick(1000);
  const profileQuery = usePractitionerProfile();
  const requestsQuery = usePractitionerInstantBookingRequests();
  const acceptMutation = useAcceptInstantBookingRequest();
  const rejectMutation = useRejectInstantBookingRequest();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const [rejectingRequest, setRejectingRequest] = useState<InstantBookingRequest | null>(null);

  useEffect(() => {
    if (!pageMessage) return;
    const timer = window.setTimeout(() => setPageMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [pageMessage]);

  const requests = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data]);
  const practitionerTimeZone = profileQuery.data?.profile.timezone ?? null;
  const practitionerTimeZoneLabel = practitionerTimeZone
    ? formatTimeZoneLabel(practitionerTimeZone, { locale })
    : null;

  // Filter groups
  const pendingRequests = useMemo(() => requests.filter((r) => r.status === "PENDING"), [requests]);
  const acceptedRequests = useMemo(() => requests.filter((r) => r.status === "ACCEPTED"), [requests]);
  const rejectedRequests = useMemo(() => requests.filter((r) => r.status === "REJECTED"), [requests]);
  const expiredRequests = useMemo(() => requests.filter((r) => r.status === "EXPIRED"), [requests]);
  const cancelledRequests = useMemo(() => requests.filter((r) => r.status === "CANCELLED"), [requests]);

  const nearestExpiry = useMemo(() => {
    if (pendingRequests.length === 0) return null;
    return [...pendingRequests].sort(
      (left, right) => new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime(),
    )[0];
  }, [pendingRequests]);

  // Filtered & reverse chronological sorted (newest first from backend / frontend)
  const filteredRequests = useMemo(() => {
    let result = requests;

    if (statusFilter !== "ALL") {
      result = result.filter((r) => r.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.patient?.displayName?.toLowerCase().includes(q) ||
          r.patient?.id.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q),
      );
    }

    // Sort newest first by default
    return [...result].sort(
      (a, b) =>
        new Date(b.createdAt || b.requestedAt).getTime() -
        new Date(a.createdAt || a.requestedAt).getTime(),
    );
  }, [requests, statusFilter, searchQuery]);

  const handleAccept = async (requestId: string) => {
    setPageMessage(null);
    setActionErrors((current) => {
      const next = { ...current };
      delete next[requestId];
      return next;
    });

    try {
      await acceptMutation.mutateAsync(requestId);
      setPageMessage(t("queue.feedback.accepted"));
      await requestsQuery.refetch();
    } catch (error) {
      const messageKey = getPractitionerInstantBookingErrorKey(error);
      setActionErrors((current) => ({
        ...current,
        [requestId]: t(messageKey as Parameters<typeof t>[0]),
      }));
      await requestsQuery.refetch();
    }
  };

  const handleReject = async (requestId: string) => {
    setPageMessage(null);
    setActionErrors((current) => {
      const next = { ...current };
      delete next[requestId];
      return next;
    });

    try {
      await rejectMutation.mutateAsync({ requestId });
      setPageMessage(t("queue.feedback.rejected"));
      setRejectingRequest(null);
      await requestsQuery.refetch();
    } catch (error) {
      const messageKey = getPractitionerInstantBookingErrorKey(error);
      setActionErrors((current) => ({
        ...current,
        [requestId]: t(messageKey as Parameters<typeof t>[0]),
      }));
      setRejectingRequest(null);
      await requestsQuery.refetch();
    }
  };

  // DataTable columns definition
  const columns = useMemo<ColumnDef<InstantBookingRequest>[]>(
    () => [
      {
        id: "patient",
        header: t("queue.patientLabel"),
        accessor: (row) => row.patient?.displayName,
        cell: (row) => {
          const name = row.patient?.displayName?.trim() || t("queue.unknownPatient");
          const initials = getInitials(row.patient?.displayName);
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary dark:bg-primary/20 dark:text-primary-light">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">{name}</p>
                <p className="text-[11px] text-text-muted">ID: {row.patient?.id.substring(0, 8)}...</p>
              </div>
            </div>
          );
        },
      },
      {
        id: "details",
        header: t("queue.sessionDetailsLabel"),
        cell: (row) => {
          const durationLabel = t("queue.durationLabel", { n: row.requestedDurationMinutes });
          const modeLabel = t(`queue.sessionModes.${row.sessionMode}` as Parameters<typeof t>[0]);
          return (
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-md bg-surface-tertiary px-2 py-0.5 font-medium text-text-secondary dark:bg-white/10 dark:text-white/80">
                {durationLabel}
              </span>
              <span className="rounded-md bg-surface-tertiary px-2 py-0.5 font-medium text-text-secondary dark:bg-white/10 dark:text-white/80">
                {modeLabel}
              </span>
            </div>
          );
        },
      },
      {
        id: "createdAt",
        header: t("queue.requestTimeLabel"),
        sortable: true,
        accessor: (row) => row.createdAt,
        cell: (row) => {
          return (
            <span className="text-xs text-text-secondary">
              {formatPractitionerOrViewerDateTime(row.createdAt, practitionerTimeZone, {
                locale: locale === "ar" ? "ar-SA" : "en-US",
                fallbackText: "-",
              })}
            </span>
          );
        },
      },
      {
        id: "expiresAt",
        header: t("queue.expiryLabel"),
        sortable: true,
        accessor: (row) => row.expiresAt,
        cell: (row) => {
          const isPending = row.status === "PENDING";
          const requestExpired = new Date(row.expiresAt).getTime() <= nowMs;
          if (isPending) {
            return (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  requestExpired
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
                )}
              >
                <Clock3 className="h-3 w-3 shrink-0" />
                {requestExpired ? t("queue.expiredShort") : formatRelativeExpiry(row.expiresAt, nowMs, t)}
              </span>
            );
          }

          return (
            <span className="text-xs text-text-muted">
              {formatPractitionerOrViewerDateTime(row.expiresAt, practitionerTimeZone, {
                locale: locale === "ar" ? "ar-SA" : "en-US",
                fallbackText: "-",
              })}
            </span>
          );
        },
      },
      {
        id: "status",
        header: t("queue.statusLabel"),
        sortable: true,
        accessor: (row) => row.status,
        cell: (row) => {
          const label = t(`queue.statuses.${row.status}` as Parameters<typeof t>[0]);
          let badgeClass = "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/80";
          if (row.status === "PENDING") {
            badgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200";
          } else if (row.status === "ACCEPTED") {
            badgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200";
          } else if (row.status === "REJECTED") {
            badgeClass = "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200";
          } else if (row.status === "EXPIRED") {
            badgeClass = "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
          }

          return (
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", badgeClass)}>
              {label}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: t("queue.actionsLabel"),
        cell: (row) => {
          const isPending = row.status === "PENDING";
          const isAccepting = acceptMutation.isPending && acceptMutation.variables === row.id;
          const isRejecting = rejectMutation.isPending && rejectMutation.variables?.requestId === row.id;
          const requestExpired = new Date(row.expiresAt).getTime() <= nowMs;
          const disableActions = !isPending || requestExpired || isAccepting || isRejecting;
          const errorMsg = actionErrors[row.id];

          if (isPending) {
            return (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={disableActions}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleAccept(row.id);
                    }}
                    startIcon={isAccepting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    className="h-auto px-3 py-1.5 text-xs"
                  >
                    {isAccepting ? t("queue.actions.accepting") : t("queue.actions.accept")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disableActions}
                    onClick={(e) => {
                      e.stopPropagation();
                      setRejectingRequest(row);
                    }}
                    startIcon={isRejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                    className="h-auto border-rose-200 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
                  >
                    {isRejecting ? t("queue.actions.rejecting") : t("queue.actions.reject")}
                  </Button>
                </div>
                {errorMsg ? <p className="text-[11px] text-rose-600">{errorMsg}</p> : null}
              </div>
            );
          }

          if (row.status === "ACCEPTED" && row.createdSessionId) {
            return (
              <Link
                href={`/practitioner/sessions/${row.createdSessionId}` as never}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline dark:text-primary-light"
              >
                {t("queue.actions.viewSession")}
                <ExternalLink className="h-3 w-3" />
              </Link>
            );
          }

          return <span className="text-xs text-text-muted">—</span>;
        },
      },
    ],
    [locale, practitionerTimeZone, nowMs, acceptMutation.isPending, acceptMutation.variables, rejectMutation.isPending, rejectMutation.variables, actionErrors, t],
  );

  const filterTabs: { id: StatusFilter; label: string; count: number }[] = useMemo(
    () => [
      { id: "ALL", label: t("queue.filters.all"), count: requests.length },
      { id: "PENDING", label: t("queue.filters.pending"), count: pendingRequests.length },
      { id: "ACCEPTED", label: t("queue.filters.accepted"), count: acceptedRequests.length },
      { id: "REJECTED", label: t("queue.filters.rejected"), count: rejectedRequests.length },
      { id: "EXPIRED", label: t("queue.filters.expired"), count: expiredRequests.length },
      { id: "CANCELLED", label: t("queue.filters.cancelled"), count: cancelledRequests.length },
    ],
    [locale, requests.length, pendingRequests.length, acceptedRequests.length, rejectedRequests.length, expiredRequests.length, cancelledRequests.length],
  );

  if (requestsQuery.isError) {
    return (
      <PractitionerOperationalListShell
        eyebrow={t("queue.eyebrow")}
        title={t("queue.title")}
        description={t("queue.subtitle")}
      >
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-rose-500" />
          <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
            {t("queue.errors.loadingHeading")}
          </h2>
          <p className="mt-1 text-xs text-text-muted">{t("queue.errors.loadingNote")}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void requestsQuery.refetch()}
            className="mt-4"
          >
            {t("queue.errors.retry")}
          </Button>
        </div>
      </PractitionerOperationalListShell>
    );
  }

  return (
    <PractitionerOperationalListShell
      eyebrow={t("queue.eyebrow")}
      title={t("queue.title")}
      description={t("queue.subtitle")}
      actions={
        <button
          type="button"
          onClick={() => void requestsQuery.refetch()}
          disabled={requestsQuery.isFetching}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-text-secondary shadow-xs hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-surface-secondary dark:text-white/80 dark:hover:bg-white/5"
          title={t("queue.ui.refreshTitle")}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", requestsQuery.isFetching && "animate-spin")} />
          <span>{t("queue.ui.refresh")}</span>
        </button>
      }
      notice={
        pageMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
            {pageMessage}
          </div>
        ) : null
      }
      summaryCards={
        <>
          <PractitionerSummaryCard
            label={t("queue.summary.pendingCount")}
            value={pendingRequests.length}
            hint={
              nearestExpiry
                ? formatRelativeExpiry(nearestExpiry.expiresAt, nowMs, t)
                : t("queue.ui.noPending")
            }
            tone="warning"
            icon={<Clock3 className="h-4 w-4" />}
          />
          <PractitionerSummaryCard
            label={t("queue.ui.rejected")}
            value={rejectedRequests.length}
            hint={t("queue.ui.rejectedHint")}
            tone="danger"
            icon={<XCircle className="h-4 w-4" />}
          />
          <PractitionerSummaryCard
            label={t("queue.ui.accepted")}
            value={acceptedRequests.length}
            hint={t("queue.ui.acceptedHint")}
            tone="success"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <PractitionerSummaryCard
            label={t("queue.ui.total")}
            value={requests.length}
            hint={practitionerTimeZoneLabel ? `توقيت ${practitionerTimeZoneLabel}` : undefined}
            tone="primary"
            icon={<Zap className="h-4 w-4" />}
          />
        </>
      }
      filters={
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {filterTabs.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    isActive
                      ? "bg-primary text-white shadow-xs"
                      : "bg-surface-tertiary text-text-secondary hover:bg-slate-200/70 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/80",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute inset-y-0 start-2.5 my-auto h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("queue.ui.searchPlaceholder")}
              className="w-full rounded-lg border border-slate-200/80 bg-white py-1.5 pe-3 ps-8 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none dark:border-white/10 dark:bg-surface-secondary dark:text-white"
            />
          </div>
        </div>
      }
      tableTitle={t("queue.ui.tableTitle")}
      tableSubtitle={t("queue.ui.tableSubtitle")}
    >
      <DataTable<InstantBookingRequest>
        data={filteredRequests}
        columns={columns}
        getRowId={(row) => row.id}
        loading={requestsQuery.isLoading}
        sortConfig={{ column: "createdAt", direction: "desc" }}
        emptyState={{
          title:
            statusFilter === "ALL"
              ? t("queue.empty.title")
              : t("queue.ui.filterEmptyTitle"),
          description:
            statusFilter === "ALL"
              ? t("queue.empty.note")
              : t("queue.ui.filterEmptyNote"),
          icon: <Zap className="h-6 w-6 text-primary" />,
        }}
        pageSizeOptions={[10, 20, 50]}
        striped
        hoverable
      />

      {/* Reject Confirmation Modal */}
      <DestructiveConfirmModal
        isOpen={Boolean(rejectingRequest)}
        onClose={() => {
          if (!rejectMutation.isPending) setRejectingRequest(null);
        }}
        size="sm"
        title={t("queue.rejectConfirm.heading")}
        description={t("queue.rejectConfirm.note")}
        confirmLabel={
          rejectMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("queue.actions.rejecting")}
            </>
          ) : (
            t("queue.rejectConfirm.confirm")
          )
        }
        cancelLabel={t("queue.rejectConfirm.cancel")}
        onConfirm={() => {
          if (rejectingRequest) {
            void handleReject(rejectingRequest.id);
          }
        }}
        loading={rejectMutation.isPending}
      >
        {rejectingRequest ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="font-semibold">{rejectingRequest.patient?.displayName}</p>
            <p className="mt-1 text-[11px] opacity-80">
              {formatRelativeExpiry(rejectingRequest.expiresAt, nowMs, t)}
            </p>
          </div>
        ) : null}
      </DestructiveConfirmModal>
    </PractitionerOperationalListShell>
  );
}
