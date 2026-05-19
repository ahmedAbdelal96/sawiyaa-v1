"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Search, Eye, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import InputField from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useDebouncedValue } from "@/hooks/use-debounce";
import type { AdminPatientListItem } from "../types/admin-patients.types";
import { useAdminPatients } from "../hooks/use-admin-patients";

const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "SUSPENDED"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : status.startsWith("PENDING")
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : "bg-surface-secondary text-text-secondary border-border-light";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {status}
    </span>
  );
}

export default function AdminPatientsDirectory() {
  const tNav = useTranslations("navigation");
  const t = useTranslations("admin-patients");
  const locale = useLocale();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "active" | "inactive" | "suspended" | "pending">("");
  const [onboarding, setOnboarding] = useState<"all" | "completed" | "incomplete">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_LIMIT);

  const debouncedSearch = useDebouncedValue(search, 300);

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      status: status || undefined,
      onboarding,
      page,
      limit: pageSize,
    }),
    [debouncedSearch, onboarding, page, pageSize, status],
  );

  const { data, isLoading, isError, refetch } = useAdminPatients(queryParams);
  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const stats = data?.stats;
  const hasActiveFilters = Boolean(search.trim()) || Boolean(status) || onboarding !== "all";
  const statusFilterLabel =
    status === "active"
      ? t("filters.statusActive")
      : status === "pending"
        ? t("filters.statusPending")
        : status === "suspended"
          ? t("filters.statusSuspended")
          : status === "inactive"
            ? t("filters.statusInactive")
            : null;
  const onboardingFilterLabel =
    onboarding === "completed"
      ? t("filters.onboardingCompleted")
      : onboarding === "incomplete"
        ? t("filters.onboardingIncomplete")
        : null;
  const activeFilterChips = [
    search.trim() ? { id: "search", label: `${t("filters.search")}: ${search.trim()}` } : null,
    statusFilterLabel ? { id: "status", label: `${t("filters.status")}: ${statusFilterLabel}` } : null,
    onboardingFilterLabel
      ? { id: "onboarding", label: `${t("filters.onboarding")}: ${onboardingFilterLabel}` }
      : null,
  ].filter(Boolean) as Array<{ id: string; label: string }>;
  
  const openDetails = (patientId: string) => {
    // next-intl router auto-prefixes the active locale (localePrefix: 'always')
    if (typeof window !== "undefined" && localStorage.getItem("debug.adminPatients") === "1") {
      // eslint-disable-next-line no-console
      console.debug("[adminPatients] navigate to patient", {
        from: window.location.pathname,
        to: `/admin/patients/${patientId}`,
      });
    }
    router.push(`/admin/patients/${patientId}` as any);
  };

  const columns = useMemo<ColumnDef<AdminPatientListItem>[]>(
    () => [
      {
        id: "name",
        header: t("table.name"),
        accessor: (row) => row.displayName ?? row.primaryEmail ?? row.primaryPhone ?? row.userId,
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
              {row.displayName ?? t("table.unknownName")}
            </p>
            <p className="mt-1 truncate text-xs text-text-muted">
              {row.primaryEmail ?? row.primaryPhone ?? row.userId}
            </p>
          </div>
        ),
      },
      {
        id: "country",
        header: t("table.country"),
        accessor: (row) => row.countryCode ?? "-",
        hideOnMobile: true,
      },
      {
        id: "onboarding",
        header: t("table.onboarding"),
        accessor: (row) => (row.onboardingCompletedAt ? "COMPLETED" : "INCOMPLETE"),
        cell: (row) =>
          row.onboardingCompletedAt ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {t("states.completed")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              {t("states.incomplete")}
            </span>
          ),
      },
      {
        id: "status",
        header: t("table.status"),
        accessor: (row) => row.status,
        cell: (row) => <StatusPill status={row.status} />,
        hideOnMobile: true,
      },
      {
        id: "createdAt",
        header: t("table.createdAt"),
        accessor: (row) => row.createdAt,
        cell: (row) => (
          <span className="text-sm text-text-secondary">
            {new Date(row.createdAt).toLocaleDateString(locale)}
          </span>
        ),
        hideOnMobile: true,
      },
    ],
    [locale, t],
  );

  const resetToFirstPage = () => setPage(1);

  return (
    <>
      <AdminOperationalListShell
        eyebrow={tNav("main.title")}
        title={tNav("main.patients")}
        description={t("description")}
        summaryCards={
          stats ? (
            <>
              <AdminSummaryCard
                label={t("cards.total")}
                value={pagination?.totalItems ?? 0}
                hint={t("cards.totalHint")}
                icon={<Users className="h-4 w-4" />}
                tone="primary"
              />
              <AdminSummaryCard
                label={t("cards.completed")}
                value={stats.completedOnboarding}
                hint={t("cards.completedHint")}
                icon={<CheckCircle2 className="h-4 w-4" />}
                tone="success"
              />
              <AdminSummaryCard
                label={t("cards.incomplete")}
                value={stats.incompleteOnboarding}
                hint={t("cards.incompleteHint")}
                icon={<AlertCircle className="h-4 w-4" />}
                tone="warning"
              />
            </>
          ) : null
        }
        filters={
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-end gap-2 border-b border-border-light/70 pb-5">
              {activeFilterChips.length > 0
                ? activeFilterChips.map((chip) => (
                    <span
                      key={chip.id}
                      className="app-chip rounded-full px-3 py-1.5 text-xs text-text-secondary dark:text-white/80"
                    >
                      {chip.label}
                    </span>
                  ))
                : null}

              {hasActiveFilters ? (
                <FilterClearButton
                  disabled={false}
                  onClick={() => {
                    setSearch("");
                    setStatus("");
                    setOnboarding("all");
                    setPage(1);
                  }}
                />
              ) : null}

              {isError ? (
                <button
                  type="button"
                  className="rounded-2xl border border-border-light bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/30 hover:bg-primary-light dark:bg-white/5"
                  onClick={() => refetch()}
                >
                  {t("actions.retry")}
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label>{t("filters.search")}</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-muted">
                    <Search className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <InputField
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      resetToFirstPage();
                    }}
                    placeholder={t("filters.searchPlaceholder")}
                    className="ps-10"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>{t("filters.status")}</Label>
                <select
                  className="app-control h-11 w-full rounded-2xl px-3"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as any);
                    resetToFirstPage();
                  }}
                >
                  <option value="">{t("filters.statusAll")}</option>
                  <option value="active">{t("filters.statusActive")}</option>
                  <option value="pending">{t("filters.statusPending")}</option>
                  <option value="suspended">{t("filters.statusSuspended")}</option>
                  <option value="inactive">{t("filters.statusInactive")}</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>{t("filters.onboarding")}</Label>
                <select
                  className="app-control h-11 w-full rounded-2xl px-3"
                  value={onboarding}
                  onChange={(e) => {
                    setOnboarding(e.target.value as any);
                    resetToFirstPage();
                  }}
                >
                  <option value="all">{t("filters.onboardingAll")}</option>
                  <option value="completed">{t("filters.onboardingCompleted")}</option>
                  <option value="incomplete">{t("filters.onboardingIncomplete")}</option>
                </select>
              </div>
            </div>
          </div>
        }
      >
        <DataTable
          data={items}
          columns={columns}
          getRowId={(row) => row.id}
          loading={isLoading}
          error={isError ? t("states.error") : null}
          emptyState={{
            title: t("states.emptyTitle"),
            description: t("states.emptyDescription"),
          }}
          pagination={pagination}
          onPageChange={(next) => setPage(next)}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          rowActionsHeader={t("table.actions")}
          rowActions={(row) => (
            <div className="flex items-center justify-end gap-2">
              <ActionIconButton
                label={t("actions.view")}
                intent="view"
                icon={<Eye className="h-4 w-4" />}
                onClick={() => openDetails(row.id)}
              />
            </div>
          )}
          onRowClick={(row) => openDetails(row.id)}
          hoverable
        />
      </AdminOperationalListShell>
    </>
  );
}
