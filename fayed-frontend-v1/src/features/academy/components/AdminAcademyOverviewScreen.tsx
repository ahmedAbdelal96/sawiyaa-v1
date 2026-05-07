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
import Input from "@/components/form/input/InputField";
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
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            row.status === "PUBLISHED"
              ? "bg-emerald-50 text-emerald-700"
              : row.status === "ARCHIVED"
                ? "bg-slate-100 text-slate-600"
                : "bg-amber-50 text-amber-700"
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
        <span className="rounded-full bg-brand-25 px-2.5 py-1 text-xs font-semibold text-text-brand">
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

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-border-light bg-white p-6 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.18)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("admin.badge")}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              {t("admin.title")}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-text-secondary">{t("admin.note")}</p>
          </div>

          {canManage ? (
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Button startIcon={<Plus className="h-4 w-4" />} onClick={() => setIsCreateOpen(true)}>
                {t("admin.create.open")}
              </Button>
              <p className="max-w-xs text-xs leading-5 text-text-muted sm:text-end">
                {t("admin.create.helper")}
              </p>
            </div>
          ) : (
            <span className="rounded-full bg-brand-25 px-3 py-1 text-xs font-semibold text-text-brand">
              {t("admin.create.adminOnlyNote")}
            </span>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: t("admin.stats.totalCourses"), value: String(stats.totalCourses) },
            { label: t("admin.stats.publishedCourses"), value: String(stats.publishedCourses) },
            { label: t("admin.stats.totalEnrollments"), value: String(stats.totalEnrollments) },
            { label: t("admin.stats.pendingPayments"), value: String(stats.pendingPayments) },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[24px] border border-border-light bg-surface-secondary px-4 py-4"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                {item.label}
              </div>
              <div className="mt-2 text-3xl font-bold text-text-primary">{item.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-border-light bg-white p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.18)] sm:p-6">
        <div className="grid gap-3 lg:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("admin.filters.status")}
            </span>
            <select
              value={statusFilter}
              onChange={(event) =>
                updateListQuery({
                  status: event.target.value === "ALL" ? null : event.target.value,
                  page: 1,
                })
              }
              className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35"
            >
              <option value="ALL">{t("admin.filters.statusAll")}</option>
              {STATUS_FILTERS.filter((status) => status !== "ALL").map((status) => (
                <option key={status} value={status}>
                  {t(`statuses.course.${status}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
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
      </section>

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
    </div>
  );
}
