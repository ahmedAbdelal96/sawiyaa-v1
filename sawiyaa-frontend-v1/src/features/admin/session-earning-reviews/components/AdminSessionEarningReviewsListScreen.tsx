"use client";

import { useDeferredValue, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Clock3, Search, Sparkles, Users } from "lucide-react";
import {
  DataTable,
  buildUpdatedSearchParams,
  parsePositiveIntParam,
  parseTextParam,
  type ColumnDef,
} from "@/components/ui/data-table";
import Button from "@/components/ui/button/Button";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import AdminOperationalListShell from "@/components/shared/admin/AdminOperationalListShell";
import { SurfaceActionLink } from "@/components/shared/SurfaceShell";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { formatSettlementDateTime, formatSettlementMoney } from "@/features/admin/finance/lib/finance-formatters";
import { useAdminSessionEarningReviews } from "../hooks/use-admin-session-earning-reviews";
import {
  ADMIN_SESSION_EARNING_REVIEW_DECISION_STYLES,
  ADMIN_SESSION_EARNING_REVIEW_SOURCE_TYPE_STYLES,
  ADMIN_SESSION_EARNING_REVIEW_STATUS_STYLES,
  getAdminSessionEarningReviewDecisionKey,
  getAdminSessionEarningReviewSourceTypeKey,
  getAdminSessionEarningReviewStatusKey,
} from "../lib/admin-session-earning-reviews";
import type {
  AdminSessionEarningReviewListItem,
  SessionEarningReviewDecision,
  SessionEarningReviewSourceType,
} from "../types/admin-session-earning-reviews.types";

type QueueView = "pending" | "finalized";
type QueryParamValue = string | number | null | undefined;

const SOURCE_TYPE_OPTIONS = ["DIRECT_SESSION", "PACKAGE_SESSION"] as const satisfies readonly SessionEarningReviewSourceType[];
const DECISION_OPTIONS = [
  "ALL",
  "AUTO_CREATED",
  "APPROVED_AS_IS",
  "EDITED_AND_APPROVED",
  "REJECTED_PAYOUT",
  "EXCLUDED_FROM_PAYOUT",
] as const satisfies readonly (SessionEarningReviewDecision | "ALL")[];

function normalizeLocale(locale: string) {
  return locale === "ar" ? "ar-EG" : "en-US";
}

function formatDateTime(locale: string, value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function shortId(value: string) {
  return value.length <= 16 ? value : `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function renderName(primary: string | null, fallback: string | null) {
  const primaryValue = primary?.trim();
  if (primaryValue) {
    return primaryValue;
  }

  const fallbackValue = fallback?.trim();
  if (!fallbackValue) {
    return "-";
  }

  return fallbackValue.length > 22 ? shortId(fallbackValue) : fallbackValue;
}

function renderLedgerBadgeClass(direction: string) {
  return direction === "DEBIT"
    ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
}

function ReviewStatePill({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}>{label}</span>;
}

export default function AdminSessionEarningReviewsListScreen() {
  const t = useTranslations("admin-finance-operations");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 50,
  });
  const queue = (searchParams.get("queue") === "finalized" ? "finalized" : "pending") as QueueView;
  const query = parseTextParam(searchParams.get("query"), { maxLength: 120 });
  const currencyCode = parseTextParam(searchParams.get("currencyCode"), { maxLength: 3 });
  const sourceTypeRaw = searchParams.get("sourceType");
  const sourceType = SOURCE_TYPE_OPTIONS.includes(sourceTypeRaw as SessionEarningReviewSourceType)
    ? (sourceTypeRaw as SessionEarningReviewSourceType)
    : undefined;
  const decisionRaw = searchParams.get("decision");
  const decision = DECISION_OPTIONS.includes(decisionRaw as (typeof DECISION_OPTIONS)[number])
    ? (decisionRaw as SessionEarningReviewDecision)
    : undefined;

  const deferredQuery = useDeferredValue(query.trim());

  const params = useMemo(
    () => ({
      page,
      limit,
      search: deferredQuery || undefined,
      sourceType,
      decision,
      currencyCode: currencyCode?.trim().toUpperCase() || undefined,
      finalized: queue === "finalized" ? true : undefined,
    }),
    [currencyCode, decision, deferredQuery, limit, page, queue, sourceType],
  );

  const reviewsQuery = useAdminSessionEarningReviews(params);
  const items = reviewsQuery.data?.items ?? [];
  const pagination = reviewsQuery.data?.pagination;

  const updateQuery = (updates: Record<string, QueryParamValue>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const queryString = next.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const hasFilters = Boolean(
    query ||
      sourceType ||
      decision ||
      currencyCode ||
      queue === "finalized" ||
      page !== 1 ||
      limit !== DEFAULT_PAGE_LIMIT,
  );

  const columns = useMemo<ColumnDef<AdminSessionEarningReviewListItem>[]>(() => [
    {
      id: "review",
      header: t("sessionEarningReviews.list.columns.review"),
      cell: (row) => (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-text-primary dark:text-white/95">{shortId(row.reviewId)}</span>
            <ReviewStatePill
              label={t(`sessionEarningReviews.sourceTypes.${getAdminSessionEarningReviewSourceTypeKey(row.sourceType).split(".")[1]}` as Parameters<typeof t>[0])}
              className={ADMIN_SESSION_EARNING_REVIEW_SOURCE_TYPE_STYLES[row.sourceType]}
            />
            <ReviewStatePill
              label={t(`sessionEarningReviews.statuses.${getAdminSessionEarningReviewStatusKey(row.reviewStatus).split(".")[1]}` as Parameters<typeof t>[0])}
              className={ADMIN_SESSION_EARNING_REVIEW_STATUS_STYLES[row.reviewStatus]}
            />
          </div>
          <p className="text-xs text-text-secondary">
            {t("sessionEarningReviews.list.columns.sessionCode")}{" "}
            <span className="font-mono text-[11px] text-text-muted">{row.session.sessionCode}</span>
          </p>
          <p className="text-xs text-text-secondary">
            {row.session.scheduledStartAt ? formatDateTime(locale, row.session.scheduledStartAt) : "-"}
            {row.session.scheduledEndAt ? ` • ${formatDateTime(locale, row.session.scheduledEndAt)}` : ""}
          </p>
        </div>
      ),
    },
    {
      id: "people",
      header: t("sessionEarningReviews.list.columns.people"),
      cell: (row) => (
        <div className="space-y-2">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-text-muted">
              {t("sessionEarningReviews.list.columns.practitioner")}
            </p>
            <p className="mt-1 font-semibold text-text-primary dark:text-white/95">
              {renderName(row.practitioner.displayName, row.practitioner.publicSlug)}
            </p>
            <p className="mt-1 text-xs text-text-secondary">{row.practitioner.professionalTitle ?? row.practitioner.publicSlug ?? row.practitioner.practitionerId}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-text-muted">
              {t("sessionEarningReviews.list.columns.patient")}
            </p>
            <p className="mt-1 font-semibold text-text-primary dark:text-white/95">
              {renderName(row.patient.displayName, row.patient.patientId)}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "money",
      header: t("sessionEarningReviews.list.columns.amounts"),
      cell: (row) => (
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-text-primary dark:text-white/95">
            {formatSettlementMoney(locale, row.paymentAmount, row.paymentCurrencyCode)}
          </p>
          <p className="text-xs leading-5 text-text-secondary">
            {t("sessionEarningReviews.list.columns.suggestedSplit")}{" "}
            {formatSettlementMoney(locale, row.suggestedPractitionerAmount, row.suggestedCurrencyCode)}{" "}
            / {formatSettlementMoney(locale, row.suggestedPlatformAmount, row.suggestedCurrencyCode)}
          </p>
          <p className="text-xs leading-5 text-text-secondary">
            {t("sessionEarningReviews.list.columns.finalSplit")}{" "}
            {row.finalPractitionerAmount && row.finalCurrencyCode
              ? `${formatSettlementMoney(locale, row.finalPractitionerAmount, row.finalCurrencyCode)} / ${formatSettlementMoney(locale, row.finalPlatformAmount ?? "0", row.finalCurrencyCode)}`
              : t("sessionEarningReviews.list.columns.unset")}
          </p>
        </div>
      ),
    },
    {
      id: "state",
      header: t("sessionEarningReviews.list.columns.state"),
      cell: (row) => (
        <div className="space-y-2">
          <ReviewStatePill
            label={t(`sessionEarningReviews.statuses.${getAdminSessionEarningReviewStatusKey(row.reviewStatus).split(".")[1]}` as Parameters<typeof t>[0])}
            className={ADMIN_SESSION_EARNING_REVIEW_STATUS_STYLES[row.reviewStatus]}
          />
          <ReviewStatePill
            label={t(`sessionEarningReviews.decisions.${getAdminSessionEarningReviewDecisionKey(row.reviewDecision).split(".")[1]}` as Parameters<typeof t>[0])}
            className={ADMIN_SESSION_EARNING_REVIEW_DECISION_STYLES[row.reviewDecision]}
          />
          <div className="flex flex-wrap gap-1.5">
            {row.isActionRequired ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                {t("sessionEarningReviews.list.badges.actionRequired")}
              </span>
            ) : null}
            {row.isFinalized ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                {t("sessionEarningReviews.list.badges.finalized")}
              </span>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      id: "audit",
      header: t("sessionEarningReviews.list.columns.audit"),
      cell: (row) => (
        <div className="space-y-2 text-sm text-text-secondary">
          <p>
            <span className="text-xs uppercase tracking-[0.14em] text-text-muted">
              {t("sessionEarningReviews.list.columns.reviewedBy")}
            </span>
            <br />
            <span className="font-medium text-text-primary dark:text-white/95">
              {row.reviewedBy?.displayName ?? t("sessionEarningReviews.detail.fallbacks.teamAdmin")}
            </span>
          </p>
          <p className="text-xs leading-5 text-text-muted">
            {row.reviewedAt ? formatDateTime(locale, row.reviewedAt) : t("sessionEarningReviews.list.columns.notYet")}
          </p>
          <p>
            <span className="text-xs uppercase tracking-[0.14em] text-text-muted">
              {t("sessionEarningReviews.list.columns.approvedBy")}
            </span>
            <br />
            <span className="font-medium text-text-primary dark:text-white/95">
              {row.approvedBy?.displayName ?? row.reviewedBy?.displayName ?? t("sessionEarningReviews.detail.fallbacks.teamAdmin")}
            </span>
          </p>
          <p className="text-xs leading-5 text-text-muted">
            {row.approvedAt ? formatDateTime(locale, row.approvedAt) : "-"}
          </p>
        </div>
      ),
    },
  ], [locale, t]);

  const queueLabel =
    queue === "finalized"
      ? t("sessionEarningReviews.list.queue.finalized")
      : t("sessionEarningReviews.list.queue.pending");

  return (
    <AdminOperationalListShell
      eyebrow={t("sessionEarningReviews.list.eyebrow")}
      title={t("sessionEarningReviews.list.title")}
      description={t("sessionEarningReviews.list.note")}
      tableTitle={t("sessionEarningReviews.list.table.title")}
      tableSubtitle={
        <span className="inline-flex items-center gap-2">
          <Clock3 className="h-3.5 w-3.5" />
          {queueLabel}
        </span>
      }
      filters={
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.8fr))]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("sessionEarningReviews.list.searchLabel")}
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  value={query}
                  onChange={(event) => updateQuery({ query: event.target.value || null, page: 1 })}
                  placeholder={t("sessionEarningReviews.list.searchPlaceholder")}
                  className="app-control w-full py-3 ps-11 pe-4"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("sessionEarningReviews.list.currencyLabel")}
              </span>
              <input
                value={currencyCode}
                onChange={(event) => updateQuery({ currencyCode: event.target.value || null, page: 1 })}
                placeholder={t("sessionEarningReviews.list.currencyPlaceholder")}
                className="app-control w-full py-3 uppercase"
                maxLength={3}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("sessionEarningReviews.list.sourceTypeLabel")}
              </span>
              <select
                value={sourceType ?? ""}
                onChange={(event) => updateQuery({ sourceType: event.target.value || null, page: 1 })}
                className="app-control w-full py-3"
              >
                <option value="">{t("sessionEarningReviews.list.sourceTypes.all")}</option>
                {SOURCE_TYPE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {t(`sessionEarningReviews.sourceTypes.${getAdminSessionEarningReviewSourceTypeKey(value).split(".")[1]}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("sessionEarningReviews.list.decisionLabel")}
              </span>
              <select
                value={decision ?? ""}
                onChange={(event) => updateQuery({ decision: event.target.value || null, page: 1 })}
                className="app-control w-full py-3"
              >
                <option value="">{t("sessionEarningReviews.list.decisions.all")}</option>
                {DECISION_OPTIONS.filter((value): value is SessionEarningReviewDecision => value !== "ALL").map((value) => (
                  <option key={value} value={value}>
                    {t(`sessionEarningReviews.decisions.${getAdminSessionEarningReviewDecisionKey(value).split(".")[1]}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["pending", t("sessionEarningReviews.list.queue.pending")],
                ["finalized", t("sessionEarningReviews.list.queue.finalized")],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => updateQuery({ queue: value, page: 1 })}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  queue === value
                    ? "border-primary/25 bg-primary-light/45 text-primary dark:bg-primary/15"
                    : "border-border-light bg-white text-text-secondary hover:border-primary/20 hover:text-text-primary dark:border-white/8 dark:bg-surface-secondary dark:text-white/75"
                }`}
              >
                {label}
              </button>
            ))}

            {hasFilters ? (
              <FilterClearButton
                onClick={() =>
                  updateQuery({
                    queue: "pending",
                    query: null,
                    sourceType: null,
                    decision: null,
                    currencyCode: null,
                    page: 1,
                    limit: DEFAULT_PAGE_LIMIT,
                  })
                }
              />
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {query ? (
              <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary-light/20 px-3 py-1 text-xs font-semibold text-primary dark:border-primary/20 dark:bg-primary/10">
                {t("sessionEarningReviews.list.filters.search")} : {query}
              </span>
            ) : null}
            {sourceType ? (
              <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary-light/20 px-3 py-1 text-xs font-semibold text-primary dark:border-primary/20 dark:bg-primary/10">
                {t("sessionEarningReviews.list.filters.sourceType")} : {t(`sessionEarningReviews.sourceTypes.${getAdminSessionEarningReviewSourceTypeKey(sourceType).split(".")[1]}` as Parameters<typeof t>[0])}
              </span>
            ) : null}
            {decision ? (
              <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary-light/20 px-3 py-1 text-xs font-semibold text-primary dark:border-primary/20 dark:bg-primary/10">
                {t("sessionEarningReviews.list.filters.decision")} : {t(`sessionEarningReviews.decisions.${getAdminSessionEarningReviewDecisionKey(decision).split(".")[1]}` as Parameters<typeof t>[0])}
              </span>
            ) : null}
            {currencyCode ? (
              <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary-light/20 px-3 py-1 text-xs font-semibold text-primary dark:border-primary/20 dark:bg-primary/10">
                {t("sessionEarningReviews.list.filters.currency")} : {currencyCode.toUpperCase()}
              </span>
            ) : null}
          </div>
        </div>
      }
    >
      <DataTable
        data={items}
        columns={columns}
        getRowId={(row) => row.reviewId}
        loading={reviewsQuery.isLoading}
        loadingRows={limit}
        error={reviewsQuery.isError ? t("sessionEarningReviews.list.errorDescription") : null}
        errorState={{
          title: t("sessionEarningReviews.list.errorTitle"),
          description: t("sessionEarningReviews.list.errorDescription"),
          action: {
            label: t("sessionEarningReviews.list.errorRetry"),
            onClick: () => reviewsQuery.refetch(),
          },
        }}
        emptyState={{
          icon: <Sparkles className="h-5 w-5 text-primary" />,
          title: t("sessionEarningReviews.list.emptyTitle"),
          description: t("sessionEarningReviews.list.emptyDescription"),
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
        onPageChange={(nextPage) => updateQuery({ page: nextPage })}
        onPageSizeChange={(nextLimit) => updateQuery({ page: 1, limit: nextLimit })}
        pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
        onRowClick={(row) => router.push(`/admin/finance/session-earning-reviews/${row.reviewId}` as never)}
        rowActions={(row) => (
          <Link
            href={`/admin/finance/session-earning-reviews/${row.reviewId}`}
            className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:bg-brand-25 dark:bg-surface-secondary dark:text-white/95 dark:hover:bg-surface-tertiary"
          >
            {t("sessionEarningReviews.list.actions.viewDetails")}
          </Link>
        )}
        rowActionsHeader={t("sessionEarningReviews.list.columns.actions")}
        ariaLabel={t("sessionEarningReviews.list.title")}
        caption={t("sessionEarningReviews.list.table.title")}
      />
    </AdminOperationalListShell>
  );
}
