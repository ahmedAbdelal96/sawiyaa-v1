"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import CareChatRequestCard from "./CareChatRequestCard";
import { usePractitionerCareChatRequests } from "../hooks/use-care-chat";
import type { CareChatRequestStatus } from "../types/care-chat.types";

const PRACTITIONER_FILTERS: Array<CareChatRequestStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "REVOKED",
  "CANCELLED",
];

export default function PractitionerCareChatHomeScreen() {
  const t = useTranslations("care-chat");
  const [statusFilter, setStatusFilter] = useState<CareChatRequestStatus | "ALL">("ALL");
  const params = useMemo(
    () => ({
      page: 1,
      limit: DEFAULT_PAGE_LIMIT,
      status: statusFilter === "ALL" ? undefined : statusFilter,
    }),
    [statusFilter],
  );
  const requests = usePractitionerCareChatRequests(params);

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
      <section className="app-panel rounded-[32px] p-5 sm:p-7">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("practitioner.home.eyebrow")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
          {t("practitioner.home.title")}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">
          {t("practitioner.home.note")}
        </p>
      </section>

      <section className="app-panel rounded-[32px] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
              {t("practitioner.list.heading")}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {t("practitioner.list.note")}
            </p>
          </div>
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {requests.data
              ? t("practitioner.list.count", { value: requests.data.pagination.totalItems })
              : t("practitioner.list.countLoading")}
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
              {PRACTITIONER_FILTERS.map((status) => (
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
              title={t("practitioner.list.states.error.heading")}
              note={t("practitioner.list.states.error.note")}
              action={{
                label: t("practitioner.list.states.error.retry"),
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
                href={`/practitioner/care-chat/${item.id}`}
                viewer="practitioner"
              />
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <StateCard
              title={t("practitioner.list.states.empty.heading")}
              note={t("practitioner.list.states.empty.note")}
              action={{
                label: t("practitioner.list.states.empty.cta"),
                href: "/practitioner/sessions",
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
