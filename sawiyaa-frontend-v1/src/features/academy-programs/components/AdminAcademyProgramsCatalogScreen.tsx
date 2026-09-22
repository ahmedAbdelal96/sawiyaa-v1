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
import Badge from "@/components/ui/badge/Badge";
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

function formatDateTimeLines(value: string | null | undefined, locale: string) {
  if (!value) return { date: "—", time: "" };
  const dateObj = new Date(value);
  if (Number.isNaN(dateObj.getTime())) return { date: "—", time: "" };

  const dateStr = dateObj.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = dateObj.toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });

  return { date: dateStr, time: timeStr };
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
        <div className="min-w-0 max-w-[280px]">
          <p className="truncate text-xs font-semibold text-text-primary hover:text-primary transition-colors" title={resolveAcademyProgramTitle(row, locale)}>
            {resolveAcademyProgramTitle(row, locale)}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-text-muted">
            <span className="font-mono bg-surface-tertiary px-1 rounded">{row.slug}</span>
          </div>
          {resolveAcademyProgramDescription(row, locale) && (
            <p className="mt-1 line-clamp-1 text-[11px] text-text-secondary leading-normal" title={resolveAcademyProgramDescription(row, locale) ?? undefined}>
              {resolveAcademyProgramDescription(row, locale)}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "category",
      header: t("programs.list.columns.category"),
      accessor: (row) => row.category?.id ?? "",
      cell: (row) => (
        <div className="min-w-0 max-w-[120px]">
          <p className="truncate text-xs font-semibold text-text-primary">
            {resolveAcademyProgramCategoryTitle(row.category, locale) ?? t("programs.list.noCategory")}
          </p>
          {row.category?.slug && (
            <p className="mt-0.5 truncate text-[10px] text-text-muted font-mono bg-surface-tertiary px-1 py-0.5 rounded w-max">
              {row.category.slug}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: t("programs.list.columns.status"),
      accessor: (row) => row.status,
      cell: (row) => {
        const statusColor = row.status === "PUBLISHED" ? "success" : row.status === "ARCHIVED" ? "dark" : "warning";
        return (
          <div className="whitespace-nowrap">
            <Badge variant="light" size="sm" color={statusColor}>
              {t(`programs.statuses.${row.status}` as Parameters<typeof t>[0])}
            </Badge>
          </div>
        );
      },
    },
    {
      id: "registration",
      header: t("programs.list.columns.registration"),
      accessor: (row) => (row.registrationOpen ? 1 : 0),
      cell: (row) => (
        <div className="flex flex-col items-start gap-1">
          <Badge
            variant="light"
            size="sm"
            color={row.registrationOpen ? "success" : "dark"}
          >
            {row.registrationOpen ? t("programs.registration.open") : t("programs.registration.closed")}
          </Badge>
          {row.isOverTargetLearners && (
            <Badge variant="light" color="warning" size="sm">
              {t("programs.list.targetExceededBadge")}
            </Badge>
          )}
        </div>
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
        const isFree = !row.priceEgp && !row.priceUsd;

        return (
          <div className="text-xs text-text-primary leading-tight whitespace-nowrap">
            {isFree ? (
              <span className="text-success-700 dark:text-success-400 bg-success-50 dark:bg-success-500/10 px-2 py-0.5 rounded text-[11px] font-semibold">
                {fallback}
              </span>
            ) : (
              <div className="space-y-0.5">
                {row.priceEgp && (
                  <div className="font-semibold text-text-primary">
                    {egp}
                  </div>
                )}
                {row.priceUsd && (
                  <div className="text-[10px] text-text-secondary font-medium">
                    {usd}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "schedule",
      header: t("programs.list.columns.schedule"),
      accessor: (row) => row.startAt ?? row.endAt ?? "",
      cell: (row) => {
        const start = formatDateTime(row.startAt, locale);
        const end = formatDateTime(row.endAt, locale);
        const targetCount = row.targetLearnerCount ?? row.maxSeats;
        return (
          <div className="text-xs text-text-primary leading-normal whitespace-nowrap">
            {row.startAt || row.endAt ? (
              <div className="space-y-0.5">
                {row.startAt && (
                  <div>
                    <span className="text-text-muted text-[10px] me-1">{locale === "ar" ? "بدء:" : "Start:"}</span>
                    <span className="font-medium">{start}</span>
                  </div>
                )}
                {row.endAt && (
                  <div>
                    <span className="text-text-muted text-[10px] me-1">{locale === "ar" ? "نهاية:" : "End:"}</span>
                    <span className="font-medium">{end}</span>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-text-muted italic">—</span>
            )}
            {targetCount ? (
              <p className="mt-1 text-[10px] text-text-secondary bg-surface-tertiary px-1.5 py-0.5 rounded w-max">
                {t("programs.list.targetLearners", { count: targetCount })}
              </p>
            ) : (
              <p className="mt-1 text-[10px] text-text-muted italic">
                {t("programs.list.noTargetLearners")}
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: "updatedAt",
      header: t("programs.list.columns.updatedAt"),
      accessor: (row) => new Date(row.updatedAt).getTime(),
      hideOnMobile: true,
      cell: (row) => {
        const { date, time } = formatDateTimeLines(row.updatedAt, locale);
        return (
          <div className="text-xs leading-normal whitespace-nowrap">
            <div className="font-medium text-text-primary dark:text-white">{date}</div>
            <div className="text-[10px] text-text-muted">{time}</div>
          </div>
        );
      },
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
          tableClassName="w-full table-auto"
          className="w-full max-w-full overflow-hidden always-visible-scrollbar"
          size="sm"
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
