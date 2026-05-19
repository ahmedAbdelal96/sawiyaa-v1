"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  useCreateAvailabilityException,
  useDeleteAvailabilityException,
} from "../hooks/use-availability";
import type {
  AvailabilityException,
  AvailabilityExceptionType,
  MyAvailabilityData,
} from "../types/availability.types";

type ExceptionMode = "DAY_OFF" | "BLOCK_SELECTED_TIMES" | "ADD_EXTRA_TIMES";

type ExceptionFormState = {
  internalNote: string;
  error: string | null;
};

type SlotSelection = {
  startIndex: number | null;
  endIndex: number | null;
};

type ExceptionGroup = {
  dateKey: string;
  items: AvailabilityException[];
};

const SLOT_STEP_MINUTES = 30;
const DAY_MINUTES = 24 * 60;

const TIME_GROUPS = [
  { key: "night", start: 0, end: 360 },
  { key: "morning", start: 360, end: 720 },
  { key: "afternoon", start: 720, end: 1080 },
  { key: "evening", start: 1080, end: 1440 },
] as const;

const WEEKDAY_SHORT_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function padTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

function getDateKeyInTimeZone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = lookup.year ?? "1970";
  const month = lookup.month ?? "01";
  const day = lookup.day ?? "01";

  return `${year}-${month}-${day}`;
}

function getWeekdayIndexForDateKey(dateKey: string, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(new Date(`${dateKey}T12:00:00`));

  return WEEKDAY_SHORT_TO_INDEX[weekday] ?? 0;
}

function buildDateLabel(dateKey: string, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(new Date(`${dateKey}T12:00:00`));
}

function buildTimeLabel(minutes: number, locale: string): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const date = new Date(Date.UTC(1970, 0, 1, hours, remainder));

  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
}

function buildRangeLabel(startMinute: number, endMinute: number, locale: string): string {
  return `${buildTimeLabel(startMinute, locale)} - ${buildTimeLabel(endMinute, locale)}`;
}

function toIsoFromDateKeyAndMinutes(dateKey: string, minutes: number): string {
  const base = new Date(`${dateKey}T00:00:00`);
  base.setMinutes(base.getMinutes() + minutes);
  return base.toISOString();
}

function buildDayOffRange(dateKey: string): { startsAt: string; endsAt: string } {
  const start = new Date(`${dateKey}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  };
}

function getZonedDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(lookup.year ?? 0),
    month: Number(lookup.month ?? 0),
    day: Number(lookup.day ?? 0),
    hour: Number(lookup.hour ?? 0),
    minute: Number(lookup.minute ?? 0),
  };
}

function isFullDayBlock(exception: AvailabilityException, timeZone: string): boolean {
  if (exception.type !== "BLOCK") {
    return false;
  }

  const start = new Date(exception.startsAt);
  const end = new Date(exception.endsAt);
  const startParts = getZonedDateParts(start, timeZone);
  const endParts = getZonedDateParts(end, timeZone);
  const duration = end.getTime() - start.getTime();

  return (
    startParts.hour === 0 &&
    startParts.minute === 0 &&
    endParts.hour === 0 &&
    endParts.minute === 0 &&
    duration >= DAY_MINUTES * 60 * 1000 - 60 * 1000 &&
    duration <= DAY_MINUTES * 60 * 1000 + 60 * 1000
  );
}

function getModeFromException(exception: AvailabilityException, timeZone: string): ExceptionMode {
  if (exception.type === "OPEN_EXTRA") {
    return "ADD_EXTRA_TIMES";
  }
  return isFullDayBlock(exception, timeZone) ? "DAY_OFF" : "BLOCK_SELECTED_TIMES";
}

function groupExceptionsByDate(exceptions: AvailabilityException[], timeZone: string): ExceptionGroup[] {
  const grouped = new Map<string, AvailabilityException[]>();

  for (const exception of exceptions) {
    const dateKey = getDateKeyInTimeZone(new Date(exception.startsAt), timeZone);
    const bucket = grouped.get(dateKey) ?? [];
    bucket.push(exception);
    grouped.set(dateKey, bucket);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([dateKey, items]) => ({
      dateKey,
      items: items.sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
    }));
}

function buildInitialForm(): ExceptionFormState {
  return {
    internalNote: "",
    error: null,
  };
}

function buildInitialSelection(): SlotSelection {
  return {
    startIndex: null,
    endIndex: null,
  };
}

type Props = {
  data: MyAvailabilityData;
};

export default function AvailabilityExceptionsList({ data }: Props) {
  const t = useTranslations("practitioner-area.availability.exceptions");
  const locale = useLocale();
  const createException = useCreateAvailabilityException();
  const deleteException = useDeleteAvailabilityException();
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedMode, setSelectedMode] = useState<ExceptionMode>("DAY_OFF");
  const [selectedDate, setSelectedDate] = useState<string>(() => getDateKeyInTimeZone(new Date(), data.timezone));
  const [form, setForm] = useState<ExceptionFormState>(buildInitialForm);
  const [slotSelection, setSlotSelection] = useState<SlotSelection>(buildInitialSelection);
  const [showInternalNote, setShowInternalNote] = useState(false);

  const activeExceptions = useMemo(
    () => data.exceptions.filter((exception) => exception.isActive),
    [data.exceptions],
  );

  const groupedExceptions = useMemo(
    () => groupExceptionsByDate(activeExceptions, data.timezone),
    [activeExceptions, data.timezone],
  );

  const dateInfo = useMemo(() => {
    const dateLabel = buildDateLabel(selectedDate, data.timezone, locale);
    const weekdayIndex = getWeekdayIndexForDateKey(selectedDate, data.timezone);
    const hasWeeklySchedule = data.weeklySlots.some(
      (slot) => slot.isActive && slot.dayOfWeek === weekdayIndex,
    );
    const hasExceptions = activeExceptions.some(
      (exception) => getDateKeyInTimeZone(new Date(exception.startsAt), data.timezone) === selectedDate,
    );
    const weekdayLabel = new Intl.DateTimeFormat(locale, {
      weekday: "long",
      timeZone: data.timezone,
    }).format(new Date(`${selectedDate}T12:00:00`));

    return {
      title: `${t("summary.titlePrefix")} ${dateLabel}`,
      dateLabel,
      weekdayLabel,
      hasWeeklySchedule,
      hasExceptions,
      summaryLine: `${weekdayLabel} · ${data.timezone}`,
      weeklyScheduleLabel: hasWeeklySchedule ? t("summary.weeklySchedule") : t("summary.noWeeklySchedule"),
      exceptionsLabel: hasExceptions ? t("summary.hasExceptions") : t("summary.noExceptionsForDay"),
    };
  }, [activeExceptions, data.timezone, data.weeklySlots, locale, selectedDate, t]);

  const timeSlots = useMemo(
    () => Array.from({ length: DAY_MINUTES / SLOT_STEP_MINUTES }, (_, index) => index * SLOT_STEP_MINUTES),
    [],
  );

  const selectedStartMinute = slotSelection.startIndex === null ? null : timeSlots[slotSelection.startIndex] ?? null;
  const selectedEndMinute =
    slotSelection.endIndex === null
      ? null
      : ((timeSlots[slotSelection.endIndex] ?? 0) + SLOT_STEP_MINUTES);

  const selectedRangeLabel =
    selectedStartMinute !== null && selectedEndMinute !== null
      ? buildRangeLabel(selectedStartMinute, selectedEndMinute, locale)
      : null;

  const selectedModeTitle =
    selectedMode === "DAY_OFF"
      ? t("modes.dayOff.title")
      : selectedMode === "BLOCK_SELECTED_TIMES"
        ? t("modes.blockTimes.title")
        : t("modes.extraAvailability.title");

  const selectedModeDescription =
    selectedMode === "DAY_OFF"
      ? t("modes.dayOff.description")
      : selectedMode === "BLOCK_SELECTED_TIMES"
        ? t("modes.blockTimes.description")
        : t("modes.extraAvailability.description");

  const selectedModeHelper =
    selectedMode === "DAY_OFF"
      ? t("modes.dayOff.helper")
      : selectedMode === "BLOCK_SELECTED_TIMES"
        ? t("modes.blockTimes.helper")
        : t("modes.extraAvailability.helper");

  const submitLabel =
    selectedMode === "DAY_OFF"
      ? t("modes.dayOff.cta")
      : selectedMode === "BLOCK_SELECTED_TIMES"
        ? t("modes.blockTimes.cta")
        : t("modes.extraAvailability.cta");

  function resetTimeSelection() {
    setSlotSelection(buildInitialSelection());
    setForm((current) => ({ ...current, error: null }));
  }

  function handleSelectQuickDate(nextDate: string) {
    setSelectedDate(nextDate);
    resetTimeSelection();
    setForm((current) => ({ ...current, error: null }));
  }

  function handleDateInputChange(value: string) {
    setSelectedDate(value);
    resetTimeSelection();
    setForm((current) => ({ ...current, error: null }));
  }

  function handleSlotClick(index: number) {
    if (selectedMode === "DAY_OFF") {
      return;
    }

    setForm((current) => ({ ...current, error: null }));

    setSlotSelection((current) => {
      if (current.startIndex === null || current.endIndex !== null) {
        return { startIndex: index, endIndex: null };
      }

      if (index < current.startIndex) {
        return { startIndex: index, endIndex: null };
      }

      return { startIndex: current.startIndex, endIndex: index };
    });
  }

  function validateForm() {
    if (!selectedDate) {
      return t("validation.dateRequired");
    }

    if (selectedMode !== "DAY_OFF") {
      if (slotSelection.startIndex === null || slotSelection.endIndex === null) {
        return t("validation.slotRequired");
      }
    }

    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setForm((current) => ({ ...current, error: validationError }));
      return;
    }

    let payload: {
      type: AvailabilityExceptionType;
      startsAt: string;
      endsAt: string;
      reason?: string;
    };

    if (selectedMode === "DAY_OFF") {
      const range = buildDayOffRange(selectedDate);
      payload = {
        type: "BLOCK",
        startsAt: range.startsAt,
        endsAt: range.endsAt,
        reason: form.internalNote.trim() || undefined,
      };
    } else {
      const startIndex = slotSelection.startIndex ?? 0;
      const endIndex = slotSelection.endIndex ?? startIndex;
      const startsAt = toIsoFromDateKeyAndMinutes(selectedDate, timeSlots[startIndex] ?? 0);
      const endsAt = toIsoFromDateKeyAndMinutes(
        selectedDate,
        (timeSlots[endIndex] ?? 0) + SLOT_STEP_MINUTES,
      );

      payload = {
        type: selectedMode === "ADD_EXTRA_TIMES" ? "OPEN_EXTRA" : "BLOCK",
        startsAt,
        endsAt,
        reason: form.internalNote.trim() || undefined,
      };
    }

    createException.mutate(payload, {
      onSuccess: () => {
        resetTimeSelection();
        setForm({ internalNote: "", error: null });
        setShowInternalNote(false);
      },
      onError: () => {
        setForm((current) => ({
          ...current,
          error: t("errors.create"),
        }));
      },
    });
  }

  function handleDelete(id: string) {
    deleteException.mutate(id, {
      onError: () => {
        // The shared error state below the list communicates failure.
      },
    });
  }

  const quickDates = useMemo(() => {
    const today = getDateKeyInTimeZone(new Date(), data.timezone);
    const tomorrow = (() => {
      const next = new Date(`${today}T12:00:00`);
      next.setDate(next.getDate() + 1);
      return getDateKeyInTimeZone(next, data.timezone);
    })();

    return { today, tomorrow };
  }, [data.timezone]);

  const selectedModeCards = [
    {
      id: "DAY_OFF" as const,
      title: t("modes.dayOff.title"),
      description: t("modes.dayOff.description"),
    },
    {
      id: "BLOCK_SELECTED_TIMES" as const,
      title: t("modes.blockTimes.title"),
      description: t("modes.blockTimes.description"),
    },
    {
      id: "ADD_EXTRA_TIMES" as const,
      title: t("modes.extraAvailability.title"),
      description: t("modes.extraAvailability.description"),
    },
  ];

  return (
    <section className="rounded-[28px] border border-border-light bg-white p-5 shadow-sm dark:border-border-light dark:bg-surface-secondary">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-text-primary dark:text-white/90">{t("heading")}</h2>
        <p className="max-w-3xl text-sm leading-6 text-text-secondary">{t("description")}</p>
      </div>

      <div className="mt-5 rounded-3xl border border-border-light bg-surface-secondary/55 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("dateMode.eyebrow")}
            </p>
            <h3 className="text-base font-semibold text-text-primary dark:text-white/90">
              {t("dateMode.title")}
            </h3>
            <p className="text-sm leading-6 text-text-secondary">{t("dateMode.subtitle")}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSelectQuickDate(quickDates.today)}
              className={[
                "rounded-full border px-4 py-2 text-sm font-medium transition",
                selectedDate === quickDates.today
                  ? "border-primary/40 bg-primary-light/70 text-text-primary shadow-sm"
                  : "border-border-light bg-white text-text-secondary hover:border-primary/30 hover:bg-surface-tertiary",
              ].join(" ")}
            >
              {t("dateMode.today")}
            </button>
            <button
              type="button"
              onClick={() => handleSelectQuickDate(quickDates.tomorrow)}
              className={[
                "rounded-full border px-4 py-2 text-sm font-medium transition",
                selectedDate === quickDates.tomorrow
                  ? "border-primary/40 bg-primary-light/70 text-text-primary shadow-sm"
                  : "border-border-light bg-white text-text-secondary hover:border-primary/30 hover:bg-surface-tertiary",
              ].join(" ")}
            >
              {t("dateMode.tomorrow")}
            </button>
            <button
              type="button"
              onClick={() => dateInputRef.current?.focus()}
              className="rounded-full border border-border-light bg-white px-4 py-2 text-sm font-medium text-text-secondary transition hover:border-primary/30 hover:bg-surface-tertiary"
            >
              {t("dateMode.pickDate")}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="min-w-0">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("dateMode.selectedDate")}
            </label>
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              onChange={(event) => handleDateInputChange(event.target.value)}
              className="app-control px-4 py-3"
            />
          </div>

          <div className="rounded-2xl border border-primary/20 bg-white px-4 py-4 shadow-sm dark:bg-surface-secondary">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-text-primary dark:text-white/90">{dateInfo.title}</p>
              <span className="inline-flex rounded-full border border-primary/20 bg-primary-light/70 px-3 py-1 text-xs font-medium text-text-brand">
                {dateInfo.weeklyScheduleLabel}
              </span>
              <span className="inline-flex rounded-full border border-border-light bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-secondary">
                {dateInfo.exceptionsLabel}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{dateInfo.summaryLine}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {selectedModeCards.map((option) => {
          const isSelected = selectedMode === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setSelectedMode(option.id);
                resetTimeSelection();
              }}
              className={[
                "rounded-2xl border px-4 py-4 text-right transition",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                isSelected
                  ? "border-primary/45 bg-primary-light/60 text-text-primary shadow-sm"
                  : "border-border-light bg-white text-text-primary hover:border-primary/30 hover:bg-surface-tertiary",
              ].join(" ")}
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold">{option.title}</p>
                <p className="text-xs leading-5 text-text-secondary">{option.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-5 rounded-3xl border border-border-light bg-white p-4 shadow-sm dark:border-border-light dark:bg-surface-secondary">
        <div className="flex flex-col gap-2 border-b border-border-light pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-text-primary dark:text-white/90">{selectedModeTitle}</p>
            <p className="text-sm text-text-secondary">{selectedModeDescription}</p>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-text-secondary">{selectedModeHelper}</p>
        </div>

        {selectedMode === "DAY_OFF" ? (
          <div className="mt-4 grid gap-4">
            <div className="rounded-2xl border border-primary/20 bg-primary-light/35 px-4 py-4">
              <p className="text-sm font-semibold text-text-primary dark:text-white/90">{t("modes.dayOff.title")}</p>
              <p className="mt-1 text-sm text-text-secondary">{t("modes.dayOff.helper")}</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            <div className="rounded-2xl border border-primary/20 bg-primary-light/30 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary dark:text-white/90">{t("picker.title")}</p>
                  <p className="mt-1 text-sm text-text-secondary">{t("picker.helper")}</p>
                </div>
                <button
                  type="button"
                  onClick={resetTimeSelection}
                  className="rounded-full border border-border-light bg-white px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-tertiary"
                >
                  {t("picker.clearSelection")}
                </button>
              </div>

              {selectedRangeLabel ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-semibold text-text-brand">
                    {t("picker.selectedRange")}
                  </span>
                  <span className="inline-flex rounded-full border border-primary/20 bg-primary-light/70 px-3 py-1 text-xs font-medium text-text-primary">
                    {selectedRangeLabel}
                  </span>
                </div>
              ) : (
                <p className="mt-4 text-sm text-text-secondary">
                  {t("picker.selectStart")}
                  {" "}
                  {t("picker.selectEnd")}
                </p>
              )}
            </div>

            <div className="grid gap-4">
              {TIME_GROUPS.map((group) => (
                <div key={group.key} className="rounded-2xl border border-border-light bg-surface-secondary/45 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                        {t(`timeGroups.${group.key}`)}
                      </p>
                      <p className="text-xs text-text-muted">
                        {buildRangeLabel(group.start, group.end === DAY_MINUTES ? 1439 : group.end - SLOT_STEP_MINUTES, locale)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {timeSlots
                      .filter((minute) => minute >= group.start && minute < group.end)
                      .map((minute, indexInGroup) => {
                        const absoluteIndex = timeSlots.indexOf(minute);
                        const isStart = slotSelection.startIndex === absoluteIndex;
                        const isEnd = slotSelection.endIndex === absoluteIndex;
                        const hasRange =
                          slotSelection.startIndex !== null &&
                          slotSelection.endIndex !== null &&
                          absoluteIndex > slotSelection.startIndex &&
                          absoluteIndex < slotSelection.endIndex;

                        return (
                          <button
                            key={minute}
                            type="button"
                            onClick={() => handleSlotClick(absoluteIndex)}
                            className={[
                              "rounded-xl border px-3 py-2 text-sm font-medium transition",
                              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                              isStart || isEnd
                                ? "border-primary bg-primary text-white shadow-sm"
                                : hasRange
                                  ? "border-primary/30 bg-primary-light/65 text-text-primary"
                                  : "border-border-light bg-white text-text-secondary hover:border-primary/30 hover:bg-surface-tertiary",
                            ].join(" ")}
                          >
                            {buildTimeLabel(minute, locale)}
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-border-light bg-surface-secondary/25 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                {t("form.internalNoteLabel")}
              </p>
              <p className="text-xs leading-5 text-text-muted">{t("form.internalNoteHint")}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowInternalNote((current) => !current)}
              className="inline-flex items-center justify-center rounded-full border border-border-light bg-white px-4 py-2 text-sm font-medium text-text-secondary transition hover:border-primary/30 hover:bg-surface-tertiary"
            >
              {showInternalNote
                ? t("form.hideInternalNote")
                : form.internalNote.trim()
                  ? t("form.editInternalNote")
                  : t("form.addInternalNote")}
            </button>
          </div>

          {showInternalNote ? (
            <div className="mt-4 min-w-0">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("form.internalNote")}
              </label>
              <textarea
                value={form.internalNote}
                onChange={(event) =>
                  setForm((current) => ({ ...current, internalNote: event.target.value, error: null }))
                }
                placeholder={t("form.internalNotePlaceholder")}
                rows={3}
                className="app-control min-h-[84px] px-4 py-3"
              />
            </div>
          ) : form.internalNote.trim() ? (
            <p className="mt-3 inline-flex rounded-full border border-success-200 bg-success-light px-3 py-1 text-sm font-medium text-success-700">
              {t("form.internalNoteSaved")}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={createException.isPending}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createException.isPending ? t("form.saving") : submitLabel}
          </button>
        </div>

        {form.error ? <p className="mt-3 text-sm text-error-500">{form.error}</p> : null}
        {createException.isError ? <p className="mt-3 text-sm text-error-500">{t("errors.create")}</p> : null}
      </form>

      <div className="mt-5">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-text-primary dark:text-white/90">{t("list.heading")}</h3>
            <p className="text-xs text-text-secondary">{t("list.note")}</p>
          </div>
        </div>

        {groupedExceptions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-light bg-surface-secondary/45 px-4 py-6 text-sm text-text-muted">
            {t("list.empty")}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedExceptions.map((group) => (
              <div key={group.dateKey} className="rounded-2xl border border-border-light bg-white p-4 shadow-sm dark:border-border-light dark:bg-surface-secondary">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary dark:text-white/90">
                      {buildDateLabel(group.dateKey, data.timezone, locale)}
                    </h4>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {group.items.map((exception) => (
                    <ExceptionRow
                      key={exception.id}
                      exception={exception}
                      timeZone={data.timezone}
                      locale={locale}
                      t={t}
                      onDelete={handleDelete}
                      deleting={deleteException.isPending}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteException.isError ? <p className="mt-3 text-sm text-error-500">{t("errors.delete")}</p> : null}
    </section>
  );
}

function ExceptionRow({
  exception,
  timeZone,
  locale,
  t,
  onDelete,
  deleting,
}: {
  exception: AvailabilityException;
  timeZone: string;
  locale: string;
  t: ReturnType<typeof useTranslations>;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const mode = getModeFromException(exception, timeZone);
  const internalNote = exception.reason?.trim();
  const timeRange = isFullDayBlock(exception, timeZone)
    ? t("labels.fullDay")
    : `${buildTimeLabel(
        getZonedDateParts(new Date(exception.startsAt), timeZone).hour * 60 +
          getZonedDateParts(new Date(exception.startsAt), timeZone).minute,
        locale,
      )} - ${buildTimeLabel(
        getZonedDateParts(new Date(exception.endsAt), timeZone).hour * 60 +
          getZonedDateParts(new Date(exception.endsAt), timeZone).minute,
        locale,
      )}`;

  const modeLabel =
    mode === "DAY_OFF"
      ? t("labels.dayOff")
      : mode === "BLOCK_SELECTED_TIMES"
        ? t("labels.blockTime")
        : t("labels.extraAvailability");

  return (
    <div className="rounded-2xl border border-border-light bg-surface-secondary/40 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={[
              "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
              mode === "ADD_EXTRA_TIMES"
                ? "border-primary/20 bg-primary-light/70 text-text-brand"
                : "border-warning-200 bg-warning-50 text-warning-900",
            ].join(" ")}
          >
            {modeLabel}
          </span>
          <span className="inline-flex rounded-full border border-border-light bg-white px-3 py-1 text-xs font-medium text-text-secondary">
            {timeRange}
          </span>
          <span className="inline-flex rounded-full border border-success-200 bg-success-light px-3 py-1 text-xs font-semibold text-success-700">
            {t("labels.active")}
          </span>
        </div>

        <button
          type="button"
          disabled={deleting}
          onClick={() => onDelete(exception.id)}
          className="inline-flex items-center justify-center rounded-xl border border-border-light bg-white px-3.5 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-surface-tertiary disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-light dark:bg-surface-secondary dark:hover:bg-white/5"
        >
          {t("actions.remove")}
        </button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {internalNote ? (
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("list.internalNote")}
            </p>
            <p className="mt-1 text-sm leading-6 text-text-secondary">{internalNote}</p>
          </div>
        ) : null}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{t("list.status")}</p>
          <p className="mt-1 text-sm leading-6 text-text-secondary">{t("labels.active")}</p>
        </div>
      </div>
    </div>
  );
}

