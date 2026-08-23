"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, CalendarDays, CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { MoneyText } from "@/components/money/MoneyText";
import { mapPractitionerDurationMoney } from "@/features/practitioners-discovery/lib/practitioner-price";
import { formatViewerDate, formatViewerDateTime, formatViewerTime } from "@/lib/time-formatting";
import { toAppError } from "@/lib/api/errors";
import { usePublicAvailabilityWindows } from "../hooks/use-public-availability";
import { useCreateScheduledSession } from "@/features/sessions/hooks/use-sessions";
import { Skeleton } from "@/components/shared/LoadingStates";
import { useAuthState } from "@/stores";
import type { PublicAvailabilityWindow } from "../types/public-availability.types";
import type { SessionItem } from "@/features/sessions/types/sessions.types";
import { cn } from "@/lib/utils";

const VISIBLE_DATE_COLUMNS = 7;

type SelectableSlot = {
  startsAt: string;
  windowEndsAt: string;
  maxDuration: 30 | 60;
};

type DayGroup = {
  sortKey: string;
  dayLabel: string;
  dayName: string;
  dayNumber: string;
  slots: SelectableSlot[];
};

type DateColumn = {
  sortKey: string;
  dayLabelShort: string;
  dayLabelFull: string;
  dayNumber: string;
  slots: SelectableSlot[];
};

type Phase = "browse" | "confirm" | "success";

type Props = {
  slug: string;
  currencyCode: "EGP" | "USD" | null;
  displaySessionPrice30: number | null;
  displaySessionPrice60: number | null;
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

function formatDayHeader(iso: string, numLocale: string): { short: string; full: string; dayNumber: string } {
  const d = new Date(iso);
  return {
    short: new Intl.DateTimeFormat(numLocale, { weekday: "short" }).format(d),
    full: new Intl.DateTimeFormat(numLocale, { weekday: "long", month: "short", day: "numeric" }).format(d),
    dayNumber: new Intl.DateTimeFormat(numLocale, { day: "numeric" }).format(d),
  };
}

function formatTimeLabel(isoString: string, numLocale: string): string {
  return formatViewerTime(isoString, { locale: numLocale });
}

function formatSlotTimeRange(startsAtIso: string, durationMinutes: 30 | 60, numLocale: string): string {
  const startFormatted = formatViewerTime(startsAtIso, { locale: numLocale });
  const endDate = new Date(new Date(startsAtIso).getTime() + durationMinutes * 60 * 1000);
  const endFormatted = formatViewerTime(endDate.toISOString(), { locale: numLocale });
  return `${startFormatted} - ${endFormatted}`;
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
  const map = new Map<string, { sortKey: string; dayLabel: string; dayName: string; dayNumber: string; slots: Map<string, SelectableSlot> }>();
  for (const window of windows) {
    const slots = buildSlotsFromWindow(window);
    for (const slot of slots) {
      const d = new Date(slot.startsAt);
      const sortKey = toDayKey(d);
      if (!map.has(sortKey)) {
        map.set(sortKey, {
          sortKey,
          dayLabel: new Intl.DateTimeFormat(numLocale, {
            weekday: "long",
            month: "short",
            day: "numeric",
          }).format(d),
          dayName: new Intl.DateTimeFormat(numLocale, { weekday: "short" }).format(d),
          dayNumber: new Intl.DateTimeFormat(numLocale, { day: "numeric" }).format(d),
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

export default function PublicAvailabilityViewer({
  slug,
  currencyCode,
  displaySessionPrice30,
  displaySessionPrice60,
}: Props) {
  const tAvail = useTranslations("practitioner-profile.availability");
  const tBook = useTranslations("practitioner-profile.booking");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const sessionFeesLabel = tBook("sessionFees");
  const selectedPriceLabel = tBook("selectedPriceLabel");
  const browseNextDatesLabel = tAvail("browseNextWeek");

  const { user, isLoading: isAuthLoading } = useAuthState();
  const isPatient = user?.role === "PATIENT";
  const isAuthenticated = Boolean(user);

  const [dateWindowOffsetDays, setDateWindowOffsetDays] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [durationFilter, setDurationFilter] = useState<30 | 60>(30);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { from, to, fromDate } = useMemo(
    () => getDateWindowBounds(dateWindowOffsetDays),
    [dateWindowOffsetDays],
  );
  const dateWindowLabel = useMemo(() => formatDateWindowLabel(from, to, numLocale), [from, to, numLocale]);
  const { data, isLoading, isError, refetch } = usePublicAvailabilityWindows(slug, from, to);

  const dayGroups = useMemo(() => (data ? groupByLocalDay(data.windows, numLocale) : []), [data, numLocale]);
  const dayMap = useMemo(() => new Map(dayGroups.map((d) => [d.sortKey, d])), [dayGroups]);

  // Build 7-day columns
  const dateColumns = useMemo<DateColumn[]>(() => {
    const columns: DateColumn[] = [];
    for (let i = 0; i < VISIBLE_DATE_COLUMNS; i += 1) {
      const d = new Date(fromDate);
      d.setDate(fromDate.getDate() + i);
      const key = toDayKey(d);
      const grouped = dayMap.get(key);
      const header = formatDayHeader(d.toISOString(), numLocale);
      const allSlots = grouped?.slots ?? [];
      const filteredSlots = allSlots.filter((slot) => slot.maxDuration >= durationFilter);

      columns.push({
        sortKey: key,
        dayLabelShort: header.short,
        dayLabelFull: header.full,
        dayNumber: header.dayNumber,
        slots: filteredSlots.sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      });
    }
    return columns;
  }, [fromDate, dayMap, numLocale, durationFilter]);

  // Auto-select first available day or fallback to today/first day
  useEffect(() => {
    if (dateColumns.length === 0) return;

    // If current selected day is not in visible range, or is null, pick first day with slots
    const isCurrentInView = dateColumns.some((c) => c.sortKey === selectedDayKey);
    if (!isCurrentInView || !selectedDayKey) {
      const firstWithSlots = dateColumns.find((c) => c.slots.length > 0);
      setSelectedDayKey(firstWithSlots ? firstWithSlots.sortKey : dateColumns[0].sortKey);
    }
  }, [dateColumns, selectedDayKey]);

  // Active selected day
  const selectedDay = useMemo(() => {
    return dateColumns.find((c) => c.sortKey === selectedDayKey) ?? dateColumns[0];
  }, [dateColumns, selectedDayKey]);

  // Find first available day across current week if selected day is empty
  const firstAvailableDayInWeek = useMemo(() => {
    return dateColumns.find((c) => c.slots.length > 0);
  }, [dateColumns]);

  const allWeekEmpty = dateColumns.every((c) => c.slots.length === 0);

  // Booking Flow State
  const [phase, setPhase] = useState<Phase>("browse");
  const [selectedSlot, setSelectedSlot] = useState<SelectableSlot | null>(null);
  const [duration, setDuration] = useState<30 | 60>(60);
  const [createdSession, setCreatedSession] = useState<SessionItem | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const createSession = useCreateScheduledSession();

  const selectedDurationPrice = duration === 30 ? displaySessionPrice30 : displaySessionPrice60;

  const handleSlotSelect = useCallback(
    (slot: SelectableSlot) => {
      setSelectedSlot(slot);
      setDuration(durationFilter);
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

  // Phase: Success
  if (phase === "success" && createdSession) {
    const payHref = `/patient/sessions/${createdSession.id}/pay` as const;
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-700/40 dark:bg-emerald-900/15">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{tBook("successHeading")}</p>
          </div>
          <p className="mt-2 text-xs font-semibold text-emerald-700/90 dark:text-emerald-400">
            {formatFullDatetime(createdSession.scheduledStartAt, numLocale)}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700/40 dark:bg-amber-900/10">
          <p className="text-xs font-bold text-amber-800 dark:text-amber-300">{tBook("successStatus")}</p>
          <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400/80">{tBook("successNote")}</p>
        </div>

        <div className="space-y-2 pt-2">
          <Link
            href={payHref}
            className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-primary/90"
          >
            {tBook("payNow")}
          </Link>
          <button
            type="button"
            onClick={handleBookAnother}
            className="flex w-full items-center justify-center rounded-xl border border-border-light px-4 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-tertiary dark:hover:bg-white/5"
          >
            {tBook("bookAnother")}
          </button>
        </div>
      </div>
    );
  }

  // Phase: Confirm Slot
  if (phase === "confirm" && selectedSlot) {
    const supports60 = selectedSlot.maxDuration >= 60;
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted transition hover:text-primary"
        >
          <ArrowLeft size={14} className="rtl:rotate-180" />
          {tBook("backToSlots")}
        </button>

        {/* Booking Summary Box */}
        <div className="space-y-3 rounded-2xl border border-border-light bg-surface-secondary/40 p-4 dark:bg-white/[0.02]">
          {/* Selected Date & Time */}
          <div className="flex items-center justify-between border-b border-border-light pb-2.5">
            <span className="text-xs font-semibold text-text-muted">{tBook("selectedSlot")}</span>
            <span className="font-mono text-xs font-bold text-text-primary">
              {formatFullDatetime(selectedSlot.startsAt, numLocale)}
            </span>
          </div>

          {/* Selected Duration (Locked to chosen duration) */}
          <div className="flex items-center justify-between border-b border-border-light pb-2.5">
            <span className="text-xs font-semibold text-text-muted">{tBook("selectDuration")}</span>
            <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              {durationFilter === 60 ? tBook("duration60") : tBook("duration30")}
            </span>
          </div>

          {/* Price */}
          {typeof selectedDurationPrice === "number" && (
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-xs font-bold text-text-primary">{selectedPriceLabel}</span>
              <span className="font-mono text-sm font-black text-primary">
                {(() => {
                  const money = mapPractitionerDurationMoney({ amount: selectedDurationPrice, currencyCode });
                  return money ? <MoneyText money={money} /> : null;
                })()}
              </span>
            </div>
          )}
        </div>

        {isAuthLoading ? (
          <Skeleton className="h-12 w-full rounded-xl" />
        ) : !isAuthenticated ? (
          <div className="space-y-2 pt-2">
            <p className="text-xs text-text-muted">{tBook("signInNote")}</p>
            <Link
              href="/signin/patient"
              className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary/90"
            >
              {tBook("signInToCta")}
            </Link>
          </div>
        ) : !isPatient ? (
          <p className="rounded-xl border border-border-light bg-surface-tertiary px-4 py-3 text-xs text-text-muted dark:bg-white/5">
            {tBook("nonPatientNote")}
          </p>
        ) : (
          <div className="space-y-2 pt-2">
            {bookingError && <p className="text-xs font-bold text-danger">{bookingError}</p>}
            <button
              type="button"
              disabled={createSession.isPending}
              onClick={handleConfirm}
              className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createSession.isPending ? tBook("confirming") : tBook("confirmCta")}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Phase: Browse (Single-Day Focused Calendar)
  return (
    <div className="space-y-4">
      {/* Week Navigator & Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border-light pb-3">
        <div className="space-y-0.5">
          <p className="text-[11px] font-bold text-text-muted">{tAvail("heading")}</p>
          <p className="text-xs font-bold text-text-primary">
            {isMounted ? dateWindowLabel : ""}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={tAvail("prevWeek")}
            onClick={() => setDateWindowOffsetDays((n) => n - VISIBLE_DATE_COLUMNS)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border-light bg-surface text-text-secondary transition hover:border-primary hover:text-primary active:scale-95"
          >
            <ChevronLeft size={16} className="rtl:rotate-180" />
          </button>
          <button
            type="button"
            aria-label={tAvail("nextWeek")}
            onClick={() => setDateWindowOffsetDays((n) => n + VISIBLE_DATE_COLUMNS)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border-light bg-surface text-text-secondary transition hover:border-primary hover:text-primary active:scale-95"
          >
            <ChevronRight size={16} className="rtl:rotate-180" />
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: VISIBLE_DATE_COLUMNS }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <div className="rounded-2xl border border-border-light bg-surface-tertiary p-4 text-center dark:bg-white/5">
          <p className="mb-2 text-xs font-bold text-danger">{tAvail("loadError")}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs font-bold text-primary hover:underline"
          >
            {tAvail("retry")}
          </button>
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* 7-DAY HORIZONTAL SELECTOR PILLS */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-text-muted">
              {tAvail("selectDatePrompt")}
            </span>
            <div className="grid grid-cols-7 gap-1.5">
              {dateColumns.map((col) => {
                const isSelected = col.sortKey === selectedDay?.sortKey;
                const hasSlots = col.slots.length > 0;

                return (
                  <button
                    key={col.sortKey}
                    type="button"
                    onClick={() => setSelectedDayKey(col.sortKey)}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl p-2 transition-all duration-150 active:scale-95",
                      isSelected
                        ? "bg-primary text-white shadow-md ring-2 ring-primary/20"
                        : "border border-border-light bg-surface-secondary/40 text-text-primary hover:border-primary/40 hover:bg-surface-secondary dark:bg-white/[0.02]"
                    )}
                  >
                    <span
                      className={cn(
                        "text-[10px] font-medium leading-none",
                        isSelected ? "text-white/90" : "text-text-muted"
                      )}
                    >
                      {col.dayLabelShort}
                    </span>
                    <span
                      className={cn(
                        "mt-1 font-mono text-xs font-black",
                        isSelected ? "text-white" : "text-text-primary"
                      )}
                    >
                      {col.dayNumber}
                    </span>
                    <span
                      className={cn(
                        "mt-1 h-1.5 w-1.5 rounded-full",
                        isSelected
                          ? "bg-white"
                          : hasSlots
                          ? "bg-emerald-500"
                          : "bg-transparent"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* DURATION SELECTOR (30 min default or 60 min) */}
          <div className="space-y-2 rounded-2xl border border-border-light bg-surface-secondary/30 p-3 dark:bg-white/[0.01]">
            <span className="text-[11px] font-bold text-text-muted">
              {tBook("selectDuration")}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {/* 30 Minutes Card */}
              <button
                type="button"
                onClick={() => setDurationFilter(30)}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-2.5 text-xs font-bold transition-all duration-150 active:scale-95",
                  durationFilter === 30
                    ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30 dark:bg-primary/20"
                    : "border-border-light bg-surface text-text-secondary hover:border-primary/40 hover:text-text-primary dark:bg-surface-secondary"
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border",
                      durationFilter === 30
                        ? "border-primary bg-primary text-white"
                        : "border-border-light bg-surface"
                    )}
                  >
                    {durationFilter === 30 && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <span>{tBook("duration30")}</span>
                </div>

                {typeof displaySessionPrice30 === "number" && (
                  <span className="font-mono text-[11px] font-black">
                    {(() => {
                      const m = mapPractitionerDurationMoney({ amount: displaySessionPrice30, currencyCode });
                      return m ? <MoneyText money={m} /> : null;
                    })()}
                  </span>
                )}
              </button>

              {/* 60 Minutes Card */}
              <button
                type="button"
                onClick={() => setDurationFilter(60)}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-2.5 text-xs font-bold transition-all duration-150 active:scale-95",
                  durationFilter === 60
                    ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30 dark:bg-primary/20"
                    : "border-border-light bg-surface text-text-secondary hover:border-primary/40 hover:text-text-primary dark:bg-surface-secondary"
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border",
                      durationFilter === 60
                        ? "border-primary bg-primary text-white"
                        : "border-border-light bg-surface"
                    )}
                  >
                    {durationFilter === 60 && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <span>{tBook("duration60")}</span>
                </div>

                {typeof displaySessionPrice60 === "number" && (
                  <span className="font-mono text-[11px] font-black">
                    {(() => {
                      const m = mapPractitionerDurationMoney({ amount: displaySessionPrice60, currencyCode });
                      return m ? <MoneyText money={m} /> : null;
                    })()}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* SELECTED DAY SLOTS SECTION */}
          {selectedDay && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold text-text-primary">
                    {selectedDay.dayLabelFull}
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-text-muted">
                  {selectedDay.slots.length}{" "}
                  {locale.startsWith("ar") ? "موعد متاح" : "slots"}
                </span>
              </div>

              {selectedDay.slots.length > 0 ? (
                /* 2-3 Column Responsive Grid for Selected Day Slots */
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {selectedDay.slots.map((slot) => (
                    <button
                      key={`${slot.startsAt}-${slot.windowEndsAt}-${slot.maxDuration}`}
                      data-testid="booking-slot-btn"
                      type="button"
                      onClick={() => handleSlotSelect(slot)}
                      className="group flex flex-col items-center justify-center rounded-xl border border-border-light bg-surface p-3 transition-all duration-150 hover:border-primary hover:bg-primary/5 hover:shadow-xs active:scale-95 dark:bg-surface-secondary/80"
                    >
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-text-primary group-hover:text-primary">
                        <Clock className="h-3.5 w-3.5 text-text-muted group-hover:text-primary" />
                        <span>{formatSlotTimeRange(slot.startsAt, durationFilter, numLocale)}</span>
                      </div>
                      <span className="mt-1 text-[11px] font-bold text-primary/90">
                        {durationFilter === 60 ? tBook("duration60") : tBook("duration30")}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                /* Empty Selected Day State */
                <div className="rounded-2xl border border-dashed border-border-light bg-surface-secondary/20 p-5 text-center">
                  <Clock className="mx-auto h-6 w-6 text-text-muted" />
                  <p className="mt-2 text-xs font-bold text-text-primary">
                    {tAvail("noSlotsOnSelectedDay")}
                  </p>

                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {firstAvailableDayInWeek && (
                      <button
                        type="button"
                        onClick={() => setSelectedDayKey(firstAvailableDayInWeek.sortKey)}
                        className="inline-flex items-center rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/20"
                      >
                        {tAvail("jumpToNextAvailable")} ({firstAvailableDayInWeek.dayLabelShort}{" "}
                        {firstAvailableDayInWeek.dayNumber})
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setDateWindowOffsetDays((n) => n + VISIBLE_DATE_COLUMNS)}
                      className="inline-flex items-center rounded-lg border border-border-light px-3 py-1.5 text-xs font-bold text-text-secondary transition hover:border-primary/40 hover:text-primary"
                    >
                      {browseNextDatesLabel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timezone Note & Local Indicator */}
          <div className="flex items-center justify-between gap-2 border-t border-border-light pt-3 text-[11px] text-text-muted">
            <span>{tAvail("timezoneNote")}</span>
            <span className="font-mono font-medium">
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
