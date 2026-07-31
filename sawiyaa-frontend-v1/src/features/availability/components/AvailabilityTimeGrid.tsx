"use client";

import { canFitAvailabilityDuration, generateAvailabilityTimeOptions } from "../utils/availability-time-grid";
import AvailabilityTimeRange, { getAvailabilityTimeRangeAccessibleLabel } from "./AvailabilityTimeRange";

type Duration = 30 | 60;

export type AvailabilityTimeGridProps = {
  duration: Duration;
  selectedStarts: number[];
  protectedStarts?: number[];
  disabled?: boolean;
  locale: string;
  durationLabel: string;
  fromLabel: string;
  toLabel: string;
  protectedLabel: string;
  endOfDayLabel: string;
  onToggle: (startMinuteOfDay: number) => void;
};

export default function AvailabilityTimeGrid({
  duration,
  selectedStarts,
  protectedStarts = [],
  disabled = false,
  locale,
  durationLabel,
  fromLabel,
  toLabel,
  protectedLabel,
  endOfDayLabel,
  onToggle,
}: AvailabilityTimeGridProps) {
  const protectedSet = new Set(protectedStarts);
  return (
    <div data-testid="availability-time-grid" className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8" aria-label={durationLabel}>
      {generateAvailabilityTimeOptions(duration).map((option) => {
        const { startMinuteOfDay: minute } = option;
        const active = selectedStarts.includes(minute);
        const protectedSlot = protectedSet.has(minute);
        const invalidEnd = !canFitAvailabilityDuration(minute, duration);
        const explanation = protectedSlot ? protectedLabel : invalidEnd ? endOfDayLabel : undefined;
        const rangeLabel = getAvailabilityTimeRangeAccessibleLabel({ locale, startMinuteOfDay: option.startMinuteOfDay, endMinuteOfDay: option.endMinuteOfDay, fromLabel, toLabel });
        return (
          <button
            key={option.startMinuteOfDay}
            type="button"
            disabled={disabled || protectedSlot || invalidEnd}
            aria-pressed={active}
            aria-label={`${durationLabel} ${rangeLabel}${explanation ? `, ${explanation}` : ""}`}
            title={explanation}
            onClick={() => onToggle(minute)}
            className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-semibold ${active ? "border-primary bg-primary-light text-text-brand" : "border-border-light bg-white text-text-secondary hover:border-primary/30"} ${protectedSlot ? "border-warning-200 bg-warning-50 text-warning-700" : ""} ${(disabled || invalidEnd) ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <span className="inline-flex items-center gap-1">{active ? <span aria-hidden="true">&#10003;</span> : null}<AvailabilityTimeRange locale={locale} startMinuteOfDay={option.startMinuteOfDay} endMinuteOfDay={option.endMinuteOfDay} fromLabel={fromLabel} toLabel={toLabel} /></span>
          </button>
        );
      })}
    </div>
  );
}
