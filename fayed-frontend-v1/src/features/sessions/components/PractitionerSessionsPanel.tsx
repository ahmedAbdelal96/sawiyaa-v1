"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CalendarDays, Clock } from "lucide-react";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import { usePractitionerSessions } from "../hooks/use-sessions";
import SessionStatusBadge from "./SessionStatusBadge";
import type { SessionListItem } from "../types/sessions.types";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";

function formatScheduledAt(isoString: string | null, numLocale: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString(numLocale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !numLocale.startsWith("ar"),
  });
}

function SessionCard({ session }: { session: SessionListItem }) {
  const t = useTranslations("sessions");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  return (
    <Link
      href={`/practitioner/sessions/${session.id}` as never}
      className="block rounded-2xl border border-border-light bg-surface-primary p-4 transition hover:border-primary/40 hover:shadow-sm dark:bg-white/5 dark:hover:border-primary/40"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary dark:text-white/90">
            {t("card.with")} {session.patient?.displayName ?? "-"}
          </p>
          <p className="mt-1 font-mono text-xs text-text-muted">{session.sessionCode}</p>
        </div>
        <SessionStatusBadge status={session.status} />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
        {session.scheduledStartAt ? (
          <span className="flex items-center gap-1">
            <CalendarDays size={12} />
            {formatScheduledAt(session.scheduledStartAt, numLocale)}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <CalendarDays size={12} />
            {t("card.noSchedule")}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {t("card.duration", { n: session.durationMinutes })}
        </span>
      </div>

      <p className="mt-3 text-xs text-text-secondary">
        {t(`practitioner.list.runtimeHints.${session.status}` as Parameters<typeof t>[0])}
      </p>
    </Link>
  );
}

export default function PractitionerSessionsPanel() {
  const t = useTranslations("sessions.practitioner.list");
  const { data, isLoading, isError, refetch } = usePractitionerSessions({
    limit: DEFAULT_PAGE_LIMIT,
  });

  if (isLoading) {
    return <ListStateSkeleton items={3} heightClass="h-20" />;
  }

  if (isError) {
    return (
      <StateCard
        title={t("errorHeading")}
        note={t("errorNote")}
        action={{ label: t("retry"), onClick: () => refetch() }}
      />
    );
  }

  const sessions = data?.items ?? [];

  if (sessions.length === 0) {
    return (
      <StateCard
        icon={<CalendarDays size={36} className="text-text-muted" />}
        title={t("emptyHeading")}
        note={t("emptyNote")}
      />
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  );
}
