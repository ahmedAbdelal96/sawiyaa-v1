"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CalendarDays, Clock } from "lucide-react";
import { usePatientSessions } from "../hooks/use-sessions";
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
      href={`/patient/sessions/${session.id}` as never}
      className="block rounded-2xl border border-border-light bg-surface-primary p-4 transition hover:border-primary/40 hover:shadow-sm dark:bg-white/5 dark:hover:border-primary/40"
    >
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary dark:text-white/90">
            {t("card.with")}{" "}
            {session.practitioner.displayName ?? session.practitioner.slug}
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
        {t(`list.runtimeHints.${session.status}` as Parameters<typeof t>[0])}
      </p>
    </Link>
  );
}

export default function PatientSessionsPanel() {
  const t = useTranslations("sessions");
  const { data, isLoading, isError, refetch } = usePatientSessions({ limit: 20 });

  if (isLoading) {
    return <ListStateSkeleton items={3} heightClass="h-20" />;
  }

  if (isError) {
    return (
      <StateCard
        title={t("list.errorHeading")}
        note={t("list.errorNote")}
        action={{ label: t("list.retry"), onClick: () => refetch() }}
      />
    );
  }

  const sessions = data?.items ?? [];

  if (sessions.length === 0) {
    return (
      <StateCard
        icon={<CalendarDays size={36} className="text-text-muted" />}
        title={t("list.emptyHeading")}
        note={t("list.emptyNote")}
        action={{
          label: t("list.emptyAction"),
          href: (
            <Link
              href="/patient/matching"
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
            >
              {t("list.emptyAction")}
            </Link>
          ),
        }}
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
