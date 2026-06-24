"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { Link } from "@/i18n/navigation";
import { Skeleton } from "@/components/shared/LoadingStates";
import { StateCard } from "@/components/shared/ContentStates";
import { toAppError } from "@/lib/api/errors";
import { usePublicAvailabilityWindows } from "@/features/practitioner-profile/hooks/use-public-availability";
import {
  formatNoDurationSlotsLabel,
  formatSlotCountLabel,
  formatTimeLabel,
  formatWeekLabel,
  getWeekBounds,
  groupByLocalDay,
  normalizeUtcIso,
  type SelectableSlot,
} from "@/features/practitioner-profile/lib/availability-slot-utils";

type Props = {
  slug: string;
  durationMinutes: 30 | 60;
  requiredCount: number;
  selectedSlots: SelectableSlot[];
  onChange: (slots: SelectableSlot[]) => void;
};

function sortSlots(slots: SelectableSlot[]) {
  return [...slots].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function isSameSlot(a: SelectableSlot, b: SelectableSlot) {
  return normalizeUtcIso(a.startsAt) === normalizeUtcIso(b.startsAt);
}

export default function PackagePurchaseSlotPicker({
  slug,
  durationMinutes,
  requiredCount,
  selectedSlots,
  onChange,
}: Props) {
  const t = useTranslations("practitioner-profile");
  const tAvail = useTranslations("practitioner-profile.availability");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const { from, to } = useMemo(() => getWeekBounds(weekOffset), [weekOffset]);
  const weekLabel = useMemo(() => formatWeekLabel(from, to, numLocale), [from, to, numLocale]);
  const { data, isLoading, isError, refetch } = usePublicAvailabilityWindows(slug, from, to);

  const dayGroups = useMemo(
    () => (data ? groupByLocalDay(data.windows, numLocale) : []),
    [data, numLocale],
  );

  const filteredDayGroups = useMemo(
    () =>
      dayGroups
        .map((group) => ({
          ...group,
          slots: group.slots.filter(
            (slot) => slot.durationMinutes === null || slot.durationMinutes === durationMinutes,
          ),
        }))
        .filter((group) => group.slots.length > 0),
    [dayGroups, durationMinutes],
  );

  const selectedDayKeyResolved = selectedDayKey ?? filteredDayGroups[0]?.sortKey ?? null;
  const selectedDay =
    filteredDayGroups.find((group) => group.sortKey === selectedDayKeyResolved) ??
    filteredDayGroups.find((group) =>
      group.slots.some((slot) => selectedSlots.some((selected) => isSameSlot(selected, slot))),
    ) ??
    filteredDayGroups[0] ??
    null;

  const selectedCount = selectedSlots.length;
  const isFull = selectedCount >= requiredCount;
  const selectedCountLabel = t("packages.flow.slotProgress", {
    selected: selectedCount,
    total: requiredCount,
  });

  const toggleSlot = (slot: SelectableSlot) => {
    const existingIndex = selectedSlots.findIndex((selected) => isSameSlot(selected, slot));
    if (existingIndex >= 0) {
      const next = [...selectedSlots];
      next.splice(existingIndex, 1);
      onChange(sortSlots(next));
      return;
    }

    if (selectedSlots.length >= requiredCount) {
      return;
    }

    onChange(sortSlots([...selectedSlots, slot]));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-border-light bg-surface/80 p-4 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("packages.flow.chosenSlots")}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
              {selectedCountLabel}
            </p>
          </div>
          <div className="rounded-2xl bg-primary-light px-3 py-2 text-sm font-semibold text-primary dark:bg-primary/15">
            {selectedCount}/{requiredCount}
          </div>
        </div>

        {selectedSlots.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedSlots.map((slot) => (
              <button
                key={slot.startsAt}
                type="button"
                onClick={() => toggleSlot(slot)}
                className="inline-flex items-center gap-2 rounded-full border border-border-light bg-white px-3 py-2 text-xs font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary dark:bg-surface-secondary"
              >
                <span>{formatTimeLabel(slot.startsAt, numLocale)}</span>
                <X size={12} />
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">
            {t("packages.flow.noSlotsSelected")}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {tAvail("heading")}
          </p>
          <p className="mt-1 text-sm text-text-secondary">{weekLabel}</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={tAvail("prevWeek")}
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset((value) => value - 1)}
            className="rounded-xl border border-border-light bg-white p-2 text-text-muted transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 dark:border-border-light dark:bg-surface"
          >
            <ChevronLeft className="rtl:rotate-180" size={16} />
          </button>
          <button
            type="button"
            aria-label={tAvail("nextWeek")}
            onClick={() => setWeekOffset((value) => value + 1)}
            className="rounded-xl border border-border-light bg-white p-2 text-text-muted transition hover:border-primary hover:text-primary dark:border-border-light dark:bg-surface"
          >
            <ChevronRight className="rtl:rotate-180" size={16} />
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
        <StateCard
          title={tAvail("loadError")}
          note={tAvail("retry")}
          action={{
            label: tAvail("retry"),
            onClick: () => refetch(),
          }}
        />
      )}

      {data && !isLoading && (
        <>
          {dayGroups.length === 0 ? (
            <div className="rounded-2xl bg-surface px-4 py-4 dark:bg-white/5">
              <p className="text-sm text-text-muted">{tAvail("noSlots")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setWeekOffset((value) => value + 1)}
                  className="inline-flex items-center justify-center rounded-xl border border-border-light px-3 py-2 text-xs font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary dark:hover:bg-white/5"
                >
                  {tAvail("browseNextWeek")}
                </button>
                <Link
                  href="/patient/practitioners"
                  className="inline-flex items-center justify-center rounded-xl border border-border-light px-3 py-2 text-xs font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary dark:hover:bg-white/5"
                >
                  {tAvail("browseOtherPractitioners")}
                </Link>
              </div>
            </div>
          ) : filteredDayGroups.length === 0 ? (
            <div className="rounded-2xl bg-surface px-4 py-4 dark:bg-white/5">
              <p className="text-sm text-text-muted">
                {formatNoDurationSlotsLabel(durationMinutes, locale)}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
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
                        {formatSlotCountLabel(group.slots.length, locale)}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-[24px] border border-border-light bg-surface p-3.5 dark:border-border-light dark:bg-surface">
                {selectedDay ? (
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                        {selectedDay.dayLabel}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {formatSlotCountLabel(selectedDay.slots.length, locale)}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {(selectedDay?.slots ?? filteredDayGroups.flatMap((group) => group.slots)).map(
                    (slot) => {
                      const selected = selectedSlots.some((value) => isSameSlot(value, slot));
                      const disabled = !selected && isFull;
                      return (
                        <button
                          key={`${slot.startsAt}-${slot.windowEndsAt}-${slot.durationMinutes ?? "any"}`}
                          type="button"
                          onClick={() => toggleSlot(slot)}
                          className={`w-[82px] flex-none rounded-lg border px-2 py-2 text-center text-[11px] font-semibold transition sm:w-[88px] lg:w-[92px] ${
                            selected
                              ? "border-primary bg-primary/10 text-primary dark:bg-primary/15"
                              : "border-border-light bg-white text-text-primary hover:border-primary hover:bg-primary/6 hover:text-primary dark:border-border-light dark:bg-surface-secondary dark:text-white/85"
                          } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                          disabled={disabled}
                        >
                          <span className="block">{formatTimeLabel(slot.startsAt, numLocale)}</span>
                          {selected ? (
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium">
                              <Check size={11} />
                              {t("packages.flow.selected")}
                            </span>
                          ) : null}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      <p className="text-[11px] text-text-muted">{tAvail("timezoneNote")}</p>
    </div>
  );
}
