"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Search, Eye, Users, CheckCircle2, AlertCircle, Globe } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Label from "@/components/form/Label";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useDebouncedValue } from "@/hooks/use-debounce";
import type { AdminPatientListItem } from "../types/admin-patients.types";
import { useAdminCountries, useAdminPatients } from "../hooks/use-admin-patients";
import { resolveCountryLabel } from "@/features/admin/shared/utils/resolve-country-label";
import { AdminPatientCountryChangeModal } from "./AdminPatientCountryChangeModal";

const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;

function StatusPill({ status, t }: { status: string; t: any }) {
  const tone =
    status === "ACTIVE"
      ? "border-status-success-border bg-status-success-soft text-status-success"
      : status === "SUSPENDED"
        ? "border-status-danger-border bg-status-danger-soft text-status-danger"
        : status.startsWith("PENDING")
          ? "border-status-warning-border bg-status-warning-soft text-status-warning"
          : "border-border-light bg-surface-tertiary text-text-secondary";

  const normalized = status.toUpperCase();
  let label = status;
  if (normalized === "ACTIVE") {
    label = t("filters.statusActive");
  } else if (normalized === "INACTIVE") {
    label = t("filters.statusInactive");
  } else if (normalized === "SUSPENDED" || normalized === "BLOCKED") {
    label = t("filters.statusSuspended");
  } else if (normalized.startsWith("PENDING")) {
    label = t("filters.statusPending");
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
      {label}
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
  const [countryChangePatient, setCountryChangePatient] = useState<AdminPatientListItem | null>(null);

  const statusOptions = useMemo(() => [
    { value: "", label: t("filters.statusAll") },
    { value: "active", label: t("filters.statusActive") },
    { value: "pending", label: t("filters.statusPending") },
    { value: "suspended", label: t("filters.statusSuspended") },
    { value: "inactive", label: t("filters.statusInactive") }
  ], [t]);

  const onboardingOptions = useMemo(() => [
    { value: "all", label: t("filters.onboardingAll") },
    { value: "completed", label: t("filters.onboardingCompleted") },
    { value: "incomplete", label: t("filters.onboardingIncomplete") }
  ], [t]);

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

  const { data: countries = [] } = useAdminCountries();
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
        align: "start",
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">
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
        accessor: (row) => resolveCountryLabel(row.countryCode, countries, locale),
        align: "center",
        cell: (row) => (
          <span className="text-sm text-text-primary">
            {resolveCountryLabel(row.countryCode, countries, locale)}
          </span>
        ),
        hideOnMobile: true,
      },
      {
        id: "onboarding",
        header: t("table.onboarding"),
        accessor: (row) => (row.onboardingCompletedAt ? "COMPLETED" : "INCOMPLETE"),
        align: "center",
        cell: (row) =>
          row.onboardingCompletedAt ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-status-success-border bg-status-success-soft px-2 py-0.5 text-xs font-semibold text-status-success">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t("states.completed")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-status-warning-border bg-status-warning-soft px-2 py-0.5 text-xs font-semibold text-status-warning">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              {t("states.incomplete")}
            </span>
          ),
      },
      {
        id: "status",
        header: t("table.status"),
        accessor: (row) => row.status,
        align: "center",
        cell: (row) => <StatusPill status={row.status} t={t} />,
        hideOnMobile: true,
      },
      {
        id: "createdAt",
        header: t("table.createdAt"),
        accessor: (row) => row.createdAt,
        align: "center",
        cell: (row) => (
          <span className="text-sm text-text-secondary">
            {new Date(row.createdAt).toLocaleDateString(locale)}
          </span>
        ),
        hideOnMobile: true,
      },
    ],
    [locale, t, countries],
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
                      className="app-chip rounded-full px-3 py-1.5 text-xs text-text-secondary"
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
                  className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-surface-tertiary"
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
                    className="ps-10 bg-surface-tertiary dark:bg-surface-tertiary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>{t("filters.status")}</Label>
                <Select
                  key={`statusFilter-${status}`}
                  defaultValue={status}
                  onChange={(value) => {
                    setStatus(value as any);
                    resetToFirstPage();
                  }}
                  options={statusOptions}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>{t("filters.onboarding")}</Label>
                <Select
                  key={`onboardingFilter-${onboarding}`}
                  defaultValue={onboarding}
                  onChange={(value) => {
                    setOnboarding(value as any);
                    resetToFirstPage();
                  }}
                  options={onboardingOptions}
                />
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
            <div className="inline-flex items-center justify-center gap-1.5">
              <ActionIconButton
                label={t("actions.changeCountry")}
                intent="neutral"
                icon={<Globe className="h-4 w-4" />}
                onClick={() => setCountryChangePatient(row)}
              />
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

      {countryChangePatient && (
        <AdminPatientCountryChangeModal
          patient={countryChangePatient}
          isOpen={true}
          onClose={() => setCountryChangePatient(null)}
        />
      )}
    </>
  );
}
