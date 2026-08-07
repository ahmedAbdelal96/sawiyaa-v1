"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Clock3, Video } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SurfaceActionLink, SurfaceCard } from "@/components/shared/SurfaceShell";
import { Skeleton } from "@/components/shared/LoadingStates";
import { useMyNextSession } from "../hooks/use-sessions";

function formatRemaining(target: string, locale: string, now: number): string {
  const minutes = Math.max(0, Math.ceil((new Date(target).getTime() - now) / 60_000));
  if (minutes < 60) return locale === "ar" ? `بعد ${minutes} دقيقة` : `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return locale === "ar"
    ? `بعد ${hours} ساعة${remainder ? ` و${remainder} دقيقة` : ""}`
    : `in ${hours}h${remainder ? ` ${remainder}m` : ""}`;
}

export function UpcomingSessionCard() {
  const locale = useLocale();
  const query = useMyNextSession();
  const [now, setNow] = useState(() => Date.now());
  const session = query.data;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const copy = useMemo(
    () => locale === "ar"
      ? { eyebrow: "الجلسة القادمة", title: "جلستك القادمة", details: "عرض تفاصيل الجلسة", join: "دخول الجلسة", starts: "تبدأ", timezone: "التوقيت", duration: "المدة", status: "الدخول متاح الآن" }
      : { eyebrow: "Upcoming session", title: "Your upcoming session", details: "View session details", join: "Join session", starts: "Starts", timezone: "Timezone", duration: "Duration", status: "Join is available now" },
    [locale],
  );

  if (query.isLoading) {
    return <SurfaceCard variant="section" aria-label={copy.title}><Skeleton className="h-4 w-32" /><Skeleton className="mt-3 h-7 w-64" /><Skeleton className="mt-4 h-12 w-full" /></SurfaceCard>;
  }
  if (query.isError || !session) return null;

  const timeLabel = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: session.displayTimezone }).format(new Date(session.startsAt));
  const countdownTarget = session.joinAvailableAt ?? session.startsAt;

  return (
    <SurfaceCard variant="section" className="border-primary/20 bg-primary-light/30 dark:bg-primary/10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><CalendarClock className="h-4 w-4" />{copy.eyebrow}</div>
          <div><h2 className="text-xl font-semibold text-text-primary dark:text-white">{copy.title}</h2><p className="mt-1 text-base font-medium text-text-primary dark:text-white/90">{session.counterpart.displayName ?? (locale === "ar" ? "الطرف الآخر" : "Your practitioner")}</p></div>
          <div className="flex flex-wrap gap-2 text-sm text-text-secondary"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{timeLabel}</span><span>{copy.timezone}: {session.displayTimezone}</span><span>{copy.duration}: {session.durationMinutes}m</span></div>
          <p className="text-sm font-medium text-primary">{session.joinAvailable ? copy.status : `${copy.starts} ${formatRemaining(countdownTarget, locale, now)}`}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch">
          <SurfaceActionLink href={(session.joinAvailable ? session.joinRoute : session.detailsRoute) as never} variant="primary"><span className="inline-flex items-center gap-2"><Video className="h-4 w-4" />{session.joinAvailable ? copy.join : copy.details}</span></SurfaceActionLink>
          {session.joinAvailable ? <Link href={session.detailsRoute as never} className="text-center text-sm font-semibold text-primary hover:underline">{copy.details}</Link> : null}
        </div>
      </div>
    </SurfaceCard>
  );
}
