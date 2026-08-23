"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  Clock3,
  Eye,
  Layers,
  Pencil,
  Repeat2,
  Send,
  Sparkles,
} from "lucide-react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  useConfirmAvailabilityWeekRepeat,
  useCreateAvailabilityWeek,
  useAvailabilityWeekDetails,
  usePreviewAvailabilityWeekRepeat,
  usePublishAvailabilityWeek,
  useUpdateAvailabilityWeek,
} from "../hooks/use-availability";
import type {
  AvailabilityRepeatPreview,
  AvailabilityRepeatConfirmation,
  AvailabilityRollingWindowData,
  AvailabilityWeekSlot,
  AvailabilityWeekWindowEntry,
  AvailabilityWorkspaceData,
} from "../types/availability.types";
import { AVAILABILITY_WEEK_MAX_SLOTS, canFitAvailabilityDuration } from "../utils/availability-time-grid";
import AvailabilityTimeGrid from "./AvailabilityTimeGrid";

type DialogState =
  | { type: "editor"; week: AvailabilityWeekWindowEntry }
  | { type: "publish"; week: AvailabilityWeekWindowEntry }
  | { type: "repeat"; week: AvailabilityWeekWindowEntry }
  | null;

type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type Duration = 30 | 60;
const DAYS: Day[] = [0, 1, 2, 3, 4, 5, 6];
const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

type SelectedTimes = Record<Day, Record<Duration, number[]>>;
type SelectedTimesInitialization = { selected: SelectedTimes; invalidLegacy60Starts: number[] };

function emptySelectedTimes(): SelectedTimes {
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

function slotsToSelectedTimes(slots: AvailabilityWeekSlot[]): SelectedTimesInitialization {
  const selected = emptySelectedTimes();
  const invalidLegacy60Starts: number[] = [];
  for (const slot of slots) {
    const day = slot.dayOfWeek as Day;
    const duration = slot.durationMinutes === 60 ? 60 : 30;
    if (duration === 60 && slot.startMinuteOfDay % 60 !== 0) {
      invalidLegacy60Starts.push(slot.startMinuteOfDay);
      continue;
    }
    selected[day][duration].push(slot.startMinuteOfDay);
  }
  return { selected, invalidLegacy60Starts };
}

function formatDateRange(start: string, end: string, locale: string) {
  const format = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  return `${format.format(new Date(`${start}T12:00:00`))} - ${format.format(new Date(`${end}T12:00:00`))}`;
}

function statusKey(status: AvailabilityWeekWindowEntry["status"]) {
  return status === "DRAFT" ? "notPublished" : status === "NOT_SET" ? "noSessionTimes" : status.toLowerCase();
}

function newIdempotencyKey(prefix: string) {
  const uuid = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${prefix}-${uuid}`;
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { code?: unknown; response?: { data?: { errorCode?: unknown } } };
  return typeof candidate.code === "string"
    ? candidate.code
    : typeof candidate.response?.data?.errorCode === "string"
      ? candidate.response.data.errorCode
      : null;
}

function repeatErrorKey(error: unknown) {
  const code = getErrorCode(error);
  const known = new Set([
    "SOURCE_HAS_NO_SESSION_TIMES",
    "REPEAT_PREVIEW_EXPIRED",
    "SOURCE_CHANGED_SINCE_PREVIEW",
    "INVALID_TIMEZONE",
    "REPEAT_IN_PROGRESS",
    "IDEMPOTENCY_CONFLICT",
  ]);
  return code && known.has(code) ? code : "UNKNOWN";
}

function StatusBadge({ status }: { status: AvailabilityWeekWindowEntry["status"] }) {
  const t = useTranslations("practitioner-area.availability");
  const styles =
    status === "PUBLISHED"
      ? "border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
      : status === "DRAFT"
        ? "border-amber-500/20 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
        : "border-border-light bg-surface-secondary text-text-muted";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", styles)}>
      {t(`statusLabels.${statusKey(status)}`)}
    </span>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-light bg-surface px-3.5 py-2.5 dark:bg-surface-secondary">
      <p className="text-[11px] font-medium text-text-muted">{label}</p>
      <p className="mt-0.5 text-xs font-bold text-text-primary dark:text-white/95">{value}</p>
    </div>
  );
}

export function ScheduleEditorModal({
  week,
  timezone,
  onClose,
}: {
  week: AvailabilityWeekWindowEntry;
  timezone: string;
  onClose: () => void;
}) {
  const t = useTranslations("practitioner-area.availability");
  const locale = useLocale();
  const createWeek = useCreateAvailabilityWeek();
  const updateWeek = useUpdateAvailabilityWeek();
  const detailsQuery = useAvailabilityWeekDetails(week.weekId);
  const details = detailsQuery.data?.week;
  const [day, setDay] = useState<Day>(1);
  const [duration, setDuration] = useState<Duration>(30);
  const [starts, setStarts] = useState<SelectedTimes>(emptySelectedTimes);
  const [invalidLegacy60Starts, setInvalidLegacy60Starts] = useState<number[]>([]);
  const isCreate = !week.weekId;
  const canEditExisting = isCreate || Boolean(details && details.isEditable && week.canEdit);
  const pending = createWeek.isPending || updateWeek.isPending;
  const slots = useMemo(
    () =>
      DAYS.flatMap((dayOfWeek) =>
        ([30, 60] as Duration[]).flatMap((slotDuration) =>
          starts[dayOfWeek][slotDuration]
            .filter((startMinuteOfDay) => startMinuteOfDay % slotDuration === 0)
            .map((startMinuteOfDay) => ({
              dayOfWeek,
              durationMinutes: slotDuration,
              startMinuteOfDay,
              endMinuteOfDay: startMinuteOfDay + slotDuration,
            }))
        )
      ),
    [starts]
  );
  const exceedsSlotLimit = slots.length > AVAILABILITY_WEEK_MAX_SLOTS;

  useEffect(() => {
    if (!details) return;
    const timer = window.setTimeout(() => {
      const initialized = slotsToSelectedTimes(details.slots);
      setStarts(initialized.selected);
      setInvalidLegacy60Starts(initialized.invalidLegacy60Starts);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [details]);

  function toggle(minute: number) {
    if (!canFitAvailabilityDuration(minute, duration)) return;
    if (duration === 60 && minute % 60 !== 0) return;
    const existingSlot = details?.slots.find(
      (slot) => slot.dayOfWeek === day && slot.durationMinutes === duration && slot.startMinuteOfDay === minute
    );
    if (existingSlot && (existingSlot.canEdit === false || existingSlot.canRemove === false)) return;
    setStarts((current) => ({
      ...current,
      [day]: {
        ...current[day],
        [duration]: current[day][duration].includes(minute)
          ? current[day][duration].filter((value) => value !== minute)
          : [...current[day][duration], minute].sort((a, b) => a - b),
      },
    }));
  }

  function save() {
    if (exceedsSlotLimit) return;
    if (isCreate) createWeek.mutate({ weekStartDate: week.weekStartDate, timezone, slots }, { onSuccess: onClose });
    else if (week.weekId && details && canEditExisting)
      updateWeek.mutate({ weekId: week.weekId, timezone, slots }, { onSuccess: onClose });
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="xl"
      ariaLabel={isCreate ? t("dialogs.editor.createTitle") : t("dialogs.editor.editTitle")}
    >
      <ModalHeader
        eyebrow={t("dialogs.editor.eyebrow")}
        title={isCreate ? t("dialogs.editor.createTitle") : t("dialogs.editor.editTitle")}
        description={formatDateRange(week.weekStartDate, week.weekEndDate, locale)}
      />
      <ModalBody className="space-y-5">
        {detailsQuery.isLoading ? <p className="text-sm text-text-muted">{t("dialogs.loading")}</p> : null}
        {detailsQuery.isError ? (
          <p className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm leading-6 text-error-700">
            {t("dialogs.loadError")}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("dialogs.editor.daysLabel")}>
          {DAYS.map((dayValue) => (
            <button
              key={dayValue}
              type="button"
              role="tab"
              aria-selected={day === dayValue}
              onClick={() => setDay(dayValue)}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-semibold transition cursor-pointer",
                day === dayValue
                  ? "border-primary bg-primary text-white"
                  : "border-border-light bg-white text-text-secondary hover:bg-surface-secondary dark:bg-surface-secondary"
              )}
            >
              {t(`editorLabels.${DAY_KEYS[dayValue]}`)}
            </button>
          ))}
        </div>
        <div className="flex gap-2" role="tablist" aria-label={t("dialogs.editor.durationLabel")}>
          {[30, 60].map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={duration === value}
              onClick={() => setDuration(value as Duration)}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-semibold transition cursor-pointer",
                duration === value
                  ? "border-primary bg-primary text-white"
                  : "border-border-light bg-white text-text-secondary hover:bg-surface-secondary dark:bg-surface-secondary"
              )}
            >
              {t(`editorLabels.duration${value}`)}
            </button>
          ))}
        </div>
        <AvailabilityTimeGrid
          duration={duration}
          selectedStarts={starts[day][duration]}
          protectedStarts={
            details?.slots
              .filter(
                (slot) =>
                  slot.dayOfWeek === day &&
                  slot.durationMinutes === duration &&
                  (slot.canEdit === false || slot.canRemove === false)
              )
              .map((slot) => slot.startMinuteOfDay) ?? []
          }
          disabled={!canEditExisting}
          locale={locale}
          durationLabel={t(`editorLabels.duration${duration}`)}
          fromLabel={t("timeRange.from")}
          toLabel={t("timeRange.to")}
          protectedLabel={t("dialogs.editor.protectedTime")}
          endOfDayLabel={t("dialogs.editor.endOfDay")}
          onToggle={toggle}
        />
        {invalidLegacy60Starts.length > 0 ? (
          <p
            role="alert"
            className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm leading-6 text-warning-700"
          >
            {t("dialogs.editor.invalidLegacy60", { count: invalidLegacy60Starts.length })}
          </p>
        ) : null}
        {exceedsSlotLimit ? (
          <p
            role="alert"
            className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm leading-6 text-error-700"
          >
            {t("dialogs.editor.weekSlotsLimit", { count: AVAILABILITY_WEEK_MAX_SLOTS })}
          </p>
        ) : null}
        <p className="text-xs leading-5 text-text-muted">{t("dialogs.editor.saveHint")}</p>
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-border-light px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-secondary"
        >
          {t("actions.cancel")}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!canEditExisting || pending || exceedsSlotLimit}
          className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? t("actions.saving") : t("actions.save")}
        </button>
      </ModalFooter>
    </Modal>
  );
}

export function PublishModal({ week, onClose }: { week: AvailabilityWeekWindowEntry; onClose: () => void }) {
  const t = useTranslations("practitioner-area.availability");
  const publish = usePublishAvailabilityWeek();
  return (
    <Modal isOpen onClose={onClose} size="sm" ariaLabel={t("dialogs.publish.title")}>
      <ModalHeader title={t("dialogs.publish.title")} description={t("dialogs.publish.body")} />
      <ModalBody>
        <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm leading-6 text-warning-700">
          {t("dialogs.publish.notice")}
        </div>
        {publish.error ? <p className="mt-3 text-sm text-error-600">{t("dialogs.publish.error")}</p> : null}
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-border-light px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-secondary"
        >
          {t("actions.cancel")}
        </button>
        <button
          type="button"
          disabled={publish.isPending || !week.weekId}
          onClick={() => week.weekId && publish.mutate(week.weekId, { onSuccess: onClose })}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          {publish.isPending ? t("actions.publishing") : t("actions.publish")}
        </button>
      </ModalFooter>
    </Modal>
  );
}

export function RepeatModal({
  week,
  data,
  onClose,
}: {
  week: AvailabilityWeekWindowEntry;
  data: AvailabilityRollingWindowData;
  onClose: () => void;
}) {
  const t = useTranslations("practitioner-area.availability");
  const locale = useLocale();
  const previewMutation = usePreviewAvailabilityWeekRepeat();
  const confirmMutation = useConfirmAvailabilityWeekRepeat();
  const [targets, setTargets] = useState<string[]>([]);
  const [preview, setPreview] = useState<AvailabilityRepeatPreview | null>(null);
  const [confirmation, setConfirmation] = useState<AvailabilityRepeatConfirmation | null>(null);
  const key = useMemo(() => newIdempotencyKey("availability-repeat"), []);
  const candidates = data.weeks.filter((entry) => entry.relativeWeekIndex > week.relativeWeekIndex);
  const toggle = (date: string) => {
    setPreview(null);
    setTargets((current) =>
      current.includes(date) ? current.filter((value) => value !== date) : [...current, date]
    );
  };
  function previewRepeat() {
    if (!week.weekId || targets.length === 0) return;
    previewMutation.mutate(
      { sourceWeekId: week.weekId, targetWeekStartDates: targets, idempotencyKey: key },
      { onSuccess: setPreview }
    );
  }
  function confirmRepeat() {
    if (!week.weekId || !preview) return;
    confirmMutation.mutate(
      { sourceWeekId: week.weekId, operationId: preview.operationId, idempotencyKey: key },
      { onSuccess: setConfirmation }
    );
  }
  return (
    <Modal isOpen onClose={onClose} size="lg" ariaLabel={t("dialogs.repeat.title")}>
      <ModalHeader
        eyebrow={t("dialogs.repeat.eyebrow")}
        title={t("dialogs.repeat.title")}
        description={t("dialogs.repeat.sourceDescription", {
          range: formatDateRange(week.weekStartDate, week.weekEndDate, locale),
        })}
      />
      <ModalBody className="space-y-4">
        <div className="space-y-2">
          {candidates.map((candidate) => (
            <label
              key={candidate.weekStartDate}
              className={cn(
                "flex items-start gap-3 rounded-2xl border border-border-light bg-surface px-4 py-3 dark:bg-surface-secondary",
                candidate.weekId ? "cursor-not-allowed opacity-70" : "cursor-pointer"
              )}
            >
              <input
                type="checkbox"
                checked={targets.includes(candidate.weekStartDate)}
                disabled={Boolean(candidate.weekId)}
                onChange={() => toggle(candidate.weekStartDate)}
                className="mt-0.5 h-4 w-4 accent-primary disabled:cursor-not-allowed"
              />
              <span className="flex-1 text-sm font-semibold text-text-primary dark:text-white/95">
                <span className="block">
                  {formatDateRange(candidate.weekStartDate, candidate.weekEndDate, locale)}
                </span>
                {candidate.weekId ? (
                  <span className="mt-1 block text-xs font-normal text-text-muted">
                    {t("dialogs.repeat.reasons.TARGET_ALREADY_EXISTS")}
                  </span>
                ) : null}
              </span>
              <StatusBadge status={candidate.status} />
            </label>
          ))}
        </div>
        {preview ? (
          <div className="rounded-2xl border border-primary/20 bg-primary-light/20 px-4 py-3 text-sm leading-6 text-text-secondary">
            <p className="font-semibold text-text-primary">{t("dialogs.repeat.previewTitle")}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <InfoItem label={t("dialogs.repeat.sessions30")} value={String(preview.sourceSlotCount30Minutes)} />
              <InfoItem label={t("dialogs.repeat.sessions60")} value={String(preview.sourceSlotCount60Minutes)} />
            </div>
            {preview.targets.map((target) => (
              <div key={target.weekStartDate} className="mt-3 flex items-center justify-between gap-3 text-xs">
                <span>{target.weekStartDate}</span>
                <span>{t(`dialogs.repeat.reasons.${target.reasonCode}`, { count: target.copiedSlotCount })}</span>
              </div>
            ))}
          </div>
        ) : null}
        {confirmation ? (
          <div className="rounded-2xl border border-success-500/20 bg-success-50 px-4 py-3 text-sm leading-6 text-success-700">
            <p className="font-semibold">{t("dialogs.repeat.confirmationTitle")}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <InfoItem
                label={t("dialogs.repeat.createdSchedules")}
                value={String(confirmation.targets.filter((target) => target.classification === "ELIGIBLE").length)}
              />
              <InfoItem
                label={t("dialogs.repeat.skippedSchedules")}
                value={String(confirmation.targets.filter((target) => target.classification !== "ELIGIBLE").length)}
              />
            </div>
          </div>
        ) : null}
        {previewMutation.error || confirmMutation.error ? (
          <p className="text-sm text-error-600">
            {t(`dialogs.repeat.errors.${repeatErrorKey(previewMutation.error || confirmMutation.error)}`)}
          </p>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-border-light px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-secondary"
        >
          {confirmation ? t("actions.close") : t("actions.cancel")}
        </button>
        {confirmation ? null : preview ? (
          <button
            type="button"
            disabled={!preview.confirmationAllowed || confirmMutation.isPending}
            onClick={confirmRepeat}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-primary/90 disabled:opacity-50"
          >
            {confirmMutation.isPending ? t("actions.confirming") : t("actions.confirm")}
          </button>
        ) : (
          <button
            type="button"
            disabled={targets.length === 0 || previewMutation.isPending}
            onClick={previewRepeat}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-primary/90 disabled:opacity-50"
          >
            {previewMutation.isPending ? t("actions.previewing") : t("actions.preview")}
          </button>
        )}
      </ModalFooter>
    </Modal>
  );
}

function WeekRow({
  week,
  data,
  onOpen,
}: {
  week: AvailabilityWeekWindowEntry;
  data: AvailabilityRollingWindowData;
  onOpen: (state: Exclude<DialogState, null>) => void;
}) {
  const t = useTranslations("practitioner-area.availability");
  const locale = useLocale();
  const canRepeat = Boolean(week.weekId && week.slotCount > 0);
  const hasEmptyFutureWeek = data.weeks.some(
    (entry) => entry.relativeWeekIndex > week.relativeWeekIndex && !entry.weekId
  );

  return (
    <div className="grid items-center gap-3 border-b border-border-light px-4 py-3 last:border-0 hover:bg-surface-secondary/40 transition-colors lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_1.6fr]">
      {/* 1. Week range */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-text-primary dark:text-white/95">
            {formatDateRange(week.weekStartDate, week.weekEndDate, locale)}
          </span>
          {week.isCurrentWeek ? (
            <span className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold text-text-brand border border-primary/20">
              {t("weekMeta.currentLabel")}
            </span>
          ) : null}
        </div>
      </div>

      {/* 2. Status */}
      <div>
        <StatusBadge status={week.status} />
      </div>

      {/* 3. 30min slots */}
      <div>
        {week.slotCount30Minutes > 0 ? (
          <span className="inline-flex items-center rounded-lg bg-surface-secondary border border-border-light px-2 py-0.5 text-xs font-bold tabular-nums text-text-primary">
            {week.slotCount30Minutes} {locale === "ar" ? "موعد" : "slots"}
          </span>
        ) : (
          <span className="text-xs text-text-muted">-</span>
        )}
      </div>

      {/* 4. 60min slots */}
      <div>
        {week.slotCount60Minutes > 0 ? (
          <span className="inline-flex items-center rounded-lg bg-surface-secondary border border-border-light px-2 py-0.5 text-xs font-bold tabular-nums text-text-primary">
            {week.slotCount60Minutes} {locale === "ar" ? "موعد" : "slots"}
          </span>
        ) : (
          <span className="text-xs text-text-muted">-</span>
        )}
      </div>

      {/* 5. Bookings */}
      <div>
        {week.containsBookings ? (
          <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            {t("weekMeta.bookings")}
          </span>
        ) : (
          <span className="text-xs text-text-muted">{t("weekMeta.noBookings")}</span>
        )}
      </div>

      {/* 6. Source */}
      <div>
        <span className="text-xs font-medium text-text-secondary">
          {week.copiedFromWeekId ? t("weekMeta.copied") : t("weekMeta.original")}
        </span>
      </div>

      {/* 7. Actions */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          href={week.weekId ? `/practitioner/availability/weeks/${week.weekId}` : "/practitioner/availability"}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-primary/90 transition"
        >
          <Eye className="h-3.5 w-3.5" />
          {week.status === "NOT_SET" ? t("actions.setup") : t("actions.details")}
        </Link>

        <ActionButton
          icon={<Pencil className="h-3.5 w-3.5" />}
          label={t("actions.edit")}
          disabled={!week.canCreate && !week.canEdit}
          onClick={() => onOpen({ type: "editor", week })}
        />

        <ActionButton
          icon={<Send className="h-3.5 w-3.5" />}
          label={t("actions.publish")}
          disabled={!week.canPublish}
          onClick={() => onOpen({ type: "publish", week })}
        />

        {canRepeat ? (
          <ActionButton
            icon={<Repeat2 className="h-3.5 w-3.5" />}
            label={t("actions.repeat")}
            disabled={!hasEmptyFutureWeek}
            title={!hasEmptyFutureWeek ? t("dialogs.repeat.reasons.NO_EMPTY_FUTURE_WEEKS") : undefined}
            onClick={() => onOpen({ type: "repeat", week })}
          />
        ) : null}
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  title,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-lg border border-border-light bg-surface px-2 py-1 text-xs font-medium text-text-secondary hover:border-primary/30 hover:text-text-brand disabled:cursor-not-allowed disabled:opacity-40 transition cursor-pointer shadow-2xs dark:bg-surface-secondary"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default function AvailabilityWeeksWorkspace({ data }: { data: AvailabilityWorkspaceData }) {
  const t = useTranslations("practitioner-area.availability");
  const locale = useLocale();
  const [dialog, setDialog] = useState<DialogState>(null);
  const timezoneMissing = !data.timezone;
  const currentEntry = data.weeks.find((week) => week.isCurrentWeek);
  const upcomingEntry = data.weeks.find((week) => week.relativeWeekIndex === 1);
  const reminder =
    currentEntry?.status === "NOT_SET"
      ? t("reminders.currentMissing")
      : upcomingEntry?.status === "NOT_SET"
        ? t("weekMeta.nextMissing")
        : null;

  if (timezoneMissing) {
    return (
      <div className="rounded-2xl border border-warning-200 bg-warning-50 px-5 py-6 text-sm leading-6 text-warning-700">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">{t("timezone.requiredTitle")}</p>
            <p className="mt-1">{t("timezone.requiredBody")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Workspace Header & Summary Bar */}
      <div className="rounded-2xl border border-border-light bg-surface p-4 shadow-xs dark:bg-surface-secondary">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-light text-text-brand">
                <Calendar className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-sm font-bold text-text-primary dark:text-white/95">
                {t("workspace.title")}
              </h2>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              {t("workspace.description")}
            </p>
          </div>

          {/* Quick Summary Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-border-light bg-surface-secondary px-2.5 py-1 text-xs font-semibold text-text-secondary">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>{t("range.activeLabel")}: </span>
              <span className="font-bold text-text-primary">
                {formatDateRange(data.activeRange.startWeekDate, data.activeRange.endWeekDate, locale)}
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-xl border border-border-light bg-surface-secondary px-2.5 py-1 text-xs font-semibold text-text-secondary">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>
                {t("range.futureWeeksValue", { count: data.futureWeeksAllowed })}
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-xl border border-border-light bg-surface-secondary px-2.5 py-1 text-xs font-semibold text-text-secondary">
              <CalendarClock className="h-3.5 w-3.5 text-primary" />
              <span>{t("range.weekStartsLabel")}: {t("range.sunday")}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-xl border border-border-light bg-surface-secondary px-2.5 py-1 text-xs font-bold text-text-secondary">
              <Clock3 className="h-3.5 w-3.5 text-primary" />
              <span dir="ltr">{data.timezone}</span>
            </div>
          </div>
        </div>
      </div>

      {reminder ? (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-50/80 px-4 py-2.5 text-xs font-semibold leading-relaxed text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <span>{reminder}</span>
        </div>
      ) : null}

      {/* Desktop Weekly Schedule Table */}
      <div className="hidden overflow-hidden rounded-2xl border border-border-light bg-surface shadow-xs dark:bg-surface-secondary md:block">
        <div className="grid gap-3 border-b border-border-light bg-surface-secondary/70 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-text-muted lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_1.6fr]">
          <span>{t("table.week")}</span>
          <span>{t("table.status")}</span>
          <span>{t("table.sessions30")}</span>
          <span>{t("table.sessions60")}</span>
          <span>{t("table.bookings")}</span>
          <span>{t("table.source")}</span>
          <span>{t("table.actions")}</span>
        </div>
        {data.weeks.map((week) => (
          <WeekRow key={week.weekStartDate} week={week} data={data} onOpen={setDialog} />
        ))}
      </div>

      {/* Mobile Weekly Schedule Cards */}
      <div className="space-y-3 md:hidden">
        {data.weeks.map((week) => (
          <div
            key={week.weekStartDate}
            className="rounded-2xl border border-border-light bg-surface p-4 shadow-xs dark:bg-surface-secondary"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-text-primary dark:text-white/95">
                  {formatDateRange(week.weekStartDate, week.weekEndDate, locale)}
                </p>
                <p className="mt-0.5 text-[11px] text-text-muted">
                  {week.isCurrentWeek ? t("weekMeta.currentLabel") : week.weekStartDate}
                </p>
              </div>
              <StatusBadge status={week.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-secondary border-t border-border-light pt-2.5">
              <span>
                30 دقيقة: {week.slotCount30Minutes ? `${week.slotCount30Minutes} موعد` : "-"}
              </span>
              <span>
                60 دقيقة: {week.slotCount60Minutes ? `${week.slotCount60Minutes} موعد` : "-"}
              </span>
              <span>{week.containsBookings ? t("weekMeta.bookings") : t("weekMeta.noBookings")}</span>
              <span>{week.copiedFromWeekId ? t("weekMeta.copied") : t("weekMeta.original")}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-border-light pt-2.5">
              {week.weekId ? (
                <Link
                  href={`/practitioner/availability/weeks/${week.weekId}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-white shadow-2xs"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {week.status === "NOT_SET" ? t("actions.setup") : t("actions.details")}
                </Link>
              ) : null}
              <ActionButton
                icon={<Pencil className="h-3.5 w-3.5" />}
                label={week.status === "NOT_SET" ? t("actions.setup") : t("actions.edit")}
                disabled={!week.canCreate && !week.canEdit}
                onClick={() => setDialog({ type: "editor", week })}
              />
              {week.canPublish ? (
                <ActionButton
                  icon={<Send className="h-3.5 w-3.5" />}
                  label={t("actions.publish")}
                  onClick={() => setDialog({ type: "publish", week })}
                />
              ) : null}
              {week.weekId && week.slotCount > 0 ? (
                <ActionButton
                  icon={<Repeat2 className="h-3.5 w-3.5" />}
                  label={t("actions.repeat")}
                  onClick={() => setDialog({ type: "repeat", week })}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {dialog?.type === "editor" ? (
        <ScheduleEditorModal week={dialog.week} timezone={data.timezone} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.type === "publish" ? <PublishModal week={dialog.week} onClose={() => setDialog(null)} /> : null}
      {dialog?.type === "repeat" ? <RepeatModal week={dialog.week} data={data} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}
