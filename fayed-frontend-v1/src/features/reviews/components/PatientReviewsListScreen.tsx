"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CalendarDays, ChevronRight, ClipboardList, Star } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import { usePatientReviews } from "../hooks/use-reviews";
import { getPatientReviewErrorKey } from "../lib/reviews-errors";
import type { ListPatientReviewsParams, PatientReviewItem, SessionReviewStatus } from "../types/reviews.types";

const PAGE_LIMIT = 20;
const STATUS_FILTERS: Array<SessionReviewStatus | "ALL"> = [
  "ALL",
  "SUBMITTED",
  "PENDING_MODERATION",
  "PUBLISHED",
  "REJECTED",
  "HIDDEN",
  "ARCHIVED",
];

const STATUS_TONE: Partial<Record<SessionReviewStatus, string>> = {
  SUBMITTED: "bg-primary-light text-text-brand",
  PENDING_MODERATION:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300",
  PUBLISHED: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300",
  REJECTED: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300",
  HIDDEN: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/60",
  ARCHIVED: "bg-zinc-100 text-zinc-500 dark:bg-white/8 dark:text-white/40",
};

function formatDateTime(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: locale !== "ar",
  });
}

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < value ? "fill-primary text-primary" : "fill-transparent text-border-light dark:text-white/25"}`}
        />
      ))}
    </span>
  );
}

function ReviewCard({ item }: { item: PatientReviewItem }) {
  const t = useTranslations("reviews");
  const locale = useLocale();
  const statusClass =
    STATUS_TONE[item.status] ?? "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/70";
  const title = item.title?.trim() || t("patient.list.untitled");
  const preview = item.textReview?.trim() || t("patient.list.noText");
  const practitionerName = item.practitioner.displayName ?? item.practitioner.slug;

  return (
    <Link
      href={`/patient/reviews/${item.id}` as never}
      className="app-panel block rounded-[28px] p-5 transition hover:border-primary/25"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
              {t(`patient.statuses.${item.status}` as Parameters<typeof t>[0])}
            </span>
            <span className="text-xs text-text-muted">
              {t("patient.list.submittedAt", {
                date: formatDateTime(item.submittedAt, locale),
              })}
            </span>
          </div>

          <h3 className="mt-3 break-words text-sm font-semibold text-text-primary dark:text-white/95 sm:text-base">
            {title}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Rating value={item.overallRating} />
            <span className="text-xs font-medium text-text-secondary">
              {t("patient.list.rating", { value: item.overallRating })}
            </span>
          </div>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-secondary">{preview}</p>

          <p className="mt-2 text-xs text-text-muted">
            {t("patient.list.practitioner", { name: practitionerName })}
          </p>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
          {t("patient.list.open")}
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </span>
      </div>
    </Link>
  );
}

export default function PatientReviewsListScreen() {
  const t = useTranslations("reviews");
  const [status, setStatus] = useState<SessionReviewStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);

  const params = useMemo<ListPatientReviewsParams>(
    () => ({
      page,
      limit: PAGE_LIMIT,
      status: status === "ALL" ? undefined : status,
    }),
    [page, status],
  );

  const reviews = usePatientReviews(params);
  const data = reviews.data;
  const items = data?.items ?? [];
  const errorKey = reviews.error ? getPatientReviewErrorKey(reviews.error) : "patient.states.errors.generic";

  return (
    <div className="space-y-6">
      <section className="app-panel rounded-[32px] p-6 sm:p-7">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("patient.list.eyebrow")}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("patient.list.title")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary sm:text-base">
              {t("patient.list.note")}
            </p>
          </div>
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {data ? t("patient.list.count", { value: data.pagination.totalItems }) : t("patient.list.countLoading")}
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("patient.filters.all")}
            </span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as SessionReviewStatus | "ALL");
                setPage(1);
              }}
              className="app-control w-full px-4 py-3"
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL"
                    ? t("patient.filters.all")
                    : t(`patient.statuses.${option}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end justify-end">
            <FilterClearButton
              disabled={status === "ALL" && page === 1}
              onClick={() => {
                setStatus("ALL");
                setPage(1);
              }}
            />
          </div>
        </div>
      </section>

      <section className="app-panel-soft rounded-[32px] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
            <ClipboardList className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("patient.boundaries.heading")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">{t("patient.boundaries.note")}</p>
          </div>
        </div>
      </section>

      {reviews.isLoading ? (
        <ListStateSkeleton items={4} heightClass="h-36" />
      ) : reviews.isError ? (
        <StateCard
          icon={<CalendarDays className="h-5 w-5 text-primary" />}
          title={t("patient.states.error.heading")}
          note={t(errorKey as Parameters<typeof t>[0])}
          action={{ label: t("patient.states.error.retry"), onClick: () => reviews.refetch() }}
          className="rounded-[28px]"
        />
      ) : items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <ReviewCard key={item.id} item={item} />
          ))}

          {data && data.pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between rounded-[24px] border border-border-light bg-surface-primary px-4 py-3 dark:bg-white/5">
              <p className="text-xs text-text-muted">
                {t("patient.pagination.summary", {
                  from: (data.pagination.page - 1) * data.pagination.limit + 1,
                  to: Math.min(data.pagination.page * data.pagination.limit, data.pagination.totalItems),
                  total: data.pagination.totalItems,
                })}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={data.pagination.page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/8"
                >
                  {t("patient.pagination.previous")}
                </button>
                <button
                  type="button"
                  disabled={data.pagination.page >= data.pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/8"
                >
                  {t("patient.pagination.next")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <StateCard
          icon={<Star className="h-5 w-5 text-primary" />}
          title={t("patient.states.empty.heading")}
          note={t("patient.states.empty.note")}
          action={{
            label: t("patient.states.empty.action"),
            href: (
              <Link
                href="/patient/sessions"
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                {t("patient.states.empty.action")}
              </Link>
            ),
          }}
          className="rounded-[28px]"
        />
      )}
    </div>
  );
}
