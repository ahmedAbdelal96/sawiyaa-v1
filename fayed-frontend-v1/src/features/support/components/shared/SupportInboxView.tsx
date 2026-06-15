"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CircleAlert, Headset } from "lucide-react";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import type { SupportTicketStatus, SupportTicketSummary } from "@/features/support/types/support.types";
import SupportMessagingScaffold from "./SupportMessagingScaffold";
import SupportStartMessagePanel from "./SupportStartMessagePanel";
import SupportConversationCard from "./SupportConversationCard";

type Props = {
  scope: "patient" | "practitioner";
  items: SupportTicketSummary[];
  totalItems?: number;
  isLoading: boolean;
  isError: boolean;
  statusFilter: SupportTicketStatus | "ALL";
  onStatusFilterChange: (next: SupportTicketStatus | "ALL") => void;
  onCreateFromMessage: (message: string) => Promise<string>;
  onOpenConversation: (id: string) => void;
  density?: "regular" | "compact";
};

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

export default function SupportInboxView({
  scope,
  items,
  totalItems,
  isLoading,
  isError,
  statusFilter,
  onStatusFilterChange,
  onCreateFromMessage,
  onOpenConversation,
  density = "regular",
}: Props) {
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const t = useTranslations(scope === "patient" ? "support" : "support.practitioner");
  const tRoot = useTranslations("support");

  const [draft, setDraft] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const helperNote = t("create.helper");

  const handleStart = async () => {
    const clean = draft.trim();
    if (!clean) return;
    try {
      setIsStarting(true);
      const id = await onCreateFromMessage(clean);
      setDraft("");
      onOpenConversation(id);
    } finally {
      setIsStarting(false);
    }
  };

  const listCountLabel = useMemo(() => {
    if (typeof totalItems === "number") return t("list.count", { value: totalItems });
    return t("list.countLoading");
  }, [t, totalItems]);

  return (
    <SupportMessagingScaffold
      density={density}
      eyebrow={t("home.eyebrow")}
      title={t("home.title")}
      note={t("home.note")}
      actions={
        <div className="app-panel-soft rounded-2xl px-4 py-3 text-sm text-text-secondary">
          <div className="flex items-center gap-2 text-text-primary dark:text-white/90">
            <Headset className="h-4 w-4 text-primary" />
            <span className="font-medium">{t("home.assuranceTitle")}</span>
          </div>
          <p className="mt-1 max-w-xs text-xs leading-5 text-text-muted">
            {t("home.assuranceNote")}
          </p>
        </div>
      }
    >
      <SupportStartMessagePanel
        value={draft}
        onChange={setDraft}
        onSubmit={handleStart}
        isSubmitting={isStarting}
        helperNote={helperNote}
        compact={density === "compact"}
      />

      <section className={density === "compact" ? "app-panel rounded-[28px] p-4 sm:p-5" : "app-panel rounded-[32px] p-5 sm:p-7"}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className={density === "compact" ? "text-base font-semibold text-text-primary dark:text-white/95" : "text-lg font-semibold text-text-primary dark:text-white/95"}>
              {t("list.heading")}
            </h2>
            <p className={density === "compact" ? "mt-1 text-xs text-text-secondary" : "mt-1 text-sm text-text-secondary"}>{t("list.note")}</p>
          </div>
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">{listCountLabel}</span>
        </div>

        <div className={density === "compact" ? "mt-3 flex flex-wrap items-end justify-between gap-2.5" : "mt-4 flex flex-wrap items-end justify-between gap-3"}>
          <label className="block min-w-[220px]">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.all")}
            </span>
            <select
              value={statusFilter}
              onChange={(event) =>
                onStatusFilterChange(event.target.value as SupportTicketStatus | "ALL")
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
          <FilterClearButton
            disabled={statusFilter === "ALL"}
            onClick={() => onStatusFilterChange("ALL")}
          />
        </div>

        {isLoading ? (
          <div className={density === "compact" ? "mt-4 space-y-2.5" : "mt-5 space-y-3"}>
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className={density === "compact" ? "h-24 animate-pulse rounded-[22px] bg-surface-tertiary dark:bg-white/10" : "h-28 animate-pulse rounded-[24px] bg-surface-tertiary dark:bg-white/10"}
              />
            ))}
          </div>
        ) : isError ? (
          <div className={density === "compact" ? "app-panel-soft mt-4 rounded-[22px] p-4" : "app-panel-soft mt-5 rounded-[24px] p-5"}>
            <div className="flex items-center gap-2 text-text-primary dark:text-white/90">
              <CircleAlert className="h-4 w-4 text-rose-500" />
              <p className="text-sm font-semibold">{t("states.listError.heading")}</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{t("states.listError.note")}</p>
          </div>
        ) : items.length > 0 ? (
          <div className={density === "compact" ? "mt-4 space-y-2.5" : "mt-5 space-y-3"}>
            {items.map((row) => (
              <SupportConversationCard
                key={row.id}
                href={scope === "patient" ? `/patient/messages?lane=support&id=${row.id}` : `/practitioner/messages?lane=support&id=${row.id}`}
                subject={row.subject}
                categoryLabel={tRoot(`categories.${row.category}` as Parameters<typeof tRoot>[0])}
                statusLabel={t(`statuses.${row.status}` as Parameters<typeof t>[0])}
                createdAtLabel={t("list.createdAt", { date: formatDateTime(row.createdAt, numLocale) })}
                lastReplyAtLabel={
                  row.lastMessageAt
                    ? t("list.lastReplyAt", { date: formatDateTime(row.lastMessageAt, numLocale) })
                    : null
                }
                unreadCount={row.unreadCount}
                hasUnread={row.hasUnread}
              />
            ))}
          </div>
        ) : (
          <div className={density === "compact" ? "app-panel-soft mt-4 rounded-[22px] p-4" : "app-panel-soft mt-5 rounded-[24px] p-5"}>
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("states.empty.heading")}
            </p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{t("states.empty.note")}</p>
          </div>
        )}
      </section>
    </SupportMessagingScaffold>
  );
}
