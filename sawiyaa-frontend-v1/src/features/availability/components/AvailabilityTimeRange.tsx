"use client";

function formatAvailabilityClock(minutes: number, locale: string) {
  const date = new Date(Date.UTC(1970, 0, 1, Math.floor(minutes / 60), minutes % 60));
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" }).format(date);
}

export function getAvailabilityTimeRangeAccessibleLabel({ locale, startMinuteOfDay, endMinuteOfDay, fromLabel, toLabel }: { locale: string; startMinuteOfDay: number; endMinuteOfDay: number; fromLabel: string; toLabel: string }) {
  return `${fromLabel} ${formatAvailabilityClock(startMinuteOfDay, locale)} ${toLabel} ${formatAvailabilityClock(endMinuteOfDay, locale)}`;
}

export default function AvailabilityTimeRange({ locale, startMinuteOfDay, endMinuteOfDay, fromLabel, toLabel, className }: { locale: string; startMinuteOfDay: number; endMinuteOfDay: number; fromLabel: string; toLabel: string; className?: string }) {
  const start = formatAvailabilityClock(startMinuteOfDay, locale);
  const end = formatAvailabilityClock(endMinuteOfDay, locale);

  if (locale.startsWith("ar")) {
    return <span dir="rtl" className={className}><span>{fromLabel}</span>{" "}<bdi dir="ltr">{start}</bdi>{" "}<span>{toLabel}</span>{" "}<bdi dir="ltr">{end}</bdi></span>;
  }

  return <span dir="ltr" className={className}>{start} – {end}</span>;
}
