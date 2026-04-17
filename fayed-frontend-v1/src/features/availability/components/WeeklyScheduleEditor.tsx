"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useReplaceWeeklyAvailability } from "../hooks/use-availability";
import type { MyAvailabilityData } from "../types/availability.types";

function minutesToTime(minutes: number): string {
  if (minutes === 24 * 60) return "24:00";
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function timeToMinutes(time: string): number {
  if (time === "24:00") return 24 * 60;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function buildTimeOptions(): string[] {
  const values: string[] = [];
  for (let minute = 0; minute <= 24 * 60; minute += 30) {
    values.push(minutesToTime(minute));
  }
  return values;
}

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

type DraftSlot = {
  dayOfWeek: number;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
};

type AddingState = {
  startTime: string;
  endTime: string;
  error: string | null;
};

const TIME_OPTIONS = buildTimeOptions();

type Props = {
  data: MyAvailabilityData;
};

export default function WeeklyScheduleEditor({ data }: Props) {
  const t = useTranslations("practitioner-area.availability.schedule");
  const replaceSlots = useReplaceWeeklyAvailability();

  const [draftSlots, setDraftSlots] = useState<DraftSlot[]>(() =>
    data.weeklySlots
      .filter((slot) => slot.isActive)
      .map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        startMinuteOfDay: slot.startMinuteOfDay,
        endMinuteOfDay: slot.endMinuteOfDay,
      })),
  );

  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [addingState, setAddingState] = useState<AddingState>({
    startTime: "09:00",
    endTime: "17:00",
    error: null,
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const timezone = data.timezone;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftSlots(
      data.weeklySlots
        .filter((slot) => slot.isActive)
        .map((slot) => ({
          dayOfWeek: slot.dayOfWeek,
          startMinuteOfDay: slot.startMinuteOfDay,
          endMinuteOfDay: slot.endMinuteOfDay,
        })),
    );
    setSaveSuccess(false);
    setAddingDay(null);
    setAddingState({ startTime: "09:00", endTime: "17:00", error: null });
  }, [data.weeklySlots]);

  function openAddSlot(dayOfWeek: number) {
    setAddingDay(dayOfWeek);
    setAddingState({ startTime: "09:00", endTime: "17:00", error: null });
    setSaveSuccess(false);
  }

  function cancelAddSlot() {
    setAddingDay(null);
    setAddingState((prev) => ({ ...prev, error: null }));
  }

  function confirmAddSlot() {
    if (addingDay === null) return;

    const start = timeToMinutes(addingState.startTime);
    const end = timeToMinutes(addingState.endTime);

    if (end <= start) {
      setAddingState((prev) => ({ ...prev, error: t("validation.endAfterStart") }));
      return;
    }

    const daySlots = draftSlots.filter((slot) => slot.dayOfWeek === addingDay);
    const overlaps = daySlots.some(
      (slot) => start < slot.endMinuteOfDay && end > slot.startMinuteOfDay,
    );

    if (overlaps) {
      setAddingState((prev) => ({ ...prev, error: t("validation.overlap") }));
      return;
    }

    setDraftSlots((prev) =>
      [...prev, { dayOfWeek: addingDay, startMinuteOfDay: start, endMinuteOfDay: end }].sort(
        (a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinuteOfDay - b.startMinuteOfDay,
      ),
    );
    setAddingDay(null);
    setAddingState({ startTime: "09:00", endTime: "17:00", error: null });
  }

  function removeSlot(dayOfWeek: number, startMinuteOfDay: number) {
    setDraftSlots((prev) =>
      prev.filter(
        (slot) =>
          !(slot.dayOfWeek === dayOfWeek && slot.startMinuteOfDay === startMinuteOfDay),
      ),
    );
    setSaveSuccess(false);
  }

  function handleSave() {
    if (!timezone) return;
    setSaveSuccess(false);
    replaceSlots.mutate(
      { timezone, slots: draftSlots },
      { onSuccess: () => setSaveSuccess(true) },
    );
  }

  return (
    <div className="rounded-2xl border border-border-light bg-white p-6 shadow-sm dark:border-border-light dark:bg-surface-secondary">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-text-primary dark:text-white/90">
          {t("heading")}
        </h2>
        <p className="mt-0.5 text-xs text-text-secondary">{t("description")}</p>
      </div>

      {!timezone ? (
        <div className="mb-5 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700/40 dark:bg-yellow-900/20 dark:text-yellow-300">
          {t("noTimezone")}
        </div>
      ) : (
        <div className="mb-5 flex items-center gap-2">
          <span className="text-xs text-text-muted">{t("timezoneLabel")}</span>
          <span className="rounded-lg bg-surface-tertiary px-2.5 py-1 text-xs font-medium text-text-secondary dark:bg-white/5 dark:text-white/60">
            {timezone}
          </span>
        </div>
      )}

      <div className="space-y-3">
        {DAY_KEYS.map((dayKey, dayIndex) => {
          const daySlots = draftSlots
            .filter((slot) => slot.dayOfWeek === dayIndex)
            .sort((a, b) => a.startMinuteOfDay - b.startMinuteOfDay);
          const isAdding = addingDay === dayIndex;

          return (
            <div
              key={dayKey}
              className="rounded-2xl border border-border-light bg-surface p-3 dark:border-border-light dark:bg-surface"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-text-primary dark:text-white/90">
                    {t(`days.${dayKey}`)}
                  </span>
                  <p className="text-xs text-text-muted">
                    {daySlots.length === 0 ? t("noSlots") : `${daySlots.length}`}
                  </p>
                </div>

                {!isAdding ? (
                  <button
                    type="button"
                    disabled={!timezone || replaceSlots.isPending}
                    onClick={() => openAddSlot(dayIndex)}
                    className="inline-flex items-center gap-1 rounded-xl border border-dashed border-border-light px-3 py-2 text-xs font-medium text-text-muted transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:hover:border-primary dark:hover:text-primary"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t("addSlot")}
                  </button>
                ) : null}
              </div>

              {daySlots.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((slot) => (
                    <span
                      key={slot.startMinuteOfDay}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary dark:border-primary/40 dark:bg-primary/10"
                    >
                      {minutesToTime(slot.startMinuteOfDay)} - {minutesToTime(slot.endMinuteOfDay)}
                      <button
                        type="button"
                        aria-label={t("removeSlot")}
                        disabled={replaceSlots.isPending}
                        onClick={() => removeSlot(slot.dayOfWeek, slot.startMinuteOfDay)}
                        className="ml-0.5 rounded-full p-0.5 text-primary/70 hover:bg-primary/10 hover:text-primary disabled:opacity-40"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              {isAdding ? (
                <div className="mt-3 rounded-xl border border-border-light bg-white p-3 dark:border-border-light dark:bg-surface-secondary">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr_auto_auto] sm:items-center">
                    <select
                      value={addingState.startTime}
                      onChange={(event) =>
                        setAddingState((prev) => ({
                          ...prev,
                          startTime: event.target.value,
                          error: null,
                        }))
                      }
                      className="app-control w-full px-3 py-2 text-sm"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>

                    <span className="hidden text-center text-xs text-text-muted sm:block">-</span>

                    <select
                      value={addingState.endTime}
                      onChange={(event) =>
                        setAddingState((prev) => ({
                          ...prev,
                          endTime: event.target.value,
                          error: null,
                        }))
                      }
                      className="app-control w-full px-3 py-2 text-sm"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={confirmAddSlot}
                      className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90"
                    >
                      {t("addConfirm")}
                    </button>

                    <button
                      type="button"
                      onClick={cancelAddSlot}
                      className="rounded-xl border border-border-light px-4 py-2 text-xs font-semibold text-text-secondary transition hover:bg-surface-tertiary dark:hover:bg-white/5"
                    >
                      {t("addCancel")}
                    </button>
                  </div>

                  {addingState.error ? (
                    <p className="mt-2 text-xs text-error-500">{addingState.error}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="my-5 border-t border-border-light dark:border-border-light" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs text-text-muted">{t("saveHint")}</div>
        <div className="flex items-center gap-3">
          {saveSuccess ? (
            <span className="text-xs text-green-600 dark:text-green-400">{t("saveSuccess")}</span>
          ) : null}
          {replaceSlots.isError ? (
            <span className="text-xs text-error-500">{t("saveError")}</span>
          ) : null}
          <button
            type="button"
            disabled={!timezone || replaceSlots.isPending}
            onClick={handleSave}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {replaceSlots.isPending ? t("saving") : t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
