"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  CircleAlert,
  Headset,
  HeartHandshake,
  LifeBuoy,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import type { ColumnDef, SortConfig } from "@/components/ui/data-table";
import { buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam } from "@/components/ui/data-table";
import { FormModal } from "@/components/ui/modal";
import { useCreatePatientSupportTicket, usePatientSupportTickets } from "../hooks/use-support";
import type {
  CreateSupportTicketRequest,
  SupportTicketCategory,
  SupportTicketStatus,
  SupportTicketSummary,
  SupportTicketsListParams,
} from "../types/support.types";

const PATIENT_SUPPORT_CATEGORIES: SupportTicketCategory[] = [
  "BOOKING",
  "PAYMENT",
  "SESSION",
  "TECHNICAL",
  "ACCOUNT",
  "MATCHING",
  "GENERAL",
  "CONTENT",
  "CHAT",
  "OTHER",
];

const STATUS_FILTERS: Array<SupportTicketStatus | "ALL"> = [
  "ALL",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "RESOLVED",
  "CLOSED",
];

const PAGE_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 40, 50];
const SORTABLE_COLUMNS = ["subject", "status", "createdAt", "lastMessageAt"] as const;
type SortableSupportColumn = (typeof SORTABLE_COLUMNS)[number];

function formatDateTime(iso: string | null, locale: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function getStatusTone(status: SupportTicketStatus) {
  switch (status) {
    case "OPEN":
    case "IN_PROGRESS":
      return "bg-primary-light text-text-brand";
    case "WAITING_FOR_USER":
      return "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300";
    case "RESOLVED":
      return "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300";
    case "CLOSED":
      return "bg-surface-tertiary text-text-secondary";
    default:
      return "bg-surface-tertiary text-text-secondary";
  }
}

export default function PatientSupportHomeScreen() {
  const t = useTranslations("support");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const statusFilter = parseEnumParam<SupportTicketStatus | "ALL">(
    searchParams.get("status"),
    STATUS_FILTERS,
    "ALL",
  );
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), PAGE_LIMIT, {
    min: 1,
    max: 40,
  });
  const sortColumn = parseEnumParam<SortableSupportColumn>(
    searchParams.get("sortBy"),
    SORTABLE_COLUMNS,
    "createdAt",
  );
  const sortDirection = parseEnumParam<"asc" | "desc">(
    searchParams.get("sortDir"),
    ["asc", "desc"],
    "desc",
  );
  const sortConfig: SortConfig = { column: sortColumn, direction: sortDirection };

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateSupportTicketRequest>({
    category: "GENERAL",
    subject: "",
    description: "",
  });

  const queryParams: SupportTicketsListParams = useMemo(
    () => ({
      page,
      limit,
      status: statusFilter === "ALL" ? undefined : statusFilter,
    }),
    [page, statusFilter, limit],
  );

  const tickets = usePatientSupportTickets(queryParams);
  const createTicket = useCreatePatientSupportTicket();
  const data = tickets.data;

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const created = await createTicket.mutateAsync({
      category: form.category,
      subject: form.subject.trim(),
      description: form.description.trim(),
    });

    setForm({ category: "GENERAL", subject: "", description: "" });
    setIsCreateOpen(false);
    router.push(`/patient/support/${created.item.id}` as never);
  };

  const columns = useMemo<ColumnDef<SupportTicketSummary>[]>(() => [
    {
      id: "subject",
      header: "Ticket",
      accessor: (row) => row.subject,
      sortable: true,
      cell: (row) => (
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold leading-6 text-text-primary dark:text-white/95">{row.subject}</p>
          <p className="mt-1 text-xs text-text-muted">{t(`categories.${row.category}` as Parameters<typeof t>[0])}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => row.status,
      sortable: true,
      cell: (row) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(row.status)}`}>
          {t(`statuses.${row.status}` as Parameters<typeof t>[0])}
        </span>
      ),
    },
    {
      id: "createdAt",
      header: "Created",
      accessor: (row) => new Date(row.createdAt).getTime(),
      sortable: true,
      hideOnMobile: true,
      cell: (row) => formatDateTime(row.createdAt, numLocale),
    },
    {
      id: "lastMessageAt",
      header: "Last reply",
      accessor: (row) => (row.lastMessageAt ? new Date(row.lastMessageAt).getTime() : null),
      sortable: true,
      hideOnMobile: true,
      cell: (row) => formatDateTime(row.lastMessageAt, numLocale),
    },
  ], [numLocale, t]);

  return (
    <div className="app-max-content mx-auto space-y-5 sm:space-y-6">
      <section className="app-panel rounded-[32px] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("home.eyebrow")}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("home.title")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary sm:text-base">
              {t("home.note")}
            </p>
          </div>

          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              {t("create.submit")}
            </button>
            <Link
              href="/patient/matching"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border-light bg-surface px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-primary hover:text-primary"
            >
              <HeartHandshake className="h-4 w-4" />
              {t("handoff.matching")}
            </Link>
            <div className="app-panel-soft rounded-2xl px-4 py-3 text-sm text-text-secondary">
              <div className="flex items-center gap-2 text-text-primary dark:text-white/90">
                <Headset className="h-4 w-4 text-primary" />
                <span className="font-medium">{t("home.assuranceTitle")}</span>
              </div>
              <p className="mt-1 max-w-xs text-xs leading-5 text-text-muted">
                {t("home.assuranceNote")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="app-panel rounded-[32px] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">{t("list.heading")}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t("list.note")}</p>
          </div>
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {data ? t("list.count", { value: data.pagination.totalItems }) : t("list.countLoading")}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.all")}
            </span>
            <select
              value={statusFilter}
              onChange={(event) =>
                updateListQuery({
                  status: event.target.value === "ALL" ? null : event.target.value,
                  page: 1,
                })
              }
              className="app-control w-full px-4 py-3"
            >
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL"
                    ? t("filters.all")
                    : t(`statuses.${status}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end justify-end">
            <FilterClearButton
              disabled={statusFilter === "ALL"}
              onClick={() =>
                updateListQuery({
                  status: null,
                  page: 1,
                })
              }
            />
          </div>
        </div>

        <div className="mt-5">
          <DataTable
            data={data?.items ?? []}
            columns={columns}
            getRowId={(row) => row.id}
            loading={tickets.isLoading}
            error={tickets.isError ? t("states.listError.note") : null}
            errorState={{
              title: t("states.listError.heading"),
              description: t("states.listError.note"),
              action: {
                label: t("states.listError.retry"),
                onClick: () => tickets.refetch(),
              },
            }}
            emptyState={{
              icon: <LifeBuoy className="h-4 w-4 text-primary" />,
              title: t("states.empty.heading"),
              description: t("states.empty.note"),
            }}
            sortConfig={sortConfig}
            onSortChange={(nextSort) =>
              updateListQuery({
                sortBy: nextSort.column,
                sortDir: nextSort.direction,
              })
            }
            rowActions={(row) => (
              <ActionIconButton
                intent="view"
                label={t("list.openTicket")}
                icon={<Search className="h-4 w-4" />}
                onClick={() => router.push(`/patient/support/${row.id}` as never)}
              />
            )}
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
            ariaLabel={t("list.heading")}
            caption={t("list.heading")}
          />
        </div>
      </section>

      <section className="app-panel-soft rounded-[32px] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
            <CircleAlert className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">{t("boundaries.heading")}</h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">{t("boundaries.note")}</p>
          </div>
        </div>
      </section>

      <section className="app-panel rounded-[32px] p-5 sm:p-7">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">{t("handoff.heading")}</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{t("handoff.note")}</p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Link
            href="/patient/matching"
            className="app-panel-soft flex items-center justify-between gap-4 rounded-[28px] p-5 transition hover:border-primary/25 hover:text-primary"
          >
            <div>
              <p className="text-sm font-semibold text-text-primary dark:text-white/95">{t("handoff.matching")}</p>
              <p className="mt-1 text-sm text-text-secondary">{t("handoff.matchingNote")}</p>
            </div>
            <HeartHandshake className="h-5 w-5 shrink-0 text-primary" />
          </Link>

          <Link
            href="/patient/assessments"
            className="app-panel-soft flex items-center justify-between gap-4 rounded-[28px] p-5 transition hover:border-primary/25 hover:text-primary"
          >
            <div>
              <p className="text-sm font-semibold text-text-primary dark:text-white/95">{t("handoff.assessments")}</p>
              <p className="mt-1 text-sm text-text-secondary">{t("handoff.assessmentsNote")}</p>
            </div>
            <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          </Link>
        </div>
      </section>

      <FormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        size="lg"
        title={t("create.heading")}
        description={t("create.note")}
        submitLabel={createTicket.isPending ? t("create.submitting") : t("create.submit")}
        cancelLabel={t("detail.back")}
        onSubmit={() => handleSubmit()}
        loading={createTicket.isPending}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-text-primary dark:text-white/90">{t("create.fields.category")}</span>
            <select
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value as SupportTicketCategory,
                }))
              }
              className="app-control px-4 py-3"
            >
              {PATIENT_SUPPORT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {t(`categories.${category}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-text-primary dark:text-white/90">{t("create.fields.subject")}</span>
            <input
              type="text"
              value={form.subject}
              maxLength={191}
              onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
              placeholder={t("create.placeholders.subject")}
              className="app-control px-4 py-3"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-text-primary dark:text-white/90">{t("create.fields.description")}</span>
            <textarea
              value={form.description}
              maxLength={2000}
              rows={6}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder={t("create.placeholders.description")}
              className="app-control px-4 py-3"
            />
          </label>

          <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-xs leading-5 text-text-secondary">
            {t("create.helper")}
          </div>

          {createTicket.isError ? (
            <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
              {t("errors.generic")}
            </div>
          ) : null}

          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </FormModal>
    </div>
  );
}
