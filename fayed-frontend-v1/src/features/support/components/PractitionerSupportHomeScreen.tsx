"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { CircleAlert, Headset, LifeBuoy, Loader2, Plus, SendHorizonal } from "lucide-react";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import {
  useCreatePractitionerSupportTicket,
  usePractitionerSupportTickets,
} from "../hooks/use-support";
import type {
  CreateSupportTicketRequest,
  SupportTicketCategory,
  SupportTicketStatus,
  SupportTicketsListParams,
} from "../types/support.types";

const PRACTITIONER_SUPPORT_CATEGORIES: SupportTicketCategory[] = [
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

function formatDateTime(iso: string | null, locale: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

export default function PractitionerSupportHomeScreen() {
  const t = useTranslations("support.practitioner");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | "ALL">("ALL");
  const [form, setForm] = useState<CreateSupportTicketRequest>({
    category: "GENERAL",
    subject: "",
    description: "",
  });

  const queryParams: SupportTicketsListParams = useMemo(
    () => ({
      page: 1,
      limit: 20,
      status: statusFilter === "ALL" ? undefined : statusFilter,
    }),
    [statusFilter],
  );

  const tickets = usePractitionerSupportTickets(queryParams);
  const createTicket = useCreatePractitionerSupportTicket();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const created = await createTicket.mutateAsync({
      category: form.category,
      subject: form.subject.trim(),
      description: form.description.trim(),
    });

    setForm({
      category: "GENERAL",
      subject: "",
      description: "",
    });

    router.push(`/practitioner/support/${created.item.id}` as never);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
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
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="app-panel rounded-[32px] p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
              <Plus className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
                {t("create.heading")}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">{t("create.note")}</p>
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-primary dark:text-white/90">
                {t("create.fields.category")}
              </span>
              <select
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: event.target.value as SupportTicketCategory,
                  }))
                }
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none ring-0 transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
              >
                {PRACTITIONER_SUPPORT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {t(`categories.${category}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-primary dark:text-white/90">
                {t("create.fields.subject")}
              </span>
              <input
                type="text"
                value={form.subject}
                maxLength={191}
                onChange={(event) =>
                  setForm((current) => ({ ...current, subject: event.target.value }))
                }
                placeholder={t("create.placeholders.subject")}
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none ring-0 transition placeholder:text-text-muted focus:border-primary/35 dark:bg-white/5 dark:text-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-primary dark:text-white/90">
                {t("create.fields.description")}
              </span>
              <textarea
                value={form.description}
                maxLength={2000}
                rows={6}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder={t("create.placeholders.description")}
                className="w-full rounded-[24px] border border-border-light bg-white px-4 py-3 text-sm leading-6 text-text-primary outline-none ring-0 transition placeholder:text-text-muted focus:border-primary/35 dark:bg-white/5 dark:text-white"
              />
            </label>

            <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-xs leading-5 text-text-secondary">
              {t("create.helper")}
            </div>

            {createTicket.isError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                {t("errors.generic")}
              </div>
            )}

            <button
              type="submit"
              disabled={
                createTicket.isPending ||
                form.subject.trim().length === 0 ||
                form.description.trim().length === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createTicket.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("create.submitting")}
                </>
              ) : (
                <>
                  <SendHorizonal className="h-4 w-4" />
                  {t("create.submit")}
                </>
              )}
            </button>
          </form>
        </div>

        <div className="app-panel rounded-[32px] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
                {t("list.heading")}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">{t("list.note")}</p>
            </div>
            <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
              {tickets.data
                ? t("list.count", { value: tickets.data.pagination.totalItems })
                : t("list.countLoading")}
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
                  setStatusFilter(event.target.value as SupportTicketStatus | "ALL")
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
                onClick={() => setStatusFilter("ALL")}
              />
            </div>
          </div>

          {tickets.isLoading ? (
            <div className="mt-5 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-[24px] bg-surface-tertiary dark:bg-white/10"
                />
              ))}
            </div>
          ) : tickets.isError ? (
            <div className="app-panel-soft mt-5 rounded-[24px] p-5">
              <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("states.listError.heading")}
              </p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {t("states.listError.note")}
              </p>
            </div>
          ) : tickets.data && tickets.data.items.length > 0 ? (
            <div className="mt-5 space-y-3">
              {tickets.data.items.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/practitioner/support/${ticket.id}` as never}
                  className="app-panel-soft block rounded-[24px] p-4 transition hover:border-primary/25"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
                          {t(`categories.${ticket.category}` as Parameters<typeof t>[0])}
                        </span>
                        <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
                          {t(`statuses.${ticket.status}` as Parameters<typeof t>[0])}
                        </span>
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-text-primary dark:text-white/95">
                        {ticket.subject}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
                        <span>
                          {t("list.createdAt", {
                            date: formatDateTime(ticket.createdAt, numLocale),
                          })}
                        </span>
                        {ticket.lastMessageAt && (
                          <span>
                            {t("list.lastReplyAt", {
                              date: formatDateTime(ticket.lastMessageAt, numLocale),
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-2 text-xs font-medium text-primary">
                      {t("list.openTicket")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="app-panel-soft mt-5 rounded-[24px] p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
                  <LifeBuoy className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {t("states.empty.heading")}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    {t("states.empty.note")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="app-panel-soft rounded-[32px] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
            <CircleAlert className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("boundaries.heading")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              {t("boundaries.note")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
