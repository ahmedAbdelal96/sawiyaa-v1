"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { BookOpenText, Plus } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import Button from "@/components/ui/button/Button";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import AdminOperationalListShell, {
  AdminSummaryCard,
} from "@/components/shared/admin/AdminOperationalListShell";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import type { ColumnDef } from "@/components/ui/data-table";
import {
  buildUpdatedSearchParams,
  parseEnumParam,
  parsePositiveIntParam,
  parseTextParam,
} from "@/components/ui/data-table";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useAuthState } from "@/stores/auth-store";
import { useAdminAcademyCourses } from "../hooks/use-academy";
import AdminAcademyCreateModal from "./AdminAcademyCreateModal";
import type { AcademyCourseItem, CourseStatus } from "../types/academy.types";

const STATUS_FILTERS = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const PAGE_LIMIT = DEFAULT_PAGE_LIMIT;
const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;

function formatCurrency(
  amount: string | null | undefined,
  currency: string | null | undefined,
  locale: string,
) {
  if (!amount || !currency) return null;
  const value = Number(amount);
  if (Number.isNaN(value)) return `${amount} ${currency}`;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

export default function AdminAcademyOverviewScreen() {
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
  const searchQuery = parseTextParam(searchParams.get("q"), { maxLength: 120 });
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), PAGE_LIMIT, {
    min: 1,
    max: 40,
  });
  const hasActiveFilters = statusFilter !== "ALL" || Boolean(searchQuery.trim());
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const listParams = {
    page,
    limit,
    ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
    ...(searchQuery.trim() ? { q: searchQuery.trim() } : {}),
  };
  const coursesQuery = useAdminAcademyCourses(listParams);
  const data = coursesQuery.data;
  const visibleItems = data?.items ?? [];

  const stats = useMemo(
    () => ({
      totalCourses: data?.pagination.totalItems ?? 0,
      publishedCourses: visibleItems.filter((item) => item.status === "PUBLISHED").length,
      totalEnrollments: visibleItems.reduce(
        (sum, item) => sum + (item.stats?.totalEnrollments ?? 0),
        0,
      ),
      pendingPayments: visibleItems.reduce(
        (sum, item) => sum + (item.stats?.pendingPayments ?? 0),
        0,
      ),
    }),
    [data?.pagination.totalItems, visibleItems],
  );

  const columns: ColumnDef<AcademyCourseItem>[] = [
    {
      id: "title",
      header: t("admin.list.columns.title"),
      accessor: (row) => row.title,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">{row.title}</p>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-text-secondary">
            {row.shortDescription ?? t("admin.list.noDescription")}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: t("admin.list.columns.status"),
      accessor: (row) => row.status ?? "DRAFT",
      cell: (row) => (
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
            row.status === "PUBLISHED"
              ? "border-status-success-border bg-status-success-soft text-status-success"
              : row.status === "ARCHIVED"
                ? "border-border-light bg-surface-tertiary text-text-muted"
                : "border-status-warning-border bg-status-warning-soft text-status-warning"
          }`}
        >
          {t(`statuses.course.${row.status ?? "DRAFT"}` as Parameters<typeof t>[0])}
        </span>
      ),
    },
    {
      id: "visibility",
      header: t("admin.list.columns.visibility"),
      accessor: (row) => row.visibility ?? "PUBLIC",
      cell: (row) => (
        <span className="rounded-full border border-primary/20 bg-primary-light px-2.5 py-1 text-xs font-semibold text-text-brand">
          {t(`statuses.visibility.${row.visibility ?? "PUBLIC"}` as Parameters<typeof t>[0])}
        </span>
      ),
    },
    {
      id: "enrollments",
      header: t("admin.list.columns.enrollments"),
      accessor: (row) => row.stats?.totalEnrollments ?? 0,
      cell: (row) => (
        <div className="text-sm text-text-primary">
          <p className="font-semibold">
            {t("admin.list.enrollmentSummary", {
              total: row.stats?.totalEnrollments ?? 0,
              paid: row.stats?.paidEnrollments ?? 0,
            })}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {t("admin.list.pendingSummary", {
              total: row.stats?.pendingPayments ?? 0,
              failed: row.stats?.failedPayments ?? 0,
            })}
          </p>
        </div>
      ),
    },
    {
      id: "priceAmount",
      header: t("admin.list.columns.price"),
      accessor: (row) => (row.priceAmount ? Number(row.priceAmount) : null),
      cell: (row) => {
        const displayPrice =
          formatCurrency(row.priceAmount ?? null, row.currencyCode ?? null, locale) ??
          t("admin.list.free");
        const egpPrice = row.priceAmountEgp
          ? formatCurrency(row.priceAmountEgp, "EGP", locale)
          : null;
        const usdPrice = row.priceAmountUsd
          ? formatCurrency(row.priceAmountUsd, "USD", locale)
          : null;

        return (
          <div className="text-sm text-text-primary">
            <p className="font-semibold">{displayPrice}</p>
            {egpPrice || usdPrice ? (
              <p className="mt-1 text-xs text-text-secondary">
                {egpPrice ? `${t("admin.list.markets.egp")}: ${egpPrice}` : null}
                {egpPrice && usdPrice ? " • " : null}
                {usdPrice ? `${t("admin.list.markets.usd")}: ${usdPrice}` : null}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "publishedAt",
      header: t("admin.list.columns.published"),
      accessor: (row) => (row.publishedAt ? new Date(row.publishedAt).getTime() : null),
      hideOnMobile: true,
      cell: (row) => formatDateTime(row.publishedAt, locale),
    },
    {
      id: "updatedAt",
      header: t("admin.list.columns.updated"),
      accessor: (row) => (row.updatedAt ? new Date(row.updatedAt).getTime() : null),
      hideOnMobile: true,
      cell: (row) => formatDateTime(row.updatedAt, locale),
    },
  ];

  const statusFilterOptions = useMemo(
    () => [
      { value: "ALL", label: t("admin.filters.statusAll") },
      ...STATUS_FILTERS.filter((status) => status !== "ALL").map((status) => ({
        value: status,
        label: t(`statuses.course.${status}` as Parameters<typeof t>[0]),
      })),
    ],
    [t],
  );

  return (
    <AdminOperationalListShell
      eyebrow={t("admin.badge")}
      title={t("admin.title")}
      description={t("admin.note")}
      actions={
        canManage ? (
          <Button startIcon={<Plus className="h-4 w-4" />} onClick={() => setIsCreateOpen(true)}>
            {t("admin.create.open")}
          </Button>
        ) : undefined
      }
      summaryCards={
        <>
          <AdminSummaryCard
            label={t("admin.stats.totalCourses")}
            value={String(stats.totalCourses)}
            tone="primary"
            icon={<BookOpenText className="h-4 w-4" />}
          />
          <AdminSummaryCard
            label={t("admin.stats.publishedCourses")}
            value={String(stats.publishedCourses)}
            tone="success"
            icon={<BookOpenText className="h-4 w-4" />}
          />
          <AdminSummaryCard
            label={t("admin.stats.totalEnrollments")}
            value={String(stats.totalEnrollments)}
            tone="neutral"
            icon={<BookOpenText className="h-4 w-4" />}
          />
          <AdminSummaryCard
            label={t("admin.stats.pendingPayments")}
            value={String(stats.pendingPayments)}
            tone="warning"
            icon={<BookOpenText className="h-4 w-4" />}
          />
        </>
      }
      filters={
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("admin.filters.status")}
              </span>
              <Select
                key={`statusFilter-${statusFilter}`}
                defaultValue={statusFilter}
                onChange={(value) =>
                  updateListQuery({
                    status: value === "ALL" ? null : value,
                    page: 1,
                  })
                }
                options={statusFilterOptions}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("admin.filters.search")}
              </span>
              <Input
                value={searchQuery}
                onChange={(event) =>
                  updateListQuery({
                    q: event.target.value || null,
                    page: 1,
                  })
                }
                placeholder={t("admin.filters.searchPlaceholder")}
              />
            </label>

            <div className="flex items-end justify-between gap-3 lg:col-span-2">
              <p className="text-xs text-text-muted">
                {t("admin.list.count", { count: data?.pagination.totalItems ?? 0 })}
              </p>
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
        </div>
      }
    >
      <DataTable
        data={visibleItems}
        columns={columns}
        getRowId={(row) => row.id}
        loading={coursesQuery.isLoading}
        error={coursesQuery.isError ? t("admin.states.error.note") : null}
        errorState={{
          title: t("admin.states.error.heading"),
          description: t("admin.states.error.note"),
          action: {
            label: t("admin.states.error.retry"),
            onClick: () => coursesQuery.refetch(),
          },
        }}
        emptyState={{
          icon: <BookOpenText className="h-5 w-5 text-primary" />,
          title: t("admin.states.empty.heading"),
          description: t("admin.states.empty.note"),
        }}
        onRowClick={(row) => router.push(`/admin/academy/${row.id}` as never)}
        rowActions={(row) => (
          <ActionIconButton
            intent="manage"
            label={t("admin.list.manage")}
            icon={<BookOpenText className="h-4 w-4" />}
            onClick={() => router.push(`/admin/academy/${row.id}` as never)}
          />
        )}
        rowActionsHeader={t("admin.list.actionsHeader")}
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
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        ariaLabel={t("admin.title")}
        caption={t("admin.list.title")}
      />

      <AdminAcademyCreateModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </AdminOperationalListShell>
  );
}
