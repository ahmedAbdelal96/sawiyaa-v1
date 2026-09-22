"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Clock3, Video } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SurfaceActionLink, SurfaceCard } from "@/components/shared/SurfaceShell";
import { Skeleton } from "@/components/shared/LoadingStates";
import { useMyNextSession } from "../hooks/use-sessions";

function formatRemaining(
  target: string,
  now: number,
  format: (key: string, values?: Record<string, number>) => string,
): string {
  const targetMs = Date.parse(target);
  if (!Number.isFinite(targetMs)) return format("upcomingSession.timeUnavailable");
  const minutes = Math.max(0, Math.ceil((targetMs - now) / 60_000));
  if (minutes < 60) return format("upcomingSession.inMinutes", { minutes });
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return format("upcomingSession.inHours", { hours, remainder });
}

export function UpcomingSessionCard() {
  const locale = useLocale();
  const t = useTranslations("home");
  const query = useMyNextSession();
  const [now, setNow] = useState(() => Date.now());
  const session = query.data;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const copy = useMemo(() => ({
    eyebrow: t("upcomingSession.eyebrow"),
    title: t("upcomingSession.title"),
    details: t("upcomingSession.details"),
    join: t("upcomingSession.join"),
    starts: t("upcomingSession.starts"),
    timezone: t("upcomingSession.timezone"),
    duration: t("upcomingSession.duration"),
    status: t("upcomingSession.status"),
  }), [t]);

  if (query.isLoading) {
    return <SurfaceCard variant="section" aria-label={copy.title}><Skeleton className="h-4 w-32" /><Skeleton className="mt-3 h-7 w-64" /><Skeleton className="mt-4 h-12 w-full" /></SurfaceCard>;
  }
  if (query.isError || !session) return null;

  const startsAtMs = Date.parse(session.startsAt);
  const displayTimezone = session.displayTimezone?.trim();
  if (!Number.isFinite(startsAtMs) || !displayTimezone) return null;

  const timeLabel = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: displayTimezone }).format(new Date(startsAtMs));
  const countdownTarget = session.joinAvailableAt ?? session.startsAt;

  return (
    <SurfaceCard variant="section" className="border-primary/20 bg-primary-light/30 dark:bg-primary/10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><CalendarClock className="h-4 w-4" />{copy.eyebrow}</div>
          <div><h2 className="text-xl font-semibold text-text-primary dark:text-white">{copy.title}</h2><p className="mt-1 text-base font-medium text-text-primary dark:text-white/90">{session.counterpart.displayName ?? t("upcomingSession.counterpart")}</p></div>
          <div className="flex flex-wrap gap-2 text-sm text-text-secondary"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{timeLabel}</span><span>{copy.timezone}: {session.displayTimezone}</span><span>{copy.duration}: {session.durationMinutes}m</span></div>
          <p className="text-sm font-medium text-primary">{session.operational.join.allowed ? copy.status : `${copy.starts} ${formatRemaining(countdownTarget, now, t)}`}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch">
          <SurfaceActionLink href={(session.operational.join.allowed ? session.joinRoute : session.detailsRoute) as never} variant="primary"><span className="inline-flex items-center gap-2"><Video className="h-4 w-4" />{session.operational.join.allowed ? copy.join : copy.details}</span></SurfaceActionLink>
          {session.operational.join.allowed ? <Link href={session.detailsRoute as never} className="text-center text-sm font-semibold text-primary hover:underline">{copy.details}</Link> : null}
        </div>
      </div>
    </SurfaceCard>
  );
}
