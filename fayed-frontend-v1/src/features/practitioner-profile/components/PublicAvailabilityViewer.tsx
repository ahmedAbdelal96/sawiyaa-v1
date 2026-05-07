"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { toAppError } from "@/lib/api/errors";
import { usePublicAvailabilityWindows } from "../hooks/use-public-availability";
import { useCreateScheduledSession } from "@/features/sessions/hooks/use-sessions";
import { Skeleton } from "@/components/shared/LoadingStates";
import { useAuthState } from "@/stores";
import type { PublicAvailabilityWindow } from "../types/public-availability.types";
import type { SessionItem } from "@/features/sessions/types/sessions.types";

function getWeekBounds(weekOffset: number): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() + weekOffset * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { from: start.toISOString(), to: end.toISOString() };
}

function formatWeekLabel(from: string, to: string, numLocale: string): string {
  const start = new Date(from);
  const end = new Date(to);
  end.setDate(end.getDate() - 1);
  const dayFmt = new Intl.DateTimeFormat(numLocale, { month: "short", day: "numeric" });
  const yearFmt = new Intl.DateTimeFormat(numLocale, { year: "numeric" });
  return `${dayFmt.format(start)} - ${dayFmt.format(end)}, ${yearFmt.format(end)}`;
}

function formatDayLabel(isoString: string, numLocale: string): string {
  return new Date(isoString).toLocaleDateString(numLocale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimeLabel(isoString: string, numLocale: string): string {
  return new Date(isoString).toLocaleTimeString(numLocale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: !numLocale.startsWith("ar"),
  });
}

function formatFullDatetime(isoString: string | null, numLocale: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString(numLocale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !numLocale.startsWith("ar"),
  });
}

type SelectableSlot = {
  startsAt: string;
  windowEndsAt: string;
  maxDuration: 30 | 60;
};

const MIN_BOOKING_LEAD_MS = 60 * 1000;

type DayGroup = {
  sortKey: string;
  dayLabel: string;
  slots: SelectableSlot[];
};

function formatSlotCountLabel(count: number, locale: string): string {
  if (locale.startsWith("ar")) {
    if (count === 1) {
      return `1 \u0645\u0648\u0639\u062f \u0645\u062a\u0627\u062d`;
    }
    if (count === 2) {
      return `2 \u0645\u0648\u0639\u062f\u0627\u0646 \u0645\u062a\u0627\u062d\u0627\u0646`;
    }
    if (count >= 3 && count <= 10) {
      return `${count} \u0645\u0648\u0627\u0639\u064a\u062f \u0645\u062a\u0627\u062d\u0629`;
    }
    return `${count} \u0645\u0648\u0639\u062f\u064b\u0627 \u0645\u062a\u0627\u062d\u064b\u0627`;
  }

  return count === 1 ? "1 available slot" : `${count} available slots`;
}

function formatNoDurationSlotsLabel(durationMinutes: 30 | 60, locale: string): string {
  if (locale.startsWith("ar")) {
    return durationMinutes === 30
      ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0648\u0627\u0639\u064a\u062f \u0645\u062a\u0627\u062d\u0629 \u0644\u062c\u0644\u0633\u0629 30 \u062f\u0642\u064a\u0642\u0629 \u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639."
      : "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0648\u0627\u0639\u064a\u062f \u0645\u062a\u0627\u062d\u0629 \u0644\u062c\u0644\u0633\u0629 60 \u062f\u0642\u064a\u0642\u0629 \u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639.";
  }

  return durationMinutes === 30
    ? "No 30-minute slots are available this week."
    : "No 60-minute slots are available this week.";
}

function buildSlotsFromWindow(window: PublicAvailabilityWindow): SelectableSlot[] {
  const slots: SelectableSlot[] = [];
  const startTime = new Date(window.startsAt).getTime();
  const endTime = new Date(window.endsAt).getTime();
  const halfHourMs = 30 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const earliestAllowedStart = Date.now() + MIN_BOOKING_LEAD_MS;

  for (let current = startTime; current + halfHourMs <= endTime; current += halfHourMs) {
    if (current <= earliestAllowedStart) {
      continue;
    }

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
  const map = new Map<
    string,
    {
      sortKey: string;
      dayLabel: string;
      slots: Map<string, SelectableSlot>;
    }
  >();

  for (const window of windows) {
    const slots = buildSlotsFromWindow(window);
    for (const slot of slots) {
      const d = new Date(slot.startsAt);
      const sortKey = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-");

      if (!map.has(sortKey)) {
        map.set(sortKey, {
          sortKey,
          dayLabel: formatDayLabel(slot.startsAt, numLocale),
          slots: new Map<string, SelectableSlot>(),
        });
      }

      const dayGroup = map.get(sortKey)!;
      const existingSlot = dayGroup.slots.get(slot.startsAt);

      if (!existingSlot) {
        dayGroup.slots.set(slot.startsAt, slot);
        continue;
      }

      if (
        slot.maxDuration > existingSlot.maxDuration ||
        new Date(slot.windowEndsAt).getTime() > new Date(existingSlot.windowEndsAt).getTime()
      ) {
        dayGroup.slots.set(slot.startsAt, {
          ...existingSlot,
          windowEndsAt: slot.windowEndsAt,
          maxDuration: Math.max(existingSlot.maxDuration, slot.maxDuration) as 30 | 60,
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

type Phase = "browse" | "confirm" | "success";

type Props = {
  slug: string;
};

export default function PublicAvailabilityViewer({ slug }: Props) {
  const tAvail = useTranslations("practitioner-profile.availability");
  const tBook = useTranslations("practitioner-profile.booking");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const { user, isLoading: isAuthLoading } = useAuthState();
  const isPatient = user?.role === "PATIENT";
  const isAuthenticated = Boolean(user);

  const [weekOffset, setWeekOffset] = useState(0);
  const { from, to } = useMemo(() => getWeekBounds(weekOffset), [weekOffset]);
  const weekLabel = useMemo(() => formatWeekLabel(from, to, numLocale), [from, to, numLocale]);
  const { data, isLoading, isError, refetch } = usePublicAvailabilityWindows(slug, from, to);
  const dayGroups = useMemo(
    () => (data ? groupByLocalDay(data.windows, numLocale) : []),
    [data, numLocale],
  );
  const [durationFilter, setDurationFilter] = useState<30 | 60>(30);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const selectedDurationLabel = durationFilter === 30 ? tBook("duration30") : tBook("duration60");

  const filteredDayGroups = useMemo(
    () =>
      dayGroups
        .map((group) => ({
          ...group,
          slots: group.slots.filter((slot) => slot.maxDuration >= durationFilter),
        }))
        .filter((group) => group.slots.length > 0),
    [dayGroups, durationFilter],
  );

  const selectedDay =
    filteredDayGroups.find((group) => group.sortKey === selectedDayKey) ??
    filteredDayGroups[0] ??
    null;

  const [phase, setPhase] = useState<Phase>("browse");
  const [selectedSlot, setSelectedSlot] = useState<SelectableSlot | null>(null);
  const [duration, setDuration] = useState<30 | 60>(60);
  const [createdSession, setCreatedSession] = useState<SessionItem | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const createSession = useCreateScheduledSession();

  const handleSlotSelect = useCallback((slot: SelectableSlot) => {
    setSelectedSlot(slot);
    setDuration(durationFilter <= slot.maxDuration ? durationFilter : slot.maxDuration);
    setBookingError(null);
    setPhase("confirm");
  }, [durationFilter]);

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
          setPhase("success");
        },
        onError: (err) => {
          const appErr = toAppError(err);
          if (appErr.statusCode === 409) {
            setBookingError(tBook("createErrorConflict"));
          } else {
            setBookingError(tBook("createError"));
          }
        },
      },
    );
  }, [selectedSlot, isPatient, slug, duration, createSession, tBook]);

  const handleBookAnother = useCallback(() => {
    setPhase("browse");
    setSelectedSlot(null);
    setCreatedSession(null);
    setBookingError(null);
    createSession.reset();
  }, [createSession]);

  if (phase === "success" && createdSession) {
    const payHref = `/patient/sessions/${createdSession.id}/pay` as const;

    return (
      <div>
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-700/40 dark:bg-green-900/10">
          <p className="mb-1 text-sm font-semibold text-green-700 dark:text-green-400">
            {tBook("successHeading")}
          </p>
          <p className="text-xs text-green-700/80 dark:text-green-400/80">
            {formatFullDatetime(createdSession.scheduledStartAt, numLocale)}
          </p>
        </div>

        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700/40 dark:bg-amber-900/10">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
            {tBook("successStatus")}
          </p>
          <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400/80">
            {tBook("successNote")}
          </p>
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
          <p className="mt-0.5 text-sm font-semibold text-primary">
            {formatFullDatetime(selectedSlot.startsAt, numLocale)}
          </p>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-[11px] font-medium text-text-muted">
            {tBook("selectDuration")}
          </p>
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
            {bookingError && (
              <p className="mb-2 text-xs text-error-500">{bookingError}</p>
            )}
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
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {tAvail("heading")}
          </p>
          <p className="mt-1 text-sm font-medium text-text-secondary">{weekLabel}</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={tAvail("prevWeek")}
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset((n) => n - 1)}
            className="rounded-xl border border-border-light bg-white p-2 text-text-muted transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 dark:border-border-light dark:bg-surface"
          >
            <ChevronLeft size={14} className="rtl:rotate-180" />
          </button>
          <button
            type="button"
            aria-label={tAvail("nextWeek")}
            onClick={() => setWeekOffset((n) => n + 1)}
            className="rounded-xl border border-border-light bg-white p-2 text-text-muted transition hover:border-primary hover:text-primary dark:border-border-light dark:bg-surface"
          >
            <ChevronRight size={14} className="rtl:rotate-180" />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 rounded-2xl" />
            ))}
          </div>
        </div>
      )}

      {isError && !isLoading && (
        <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-4 text-center dark:bg-white/5">
          <p className="mb-2 text-sm text-error-500">{tAvail("loadError")}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm font-medium text-primary hover:underline"
          >
            {tAvail("retry")}
          </button>
        </div>
      )}

      {data && !isLoading && (
        <>
          {dayGroups.length === 0 ? (
            <div className="rounded-2xl bg-surface px-4 py-4 dark:bg-white/5">
              <p className="text-sm text-text-muted">{tAvail("noSlots")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setWeekOffset((n) => n + 1)}
                  className="inline-flex items-center justify-center rounded-xl border border-border-light px-3 py-2 text-xs font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary dark:hover:bg-white/5"
                >
                  {tAvail("browseNextWeek")}
                </button>
                <Link
                  href={isPatient ? "/patient/practitioners" : "/practitioners"}
                  className="inline-flex items-center justify-center rounded-xl border border-border-light px-3 py-2 text-xs font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary dark:hover:bg-white/5"
                >
                  {tAvail("browseOtherPractitioners")}
                </Link>
              </div>
            </div>
          ) : (
            <>
              {!isAuthLoading && !isPatient && (
                <p className="mb-3 text-sm text-text-muted">{tBook("slotHint")}</p>
              )}

              {filteredDayGroups.length === 0 ? (
                <div className="rounded-2xl bg-surface px-4 py-4 dark:bg-white/5">
                  <p className="text-sm text-text-muted">
                    {formatNoDurationSlotsLabel(durationFilter, locale)}
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap items-start gap-2">
                    <div className="inline-flex min-h-[64px] items-center gap-1 rounded-lg border border-border-light bg-white px-2 py-2 dark:bg-surface">
                      <span className="text-[10px] font-medium text-text-muted">
                        {tBook("selectDuration")}
                      </span>
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

                    {filteredDayGroups.map((group) => {
                      const isSelected = group.sortKey === selectedDay?.sortKey;
                      return (
                        <button
                          key={group.sortKey}
                          type="button"
                          onClick={() => setSelectedDayKey(group.sortKey)}
                          className={`min-h-[64px] w-[124px] flex-none rounded-lg border px-2 py-2 text-start transition sm:w-[132px] ${
                            isSelected
                              ? "border-primary bg-primary/8 shadow-sm dark:bg-primary/12"
                              : "border-border-light bg-white hover:border-primary/40 dark:border-border-light dark:bg-surface"
                          }`}
                        >
                          <p className="text-[11px] font-semibold leading-5 text-text-primary dark:text-white/90">
                            {group.dayLabel}
                          </p>
                          <p className="mt-1 text-[10px] text-text-muted">
                            {formatSlotCountLabel(group.slots.length, locale)} · {selectedDurationLabel}
                          </p>
                        </button>
                      );
                    })}
                  </div>

              {selectedDay && (
                <div className="mt-4 rounded-[24px] border border-border-light bg-surface p-3.5 dark:border-border-light dark:bg-surface">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                        {selectedDay.dayLabel}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {selectedDurationLabel} · {formatSlotCountLabel(selectedDay.slots.length, locale)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedDay.slots.map((slot) => (
                      <button
                        key={`${slot.startsAt}-${slot.windowEndsAt}-${slot.maxDuration}`}
                        type="button"
                        onClick={() => handleSlotSelect(slot)}
                        className="w-[82px] flex-none rounded-lg border border-border-light bg-white px-2 py-2 text-center text-[11px] font-semibold text-text-primary transition hover:border-primary hover:bg-primary/6 hover:text-primary dark:border-border-light dark:bg-surface-secondary dark:text-white/85 sm:w-[88px] lg:w-[92px]"
                      >
                        {formatTimeLabel(slot.startsAt, numLocale)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
                </>
              )}
            </>
          )}
          <p className="mt-4 text-[11px] text-text-muted">{tAvail("timezoneNote")}</p>
        </>
      )}
    </div>
  );
}
