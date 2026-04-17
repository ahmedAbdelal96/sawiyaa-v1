"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Eye, Plus, Search } from "lucide-react";
import { useAdminPractitionerApplications } from "../hooks/use-practitioner-applications";
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
import type { PractitionerApplicationListItem } from "../types/practitioner-applications.types";

const statusColour: Record<PractitionerApplicationStatus, string> = {
  DRAFT: "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/70",
  SUBMITTED: "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  UNDER_REVIEW: "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  APPROVED: "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  REJECTED: "bg-error-50 text-error-700 dark:bg-error-500/12 dark:text-error-400",
  CHANGES_REQUESTED: "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  ARCHIVED: "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/55",
};

type FilterStatus = PractitionerApplicationStatus | "ALL";

const FILTER_TABS: FilterStatus[] = [
  "ALL",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "CHANGES_REQUESTED",
  "ARCHIVED",
];

const SORTABLE_COLUMNS = ["applicant", "submittedAt", "updatedAt", "status"] as const;
type SortableApplicationsColumn = (typeof SORTABLE_COLUMNS)[number];

export default function AdminApplicationsList() {
  const t = useTranslations("admin-area");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeFilter = parseEnumParam<FilterStatus>(
    searchParams.get("status"),
    FILTER_TABS,
    "SUBMITTED"
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

  const hasActiveFilters = activeFilter !== "SUBMITTED" || Boolean(searchQuery.trim());
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

  const params =
    activeFilter === "ALL"
      ? { q: searchQuery || undefined, page, limit }
      : {
          status: activeFilter as PractitionerApplicationStatus,
          q: searchQuery || undefined,
          page,
          limit,
        };

  const { data, isLoading, isError, refetch } = useAdminPractitionerApplications(params, true);

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const columns = useMemo<ColumnDef<PractitionerApplicationListItem>[]>(
    () => [
      {
        id: "applicant",
        header: "Applicant",
        accessor: (row) => row.displayName ?? t("applications.table.noName"),
        sortable: true,
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary dark:text-white">
              {row.displayName ?? t("applications.table.noName")}
            </p>
            <p className="mt-1 text-xs text-text-muted">{row.countryCode ?? "-"}</p>
          </div>
        ),
      },
      {
        id: "type",
        header: "Type",
        accessor: (row) => t(`practitionerType.${row.practitionerType as PractitionerType}`),
      },
      {
        id: "specialty",
        header: "Specialty",
        accessor: (row) => row.mainSpecialty?.title ?? "-",
        hideOnMobile: true,
      },
      {
        id: "submittedAt",
        header: "Submitted",
        accessor: (row) => (row.submittedAt ? new Date(row.submittedAt).getTime() : null),
        hideOnMobile: true,
        sortable: true,
        cell: (row) => (row.submittedAt ? new Date(row.submittedAt).toLocaleDateString(locale) : "-"),
      },
      {
        id: "updatedAt",
        header: "Updated",
        accessor: (row) => new Date(row.updatedAt).getTime(),
        hideOnMobile: true,
        sortable: true,
        cell: (row) => new Date(row.updatedAt).toLocaleDateString(locale),
      },
      {
        id: "status",
        header: "Status",
        accessor: (row) => row.applicationStatus,
        sortable: true,
        cell: (row) => (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColour[row.applicationStatus]}`}>
            {t(`status.${row.applicationStatus}`)}
          </span>
        ),
      },
    ],
    [locale, t]
  );

  const applications = data?.applications ?? [];
  const pagination = data?.pagination;
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
        <AdminSummaryCard
          label={t("applications.title")}
          value={typeof pagination?.total === "number" ? pagination.total : "..."}
          tone="primary"
        />
      }
      filters={
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="block md:col-span-2">
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
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("applications.table.status")}
            </span>
            <select
              value={activeFilter}
              onChange={(event) =>
                updateListQuery({
                  status: event.target.value === "SUBMITTED" ? null : event.target.value,
                  page: 1,
                })
              }
              className="app-control w-full px-4 py-3"
            >
              {FILTER_TABS.map((filter) => (
                <option key={filter} value={filter}>
                  {filter === "ALL"
                    ? t("applications.filters.all")
                    : t(`applications.filters.${filter as PractitionerApplicationStatus}`)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end md:col-span-2 lg:col-span-3">
            <FilterClearButton
              disabled={!hasActiveFilters}
              onClick={() =>
                updateListQuery({
                  status: null,
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
