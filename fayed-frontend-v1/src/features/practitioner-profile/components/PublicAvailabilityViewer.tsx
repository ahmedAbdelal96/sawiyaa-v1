"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatViewerDate, formatViewerDateTime, formatViewerTime } from "@/lib/time-formatting";
import { toAppError } from "@/lib/api/errors";
import { usePublicAvailabilityWindows } from "../hooks/use-public-availability";
import { useCreateScheduledSession } from "@/features/sessions/hooks/use-sessions";
import { Skeleton } from "@/components/shared/LoadingStates";
import { useAuthState } from "@/stores";
import type { PublicAvailabilityWindow } from "../types/public-availability.types";
import type { SessionItem } from "@/features/sessions/types/sessions.types";

const VISIBLE_DATE_COLUMNS = 5;

type SelectableSlot = {
  startsAt: string;
  windowEndsAt: string;
  maxDuration: 30 | 60;
};

type DayGroup = {
  sortKey: string;
  dayLabel: string;
  slots: SelectableSlot[];
};

type DateColumn = {
  sortKey: string;
  dayLabelShort: string;
  dayNumber: string;
  slots: SelectableSlot[];
};

type Phase = "browse" | "confirm" | "success";

type Props = {
  slug: string;
};

const MIN_BOOKING_LEAD_MS = 60 * 1000;

function toDayKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getDateWindowBounds(dateOffsetDays: number): { from: string; to: string; fromDate: Date; toDate: Date } {
  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dateOffsetDays, 0, 0, 0, 0);
  const toDate = new Date(fromDate);
  toDate.setDate(toDate.getDate() + VISIBLE_DATE_COLUMNS);
  return { from: fromDate.toISOString(), to: toDate.toISOString(), fromDate, toDate };
}

function formatDateWindowLabel(from: string, to: string, numLocale: string): string {
  const start = new Date(from);
  const end = new Date(to);
  end.setDate(end.getDate() - 1);
  return `${formatViewerDate(start, { locale: numLocale })} - ${formatViewerDate(end, {
    locale: numLocale,
  })}`;
}

function formatDayHeader(iso: string, numLocale: string): { short: string; dayNumber: string } {
  const d = new Date(iso);
  return {
    short: new Intl.DateTimeFormat(numLocale, { weekday: "short" }).format(d),
    dayNumber: new Intl.DateTimeFormat(numLocale, { day: "numeric" }).format(d),
  };
}

function formatTimeLabel(isoString: string, numLocale: string): string {
  return formatViewerTime(isoString, { locale: numLocale });
}

function formatFullDatetime(isoString: string | null, numLocale: string): string {
  return formatViewerDateTime(isoString, { locale: numLocale });
}

function buildSlotsFromWindow(window: PublicAvailabilityWindow): SelectableSlot[] {
  const slots: SelectableSlot[] = [];
  const startTime = new Date(window.startsAt).getTime();
  const endTime = new Date(window.endsAt).getTime();
  const halfHourMs = 30 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const earliestAllowedStart = Date.now() + MIN_BOOKING_LEAD_MS;

  for (let current = startTime; current + halfHourMs <= endTime; current += halfHourMs) {
    if (current <= earliestAllowedStart) continue;
    const remaining = endTime - current;
    slots.push({
      startsAt: new Date(current).toISOString(),
      windowEndsAt: window.endsAt,
      maxDuration: remaining >= hourMs ? 60 : 30,
    });
  }
  return slots;
}

function groupByLocalDay(windows: PublicAvailabilityWindow[], numLocale: string): DayGroup[] {
  const map = new Map<string, { sortKey: string; dayLabel: string; slots: Map<string, SelectableSlot> }>();
  for (const window of windows) {
    const slots = buildSlotsFromWindow(window);
    for (const slot of slots) {
      const d = new Date(slot.startsAt);
      const sortKey = toDayKey(d);
      if (!map.has(sortKey)) {
        map.set(sortKey, {
          sortKey,
          dayLabel: new Intl.DateTimeFormat(numLocale, {
            weekday: "short",
            month: "short",
            day: "numeric",
          }).format(d),
          slots: new Map<string, SelectableSlot>(),
        });
      }
      const dayGroup = map.get(sortKey)!;
      const existing = dayGroup.slots.get(slot.startsAt);
      if (!existing) {
        dayGroup.slots.set(slot.startsAt, slot);
        continue;
      }
      if (
        slot.maxDuration > existing.maxDuration ||
        new Date(slot.windowEndsAt).getTime() > new Date(existing.windowEndsAt).getTime()
      ) {
        dayGroup.slots.set(slot.startsAt, {
          ...existing,
          windowEndsAt: slot.windowEndsAt,
          maxDuration: Math.max(existing.maxDuration, slot.maxDuration) as 30 | 60,
        });
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map((group) => ({
      ...group,
      slots: Array.from(group.slots.values()).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    }));
}

export default function PublicAvailabilityViewer({ slug }: Props) {
  const tAvail = useTranslations("practitioner-profile.availability");
  const tBook = useTranslations("practitioner-profile.booking");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const isRtl = locale === "ar";
  const noTimesInDayLabel = isRtl ? "لا توجد مواعيد" : "No times available";
  const showBookedSessionsLabel = isRtl ? "إظهار الجلسات المحجوزة" : "Show booked sessions";
  const bookedSlotsUnavailableLabel = isRtl
    ? "لا يوجد عقد بيانات حالي يعرض المواعيد المحجوزة"
    : "Current data contract does not expose booked slots.";
  const browseNextDatesLabel = isRtl ? "عرض التواريخ التالية" : "Show next dates";

  const { user, isLoading: isAuthLoading } = useAuthState();
  const isPatient = user?.role === "PATIENT";
  const isAuthenticated = Boolean(user);

  const [dateWindowOffsetDays, setDateWindowOffsetDays] = useState(0);
  const [showBooked, setShowBooked] = useState(false);
  const canShowBookedSlots = false;

  const { from, to, fromDate } = useMemo(
    () => getDateWindowBounds(dateWindowOffsetDays),
    [dateWindowOffsetDays],
  );
  const dateWindowLabel = useMemo(() => formatDateWindowLabel(from, to, numLocale), [from, to, numLocale]);
  const { data, isLoading, isError, refetch } = usePublicAvailabilityWindows(slug, from, to);

  const dayGroups = useMemo(() => (data ? groupByLocalDay(data.windows, numLocale) : []), [data, numLocale]);
  const dayMap = useMemo(() => new Map(dayGroups.map((d) => [d.sortKey, d])), [dayGroups]);

  const [durationFilter, setDurationFilter] = useState<30 | 60>(30);
  const [phase, setPhase] = useState<Phase>("browse");
  const [selectedSlot, setSelectedSlot] = useState<SelectableSlot | null>(null);
  const [duration, setDuration] = useState<30 | 60>(60);
  const [createdSession, setCreatedSession] = useState<SessionItem | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const createSession = useCreateScheduledSession();

  const dateColumns = useMemo<DateColumn[]>(() => {
    const columns: DateColumn[] = [];
    for (let i = 0; i < VISIBLE_DATE_COLUMNS; i += 1) {
      const d = new Date(fromDate);
      d.setDate(fromDate.getDate() + i);
      const key = toDayKey(d);
      const grouped = dayMap.get(key);
      const header = formatDayHeader(d.toISOString(), numLocale);
      columns.push({
        sortKey: key,
        dayLabelShort: header.short,
        dayNumber: header.dayNumber,
        slots: (grouped?.slots ?? [])
          .filter((slot) => slot.maxDuration >= durationFilter)
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      });
    }
    return columns;
  }, [fromDate, dayMap, numLocale, durationFilter]);

  const allEmpty = dateColumns.every((c) => c.slots.length === 0);

  const handleSlotSelect = useCallback(
    (slot: SelectableSlot) => {
      setSelectedSlot(slot);
      setDuration(durationFilter <= slot.maxDuration ? durationFilter : slot.maxDuration);
      setBookingError(null);
      setPhase("confirm");
    },
    [durationFilter],
  );

  const handleBack = useCallback(() => {
    setPhase("browse");
    setSelectedSlot(null);
    setBookingError(null);
    createSession.reset();
  }, [createSession]);

  const handleConfirm = useCallback(() => {
    if (!selectedSlot || !isPatient) return;
    setBookingError(null);
    createSession.mutate(
      {
        practitionerSlug: slug,
        scheduledStartAt: selectedSlot.startsAt,
        durationMinutes: duration,
        sessionMode: "VIDEO",
      },
      {
        onSuccess: (response) => {
          setCreatedSession(response.item);
          void refetch();
          setPhase("success");
        },
        onError: (err) => {
          const appErr = toAppError(err);
          setBookingError(appErr.statusCode === 409 ? tBook("createErrorConflict") : tBook("createError"));
        },
      },
    );
  }, [selectedSlot, isPatient, slug, duration, createSession, tBook, refetch]);

  const handleBookAnother = useCallback(() => {
    void refetch();
    setPhase("browse");
    setSelectedSlot(null);
    setCreatedSession(null);
    setBookingError(null);
    createSession.reset();
  }, [createSession, refetch]);

  if (phase === "success" && createdSession) {
    const payHref = `/patient/sessions/${createdSession.id}/pay` as const;
    return (
      <div>
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-700/40 dark:bg-green-900/10">
          <p className="mb-1 text-sm font-semibold text-green-700 dark:text-green-400">{tBook("successHeading")}</p>
          <p className="text-xs text-green-700/80 dark:text-green-400/80">
            {formatFullDatetime(createdSession.scheduledStartAt, numLocale)}
          </p>
        </div>
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700/40 dark:bg-amber-900/10">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">{tBook("successStatus")}</p>
          <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400/80">{tBook("successNote")}</p>
        </div>
        <div className="mt-4 space-y-2">
          <Link
            href={payHref}
            className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90"
          >
            {tBook("payNow")}
          </Link>
          <button
            type="button"
            onClick={handleBookAnother}
            className="flex w-full items-center justify-center rounded-2xl border border-border-light px-4 py-3 text-sm text-text-secondary hover:bg-surface-tertiary dark:hover:bg-white/5"
          >
            {tBook("bookAnother")}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "confirm" && selectedSlot) {
    const supports60 = selectedSlot.maxDuration >= 60;
    return (
      <div>
        <button
          type="button"
          onClick={handleBack}
          className="mb-3 inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary"
        >
          <ArrowLeft size={12} className="rtl:rotate-180" />
          {tBook("backToSlots")}
        </button>

        <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 dark:border-primary/40 dark:bg-primary/10">
          <p className="text-[11px] font-medium text-text-muted">{tBook("selectedSlot")}</p>
          <p className="mt-0.5 text-sm font-semibold text-primary">{formatFullDatetime(selectedSlot.startsAt, numLocale)}</p>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-[11px] font-medium text-text-muted">{tBook("selectDuration")}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDuration(30)}
              className={`flex-1 rounded-2xl border px-3 py-3 text-xs font-medium transition ${
                duration === 30
                  ? "border-primary bg-primary/10 text-primary dark:bg-primary/15"
                  : "border-border-light bg-white text-text-secondary hover:bg-surface-tertiary dark:bg-surface-secondary dark:hover:bg-white/5"
              }`}
            >
              {tBook("duration30")}
            </button>
            <button
              type="button"
              disabled={!supports60}
              onClick={() => supports60 && setDuration(60)}
              className={`flex-1 rounded-2xl border px-3 py-3 text-xs font-medium transition ${
                duration === 60
                  ? "border-primary bg-primary/10 text-primary dark:bg-primary/15"
                  : "border-border-light bg-white text-text-secondary hover:bg-surface-tertiary dark:bg-surface-secondary dark:hover:bg-white/5"
              } ${!supports60 ? "cursor-not-allowed opacity-40" : ""}`}
            >
              {tBook("duration60")}
            </button>
          </div>
        </div>

        {isAuthLoading ? (
          <Skeleton className="h-12 w-full rounded-2xl" />
        ) : !isAuthenticated ? (
          <div>
            <p className="mb-2 text-xs text-text-muted">{tBook("signInNote")}</p>
            <Link
              href="/signin?mode=patient"
              className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90"
            >
              {tBook("signInToCta")}
            </Link>
          </div>
        ) : !isPatient ? (
          <p className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 text-xs text-text-muted dark:bg-white/5">
            {tBook("nonPatientNote")}
          </p>
        ) : (
          <div>
            {bookingError && <p className="mb-2 text-xs text-error-500">{bookingError}</p>}
            <button
              type="button"
              disabled={createSession.isPending}
              onClick={handleConfirm}
              className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createSession.isPending ? tBook("confirming") : tBook("confirmCta")}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">{tAvail("heading")}</p>
          <p className="mt-1 text-sm font-medium text-text-secondary">{dateWindowLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={isRtl ? "السابق" : "Previous"}
            onClick={() => setDateWindowOffsetDays((n) => n - VISIBLE_DATE_COLUMNS)}
            className="rounded-xl border border-border-light bg-white p-2 text-text-muted transition hover:border-primary hover:text-primary dark:border-border-light dark:bg-surface"
          >
            <ChevronLeft size={14} className="rtl:rotate-180" />
          </button>
          <button
            type="button"
            aria-label={isRtl ? "التالي" : "Next"}
            onClick={() => setDateWindowOffsetDays((n) => n + VISIBLE_DATE_COLUMNS)}
            className="rounded-xl border border-border-light bg-white p-2 text-text-muted transition hover:border-primary hover:text-primary dark:border-border-light dark:bg-surface"
          >
            <ChevronRight size={14} className="rtl:rotate-180" />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${VISIBLE_DATE_COLUMNS}, minmax(0, 1fr))` }}>
            {Array.from({ length: VISIBLE_DATE_COLUMNS }).map((_, i) => (
              <Skeleton key={i} className="h-8 rounded-lg" />
            ))}
          </div>
          <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${VISIBLE_DATE_COLUMNS}, minmax(0, 1fr))` }}>
            {Array.from({ length: VISIBLE_DATE_COLUMNS }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {isError && !isLoading && (
        <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-4 text-center dark:bg-white/5">
          <p className="mb-2 text-sm text-error-500">{tAvail("loadError")}</p>
          <button type="button" onClick={() => refetch()} className="text-sm font-medium text-primary hover:underline">
            {tAvail("retry")}
          </button>
        </div>
      )}

      {data && !isLoading && (
        <>
          {!isAuthLoading && !isPatient && <p className="mb-3 text-sm text-text-muted">{tBook("slotHint")}</p>}

          <div className="mb-3 inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-border-light bg-white px-2 py-2 dark:bg-surface">
            <span className="text-[10px] font-medium text-text-muted">{tBook("selectDuration")}</span>
            <button
              type="button"
              onClick={() => setDurationFilter(30)}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
                durationFilter === 30
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border-light bg-white text-text-secondary hover:border-primary/40 hover:text-primary dark:bg-surface"
              }`}
            >
              {tBook("duration30")}
            </button>
            <button
              type="button"
              onClick={() => setDurationFilter(60)}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
                durationFilter === 60
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border-light bg-white text-text-secondary hover:border-primary/40 hover:text-primary dark:bg-surface"
              }`}
            >
              {tBook("duration60")}
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border-light bg-white dark:bg-surface">
            <div className={`grid border-b border-border-light`} style={{ gridTemplateColumns: `repeat(${VISIBLE_DATE_COLUMNS}, minmax(0, 1fr))` }}>
              {dateColumns.map((day, index) => (
                <div
                  key={day.sortKey}
                  className={`px-1.5 py-2 text-center ${index !== 0 ? (isRtl ? "border-r" : "border-l") : ""} border-border-light`}
                >
                  <p className="text-[10px] font-medium text-text-secondary">{day.dayLabelShort}</p>
                  <p className="text-[11px] font-semibold text-text-primary">{day.dayNumber}</p>
                </div>
              ))}
            </div>

            <div className={`grid`} style={{ gridTemplateColumns: `repeat(${VISIBLE_DATE_COLUMNS}, minmax(0, 1fr))` }}>
              {dateColumns.map((day, index) => (
                <div
                  key={day.sortKey}
                  className={`min-h-[220px] px-1 py-1.5 ${index !== 0 ? (isRtl ? "border-r" : "border-l") : ""} border-border-light`}
                >
                  {day.slots.length === 0 ? (
                    <p className="mt-2 text-center text-[11px] leading-4 text-text-muted">{noTimesInDayLabel}</p>
                  ) : (
                    day.slots.map((slot) => (
                      <button
                        key={`${slot.startsAt}-${slot.windowEndsAt}-${slot.maxDuration}`}
                        type="button"
                        onClick={() => handleSlotSelect(slot)}
                        className="mb-1 flex h-8 w-full items-center justify-center rounded-lg border border-border-light/70 bg-white px-1 text-[10px] sm:text-xs font-semibold text-text-primary transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:text-primary dark:bg-surface-secondary"
                      >
                        {formatTimeLabel(slot.startsAt, numLocale)}
                      </button>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border-light bg-surface-tertiary px-3 py-2 dark:bg-white/5">
            <div className="flex items-center gap-2 text-[11px] text-text-secondary">
              <span className="font-medium text-text-muted">{tAvail("localTimeLabel")}</span>
              <span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
            </div>
          </div>

          {allEmpty && (
            <div className="mt-3 rounded-2xl bg-surface px-4 py-4 dark:bg-white/5">
              <p className="text-sm text-text-muted">{tAvail("noSlots")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDateWindowOffsetDays((n) => n + VISIBLE_DATE_COLUMNS)}
                  className="inline-flex items-center justify-center rounded-xl border border-border-light px-3 py-2 text-xs font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary dark:hover:bg-white/5"
                >
                  {browseNextDatesLabel}
                </button>
                <Link
                  href={isPatient ? "/patient/practitioners" : "/practitioners"}
                  className="inline-flex items-center justify-center rounded-xl border border-border-light px-3 py-2 text-xs font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary dark:hover:bg-white/5"
                >
                  {tAvail("browseOtherPractitioners")}
                </Link>
              </div>
            </div>
          )}

          <p className="mt-4 text-[11px] text-text-muted">{tAvail("timezoneNote")}</p>
        </>
      )}
    </div>
  );
}
