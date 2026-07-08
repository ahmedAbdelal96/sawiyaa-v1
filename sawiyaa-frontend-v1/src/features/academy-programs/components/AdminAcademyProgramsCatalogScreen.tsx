"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { BookOpenText, Plus, Sparkles } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import {
  buildUpdatedSearchParams,
  parseEnumParam,
  parsePositiveIntParam,
  parseTextParam,
} from "@/components/ui/data-table";
import AdminOperationalListShell, {
  AdminSummaryCard,
} from "@/components/shared/admin/AdminOperationalListShell";
import Button from "@/components/ui/button/Button";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useAuthState } from "@/stores/auth-store";
import { AdminTableSection } from "@/components/shared/admin/AdminDashboardKit";
import { useAdminAcademyPrograms } from "../hooks/use-academy-programs";
import {
  resolveAcademyProgramCategoryTitle,
  resolveAcademyProgramDescription,
  resolveAcademyProgramTitle,
} from "../lib/academy-program-localization";
import type { AcademyProgramItem, AcademyProgramStatus } from "../types/academy-programs.types";
import AdminAcademyProgramFormModal from "./AdminAcademyProgramFormModal";

const STATUS_FILTERS = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const PAGE_LIMIT = 12;

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function formatCurrency(
  amount: string | null | undefined,
  currency: string | null | undefined,
  locale: string,
) {
  if (!amount || !currency) {
    return null;
  }

  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    return `${amount} ${currency}`;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(numeric);
}

function formatDateRange(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
  locale: string,
) {
  const start = formatDateTime(startsAt, locale);
  const end = formatDateTime(endsAt, locale);

  if (start === "—" && end === "—") {
    return "—";
  }

  return `${start} → ${end}`;
}

function getStatusTone(status: AcademyProgramStatus) {
  if (status === "PUBLISHED") return "border-status-success-border bg-status-success-soft text-status-success";
  if (status === "ARCHIVED") return "border-border-light bg-surface-tertiary text-text-muted";
  return "border-status-warning-border bg-status-warning-soft text-status-warning";
}

function ProgramSearchField({
  initialQuery,
  placeholder,
  onCommit,
}: {
  initialQuery: string;
  placeholder: string;
  onCommit: (value: string) => void;
}) {
  const [search, setSearch] = useState(initialQuery);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    onCommit(debouncedSearch);
  }, [debouncedSearch, onCommit]);

  return <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder} />;
}

export default function AdminAcademyProgramsCatalogScreen() {
  const t = useTranslations("academy");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthState();
  const canManage = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const statusFilter = parseEnumParam<(typeof STATUS_FILTERS)[number]>(
    searchParams.get("status"),
    STATUS_FILTERS,
    "ALL",
  );
  const initialQuery = parseTextParam(searchParams.get("q"), { maxLength: 120 });
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), PAGE_LIMIT, {
    min: 1,
    max: 40,
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const commitSearch = useCallback(
    (nextSearch: string) => {
      const normalized = nextSearch.trim();
      if (normalized === initialQuery) {
        return;
      }

      const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), {
        q: normalized || null,
        page: 1,
      });
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [initialQuery, pathname, router, searchParams],
  );

  const programsQuery = useAdminAcademyPrograms({
    page,
    limit,
    ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
    ...(initialQuery.trim() ? { q: initialQuery.trim() } : {}),
  });

  const data = programsQuery.data;
  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const hasActiveFilters = statusFilter !== "ALL" || Boolean(initialQuery.trim());

  const stats = useMemo(
    () => ({
      total: data?.pagination.totalItems ?? 0,
      published: items.filter((item) => item.status === "PUBLISHED").length,
      drafts: items.filter((item) => item.status === "DRAFT").length,
      archived: items.filter((item) => item.status === "ARCHIVED").length,
    }),
    [data?.pagination.totalItems, items],
  );

  const columns: ColumnDef<AcademyProgramItem>[] = [
    {
      id: "title",
      header: t("programs.list.columns.title"),
      accessor: (row) => resolveAcademyProgramTitle(row, locale),
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">
            {resolveAcademyProgramTitle(row, locale)}
          </p>
          <p className="mt-1 truncate text-xs text-text-muted">{row.slug}</p>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-text-secondary">
            {resolveAcademyProgramDescription(row, locale) ?? t("programs.list.noDescription")}
          </p>
        </div>
      ),
    },
    {
      id: "category",
      header: t("programs.list.columns.category"),
      accessor: (row) => row.category?.id ?? "",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">
            {resolveAcademyProgramCategoryTitle(row.category, locale) ?? t("programs.list.noCategory")}
          </p>
          <p className="mt-1 truncate text-xs text-text-muted">
            {row.category?.slug ?? t("programs.list.noCategorySlug")}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: t("programs.list.columns.status"),
      accessor: (row) => row.status,
      cell: (row) => (
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusTone(row.status)}`}>
          {t(`programs.statuses.${row.status}` as Parameters<typeof t>[0])}
        </span>
      ),
    },
    {
      id: "registration",
      header: t("programs.list.columns.registration"),
      accessor: (row) => (row.registrationOpen ? 1 : 0),
      cell: (row) => (
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
            row.registrationOpen
              ? "border-status-success-border bg-status-success-soft text-status-success"
              : "border-border-light bg-surface-tertiary text-text-muted"
          }`}
        >
          {row.registrationOpen ? t("programs.registration.open") : t("programs.registration.closed")}
        </span>
      ),
    },
    {
      id: "price",
      header: t("programs.list.columns.price"),
      accessor: (row) => row.priceEgp ?? row.priceUsd ?? "",
      cell: (row) => {
        const egp = formatCurrency(row.priceEgp, "EGP", locale);
        const usd = formatCurrency(row.priceUsd, "USD", locale);
        const fallback = t("programs.list.free");

        return (
          <div className="text-sm text-text-primary">
            <p className="font-semibold">{egp ?? usd ?? fallback}</p>
            {egp && usd ? (
              <p className="mt-1 text-xs text-text-secondary">
                {t("programs.list.priceMarkets", { egp, usd })}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "schedule",
      header: t("programs.list.columns.schedule"),
      accessor: (row) => row.startAt ?? row.endAt ?? "",
      cell: (row) => (
        <div className="text-sm text-text-primary">
          <p className="font-semibold">{formatDateRange(row.startAt, row.endAt, locale)}</p>
          <p className="mt-1 text-xs text-text-secondary">
            {t("programs.list.seats", {
              maxSeats: row.maxSeats ?? t("programs.list.noSeats"),
            })}
          </p>
        </div>
      ),
    },
    {
      id: "updatedAt",
      header: t("programs.list.columns.updatedAt"),
      accessor: (row) => new Date(row.updatedAt).getTime(),
      hideOnMobile: true,
      cell: (row) => formatDateTime(row.updatedAt, locale),
    },
  ];

  const statusFilterOptions = useMemo(
    () => [
      { value: "ALL", label: t("programs.filters.all") },
      { value: "DRAFT", label: t("programs.statuses.DRAFT") },
      { value: "PUBLISHED", label: t("programs.statuses.PUBLISHED") },
      { value: "ARCHIVED", label: t("programs.statuses.ARCHIVED") },
    ],
    [t],
  );

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <AdminOperationalListShell
      eyebrow={t("programs.badge")}
      title={t("programs.title")}
      description={t("programs.note")}
      actions={
        canManage ? (
          <Button startIcon={<Plus className="h-4 w-4" />} onClick={() => setIsCreateOpen(true)}>
            {t("programs.actions.create")}
          </Button>
        ) : undefined
      }
      summaryCards={
        <>
          <AdminSummaryCard
            label={t("programs.stats.total")}
            value={String(stats.total)}
            tone="primary"
            icon={<BookOpenText className="h-4 w-4" />}
          />
          <AdminSummaryCard
            label={t("programs.stats.published")}
            value={String(stats.published)}
            tone="success"
            icon={<BookOpenText className="h-4 w-4" />}
          />
          <AdminSummaryCard
            label={t("programs.stats.drafts")}
            value={String(stats.drafts)}
            tone="warning"
            icon={<BookOpenText className="h-4 w-4" />}
          />
          <AdminSummaryCard
            label={t("programs.stats.archived")}
            value={String(stats.archived)}
            tone="neutral"
            icon={<BookOpenText className="h-4 w-4" />}
          />
        </>
      }
      filters={
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("programs.filters.status")}
              </span>
              <Select
                key={`academy-program-status-${statusFilter}`}
                defaultValue={statusFilter}
                options={statusFilterOptions}
                onChange={(value) =>
                  updateListQuery({
                    status: value === "ALL" ? null : value,
                    page: 1,
                  })
                }
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("programs.filters.search")}
              </span>
              <ProgramSearchField
                key={`academy-program-search-${initialQuery}`}
                initialQuery={initialQuery}
                placeholder={t("programs.filters.searchPlaceholder")}
                onCommit={commitSearch}
              />
            </label>

            <div className="flex items-end justify-between gap-3 lg:col-span-2">
              <p className="text-xs text-text-muted">
                {t("programs.list.count", { count: data?.pagination.totalItems ?? 0 })}
              </p>
              <FilterClearButton
                disabled={!hasActiveFilters}
                onClick={() => {
                  commitSearch("");
                  updateListQuery({
                    status: null,
                    q: null,
                    page: 1,
                  });
                }}
              />
            </div>
          </div>
        </div>
      }
    >
      <AdminTableSection flushContent>
        <DataTable
          data={items}
          columns={columns}
          getRowId={(row) => row.id}
          loading={programsQuery.isLoading}
          error={programsQuery.isError ? t("programs.states.error.note") : null}
          errorState={{
            title: t("programs.states.error.heading"),
            description: t("programs.states.error.note"),
            action: {
              label: t("programs.states.error.retry"),
              onClick: () => programsQuery.refetch(),
            },
          }}
          emptyState={{
            icon: <Sparkles className="h-5 w-5 text-primary" />,
            title: t("programs.states.empty.heading"),
            description: t("programs.states.empty.note"),
          }}
          onRowClick={(row) => router.push(`/admin/academy/programs/${row.id}` as never)}
          rowActions={
            canManage
              ? (row) => (
                  <ActionIconButton
                    intent="manage"
                    label={t("programs.actions.manage")}
                    icon={<BookOpenText className="h-4 w-4" />}
                    onClick={() => router.push(`/admin/academy/programs/${row.id}` as never)}
                  />
                )
              : undefined
          }
          rowActionsHeader={canManage ? t("programs.list.actionsHeader") : undefined}
          pagination={
            data
              ? {
                  page: data.pagination.page,
                  limit: data.pagination.limit,
                  total: data.pagination.totalItems,
                  totalPages: data.pagination.totalPages,
                  hasPrevPage: data.pagination.page > 1,
                  hasNextPage: data.pagination.page < data.pagination.totalPages,
                }
              : undefined
          }
          onPageChange={(nextPage) => updateListQuery({ page: nextPage })}
          onPageSizeChange={(nextLimit) => updateListQuery({ limit: nextLimit, page: 1 })}
          ariaLabel={t("programs.title")}
          caption={t("programs.list.title")}
        />
      </AdminTableSection>

      <AdminAcademyProgramFormModal
        key={`academy-program-create-${isCreateOpen ? "open" : "closed"}`}
        isOpen={isCreateOpen}
        mode="create"
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          programsQuery.refetch();
        }}
      />
    </AdminOperationalListShell>
  );
}
