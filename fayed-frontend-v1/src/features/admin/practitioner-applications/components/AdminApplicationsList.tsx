"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Edit3, Eye, FilePlus2, Plus, Search } from "lucide-react";
import { useAdminPractitionerApplications } from "../hooks/use-practitioner-applications";
import { useAdminCountries } from "@/features/admin/patients/hooks/use-admin-patients";
import { resolveCountryLabel } from "@/features/admin/shared/utils/resolve-country-label";
import { DataTable } from "@/components/ui/data-table";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import type { ColumnDef, SortConfig } from "@/components/ui/data-table";
import {
  buildUpdatedSearchParams,
  parseEnumParam,
  parsePositiveIntParam,
  parseTextParam,
} from "@/components/ui/data-table";
import { useDebouncedValue } from "@/hooks/use-debounce";
import Button from "@/components/ui/button/Button";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import type { PractitionerApplicationStatus, PractitionerType } from "@/features/practitioners/types/practitioners.types";
import type {
  PractitionerApplicationKind,
  PractitionerApplicationListItem,
} from "../types/practitioner-applications.types";

const statusColour: Record<PractitionerApplicationStatus, string> = {
  DRAFT: "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/70",
  SUBMITTED: "bg-sky-50 text-sky-700 dark:bg-sky-500/12 dark:text-sky-300",
  UNDER_REVIEW: "bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-300",
  APPROVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300",
  REJECTED: "bg-rose-50 text-rose-700 dark:bg-rose-500/12 dark:text-rose-300",
  CHANGES_REQUESTED: "bg-orange-50 text-orange-700 dark:bg-orange-500/12 dark:text-orange-300",
  ARCHIVED: "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/55",
};

type FilterView = "ACTIVE" | "HISTORY" | "ALL";
type FilterStatus = PractitionerApplicationStatus | "ALL";

const FILTER_VIEWS: FilterView[] = ["ACTIVE", "HISTORY", "ALL"];
const FILTER_STATUSES: FilterStatus[] = [
  "ALL",
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
];

type FilterKind = PractitionerApplicationKind | "ALL";

const KIND_FILTER_TABS: FilterKind[] = ["ALL", "NEW_APPLICATION", "EDIT_REQUEST"];

const kindColour: Record<PractitionerApplicationKind, string> = {
  NEW_APPLICATION: "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  EDIT_REQUEST: "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
};

const SORTABLE_COLUMNS = ["applicant", "submittedAt", "updatedAt", "status"] as const;
type SortableApplicationsColumn = (typeof SORTABLE_COLUMNS)[number];

export default function AdminApplicationsList() {
  const t = useTranslations("admin-area");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeView = parseEnumParam<FilterView>(
    searchParams.get("view"),
    FILTER_VIEWS,
    "ACTIVE"
  );
  const activeStatusFilter = parseEnumParam<FilterStatus>(
    searchParams.get("status"),
    FILTER_STATUSES,
    "ALL"
  );
  const activeKindFilter = parseEnumParam<FilterKind>(
    searchParams.get("kind"),
    KIND_FILTER_TABS,
    "ALL"
  );
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 50,
  });
  const searchQuery = parseTextParam(searchParams.get("q"), { maxLength: 80 });

  const sortColumn = parseEnumParam<SortableApplicationsColumn>(
    searchParams.get("sortBy"),
    SORTABLE_COLUMNS,
    "submittedAt"
  );
  const sortDirection = parseEnumParam<"asc" | "desc">(
    searchParams.get("sortDir"),
    ["asc", "desc"],
    "desc"
  );
  const sortConfig: SortConfig = { column: sortColumn, direction: sortDirection };

  const hasActiveFilters =
    activeView !== "ACTIVE" ||
    activeStatusFilter !== "ALL" ||
    activeKindFilter !== "ALL" ||
    Boolean(searchQuery.trim());
  const [searchInput, setSearchInput] = useState(searchQuery);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const normalized = debouncedSearch.trim();
    if (normalized === searchQuery) return;
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), {
      q: normalized || null,
      page: 1,
    });
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedSearch, pathname, router, searchParams, searchQuery]);

  const params = {
    view: activeView,
    status: activeStatusFilter === "ALL" ? undefined : activeStatusFilter,
    kind: activeKindFilter === "ALL" ? undefined : activeKindFilter,
    q: searchQuery || undefined,
    page,
    limit,
  };

  const { data, isLoading, isError, refetch } = useAdminPractitionerApplications(params, true);
  const { data: countries = [] } = useAdminCountries();

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const columns = useMemo<ColumnDef<PractitionerApplicationListItem>[]>(
    () => [
      {
        id: "applicant",
        header: t("applications.table.applicant"),
        accessor: (row) => row.displayName ?? t("applications.table.noName"),
        align: "start",
        sortable: true,
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary dark:text-white">
              {row.displayName ?? t("applications.table.noName")}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {resolveCountryLabel(row.countryCode, countries, locale)}
            </p>
          </div>
        ),
      },
      {
        id: "kind",
        header: t("applications.table.kind"),
        accessor: (row) => row.applicationKind,
        align: "center",
        cell: (row) => (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${kindColour[row.applicationKind]}`}
          >
            {t(`applications.table.kindLabels.${row.applicationKind}`)}
          </span>
        ),
      },
      {
        id: "type",
        header: t("applications.table.type"),
        accessor: (row) => t(`practitionerType.${row.practitionerType as PractitionerType}`),
        align: "center",
      },
      {
        id: "specialty",
        header: t("applications.table.specialty"),
        accessor: (row) => row.mainSpecialty?.title ?? "-",
        align: "start",
        hideOnMobile: true,
      },
      {
        id: "submittedAt",
        header: t("applications.table.submittedAt"),
        accessor: (row) => (row.submittedAt ? new Date(row.submittedAt).getTime() : null),
        align: "center",
        hideOnMobile: true,
        sortable: true,
        cell: (row) => (row.submittedAt ? new Date(row.submittedAt).toLocaleDateString(locale) : "-"),
      },
      {
        id: "updatedAt",
        header: t("applications.table.updatedAt"),
        accessor: (row) => new Date(row.updatedAt).getTime(),
        align: "center",
        hideOnMobile: true,
        sortable: true,
        cell: (row) => new Date(row.updatedAt).toLocaleDateString(locale),
      },
      {
        id: "status",
        header: t("applications.table.status"),
        accessor: (row) => row.applicationStatus,
        align: "center",
        sortable: true,
        cell: (row) => (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColour[row.applicationStatus]}`}>
            {t(`status.${row.applicationStatus}`)}
          </span>
        ),
      },
    ],
    [locale, t, countries]
  );

  const applications = data?.applications ?? [];
  const pagination = data?.pagination;
  const summary = data?.summary;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0;

  return (
    <AdminOperationalListShell
      title={t("applications.title")}
      description={t("applications.directCreate.note")}
      actions={
        <Button
          onClick={() => router.push("/admin/practitioner-applications/create" as never)}
          startIcon={<Plus className="h-4 w-4" />}
        >
          {t("applications.directCreate.openAction")}
        </Button>
      }
      summaryCards={
        <>
          <AdminSummaryCard
            metricKey="applications.total"
            label={t("applications.summary.total")}
            value={typeof summary?.total === "number" ? summary.total : "..."}
            hint={t("applications.summary.totalHint")}
            tone="primary"
          />
          <AdminSummaryCard
            metricKey="applications.pending"
            label={t("applications.summary.active")}
            value={typeof summary?.activeApplications === "number" ? summary.activeApplications : "..."}
            hint={t("applications.summary.activeHint")}
            tone="success"
            icon={<FilePlus2 className="h-5 w-5" />}
          />
          <AdminSummaryCard
            metricKey="applications.new"
            label={t("applications.summary.new")}
            value={typeof summary?.newApplications === "number" ? summary.newApplications : "..."}
            hint={t("applications.summary.newHint")}
            tone="primary"
            icon={<FilePlus2 className="h-5 w-5" />}
          />
          <AdminSummaryCard
            metricKey="applications.editrequests"
            label={t("applications.summary.edit")}
            value={typeof summary?.editRequests === "number" ? summary.editRequests : "..."}
            hint={t("applications.summary.editHint")}
            tone="success"
            icon={<Edit3 className="h-5 w-5" />}
          />
          <AdminSummaryCard
            metricKey="applications.approved"
            label={t("applications.summary.approvedHistory")}
            value={typeof summary?.approvedApplications === "number" ? summary.approvedApplications : "..."}
            hint={t("applications.summary.approvedHistoryHint")}
            tone="success"
          />
          <AdminSummaryCard
            metricKey="applications.rejected"
            label={t("applications.summary.rejectedHistory")}
            value={typeof summary?.rejectedApplications === "number" ? summary.rejectedApplications : "..."}
            hint={t("applications.summary.rejectedHistoryHint")}
            tone="warning"
          />
        </>
      }
      filters={
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <div className="block md:col-span-2 lg:col-span-6">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("applications.filters.view")}
            </span>
            <div className="flex flex-wrap gap-2">
              {FILTER_VIEWS.map((filter) => {
                const isActive = activeView === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() =>
                      updateListQuery({
                        view: filter === "ACTIVE" ? null : filter,
                        page: 1,
                      })
                    }
                    className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? "border-primary/30 bg-primary-light text-text-brand dark:border-primary/40 dark:bg-primary/12 dark:text-primary-light"
                        : "border-border-light bg-surface-subtle text-text-secondary hover:border-primary/25 hover:text-text-primary dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70"
                    }`}
                  >
                    {t(`applications.filters.viewTabs.${filter}`)}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("applications.table.status")}
            </span>
            <select
              value={activeStatusFilter}
              onChange={(event) => {
                const nextStatus = event.target.value as FilterStatus;
                updateListQuery({
                  status: nextStatus === "ALL" ? null : nextStatus,
                  view: nextStatus === "ALL" ? undefined : "ALL",
                  page: 1,
                });
              }}
              className="app-control w-full px-4 py-3"
            >
              {FILTER_STATUSES.map((filter) => (
                <option key={filter} value={filter}>
                  {filter === "ALL"
                    ? t("applications.filters.all")
                    : t(`applications.filters.${filter as PractitionerApplicationStatus}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2 lg:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("applications.filters.search")}
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t("applications.filters.searchPlaceholder")}
                className="app-control w-full py-3 pe-4 ps-10"
              />
            </div>
          </label>
          <div className="block md:col-span-2 lg:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("applications.filters.kind")}
            </span>
            <div className="flex flex-wrap gap-2">
              {KIND_FILTER_TABS.map((filter) => {
                const isActive = activeKindFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() =>
                      updateListQuery({
                        kind: filter === "ALL" ? null : filter,
                        page: 1,
                      })
                    }
                    className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? "border-primary/30 bg-primary-light text-text-brand dark:border-primary/40 dark:bg-primary/12 dark:text-primary-light"
                        : "border-border-light bg-surface-subtle text-text-secondary hover:border-primary/25 hover:text-text-primary dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70"
                    }`}
                  >
                    {filter === "ALL"
                      ? t("applications.filters.all")
                      : t(`applications.filters.kindTabs.${filter}`)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end md:col-span-2 lg:col-span-6">
            <FilterClearButton
              disabled={!hasActiveFilters}
              onClick={() =>
                updateListQuery({
                  view: null,
                  status: null,
                  kind: null,
                  q: null,
                  page: 1,
                })
              }
            />
          </div>
        </div>
      }
    >
      <DataTable
        data={applications}
        columns={columns}
        getRowId={(row) => row.applicationId}
        loading={isLoading}
        error={isError ? t("applications.feedback.loadError") : null}
        errorState={{
          title: t("applications.feedback.loadError"),
          action: { label: t("applications.feedback.retry"), onClick: () => refetch() },
        }}
        sortConfig={sortConfig}
        onSortChange={(nextSort) =>
          updateListQuery({ sortBy: nextSort.column, sortDir: nextSort.direction })
        }
        onRowClick={(row) => router.push(`/admin/practitioner-applications/${row.applicationId}` as never)}
        rowActionsHeader={t("applications.table.actions")}
        rowActions={(row) => (
          <ActionIconButton
            intent="view"
            label={t("applications.table.viewAction")}
            icon={<Eye className="h-4 w-4" />}
            onClick={() => router.push(`/admin/practitioner-applications/${row.applicationId}` as never)}
          />
        )}
        pagination={
          pagination
            ? {
                page: pagination.page,
                limit: pagination.limit,
                total: pagination.total,
                totalPages,
                hasPrevPage: pagination.page > 1,
                hasNextPage: pagination.page < totalPages,
              }
            : undefined
        }
        onPageChange={(nextPage) => updateListQuery({ page: nextPage })}
        onPageSizeChange={(nextLimit) => updateListQuery({ limit: nextLimit, page: 1 })}
        pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
        emptyState={{ title: t("applications.empty") }}
        ariaLabel={t("applications.title")}
        caption={t("applications.title")}
      />
    </AdminOperationalListShell>
  );
}
