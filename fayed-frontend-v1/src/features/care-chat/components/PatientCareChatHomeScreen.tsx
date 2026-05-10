"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { PatientQuickNav } from "@/components/patient/PatientSectionFrame";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import { getCareChatErrorKey } from "../lib/care-chat-ui";
import {
  useCreatePatientCareChatRequest,
  usePatientCareChatRequests,
} from "../hooks/use-care-chat";
import type {
  CareChatRequestStatus,
  CreateCareChatRequestInput,
} from "../types/care-chat.types";
import CareChatRequestCard from "./CareChatRequestCard";

type Props = {
  prefill?: {
    practitionerSlug?: string;
    relatedSessionId?: string;
  };
};

const PATIENT_FILTERS: Array<CareChatRequestStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "REVOKED",
  "CANCELLED",
];

function humanizePractitionerSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function PatientCareChatHomeScreen({ prefill }: Props) {
  const t = useTranslations("care-chat");
  const router = useRouter();
  const practitionerSlug = prefill?.practitionerSlug?.trim() ?? "";
  const relatedSessionId = prefill?.relatedSessionId?.trim() ?? "";
  const hasPrefilledPractitioner = practitionerSlug.length > 0;
  const practitionerDisplayName = hasPrefilledPractitioner
    ? humanizePractitionerSlug(practitionerSlug)
    : "";
  const [statusFilter, setStatusFilter] = useState<CareChatRequestStatus | "ALL">("ALL");
  const [form, setForm] = useState<CreateCareChatRequestInput>({
    practitionerSlug,
    relatedSessionId,
    reason: "",
  });

  const params = useMemo(
    () => ({
      page: 1,
      limit: DEFAULT_PAGE_LIMIT,
      status: statusFilter === "ALL" ? undefined : statusFilter,
    }),
    [statusFilter],
  );
  const requests = usePatientCareChatRequests(params);
  const createRequest = useCreatePatientCareChatRequest();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = await createRequest.mutateAsync({
      practitionerSlug: form.practitionerSlug.trim(),
      relatedSessionId: form.relatedSessionId?.trim() || undefined,
      reason: form.reason?.trim() || undefined,
    });
    router.push(`/patient/care-chat/${created.item.id}` as never);
  };

  return (
    <div className="app-max-content mx-auto space-y-5 sm:space-y-6">
      <section className="app-panel rounded-[32px] p-5 sm:p-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          {t("patient.home.eyebrow")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
          {t("patient.home.title")}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
          {t("patient.home.note")}
        </p>

        <div className="mt-5 border-t border-border-light/70 pt-4 dark:border-white/10">
          <PatientQuickNav />
        </div>
      </section>

      {hasPrefilledPractitioner ? (
        <section className="app-panel rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
                {t("patient.create.heading")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                {t("patient.create.note")}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="app-chip rounded-full px-3 py-1.5 text-sm font-medium">
                  {practitionerDisplayName}
                </span>
                {relatedSessionId ? (
                  <span className="app-panel-soft rounded-full px-3 py-1.5 text-sm font-medium text-text-secondary dark:text-white/75">
                    {t("common.relatedSessionShort", { id: relatedSessionId })}
                  </span>
                ) : null}
              </div>
            </div>

            <Link
              href={`/patient/practitioners/${practitionerSlug}` as never}
              className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white/90"
            >
              {t("common.actions.goBack")}
            </Link>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-primary dark:text-white/90">
                {t("patient.create.fields.reason")}
              </span>
              <textarea
                rows={4}
                value={form.reason ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                placeholder={t("patient.create.placeholders.reason")}
                className="w-full rounded-[24px] border border-border-light bg-white px-4 py-3 text-sm leading-6 text-text-primary outline-none ring-0 transition placeholder:text-text-muted focus:border-primary/35 dark:bg-white/5 dark:text-white"
              />
            </label>

            <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-xs leading-5 text-text-secondary">
              {t("patient.create.helper")}
            </div>

            {createRequest.isError ? (
              <p className="text-sm text-rose-600 dark:text-rose-400">
                {t(getCareChatErrorKey(createRequest.error) as Parameters<typeof t>[0])}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/patient/sessions"
                className="text-center text-xs font-medium text-primary hover:underline sm:text-sm"
              >
                {t("patient.list.states.empty.cta")}
              </Link>
              <button
                type="submit"
                disabled={createRequest.isPending || form.practitionerSlug.trim().length === 0}
                className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {createRequest.isPending
                  ? t("patient.create.submitting")
                  : t("patient.create.submit")}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="app-panel rounded-[32px] p-5 sm:p-6">
          <StateCard
            title={t("patient.create.heading")}
            note={t("patient.home.note")}
            action={{
              label: t("patient.list.states.empty.cta"),
              href: (
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/patient/practitioners"
                    className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
                  >
                    {t("patient.list.states.empty.cta")}
                  </Link>
                  <Link
                    href="/patient/sessions"
                    className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-5 py-2.5 text-sm font-semibold text-text-primary hover:border-primary/30 hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white/90"
                  >
                    {t("common.actions.goBack")}
                  </Link>
                </div>
              ),
            }}
            centered={false}
            className="rounded-[24px] p-0"
          />
        </section>
      )}

      <section className="app-panel rounded-[32px] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
              {t("patient.list.heading")}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">{t("patient.list.note")}</p>
          </div>
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {requests.data
              ? t("patient.list.count", { value: requests.data.pagination.totalItems })
              : t("patient.list.countLoading")}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("common.filters.all")}
            </span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as CareChatRequestStatus | "ALL")
              }
              className="app-control w-full px-4 py-3"
            >
              {PATIENT_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL"
                    ? t("common.filters.all")
                    : t(`common.requestStatuses.${status}` as Parameters<typeof t>[0])}
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

        {requests.isLoading ? (
          <div className="mt-5">
            <ListStateSkeleton items={3} heightClass="h-28" />
          </div>
        ) : requests.isError ? (
          <div className="mt-5">
            <StateCard
              title={t("patient.list.states.error.heading")}
              note={t("patient.list.states.error.note")}
              action={{
                label: t("patient.list.states.error.retry"),
                onClick: () => requests.refetch(),
              }}
            />
          </div>
        ) : requests.data && requests.data.items.length > 0 ? (
          <div className="mt-5 space-y-3">
            {requests.data.items.map((item) => (
              <CareChatRequestCard
                key={item.id}
                item={item}
                href={`/patient/care-chat/${item.id}`}
                viewer="patient"
              />
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <StateCard
              title={t("patient.list.states.empty.heading")}
              note={t("patient.list.states.empty.note")}
              action={{
                label: t("patient.list.states.empty.cta"),
                href: (
                  <Link
                    href="/patient/sessions"
                    className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
                  >
                    {t("patient.list.states.empty.cta")}
                  </Link>
                ),
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
