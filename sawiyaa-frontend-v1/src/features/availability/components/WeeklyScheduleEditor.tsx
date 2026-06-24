"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Clock3, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SurfaceCard, SurfaceHeader } from "@/components/shared/SurfaceShell";
import { useReplaceWeeklyAvailability } from "../hooks/use-availability";
import type { MyAvailabilityData } from "../types/availability.types";

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type SessionBlockDuration = 30 | 60;
type MinuteRange = {
  startMinuteOfDay: number;
  endMinuteOfDay: number;
};

type DraftSchedule = Record<DayOfWeek, Record<SessionBlockDuration, number[]>>;

const DAY_ORDER: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];
const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;
const DURATIONS: SessionBlockDuration[] = [30, 60];
const HALF_HOUR_STEP = 30;
const DAY_END_MINUTE = 24 * 60;

function dayKeyFor(dayOfWeek: number): (typeof DAY_KEYS)[number] {
  return DAY_KEYS[dayOfWeek as DayOfWeek] ?? "monday";
}

function createEmptyDraftSchedule(): DraftSchedule {
  return {
    0: { 30: [], 60: [] },
    1: { 30: [], 60: [] },
    2: { 30: [], 60: [] },
    3: { 30: [], 60: [] },
    4: { 30: [], 60: [] },
    5: { 30: [], 60: [] },
    6: { 30: [], 60: [] },
  };
}

function normalizeStarts(minutes: number[]): number[] {
  return Array.from(
    new Set(minutes.filter((minute) => minute >= 0 && minute < DAY_END_MINUTE)),
  ).sort((left, right) => left - right);
}

function slotsToDraftSchedule(slots: MyAvailabilityData["weeklySlots"]): DraftSchedule {
  const output = createEmptyDraftSchedule();

  for (const slot of slots) {
    const day = slot.dayOfWeek as DayOfWeek;
    const duration = slot.durationMinutes === 60 ? 60 : 30;
    const bucket = output[day][duration];
    bucket.push(slot.startMinuteOfDay);
    output[day][duration] = normalizeStarts(bucket);
  }

  return output;
}

function draftScheduleToSlots(draft: DraftSchedule) {
  const slots: Array<{
    dayOfWeek: number;
    durationMinutes: SessionBlockDuration;
    startMinuteOfDay: number;
    endMinuteOfDay: number;
  }> = [];

  for (const day of DAY_ORDER) {
    for (const duration of DURATIONS) {
      for (const startMinuteOfDay of normalizeStarts(draft[day][duration])) {
        slots.push({
          dayOfWeek: day,
          durationMinutes: duration,
          startMinuteOfDay,
          endMinuteOfDay: startMinuteOfDay + duration,
        });
      }
    }
  }

  return slots;
}

function slotRangesFromStarts(starts: number[], duration: SessionBlockDuration): MinuteRange[] {
  return normalizeStarts(starts).map((startMinuteOfDay) => ({
    startMinuteOfDay,
    endMinuteOfDay: startMinuteOfDay + duration,
  }));
}

function formatTimeLabel(minutes: number, locale: string): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const date = new Date(Date.UTC(1970, 0, 1, hours, remainder));
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(date);
}

function formatRangeLabel(range: MinuteRange, locale: string): string {
  return `${formatTimeLabel(range.startMinuteOfDay, locale)} - ${formatTimeLabel(
    range.endMinuteOfDay,
    locale,
  )}`;
}

function getInitialSelectedDay(slots: MyAvailabilityData["weeklySlots"]): number {
  const firstExisting = DAY_ORDER.find((day) => slots.some((slot) => slot.dayOfWeek === day));
  return firstExisting ?? 1;
}

function serializeDraft(draft: DraftSchedule): string {
  return DAY_ORDER.map(
    (day) =>
      `${day}|30:${normalizeStarts(draft[day][30]).join(",")}|60:${normalizeStarts(
        draft[day][60],
      ).join(",")}`,
  ).join(";");
}

export default function WeeklyScheduleEditor({ data }: { data: MyAvailabilityData }) {
  const t = useTranslations("practitioner-area.availability.schedule");
  const locale = useLocale();
  const replaceWeeklyAvailability = useReplaceWeeklyAvailability();

  const initialDraft = useMemo(() => slotsToDraftSchedule(data.weeklySlots), [data.weeklySlots]);
  const [selectedDay, setSelectedDay] = useState<number>(() => getInitialSelectedDay(data.weeklySlots));
  const [selectedDuration, setSelectedDuration] = useState<SessionBlockDuration>(30);
  const [draft, setDraft] = useState<DraftSchedule>(() => initialDraft);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  useEffect(() => {
    if (!DAY_ORDER.includes(selectedDay as DayOfWeek)) {
      setSelectedDay(getInitialSelectedDay(data.weeklySlots));
    }
  }, [data.weeklySlots, selectedDay]);

  const selectedDaySlots = draft[selectedDay as DayOfWeek] ?? createEmptyDraftSchedule()[0];
  const selectedDayRanges30 = useMemo(
    () => slotRangesFromStarts(selectedDaySlots[30], 30),
    [selectedDaySlots],
  );
  const selectedDayRanges60 = useMemo(
    () => slotRangesFromStarts(selectedDaySlots[60], 60),
    [selectedDaySlots],
  );
  const totalWeeklySlots30 = useMemo(
    () =>
      DAY_ORDER.reduce<number>(
        (total, day) => total + normalizeStarts(draft[day][30]).length,
        0,
      ),
    [draft],
  );
  const totalWeeklySlots60 = useMemo(
    () =>
      DAY_ORDER.reduce<number>(
        (total, day) => total + normalizeStarts(draft[day][60]).length,
        0,
      ),
    [draft],
  );

  const selectedDayLabel = t(`days.${dayKeyFor(selectedDay)}`);
  const selectedDurationLabel = selectedDuration === 60 ? t("duration60") : t("duration30");
  const timeSteps = useMemo(
    () =>
      Array.from(
        { length: selectedDuration === 60 ? 24 : 48 },
        (_, index) => index * selectedDuration,
      ),
    [selectedDuration],
  );
  const timeGridColumnsClass =
    selectedDuration === 60
      ? "[grid-template-columns:repeat(auto-fit,minmax(7rem,1fr))]"
      : "[grid-template-columns:repeat(auto-fit,minmax(5.75rem,1fr))]";
  const hasTimezone = Boolean(data.timezone);
  const isDirty = useMemo(
    () => serializeDraft(draft) !== serializeDraft(initialDraft),
    [draft, initialDraft],
  );

  function updateDurationStarts(day: DayOfWeek, duration: SessionBlockDuration, nextStarts: number[]) {
    setDraft((current) => ({
      ...current,
      [day]: {
        ...current[day],
        [duration]: normalizeStarts(nextStarts),
      },
    }));
  }

  function toggleSlotStart(day: DayOfWeek, minute: number) {
    const duration = selectedDuration;
    if (minute + duration > DAY_END_MINUTE) {
      return;
    }

    setDraft((current) => {
      const currentStarts = current[day][duration];
      const exists = currentStarts.includes(minute);
      return {
        ...current,
        [day]: {
          ...current[day],
          [duration]: exists
            ? currentStarts.filter((entry) => entry !== minute)
            : normalizeStarts([...currentStarts, minute]),
        },
      };
    });
  }

  function clearDuration(day: DayOfWeek, duration: SessionBlockDuration) {
    updateDurationStarts(day, duration, []);
  }

  function clearSelectedDay() {
    setDraft((current) => ({
      ...current,
      [selectedDay as DayOfWeek]: {
        30: [],
        60: [],
      },
    }));
  }

  function handleSave() {
    const slots = draftScheduleToSlots(draft);

    replaceWeeklyAvailability.mutate(
      {
        timezone: data.timezone,
        slots,
      },
      {
        onSuccess: (next) => {
          const nextDraft = slotsToDraftSchedule(next.weeklySlots);
          setDraft(nextDraft);
          setSelectedDay(getInitialSelectedDay(next.weeklySlots));
        },
      },
    );
  }

  function isCellSelected(minute: number): boolean {
    return (draft[selectedDay as DayOfWeek]?.[selectedDuration] ?? []).includes(minute);
  }

  function isCellDisabled(minute: number): boolean {
    return minute + selectedDuration > DAY_END_MINUTE;
  }

  function renderDurationRanges(duration: SessionBlockDuration) {
    const ranges = duration === 30 ? selectedDayRanges30 : selectedDayRanges60;

    return (
      <div
        className={cn(
          "rounded-[22px] border px-4 py-4",
          selectedDuration === duration
            ? "border-primary/25 bg-primary-light/20"
            : "border-border-light bg-surface-secondary/35",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {duration === 30 ? t("duration30") : t("duration60")}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {t("slotCount", { count: ranges.length })}
            </p>
          </div>

          <button
            type="button"
            onClick={() => clearDuration(selectedDay as DayOfWeek, duration)}
            disabled={ranges.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border-light bg-white px-3 py-2 text-xs font-semibold text-text-secondary transition hover:border-error-200 hover:bg-error-50 hover:text-error-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-surface-secondary dark:hover:bg-error-500/10 dark:hover:text-error-300"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t("clearDuration")}
          </button>
        </div>

        {ranges.length === 0 ? (
          <div className="mt-4 rounded-[18px] border border-dashed border-border-light bg-white px-4 py-4 text-sm text-text-muted dark:bg-surface-secondary">
            {t("emptySelectedDay")}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {ranges.map((range) => (
              <div
                key={`${range.startMinuteOfDay}-${range.endMinuteOfDay}-${duration}`}
                className="flex items-center justify-between gap-3 rounded-[18px] border border-border-light bg-white px-4 py-3 dark:bg-surface-secondary"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {formatRangeLabel(range, locale)}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">{selectedDayLabel}</p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateDurationStarts(
                      selectedDay as DayOfWeek,
                      duration,
                      (draft[selectedDay as DayOfWeek]?.[duration] ?? []).filter(
                        (start) => start !== range.startMinuteOfDay,
                      ),
                    )
                  }
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-border-light bg-white px-3 py-2 text-xs font-semibold text-text-secondary transition hover:border-error-200 hover:bg-error-50 hover:text-error-600 dark:bg-surface-secondary dark:hover:bg-error-500/10 dark:hover:text-error-300"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("removeSlot")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <SurfaceCard as="section" variant="section" className="space-y-6 overflow-hidden">
      <SurfaceHeader
        eyebrow={t("heading")}
        title={t("heading")}
        description={t("description")}
        className="gap-3"
      />

      <div className="rounded-[22px] border border-primary/15 bg-primary-light/20 px-4 py-4 text-sm text-text-secondary dark:border-primary/20 dark:bg-primary/10">
        <p className="font-semibold text-text-primary dark:text-white/95">{t("durationHeading")}</p>
        <p className="mt-1 text-xs leading-6 text-text-secondary">{t("durationNote", { duration: selectedDurationLabel })}</p>
        <p className="mt-2 text-xs leading-6 text-text-muted">{t("independenceNote")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-border-light bg-white px-4 py-3 text-xs text-text-secondary dark:bg-surface-secondary">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-25 px-3 py-1.5 font-semibold text-text-primary">
          <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {t("stats.currentDay")}: <span className="text-primary">{selectedDayLabel}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-tertiary px-3 py-1.5 font-medium">
          <Clock3 className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />
          {t("duration30")}: {totalWeeklySlots30}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-tertiary px-3 py-1.5 font-medium">
          <Clock3 className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />
          {t("duration60")}: {totalWeeklySlots60}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium",
            isDirty
              ? "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300"
              : "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300",
          )}
        >
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          {isDirty ? t("stats.unsaved") : t("stats.saved")}
        </span>
      </div>

      {!hasTimezone ? (
        <div className="rounded-[22px] border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
          {t("timezoneLabel")}: {t("noTimezone")}
        </div>
      ) : (
        <div className="rounded-[22px] border border-border-light bg-white px-4 py-3 text-sm text-text-secondary dark:border-border-light dark:bg-surface-secondary">
          {t("timezoneLabel")}: <span className="font-semibold text-text-primary">{data.timezone}</span>
        </div>
      )}

      <div className="space-y-6">
        <div className="rounded-[26px] border border-border-light bg-white px-5 py-5 shadow-sm dark:border-border-light dark:bg-surface-secondary">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("daySelectorHeading")}
              </h2>
              <p className="mt-1 text-xs leading-6 text-text-secondary">{t("daySelectorHint")}</p>
            </div>

            <button
              type="button"
              onClick={clearSelectedDay}
              disabled={!isDirty}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border-light bg-white px-3 py-2 text-xs font-semibold text-text-secondary transition hover:border-error-200 hover:bg-error-50 hover:text-error-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-surface-secondary dark:hover:bg-error-500/10 dark:hover:text-error-300"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t("clearDay")}
            </button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {DAY_ORDER.map((day) => {
              const isActive = day === selectedDay;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "shrink-0 rounded-2xl border px-4 py-2 text-sm font-semibold transition",
                    isActive
                      ? "border-primary/35 bg-primary-light text-text-brand shadow-[0_12px_24px_-18px_rgba(68,161,148,0.4)]"
                      : "border-border-light bg-white text-text-secondary hover:border-primary/25 hover:bg-brand-25 dark:bg-surface-secondary dark:hover:bg-white/5",
                  )}
                >
                  {t(`days.${dayKeyFor(day)}`)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.95fr)]">
          <div className="space-y-6">
            <div className="rounded-[26px] border border-border-light bg-white px-5 py-5 shadow-sm dark:border-border-light dark:bg-surface-secondary">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {t("timeGridHeading")}
                  </h2>
                <p className="mt-1 text-xs leading-6 text-text-secondary">{t("timeGridHint")}</p>
              </div>
                <div className="inline-flex rounded-2xl border border-border-light bg-surface-secondary/60 p-1 dark:bg-white/5">
                  {DURATIONS.map((duration) => {
                    const isActive = selectedDuration === duration;
                    return (
                      <button
                        key={duration}
                        type="button"
                        onClick={() => setSelectedDuration(duration)}
                        className={cn(
                          "rounded-xl px-4 py-2 text-sm font-semibold transition",
                          isActive
                            ? "bg-primary text-white shadow-[0_12px_24px_-18px_rgba(68,161,148,0.42)]"
                            : "text-text-secondary hover:bg-white hover:text-text-primary dark:hover:bg-surface-secondary",
                        )}
                      >
                        {duration === 30 ? t("duration30") : t("duration60")}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="mt-3 text-xs text-text-muted">
                {t("durationNote", { duration: selectedDurationLabel })}
              </p>

              <div
                className={cn(
                  "mt-4 grid gap-2",
                  timeGridColumnsClass,
                )}
              >
                {timeSteps.map((minute) => {
                  const isActive = isCellSelected(minute);
                  const isDisabled = isCellDisabled(minute);
                  return (
                    <button
                      key={minute}
                      type="button"
                      onClick={() => toggleSlotStart(selectedDay as DayOfWeek, minute)}
                      disabled={isDisabled}
                      aria-pressed={isActive}
                      aria-label={`${selectedDurationLabel} ${formatTimeLabel(minute, locale)}`}
                      className={cn(
                        "w-full min-h-[3rem] rounded-2xl border px-2 py-2 text-[11px] font-semibold transition sm:text-xs",
                        isActive
                          ? "border-primary/35 bg-primary-light text-text-brand shadow-[0_12px_24px_-18px_rgba(68,161,148,0.36)]"
                          : "border-border-light bg-white text-text-secondary hover:border-primary/25 hover:bg-brand-25 dark:bg-surface-secondary dark:hover:bg-white/5",
                        isDisabled && "cursor-not-allowed opacity-40 hover:border-border-light hover:bg-white",
                      )}
                    >
                      {formatTimeLabel(minute, locale)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[26px] border border-border-light bg-white px-5 py-5 shadow-sm dark:border-border-light dark:bg-surface-secondary">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {t("save")}
                  </h2>
                  <p className="mt-1 text-xs leading-6 text-text-secondary">{t("saveHint")}</p>
                </div>
              </div>

              {!hasTimezone ? (
                <p className="mt-4 rounded-[18px] border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
                  {t("noTimezone")}
                </p>
              ) : (
                <p className="mt-4 rounded-[18px] border border-border-light bg-surface-secondary/55 px-4 py-3 text-sm text-text-secondary">
                  {t("timezoneLabel")}:{" "}
                  <span className="font-semibold text-text-primary">{data.timezone}</span>
                </p>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={!hasTimezone || !isDirty || replaceWeeklyAvailability.isPending}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_-20px_rgba(68,161,148,0.42)] transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {replaceWeeklyAvailability.isPending ? t("saving") : t("save")}
              </button>

              <p className="mt-3 text-xs text-text-muted">
                {isDirty ? t("stats.unsaved") : t("stats.saved")}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[26px] border border-border-light bg-white px-5 py-5 shadow-sm dark:border-border-light dark:bg-surface-secondary">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {t("selectedRangesHeading")}
                  </h2>
                  <p className="mt-1 text-xs leading-6 text-text-secondary">{t("selectedRangesHint")}</p>
                </div>
                <span className="rounded-full border border-border-light bg-white px-3 py-1 text-xs font-semibold text-text-secondary dark:bg-surface-secondary">
                  {selectedDayLabel}
                </span>
              </div>

              <div className="mt-4 grid gap-4">
                {renderDurationRanges(30)}
                {renderDurationRanges(60)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}
