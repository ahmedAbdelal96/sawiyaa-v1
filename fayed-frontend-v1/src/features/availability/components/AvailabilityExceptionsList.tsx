"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  PlusCircle,
  ShieldAlert,
} from "lucide-react";
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
  errorArea: "date" | "mode" | "range" | null;
};

type SlotSelection = {
  startIndex: number | null;
  endIndex: number | null;
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

function buildDurationLabel(durationMinutes: number, locale: string): string {
  if (durationMinutes >= DAY_MINUTES - 1) {
    return locale === "ar" ? "طوال اليوم" : "Full day";
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const formatter = new Intl.NumberFormat(locale);

  if (hours === 0) {
    return locale === "ar"
      ? `${formatter.format(minutes)} دقيقة`
      : `${formatter.format(minutes)} minute${minutes === 1 ? "" : "s"}`;
  }

  const hourLabel =
    locale === "ar"
      ? `${formatter.format(hours)} ساعة`
      : `${formatter.format(hours)} hour${hours === 1 ? "" : "s"}`;

  if (minutes === 0) {
    return hourLabel;
  }

  const minuteLabel =
    locale === "ar"
      ? `${formatter.format(minutes)} دقيقة`
      : `${formatter.format(minutes)} minute${minutes === 1 ? "" : "s"}`;

  return locale === "ar" ? `${hourLabel} و ${minuteLabel}` : `${hourLabel} ${minuteLabel}`;
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

function buildInitialForm(): ExceptionFormState {
  return {
    internalNote: "",
    error: null,
    errorArea: null,
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

  const [selectedMode, setSelectedMode] = useState<ExceptionMode | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => getDateKeyInTimeZone(new Date(), data.timezone));
  const [form, setForm] = useState<ExceptionFormState>(buildInitialForm);
  const [slotSelection, setSlotSelection] = useState<SlotSelection>(buildInitialSelection);
  const [showInternalNote, setShowInternalNote] = useState(false);

  const activeExceptions = useMemo(
    () => data.exceptions.filter((exception) => exception.isActive),
    [data.exceptions],
  );

  const selectedDateExceptions = useMemo(
    () =>
      activeExceptions.filter(
        (exception) => getDateKeyInTimeZone(new Date(exception.startsAt), data.timezone) === selectedDate,
      ),
    [activeExceptions, data.timezone, selectedDate],
  );

  const dateInfo = useMemo(() => {
    if (!selectedDate) {
      return {
        title: t("dateSummary.noDateSelected"),
        dateLabel: t("dateSummary.noDateSelected"),
        weekdayLabel: t("dateSummary.noDateSelected"),
        hasWeeklySchedule: false,
        hasExceptions: false,
        hasFullDayBlock: false,
        summaryLine: "",
        weeklyScheduleLabel: t("dateSummary.noWeeklySchedule"),
        dayStatusLabel: t("dateSummary.noExceptionsForDay"),
      };
    }

    const dateLabel = buildDateLabel(selectedDate, data.timezone, locale);
    const weekdayIndex = getWeekdayIndexForDateKey(selectedDate, data.timezone);
    const hasWeeklySchedule = data.weeklySlots.some(
      (slot) => slot.isActive && slot.dayOfWeek === weekdayIndex,
    );
    const hasExceptions = activeExceptions.some(
      (exception) => getDateKeyInTimeZone(new Date(exception.startsAt), data.timezone) === selectedDate,
    );
    const hasFullDayBlock = selectedDateExceptions.some((exception) => isFullDayBlock(exception, data.timezone));
    const weekdayLabel = new Intl.DateTimeFormat(locale, {
      weekday: "long",
      timeZone: data.timezone,
    }).format(new Date(`${selectedDate}T12:00:00`));
    const dayStatusLabel = hasFullDayBlock
      ? t("dateSummary.dayBlocked")
      : hasExceptions
        ? t("dateSummary.dayHasExceptions")
        : hasWeeklySchedule
          ? t("dateSummary.followsWeeklySchedule")
          : t("dateSummary.noWeeklySchedule");

    return {
      title: `${t("summary.titlePrefix")} ${dateLabel}`,
      dateLabel,
      weekdayLabel,
      hasWeeklySchedule,
      hasExceptions,
      hasFullDayBlock,
      summaryLine: `${weekdayLabel} · ${data.timezone}`,
      weeklyScheduleLabel: hasWeeklySchedule ? t("summary.weeklySchedule") : t("summary.noWeeklySchedule"),
      dayStatusLabel,
    };
  }, [activeExceptions, data.timezone, data.weeklySlots, locale, selectedDate, selectedDateExceptions, t]);

  const selectedModeConfig = selectedMode
    ? {
        DAY_OFF: {
          title: t("modes.dayOff.title"),
          description: t("modes.dayOff.description"),
          helper: t("modes.dayOff.helper"),
          cta: t("modes.dayOff.cta"),
          tone: "warning" as const,
          icon: ShieldAlert,
        },
        BLOCK_SELECTED_TIMES: {
          title: t("modes.blockTimes.title"),
          description: t("modes.blockTimes.description"),
          helper: t("modes.blockTimes.helper"),
          cta: t("modes.blockTimes.cta"),
          tone: "amber" as const,
          icon: Clock3,
        },
        ADD_EXTRA_TIMES: {
          title: t("modes.extraAvailability.title"),
          description: t("modes.extraAvailability.description"),
          helper: t("modes.extraAvailability.helper"),
          cta: t("modes.extraAvailability.cta"),
          tone: "success" as const,
          icon: PlusCircle,
        },
      }[selectedMode]
    : null;

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

  function resetTimeSelection() {
    setSlotSelection(buildInitialSelection());
    setForm((current) => ({ ...current, error: null, errorArea: null }));
  }

  function handleSelectQuickDate(nextDate: string) {
    setSelectedDate(nextDate);
    resetTimeSelection();
    setForm((current) => ({ ...current, error: null, errorArea: null }));
  }

  function handleDateInputChange(value: string) {
    setSelectedDate(value);
    resetTimeSelection();
    setForm((current) => ({ ...current, error: null, errorArea: null }));
  }

  function handleSlotClick(index: number) {
    if (!selectedMode || selectedMode === "DAY_OFF") {
      return;
    }

    setForm((current) => ({ ...current, error: null, errorArea: null }));

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

  function validateForm():
    | {
        message: string;
        area: ExceptionFormState["errorArea"];
      }
    | null {
    if (!selectedDate) {
      return {
        message: t("validation.dateRequired"),
        area: "date",
      };
    }

    if (!selectedMode) {
      return {
        message: t("validation.actionRequired"),
        area: "mode",
      };
    }

    if (selectedMode !== "DAY_OFF") {
      if (slotSelection.startIndex === null || slotSelection.endIndex === null) {
        return {
          message: t("validation.slotRequired"),
          area: "range",
        };
      }

      const startMinute = timeSlots[slotSelection.startIndex] ?? null;
      const endMinute = slotSelection.endIndex === null ? null : (timeSlots[slotSelection.endIndex] ?? 0) + SLOT_STEP_MINUTES;

      if (startMinute === null || endMinute === null || endMinute <= startMinute) {
        return {
          message: t("validation.endAfterStart"),
          area: "range",
        };
      }
    }

    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setForm((current) => ({
        ...current,
        error: validationError.message,
        errorArea: validationError.area,
      }));
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
        setForm({ internalNote: "", error: null, errorArea: null });
        setShowInternalNote(false);
      },
      onError: () => {
        setForm((current) => ({
          ...current,
          error: t("errors.create"),
          errorArea: "range",
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

  const actionCards = [
    {
      id: "DAY_OFF" as const,
      number: "1",
      title: t("modes.dayOff.title"),
      description: t("modes.dayOff.description"),
      tone: "warning" as const,
      icon: ShieldAlert,
      badge: t("labels.preventBookings"),
    },
    {
      id: "BLOCK_SELECTED_TIMES" as const,
      number: "2",
      title: t("modes.blockTimes.title"),
      description: t("modes.blockTimes.description"),
      tone: "amber" as const,
      icon: Clock3,
      badge: t("labels.blockedTimes"),
    },
    {
      id: "ADD_EXTRA_TIMES" as const,
      number: "3",
      title: t("modes.extraAvailability.title"),
      description: t("modes.extraAvailability.description"),
      tone: "success" as const,
      icon: PlusCircle,
      badge: t("labels.extraAvailability"),
    },
  ];

  return (
    <section className="rounded-[28px] border border-border-light bg-white p-5 shadow-sm dark:border-border-light dark:bg-surface-secondary">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
          {t("steps.eyebrow")}
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-text-primary dark:text-white/90">{t("heading")}</h2>
        <p className="max-w-3xl text-sm leading-6 text-text-secondary">{t("description")}</p>
      </div>

      <div className="mt-5 rounded-3xl border border-border-light bg-surface-secondary/55 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: t("steps.step1"), hint: t("steps.step1Hint") },
            { label: t("steps.step2"), hint: t("steps.step2Hint") },
            { label: t("steps.step3"), hint: t("steps.step3Hint") },
          ].map((step, index) => (
            <div
              key={step.label}
              className="flex gap-3 rounded-2xl border border-border-light bg-white px-4 py-3 shadow-sm dark:bg-surface-secondary"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-semibold text-text-brand">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary dark:text-white/90">{step.label}</p>
                <p className="mt-1 text-xs leading-5 text-text-secondary">{step.hint}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div className="rounded-3xl border border-border-light bg-surface-secondary/45 p-4">
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
              {form.errorArea === "date" ? <p className="mt-2 text-sm text-error-500">{form.error}</p> : null}
            </div>

            <div className="rounded-2xl border border-primary/20 bg-white px-4 py-4 shadow-sm dark:bg-surface-secondary">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-text-primary dark:text-white/90">{dateInfo.title}</p>
                <span className="inline-flex rounded-full border border-primary/20 bg-primary-light/70 px-3 py-1 text-xs font-medium text-text-brand">
                  {dateInfo.weeklyScheduleLabel}
                </span>
                <span
                  className={[
                    "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                    dateInfo.hasFullDayBlock
                      ? "border border-amber-200 bg-amber-50 text-amber-900"
                      : dateInfo.hasExceptions
                        ? "border border-warning-200 bg-warning-50 text-warning-900"
                        : "border border-border-light bg-surface-tertiary text-text-secondary",
                  ].join(" ")}
                >
                  {dateInfo.dayStatusLabel}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border-light bg-surface-secondary/45 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{t("dateSummary.date")}</p>
                  <p className="mt-1 text-sm font-medium text-text-primary">{dateInfo.dateLabel}</p>
                </div>
                <div className="rounded-xl border border-border-light bg-surface-secondary/45 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{t("dateSummary.weekday")}</p>
                  <p className="mt-1 text-sm font-medium text-text-primary">{dateInfo.weekdayLabel}</p>
                </div>
                <div className="rounded-xl border border-border-light bg-surface-secondary/45 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{t("dateSummary.timezone")}</p>
                  <p className="mt-1 text-sm font-medium text-text-primary">{data.timezone}</p>
                </div>
                <div className="rounded-xl border border-border-light bg-surface-secondary/45 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {t("dateSummary.weeklyStatus")}
                  </p>
                  <p className="mt-1 text-sm font-medium text-text-primary">
                    {dateInfo.hasWeeklySchedule ? t("dateSummary.followsWeeklySchedule") : t("dateSummary.noWeeklySchedule")}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-text-secondary">{t("dateSummary.note")}</p>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("steps.step2")}
              </p>
              <h3 className="text-sm font-semibold text-text-primary dark:text-white/90">{t("actionHeading")}</h3>
              <p className="text-xs leading-5 text-text-secondary">{t("actionHint")}</p>
            </div>
          </div>

          <div className="grid gap-3">
            {actionCards.map((option) => {
              const isSelected = selectedMode === option.id;
              const accentClass =
                option.tone === "warning"
                  ? "border-amber-300 bg-amber-50/95 shadow-[0_10px_24px_-18px_rgba(245,158,11,0.45)]"
                  : option.tone === "success"
                    ? "border-emerald-200 bg-emerald-50/90 shadow-[0_10px_24px_-18px_rgba(16,185,129,0.45)]"
                    : "border-amber-200 bg-amber-50/90 shadow-[0_10px_24px_-18px_rgba(245,158,11,0.25)]";
              const badgeClass =
                option.tone === "warning"
                  ? "bg-amber-100 text-amber-900"
                  : option.tone === "success"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-900";

              return (
                <div
                  key={option.id}
                  className={[
                    "overflow-hidden rounded-[22px] border text-right transition-all duration-200",
                    isSelected
                      ? `${accentClass} shadow-lg ring-1 ring-inset ring-current/10`
                      : "border-border-light bg-white shadow-sm hover:-translate-y-0.5 hover:shadow-md dark:bg-surface-secondary dark:hover:bg-white/5",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    aria-expanded={isSelected}
                    onClick={() => {
                      if (selectedMode === option.id) {
                        setSelectedMode(null);
                        resetTimeSelection();
                        setShowInternalNote(false);
                        setForm((current) => ({ ...current, error: null, errorArea: null }));
                        return;
                      }

                      if (selectedMode !== option.id) {
                        setSelectedMode(option.id);
                        resetTimeSelection();
                        setShowInternalNote(false);
                        setForm((current) => ({ ...current, error: null, errorArea: null }));
                      }
                    }}
                    className={[
                      "group flex w-full items-start gap-3 px-4 py-4 text-right transition",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                      isSelected ? "bg-white/35" : "hover:bg-surface-tertiary",
                    ].join(" ")}
                  >
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm">
                      <option.icon
                        className={[
                          "h-5 w-5",
                          option.tone === "warning"
                            ? "text-amber-700"
                            : option.tone === "success"
                              ? "text-emerald-600"
                              : "text-amber-700",
                        ].join(" ")}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-text-primary dark:text-white/90">{option.title}</p>
                        <span className={["inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold", badgeClass].join(" ")}>
                          {option.tone === "warning"
                            ? t("labels.dayOff")
                            : option.tone === "success"
                              ? t("labels.extraAvailability")
                              : t("labels.blockTime")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-text-secondary">{option.description}</p>
                    </div>
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary-light/80 px-3 py-1 text-[11px] font-semibold text-text-brand dark:bg-surface-secondary">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("selectedAction")}
                      </span>
                    ) : (
                      <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-text-muted transition group-hover:text-text-secondary" />
                    )}
                  </button>

                  {isSelected && selectedModeConfig ? (
                    <div className="border-t border-white/60 bg-white/50 px-4 py-4 text-right dark:border-border-light dark:bg-surface-secondary/70">
                      <div
                        className={[
                          "space-y-4 rounded-2xl border p-4",
                          selectedModeConfig.tone === "warning"
                            ? "border-amber-200 bg-amber-50/60"
                            : selectedModeConfig.tone === "success"
                              ? "border-emerald-200 bg-emerald-50/60"
                              : "border-amber-200 bg-amber-50/55",
                        ].join(" ")}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={[
                              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                              selectedModeConfig.tone === "warning"
                                ? "bg-amber-100 text-amber-800"
                                : selectedModeConfig.tone === "success"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-800",
                            ].join(" ")}
                          >
                            <selectedModeConfig.icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                              {selectedModeConfig.title}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-text-secondary">{selectedModeConfig.helper}</p>
                          </div>
                        </div>

                        {selectedMode === "DAY_OFF" ? (
                          <div className="space-y-4">
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/75 px-4 py-4">
                              <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                                {t("modes.dayOff.noteTitle")}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-text-secondary">{t("modes.dayOff.note")}</p>
                            </div>

                            <div className="min-w-0">
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                                {t("form.internalNoteLabel")}
                              </label>
                              <textarea
                                value={form.internalNote}
                                onChange={(event) =>
                                  setForm((current) => ({
                                    ...current,
                                    internalNote: event.target.value,
                                    error: null,
                                    errorArea: null,
                                  }))
                                }
                                placeholder={t("form.internalNotePlaceholder")}
                                rows={3}
                                className="app-control min-h-[84px] px-4 py-3"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-3">
                              <button
                                type="submit"
                                disabled={createException.isPending}
                                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {createException.isPending ? t("form.saving") : selectedModeConfig.cta}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="rounded-2xl border border-primary/20 bg-primary-light/20 px-4 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                                    {t("picker.title")}
                                  </p>
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
                                  {t("picker.selectStart")} {t("picker.selectEnd")}
                                </p>
                              )}
                            </div>

                            <div className="grid gap-4">
                              {TIME_GROUPS.map((group) => (
                                <div
                                  key={group.key}
                                  className="rounded-2xl border border-border-light bg-surface-secondary/45 p-4"
                                >
                                  <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                                        {t(`timeGroups.${group.key}`)}
                                      </p>
                                      <p className="text-xs text-text-muted">
                                        {buildRangeLabel(
                                          group.start,
                                          group.end === DAY_MINUTES ? 1439 : group.end - SLOT_STEP_MINUTES,
                                          locale,
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                                    {timeSlots
                                      .filter((minute) => minute >= group.start && minute < group.end)
                                      .map((minute) => {
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

                            <div className="rounded-2xl border border-border-light bg-surface-secondary/25 px-4 py-3">
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
                                      setForm((current) => ({
                                        ...current,
                                        internalNote: event.target.value,
                                        error: null,
                                        errorArea: null,
                                      }))
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

                            {form.errorArea === "range" ? (
                              <p className="text-sm text-error-500">{form.error}</p>
                            ) : null}

                            <div className="flex items-center justify-end gap-3">
                              <button
                                type="submit"
                                disabled={createException.isPending}
                                className={[
                                  "inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60",
                                  selectedMode === "ADD_EXTRA_TIMES" ? "bg-primary hover:bg-primary-hover" : "bg-text-primary hover:bg-gray-700",
                                ].join(" ")}
                              >
                                {createException.isPending ? t("form.saving") : selectedModeConfig.cta}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {form.errorArea === "mode" ? <p className="mt-3 text-sm text-error-500">{form.error}</p> : null}
        </div>
      </form>

      <div className="mt-6 rounded-[28px] border border-border-light bg-surface-secondary/50 p-5 shadow-sm">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{t("steps.step3")}</p>
            <h3 className="text-sm font-semibold text-text-primary dark:text-white/90">{t("currentExceptions.heading")}</h3>
            <p className="text-xs leading-5 text-text-secondary">{t("currentExceptions.subtitle")}</p>
          </div>
        </div>

        {selectedDateExceptions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-light bg-white px-4 py-6 text-sm text-text-muted shadow-sm dark:bg-surface-secondary">
            {t("currentExceptions.empty")}
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDateExceptions.map((exception) => (
              <ExceptionRow
                key={exception.id}
                exception={exception}
                selectedDate={selectedDate}
                timeZone={data.timezone}
                locale={locale}
                t={t}
                onDelete={handleDelete}
                deleting={deleteException.isPending}
              />
            ))}
          </div>
        )}

        {deleteException.isError ? <p className="mt-3 text-sm text-error-500">{t("errors.delete")}</p> : null}
      </div>
    </section>
  );
}

function ExceptionRow({
  exception,
  selectedDate,
  timeZone,
  locale,
  t,
  onDelete,
  deleting,
}: {
  exception: AvailabilityException;
  selectedDate: string;
  timeZone: string;
  locale: string;
  t: ReturnType<typeof useTranslations>;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const mode = getModeFromException(exception, timeZone);
  const internalNote = exception.reason?.trim();
  const startParts = getZonedDateParts(new Date(exception.startsAt), timeZone);
  const endParts = getZonedDateParts(new Date(exception.endsAt), timeZone);
  const startMinute = startParts.hour * 60 + startParts.minute;
  const endMinute = endParts.hour * 60 + endParts.minute;
  const timeRange = isFullDayBlock(exception, timeZone)
    ? t("labels.fullDay")
    : `${buildTimeLabel(startMinute, locale)} - ${buildTimeLabel(endMinute, locale)}`;
  const durationMinutes = Math.max(
    1,
    Math.round((new Date(exception.endsAt).getTime() - new Date(exception.startsAt).getTime()) / 60_000),
  );
  const durationLabel = buildDurationLabel(durationMinutes, locale);
  const dateLabel = buildDateLabel(selectedDate, timeZone, locale);

  const modeLabel =
    mode === "DAY_OFF"
      ? t("labels.dayOff")
      : mode === "BLOCK_SELECTED_TIMES"
        ? t("labels.blockTime")
        : t("labels.extraAvailability");

  return (
    <div className="rounded-2xl border border-border-light bg-white p-4 shadow-sm dark:border-border-light dark:bg-surface-secondary">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
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
            <span className="inline-flex rounded-full border border-border-light bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-secondary">
              {dateLabel}
            </span>
            <span className="inline-flex rounded-full border border-border-light bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-secondary">
              {timeRange}
            </span>
            <span className="inline-flex rounded-full border border-border-light bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-secondary">
              {t("labels.duration")}: {durationLabel}
            </span>
          </div>

          {internalNote ? (
            <p className="mt-3 text-sm leading-6 text-text-secondary">{internalNote}</p>
          ) : null}
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
    </div>
  );
}

