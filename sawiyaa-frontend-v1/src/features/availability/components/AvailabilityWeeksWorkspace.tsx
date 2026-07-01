"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Copy,
  Lock,
  Save,
  Sparkles,
  Clock3,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SurfaceCard, SurfaceHeader } from "@/components/shared/SurfaceShell";
import {
  useCopyAvailabilityWeekToNext,
  useCreateAvailabilityWeek,
  usePublishAvailabilityWeek,
  useUpdateAvailabilityWeek,
} from "../hooks/use-availability";
import type {
  AvailabilityWeek,
  AvailabilityWeekOverview,
  AvailabilityWorkspaceData,
} from "../types/availability.types";

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type SessionBlockDuration = 30 | 60;
type WeekKind = "current" | "next";

type MinuteRange = {
  startMinuteOfDay: number;
  endMinuteOfDay: number;
};

type DraftSchedule = Record<DayOfWeek, Record<SessionBlockDuration, number[]>>;

const DAY_ORDER: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];
const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const DURATIONS: SessionBlockDuration[] = [30, 60];
const DAY_END_MINUTE = 24 * 60;

function dayKeyFor(dayOfWeek: number): (typeof DAY_KEYS)[number] {
  return DAY_KEYS[dayOfWeek as DayOfWeek] ?? "monday";
}

function normalizeStarts(minutes: number[]): number[] {
  return Array.from(new Set(minutes.filter((minute) => minute >= 0 && minute < DAY_END_MINUTE))).sort(
    (left, right) => left - right,
  );
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

function slotsToDraftSchedule(slots: AvailabilityWeek["slots"]): DraftSchedule {
  const output = createEmptyDraftSchedule();

  for (const slot of slots) {
    const day = slot.dayOfWeek as DayOfWeek;
    const duration = slot.durationMinutes === 60 ? 60 : 30;
    output[day][duration].push(slot.startMinuteOfDay);
    output[day][duration] = normalizeStarts(output[day][duration]);
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

function formatWeekRange(week: AvailabilityWeek, locale: string): string {
  const start = new Date(`${week.weekStartDate}T12:00:00`);
  const end = new Date(`${week.weekEndDate}T12:00:00`);

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(start) +
    " - " +
    new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(end);
}

function getDefaultSelectedKind(overview: AvailabilityWeekOverview): WeekKind {
  if (overview.currentWeek.status === "DRAFT" || overview.currentWeek.status === "PUBLISHED") {
    return "current";
  }

  if (overview.nextWeek.status === "DRAFT" || overview.nextWeek.status === "PUBLISHED") {
    return "next";
  }

  return "current";
}

function statusTone(status: AvailabilityWeek["status"]) {
  switch (status) {
    case "PUBLISHED":
      return "success" as const;
    case "DRAFT":
      return "warning" as const;
    case "ARCHIVED":
      return "neutral" as const;
    default:
      return "neutral" as const;
  }
}

function statusClass(status: AvailabilityWeek["status"]) {
  switch (status) {
    case "PUBLISHED":
      return "border-success-500/20 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300";
    case "DRAFT":
      return "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300";
    case "ARCHIVED":
      return "border-border-light bg-surface-tertiary text-text-muted";
    default:
      return "border-border-light bg-surface-tertiary text-text-muted";
  }
}

function statusLabel(
  t: ReturnType<typeof useTranslations>,
  status: AvailabilityWeek["status"],
) {
  if (status === "NOT_SET") return t("weeks.status.notSet");
  if (status === "DRAFT") return t("weeks.status.draft");
  if (status === "PUBLISHED") return t("weeks.status.published");
  return t("weeks.status.archived");
}

function weekActionLabel(
  t: ReturnType<typeof useTranslations>,
  week: AvailabilityWeek,
  kind: WeekKind,
) {
  if (week.status === "DRAFT") return t("weeks.actions.editDraft");
  if (week.status === "PUBLISHED") return t("weeks.actions.viewPublished");
  if (kind === "current") return t("weeks.actions.createCurrentDraft");
  return t("weeks.actions.copyCurrentToNextDraft");
}

function WeekSummaryCard({
  week,
  kind,
  selected,
  onSelect,
  onAction,
  actionLabel,
  actionDisabled,
  actionDisabledReason,
}: {
  week: AvailabilityWeek;
  kind: WeekKind;
  selected: boolean;
  onSelect: () => void;
  onAction: () => void;
  actionLabel: string;
  actionDisabled?: boolean;
  actionDisabledReason?: string;
}) {
  const t = useTranslations("practitioner-area.availability");
  const locale = useLocale();
  const isPublished = week.status === "PUBLISHED";
  const isDraft = week.status === "DRAFT";
  const isNotSet = week.status === "NOT_SET";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group flex h-full w-full flex-col rounded-[24px] border p-4 text-start transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        selected
          ? "border-primary/30 bg-primary-light/20 shadow-[0_16px_30px_-22px_rgba(68,161,148,0.35)]"
          : "border-border-light bg-white hover:border-primary/20 hover:bg-surface-tertiary dark:bg-surface-secondary",
      )}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {kind === "current" ? t("weeks.currentLabel") : t("weeks.nextLabel")}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
            {formatWeekRange(week, locale)}
          </h3>
          <p className="mt-1 text-xs leading-6 text-text-secondary">
            {isPublished
              ? t("weeks.notes.published")
              : isDraft
                ? t("weeks.notes.draft")
                : isNotSet
                  ? t("weeks.notes.notSet")
                  : t("weeks.notes.archived")}
          </p>
        </div>

        <span className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-semibold", statusClass(week.status))}>
          {statusLabel(t, week.status)}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-text-secondary">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>{week.weekStartDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>{week.timezone}</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>
            {week.hasSlots ? t("weeks.card.hasSlots") : t("weeks.card.noSlots")}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-1 flex-col justify-end gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (!actionDisabled) {
              onAction();
            }
          }}
          disabled={actionDisabled}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50",
            isPublished
              ? "bg-surface-secondary text-text-secondary border border-border-light"
              : isDraft
                ? "bg-primary text-white hover:bg-primary-hover"
                : "bg-primary text-white hover:bg-primary-hover",
          )}
        >
          {isPublished ? <Lock className="h-4 w-4" aria-hidden="true" /> : isDraft ? <Save className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {actionLabel}
        </button>
        {actionDisabledReason ? (
          <p className="text-xs leading-5 text-text-muted">{actionDisabledReason}</p>
        ) : null}
      </div>
    </div>
  );
}

function WeekDraftEditor({
  week,
  selectedKind,
}: {
  week: AvailabilityWeek;
  selectedKind: WeekKind;
}) {
  const t = useTranslations("practitioner-area.availability");
  const locale = useLocale();
  const updateWeek = useUpdateAvailabilityWeek();
  const publishWeek = usePublishAvailabilityWeek();
  const createWeek = useCreateAvailabilityWeek();

  const initialDraft = useMemo(() => slotsToDraftSchedule(week.slots), [week.slots]);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const firstExisting = DAY_ORDER.find((day) => week.slots.some((slot) => slot.dayOfWeek === day));
    return firstExisting ?? 1;
  });
  const [selectedDuration, setSelectedDuration] = useState<SessionBlockDuration>(30);
  const [draft, setDraft] = useState<DraftSchedule>(() => initialDraft);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  useEffect(() => {
    if (!DAY_ORDER.includes(selectedDay)) {
      const firstExisting = DAY_ORDER.find((day) => week.slots.some((slot) => slot.dayOfWeek === day));
      setSelectedDay(firstExisting ?? 1);
    }
  }, [selectedDay, week.slots]);

  const isEditable = week.status === "DRAFT";
  const isPublished = week.status === "PUBLISHED";
  const isNotSet = week.status === "NOT_SET";

  const selectedDaySlots = draft[selectedDay];
  const selectedDayRanges30 = useMemo(
    () => slotRangesFromStarts(selectedDaySlots[30], 30),
    [selectedDaySlots],
  );
  const selectedDayRanges60 = useMemo(
    () => slotRangesFromStarts(selectedDaySlots[60], 60),
    [selectedDaySlots],
  );

  const totalWeeklySlots30 = useMemo(
    () => DAY_ORDER.reduce<number>((total, day) => total + normalizeStarts(draft[day][30]).length, 0),
    [draft],
  );
  const totalWeeklySlots60 = useMemo(
    () => DAY_ORDER.reduce<number>((total, day) => total + normalizeStarts(draft[day][60]).length, 0),
    [draft],
  );

  const selectedDayLabel = t(`weeks.days.${dayKeyFor(selectedDay)}`);
  const selectedDurationLabel = selectedDuration === 60 ? t("weeks.duration60") : t("weeks.duration30");
  const timeSteps = useMemo(
    () => Array.from({ length: selectedDuration === 60 ? 24 : 48 }, (_, index) => index * selectedDuration),
    [selectedDuration],
  );
  const timeGridColumnsClass =
    selectedDuration === 60
      ? "[grid-template-columns:repeat(auto-fit,minmax(7rem,1fr))]"
      : "[grid-template-columns:repeat(auto-fit,minmax(5.75rem,1fr))]";
  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initialDraft),
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
      [selectedDay]: { 30: [], 60: [] },
    }));
  }

  function handleSave() {
    const slots = draftScheduleToSlots(draft);

    if (isNotSet) {
      createWeek.mutate({
        weekStartDate: week.weekStartDate,
        timezone: week.timezone,
        slots,
      });
      return;
    }

    if (!week.id) {
      return;
    }

    updateWeek.mutate({
      weekId: week.id,
      timezone: week.timezone,
      slots,
    });
  }

  function handlePublish() {
    if (!week.id) return;
    publishWeek.mutate(week.id);
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
              {duration === 30 ? t("weeks.duration30") : t("weeks.duration60")}
            </p>
            <p className="mt-1 text-xs text-text-muted">{t("weeks.slotCount", { count: ranges.length })}</p>
          </div>

          <button
            type="button"
            onClick={() => clearDuration(selectedDay, duration)}
            disabled={!isEditable || ranges.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border-light bg-white px-3 py-2 text-xs font-semibold text-text-secondary transition hover:border-error-200 hover:bg-error-50 hover:text-error-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-surface-secondary dark:hover:bg-error-500/10 dark:hover:text-error-300"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t("weeks.clearDuration")}
          </button>
        </div>

        {ranges.length === 0 ? (
          <div className="mt-4 rounded-[18px] border border-dashed border-border-light bg-white px-4 py-4 text-sm text-text-muted dark:bg-surface-secondary">
            {t("weeks.emptySelectedDay")}
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
                      selectedDay,
                      duration,
                      draft[selectedDay][duration].filter((start) => start !== range.startMinuteOfDay),
                    )
                  }
                  disabled={!isEditable}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-border-light bg-white px-3 py-2 text-xs font-semibold text-text-secondary transition hover:border-error-200 hover:bg-error-50 hover:text-error-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-surface-secondary dark:hover:bg-error-500/10 dark:hover:text-error-300"
                >
                  {t("weeks.removeSlot")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isNotSet) {
    return (
      <SurfaceCard as="section" variant="section" className="space-y-4">
        <SurfaceHeader
          eyebrow={selectedKind === "current" ? t("weeks.currentLabel") : t("weeks.nextLabel")}
          title={t("weeks.empty.title")}
          description={selectedKind === "current" ? t("weeks.empty.current") : t("weeks.empty.next")}
        />

        <div className="rounded-[22px] border border-warning-200 bg-warning-50/75 px-4 py-4 text-sm leading-6 text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
          <p className="font-semibold text-text-primary dark:text-white/95">{t("weeks.empty.noteTitle")}</p>
          <p className="mt-1">{t("weeks.empty.noteBody")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={createWeek.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_-20px_rgba(68,161,148,0.42)] transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createWeek.isPending ? t("weeks.actions.creatingDraft") : t("weeks.actions.createCurrentDraft")}
          </button>
        </div>
      </SurfaceCard>
    );
  }

  if (isPublished) {
    return (
      <SurfaceCard as="section" variant="section" className="space-y-4">
        <SurfaceHeader
          eyebrow={selectedKind === "current" ? t("weeks.currentLabel") : t("weeks.nextLabel")}
          title={t("weeks.published.title")}
          description={t("weeks.published.description")}
          meta={<span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", statusClass(week.status))}>{statusLabel(t, week.status)}</span>}
        />

        <div className="rounded-[22px] border border-success-200 bg-success-50/80 px-4 py-4 text-sm leading-6 text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-300">
          <p className="font-semibold text-text-primary dark:text-white/95">{t("weeks.published.safeTitle")}</p>
          <p className="mt-1">{t("weeks.published.safeBody")}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[18px] border border-border-light bg-white px-4 py-3 text-sm text-text-secondary dark:bg-surface-secondary">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">{t("weeks.card.weekRange")}</p>
            <p className="mt-1 font-semibold text-text-primary dark:text-white/95">{formatWeekRange(week, locale)}</p>
          </div>
          <div className="rounded-[18px] border border-border-light bg-white px-4 py-3 text-sm text-text-secondary dark:bg-surface-secondary">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">{t("weeks.card.status")}</p>
            <p className="mt-1 font-semibold text-text-primary dark:text-white/95">{statusLabel(t, week.status)}</p>
          </div>
          <div className="rounded-[18px] border border-border-light bg-white px-4 py-3 text-sm text-text-secondary dark:bg-surface-secondary">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">{t("weeks.card.patients")}</p>
            <p className="mt-1 font-semibold text-text-primary dark:text-white/95">{t("weeks.published.patientVisible")}</p>
          </div>
        </div>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard as="section" variant="section" className="space-y-6 overflow-hidden">
      <SurfaceHeader
        eyebrow={selectedKind === "current" ? t("weeks.currentLabel") : t("weeks.nextLabel")}
        title={t("weeks.editor.title")}
        description={t("weeks.editor.description")}
        meta={<span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", statusClass(week.status))}>{statusLabel(t, week.status)}</span>}
      />

      <div className="rounded-[22px] border border-primary/15 bg-primary-light/20 px-4 py-4 text-sm leading-6 text-text-secondary dark:border-primary/20 dark:bg-primary/10">
        <p className="font-semibold text-text-primary dark:text-white/95">{t("weeks.editor.safetyTitle")}</p>
        <ul className="mt-2 list-disc space-y-1 ps-5">
          <li>{t("weeks.editor.safeOne")}</li>
          <li>{t("weeks.editor.safeTwo")}</li>
          <li>{t("weeks.editor.safeThree")}</li>
          <li>{t("weeks.editor.safeFour")}</li>
        </ul>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] border border-border-light bg-white px-4 py-3 text-sm text-text-secondary dark:bg-surface-secondary">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">{t("weeks.card.weekRange")}</p>
          <p className="mt-1 font-semibold text-text-primary dark:text-white/95">{formatWeekRange(week, locale)}</p>
        </div>
        <div className="rounded-[18px] border border-border-light bg-white px-4 py-3 text-sm text-text-secondary dark:bg-surface-secondary">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">{t("weeks.card.status")}</p>
          <p className="mt-1 font-semibold text-text-primary dark:text-white/95">{statusLabel(t, week.status)}</p>
        </div>
        <div className="rounded-[18px] border border-border-light bg-white px-4 py-3 text-sm text-text-secondary dark:bg-surface-secondary">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">{t("weeks.card.patients")}</p>
          <p className="mt-1 font-semibold text-text-primary dark:text-white/95">{t("weeks.editor.patientOnlyPublished")}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] border border-border-light bg-white px-4 py-3 text-sm text-text-secondary dark:bg-surface-secondary">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">{t("weeks.stats.day")}</p>
          <p className="mt-1 font-semibold text-text-primary dark:text-white/95">{t(`weeks.days.${dayKeyFor(selectedDay)}`)}</p>
        </div>
        <div className="rounded-[18px] border border-border-light bg-white px-4 py-3 text-sm text-text-secondary dark:bg-surface-secondary">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">{t("weeks.stats.count30")}</p>
          <p className="mt-1 font-semibold text-text-primary dark:text-white/95">{totalWeeklySlots30}</p>
        </div>
        <div className="rounded-[18px] border border-border-light bg-white px-4 py-3 text-sm text-text-secondary dark:bg-surface-secondary">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">{t("weeks.stats.count60")}</p>
          <p className="mt-1 font-semibold text-text-primary dark:text-white/95">{totalWeeklySlots60}</p>
        </div>
      </div>

      <div className="rounded-[22px] border border-primary/15 bg-primary-light/20 px-4 py-4 text-sm text-text-secondary dark:border-primary/20 dark:bg-primary/10">
        <p className="font-semibold text-text-primary dark:text-white/95">{t("weeks.schedule.heading")}</p>
        <p className="mt-1 text-xs leading-6 text-text-secondary">{t("weeks.schedule.description", { duration: selectedDurationLabel })}</p>
        <p className="mt-2 text-xs leading-6 text-text-muted">{t("weeks.schedule.independenceNote")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-border-light bg-white px-4 py-3 text-xs text-text-secondary dark:bg-surface-secondary">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-25 px-3 py-1.5 font-semibold text-text-primary">
          <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {t("weeks.stats.currentDay")}: <span className="text-primary">{selectedDayLabel}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-tertiary px-3 py-1.5 font-medium">
          <Clock3 className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />
          {t("weeks.duration30")}: {totalWeeklySlots30}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-tertiary px-3 py-1.5 font-medium">
          <Clock3 className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />
          {t("weeks.duration60")}: {totalWeeklySlots60}
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
          {isDirty ? t("weeks.stats.unsaved") : t("weeks.stats.saved")}
        </span>
      </div>

      <div className="space-y-6">
        <div className="rounded-[26px] border border-border-light bg-white px-5 py-5 shadow-sm dark:border-border-light dark:bg-surface-secondary">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">{t("weeks.daySelectorHeading")}</h2>
              <p className="mt-1 text-xs leading-6 text-text-secondary">{t("weeks.daySelectorHint")}</p>
            </div>

            <button
              type="button"
              onClick={clearSelectedDay}
              disabled={!isEditable}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border-light bg-white px-3 py-2 text-xs font-semibold text-text-secondary transition hover:border-error-200 hover:bg-error-50 hover:text-error-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-surface-secondary dark:hover:bg-error-500/10 dark:hover:text-error-300"
            >
              {t("weeks.clearDay")}
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
                    "shrink-0 rounded-2xl border px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                    isActive
                      ? "border-primary/35 bg-primary-light text-text-brand shadow-[0_12px_24px_-18px_rgba(68,161,148,0.4)]"
                      : "border-border-light bg-white text-text-secondary hover:border-primary/25 hover:bg-brand-25 dark:bg-surface-secondary dark:hover:bg-white/5",
                  )}
                >
                  {t(`weeks.days.${dayKeyFor(day)}`)}
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
                  <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">{t("weeks.timeGridHeading")}</h2>
                  <p className="mt-1 text-xs leading-6 text-text-secondary">{t("weeks.timeGridHint")}</p>
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
                        {duration === 30 ? t("weeks.duration30") : t("weeks.duration60")}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="mt-3 text-xs text-text-muted">
                {t("weeks.schedule.description", { duration: selectedDurationLabel })}
              </p>

              <div className={cn("mt-4 grid gap-2", timeGridColumnsClass)}>
                {timeSteps.map((minute) => {
                  const isActive = (draft[selectedDay][selectedDuration] ?? []).includes(minute);
                  const isDisabled = minute + selectedDuration > DAY_END_MINUTE || !isEditable;
                  return (
                    <button
                      key={minute}
                      type="button"
                      onClick={() => toggleSlotStart(selectedDay, minute)}
                      disabled={isDisabled}
                      aria-pressed={isActive}
                      aria-label={`${selectedDurationLabel} ${formatTimeLabel(minute, locale)}`}
                      className={cn(
                        "w-full min-h-[3rem] rounded-2xl border px-2 py-2 text-[11px] font-semibold transition sm:text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
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
                  <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">{t("weeks.save.heading")}</h2>
                  <p className="mt-1 text-xs leading-6 text-text-secondary">{t("weeks.save.hint")}</p>
                </div>
              </div>

              <div className="mt-4 rounded-[18px] border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
                <p className="font-semibold text-text-primary dark:text-white/95">{t("weeks.save.noticeTitle")}</p>
                <p className="mt-1">{t("weeks.save.noticeBody")}</p>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={!isEditable || updateWeek.isPending || createWeek.isPending}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_-20px_rgba(68,161,148,0.42)] transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {createWeek.isPending || updateWeek.isPending ? t("weeks.actions.savingDraft") : t("weeks.actions.saveDraft")}
              </button>

              <button
                type="button"
                onClick={handlePublish}
                disabled={!isEditable || publishWeek.isPending || !week.id}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border-light bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-success-200 hover:bg-success-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-secondary dark:hover:bg-success-500/10"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {publishWeek.isPending ? t("weeks.actions.publishing") : t("weeks.actions.publishDraft")}
              </button>

              {!isEditable ? (
                <p className="mt-3 text-xs leading-5 text-text-muted">{t("weeks.save.readOnlyNote")}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[26px] border border-border-light bg-white px-5 py-5 shadow-sm dark:border-border-light dark:bg-surface-secondary">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">{t("weeks.selectedRangesHeading")}</h2>
                  <p className="mt-1 text-xs leading-6 text-text-secondary">{t("weeks.selectedRangesHint")}</p>
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

            <div className="rounded-[26px] border border-border-light bg-white px-5 py-5 shadow-sm dark:border-border-light dark:bg-surface-secondary">
              <div className="flex items-start gap-3 rounded-[18px] border border-primary/15 bg-primary-light/20 px-4 py-4 text-sm leading-6 text-text-secondary dark:border-primary/20 dark:bg-primary/10">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <p>{t("weeks.editor.bookedSessionsNote")}</p>
              </div>
              <p className="mt-3 text-xs leading-6 text-text-muted">{t("weeks.editor.patientBookingNote")}</p>
            </div>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}

export default function AvailabilityWeeksWorkspace({ data }: { data: AvailabilityWorkspaceData }) {
  const t = useTranslations("practitioner-area.availability");
  const [selectedKind, setSelectedKind] = useState<WeekKind>(() => getDefaultSelectedKind(data.weeks));
  const locale = useLocale();
  const copyWeek = useCopyAvailabilityWeekToNext();
  const createCurrentWeek = useCreateAvailabilityWeek();

  useEffect(() => {
    setSelectedKind(getDefaultSelectedKind(data.weeks));
  }, [data.weeks.currentWeek.status, data.weeks.nextWeek.status]);

  const selectedWeek = selectedKind === "current" ? data.weeks.currentWeek : data.weeks.nextWeek;
  const currentWeek = data.weeks.currentWeek;
  const nextWeek = data.weeks.nextWeek;
  const hasCurrentWeek = Boolean(currentWeek.id);
  const canCopyToNext = hasCurrentWeek && currentWeek.status !== "ARCHIVED";

  function handleCreateCurrentDraft() {
    createCurrentWeek.mutate({
      weekStartDate: currentWeek.weekStartDate,
      timezone: data.weeks.timezone,
      slots: [],
    });
  }

  function handleCopyCurrentToNext() {
    if (!currentWeek.id) return;
    copyWeek.mutate(currentWeek.id);
  }

  const reminderMessage =
    data.weeks.reminderState === "CURRENT_WEEK_MISSING"
      ? t("weeks.reminder.currentMissing")
      : data.weeks.reminderState === "NEXT_WEEK_MISSING"
        ? t("weeks.reminder.nextMissing")
        : data.weeks.reminderState === "DRAFT_EXISTS"
          ? t("weeks.reminder.draftExists")
          : t("weeks.reminder.none");

  return (
    <div className="space-y-6">
      <SurfaceCard variant="section" className="space-y-5">
        <SurfaceHeader
          eyebrow={t("workflow.eyebrow")}
          title={t("workflow.title")}
          description={t("workflow.description")}
        />

        <div className="rounded-[22px] border border-primary/15 bg-primary-light/20 px-4 py-4 text-sm leading-6 text-text-secondary dark:border-primary/20 dark:bg-primary/10">
          <p className="font-semibold text-text-primary dark:text-white/95">{t("workflow.bannerTitle")}</p>
          <ul className="mt-2 list-disc space-y-1 ps-5">
            <li>{t("workflow.bullets.thisWeekOnly")}</li>
            <li>{t("workflow.bullets.publishedOnly")}</li>
            <li>{t("workflow.bullets.nextWeekHidden")}</li>
            <li>{t("workflow.bullets.bookedSessionsStay")}</li>
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-border-light bg-white px-4 py-3 text-xs text-text-secondary dark:bg-surface-secondary">
          <span className="rounded-full border border-border-light bg-surface-tertiary px-3 py-1.5 font-semibold text-text-primary">
            {t("workflow.timezone")}: {data.weeks.timezone}
          </span>
          <span className="rounded-full border border-border-light bg-surface-tertiary px-3 py-1.5 font-medium">
            {reminderMessage}
          </span>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <WeekSummaryCard
            week={currentWeek}
            kind="current"
            selected={selectedKind === "current"}
            onSelect={() => setSelectedKind("current")}
            onAction={() => {
              setSelectedKind("current");
              if (currentWeek.status === "NOT_SET") {
                handleCreateCurrentDraft();
              }
            }}
            actionLabel={weekActionLabel(t, currentWeek, "current")}
            actionDisabled={createCurrentWeek.isPending}
            actionDisabledReason={
              currentWeek.status === "NOT_SET"
                ? t("weeks.actions.createDraftHint")
                : undefined
            }
          />

          <WeekSummaryCard
            week={nextWeek}
            kind="next"
            selected={selectedKind === "next"}
            onSelect={() => setSelectedKind("next")}
            onAction={() => {
              setSelectedKind("next");
              if (nextWeek.status === "NOT_SET" && canCopyToNext) {
                handleCopyCurrentToNext();
              }
            }}
            actionLabel={weekActionLabel(t, nextWeek, "next")}
            actionDisabled={copyWeek.isPending || (nextWeek.status === "NOT_SET" && !canCopyToNext)}
            actionDisabledReason={
              nextWeek.status === "NOT_SET" && !canCopyToNext
                ? t("weeks.actions.copyRequiresCurrent")
                : nextWeek.status === "NOT_SET"
                  ? t("weeks.actions.copyCurrentToNextHint")
                  : undefined
            }
          />
        </div>

        <div className="rounded-[22px] border border-warning-200 bg-warning-50/75 px-4 py-4 text-sm leading-6 text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
          <p className="font-semibold text-text-primary dark:text-white/95">{t("workflow.protectedTitle")}</p>
          <p className="mt-1">{t("workflow.protectedBody")}</p>
        </div>
      </SurfaceCard>

      <WeekDraftEditor week={selectedWeek} selectedKind={selectedKind} />
    </div>
  );
}
