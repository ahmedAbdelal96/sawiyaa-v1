"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Check, Clock3, Pencil, Repeat2, Send, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useAvailabilityWeekDetails, useMyAvailabilityWeeks } from "../hooks/use-availability";
import type { AvailabilityWeek, AvailabilityWeekWindowEntry } from "../types/availability.types";
import { PublishModal, RepeatModal, ScheduleEditorModal } from "./AvailabilityWeeksWorkspace";
import AvailabilityTimeRange from "./AvailabilityTimeRange";

type Duration = 30 | 60;
type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const DAYS: Day[] = [0, 1, 2, 3, 4, 5, 6];
const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function formatDateRange(start: string, end: string, locale: string) {
  const formatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  return `${formatter.format(new Date(`${start}T12:00:00`))} - ${formatter.format(new Date(`${end}T12:00:00`))}`;
}

function statusKey(status: AvailabilityWeek["status"]) {
  return status === "DRAFT" ? "notPublished" : status === "NOT_SET" ? "noSessionTimes" : status.toLowerCase();
}

function StatusBadge({ status }: { status: AvailabilityWeek["status"] }) {
  const t = useTranslations("practitioner-area.availability");
  return <span className="inline-flex rounded-full border border-border-light bg-surface-tertiary px-3 py-1 text-xs font-semibold text-text-secondary">{t(`statusLabels.${statusKey(status)}`)}</span>;
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-border-light bg-white p-4 shadow-sm dark:bg-surface-secondary"><div className="flex items-center gap-2 text-xs font-medium text-text-muted">{icon}{label}</div><p className="mt-2 text-lg font-semibold text-text-primary dark:text-white/95">{value}</p></div>;
}

export default function AvailabilityWeekDetailsScreen({ weekId }: { weekId: string }) {
  const t = useTranslations("practitioner-area.availability");
  const locale = useLocale();
  const detailsQuery = useAvailabilityWeekDetails(weekId);
  const weeksQuery = useMyAvailabilityWeeks();
  const [duration, setDuration] = useState<Duration>(30);
  const [dialog, setDialog] = useState<"edit" | "publish" | "repeat" | null>(null);
  const details = detailsQuery.data;
  const week = details?.week;
  const summary = weeksQuery.data?.weeks.find((entry) => entry.weekId === weekId);
  const entry = useMemo<AvailabilityWeekWindowEntry | null>(() => {
    if (summary) return summary;
    if (!week) return null;
    return { weekId, weekStartDate: week.weekStartDate, weekEndDate: week.weekEndDate, status: week.status, isCurrentWeek: false, relativeWeekIndex: 0, canCreate: false, canEdit: week.isEditable, canPublish: Boolean(details?.canPublish), containsBookings: Boolean(details?.containsBookings), slotCount: week.slots.length, slotCount30Minutes: details?.slotCount30Minutes ?? 0, slotCount60Minutes: details?.slotCount60Minutes ?? 0, copiedFromWeekId: week.copiedFromWeekId };
  }, [details, summary, week, weekId]);
  const hasEmptyFutureWeek = Boolean(weeksQuery.data?.weeks.some((entry) => entry.relativeWeekIndex > (summary?.relativeWeekIndex ?? 0) && !entry.weekId));
  const grouped = useMemo(() => DAYS.map((day) => ({ day, slots: week?.slots.filter((slot) => slot.dayOfWeek === day && slot.durationMinutes === duration) ?? [] })).filter((entry) => entry.slots.length > 0), [duration, week]);

  if (detailsQuery.isLoading || !week || !entry) return <div className="rounded-2xl border border-border-light bg-white p-6 text-sm text-text-muted dark:bg-surface-secondary">{t("detailsPage.loading")}</div>;
  if (detailsQuery.isError) return <div className="rounded-2xl border border-error-200 bg-error-50 p-6 text-sm text-error-700">{t("dialogs.loadError")}</div>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2"><Link href="/practitioner/availability" className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-primary"><ArrowLeft className="h-4 w-4" />{t("detailsPage.back")}</Link><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{t("detailsPage.eyebrow")}</p><h1 className="mt-2 text-2xl font-semibold text-text-primary dark:text-white/95">{t(`detailsPage.title.${week.status === "NOT_SET" ? "setup" : "details"}`, { range: formatDateRange(week.weekStartDate, week.weekEndDate, locale) })}</h1><p className="mt-2 text-sm text-text-secondary">{t("detailsPage.timezone", { timezone: week.timezone })}</p></div></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setDialog("edit")} disabled={!entry.canEdit} className="inline-flex items-center gap-2 rounded-xl border border-border-light bg-white px-3.5 py-2.5 text-sm font-semibold text-text-secondary disabled:cursor-not-allowed disabled:opacity-40 dark:bg-surface-secondary"><Pencil className="h-4 w-4" />{t("actions.edit")}</button>{entry.canPublish ? <button type="button" onClick={() => setDialog("publish")} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-white"><Send className="h-4 w-4" />{t("actions.publish")}</button> : null}{entry.slotCount > 0 ? <button type="button" onClick={() => setDialog("repeat")} disabled={!hasEmptyFutureWeek} title={!hasEmptyFutureWeek ? t("dialogs.repeat.reasons.NO_EMPTY_FUTURE_WEEKS") : undefined} className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary-light px-3.5 py-2.5 text-sm font-semibold text-text-brand disabled:cursor-not-allowed disabled:opacity-50"><Repeat2 className="h-4 w-4" />{t("actions.repeat")}</button> : null}</div>
    </div>
    <div className="flex flex-wrap items-center gap-3"><StatusBadge status={week.status} /><span className="text-sm text-text-secondary">{details.containsBookings ? t("weekMeta.bookings") : t("weekMeta.noBookings")}</span>{week.copiedFromWeekId ? <span className="text-sm text-text-muted">{t("weekMeta.copied")}</span> : null}</div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><SummaryCard label={t("detailsPage.summary.sessions30")} value={String(details.slotCount30Minutes)} icon={<Clock3 className="h-4 w-4 text-primary" />} /><SummaryCard label={t("detailsPage.summary.sessions60")} value={String(details.slotCount60Minutes)} icon={<Clock3 className="h-4 w-4 text-primary" />} /><SummaryCard label={t("detailsPage.summary.bookings")} value={details.containsBookings ? t("weekMeta.bookings") : t("weekMeta.noBookings")} icon={<ShieldCheck className="h-4 w-4 text-primary" />} /><SummaryCard label={t("detailsPage.summary.timezone")} value={week.timezone} icon={<CalendarDays className="h-4 w-4 text-primary" />} /></div>
    <section className="rounded-[26px] border border-border-light bg-white p-5 shadow-sm dark:bg-surface-secondary"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-text-primary dark:text-white/95">{t("detailsPage.sessionsTitle")}</h2><p className="mt-1 text-sm text-text-secondary">{t("detailsPage.sessionsDescription")}</p></div><div className="flex rounded-xl border border-border-light p-1" role="tablist">{([30, 60] as Duration[]).map((value) => <button key={value} type="button" role="tab" aria-selected={duration === value} onClick={() => setDuration(value)} className={cn("rounded-lg px-3 py-2 text-sm font-semibold", duration === value ? "bg-primary text-white" : "text-text-secondary")}>{t(`editorLabels.duration${value}`)}</button>)}</div></div><div className="mt-5 space-y-3">{grouped.length === 0 ? <p className="rounded-2xl border border-dashed border-border-light px-4 py-6 text-sm text-text-muted">{t("dialogs.details.noTimes")}</p> : grouped.map(({ day, slots }) => <div key={day} className="flex flex-wrap items-start gap-3 rounded-2xl bg-surface-tertiary px-4 py-3"><span className="w-24 pt-1 text-sm font-semibold text-text-secondary">{t(`editorLabels.${DAY_KEYS[day]}`)}</span><div className="flex flex-wrap gap-2">{slots.map((slot) => <span key={slot.id} className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold", slot.isBookedOrReserved ? "border-warning-200 bg-warning-50 text-warning-700" : "border-primary/15 bg-primary-light text-text-brand")} title={slot.isBookedOrReserved ? t("detailsPage.protectedTime") : undefined}>{slot.isBookedOrReserved ? <ShieldCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}<AvailabilityTimeRange locale={locale} startMinuteOfDay={slot.startMinuteOfDay} endMinuteOfDay={slot.endMinuteOfDay} fromLabel={t("timeRange.from")} toLabel={t("timeRange.to")} />{slot.isBookedOrReserved ? <span className="sr-only">{t("detailsPage.protectedTime")}</span> : null}</span>)}</div></div>)}</div></section>
    <section className="rounded-2xl border border-border-light bg-surface-tertiary p-4"><h2 className="text-sm font-semibold text-text-primary dark:text-white/95">{t("detailsPage.exceptionsTitle")}</h2><p className="mt-1 text-sm leading-6 text-text-secondary">{t("detailsPage.exceptionsDescription")}</p></section>
    {dialog === "edit" ? <ScheduleEditorModal week={entry} timezone={week.timezone} onClose={() => setDialog(null)} /> : null}{dialog === "publish" ? <PublishModal week={entry} onClose={() => setDialog(null)} /> : null}{dialog === "repeat" && weeksQuery.data ? <RepeatModal week={entry} data={weeksQuery.data} onClose={() => setDialog(null)} /> : null}
  </div>;
}
