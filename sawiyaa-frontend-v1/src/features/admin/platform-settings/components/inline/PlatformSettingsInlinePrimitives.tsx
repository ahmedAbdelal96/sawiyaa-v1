"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { History, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import type { PlatformSetting } from "../../types/platform-settings.types";
import {
  formatHumanSettingValue,
  formatListItem,
  formatReminderOffset,
  getSettingPresentation,
  SESSION_REMINDER_OFFSETS_KEY,
} from "./platform-settings-human-presentation";

export function getSettingUnit(
  setting: PlatformSetting,
  value: unknown,
  isAr: boolean,
) {
  const key = setting.key.toLowerCase();
  const control = setting.uiMetadata?.control;
  if (control === "percentage") return "%";
  if (key.includes("bytes")) return "MB";
  if (key.includes("filesper") || key.includes("maxfiles"))
    return isAr ? "ملفات" : "files";
  if (
    control === "duration" ||
    key.includes("minutes") ||
    key.includes("ttl")
  ) {
    const amount = Number(value);
    return isAr
      ? amount === 1
        ? "دقيقة"
        : "دقائق"
      : amount === 1
        ? "minute"
        : "minutes";
  }
  return null;
}

function isFileSizeSetting(setting: PlatformSetting) {
  return setting.key.toLowerCase().includes("bytes");
}

function toInputValue(setting: PlatformSetting, value: unknown) {
  if (value === null || value === undefined) return "";
  if (isFileSizeSetting(setting) && typeof value === "number") {
    return String(Number((value / (1024 * 1024)).toFixed(2)));
  }
  return String(value);
}

function fromInputValue(setting: PlatformSetting, raw: string) {
  if (raw === "") return "";
  const numeric = Number(raw);
  if (isFileSizeSetting(setting)) return Math.round(numeric * 1024 * 1024);
  if (
    setting.uiMetadata?.control === "integer" ||
    setting.uiMetadata?.control === "duration"
  ) {
    return Math.round(numeric);
  }
  return numeric;
}

export function SettingControl({
  setting,
  value,
  isAr,
  disabled,
  onChange,
}: {
  setting: PlatformSetting;
  value: unknown;
  isAr: boolean;
  disabled?: boolean;
  onChange: (value: unknown) => void;
}) {
  const t = useTranslations("admin-platform-settings");
  const control = setting.uiMetadata?.control;
  const displayLabel = isAr ? setting.labelAr || setting.label : setting.label;

  if (control === "toggle") {
    const checked = Boolean(value);
    return (
      <button
        type="button"
        aria-label={displayLabel}
        aria-pressed={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition ${
          checked
            ? "border-primary bg-primary"
            : "border-border-light bg-surface-secondary"
        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
            checked
              ? "translate-x-6 rtl:-translate-x-6"
              : "translate-x-1 rtl:-translate-x-1"
          }`}
        />
        <span className="sr-only">
          {checked ? t("editor.booleanEnabled") : t("editor.booleanDisabled")}
        </span>
      </button>
    );
  }

  if (
    control === "integer" ||
    control === "decimal" ||
    control === "percentage" ||
    control === "duration"
  ) {
    const unit = getSettingUnit(setting, value, isAr);
    return (
      <div className="flex min-w-36 items-center gap-2">
        <input
          aria-label={displayLabel}
          type="number"
          min={setting.minimum}
          max={setting.maximum}
          step={control === "integer" || control === "duration" ? 1 : "any"}
          value={toInputValue(setting, value)}
          disabled={disabled}
          onChange={(event) =>
            onChange(fromInputValue(setting, event.target.value))
          }
          className="border-border-light bg-surface-primary text-text-primary focus:border-primary w-28 rounded-lg border px-3 py-2 text-sm font-semibold transition outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        {unit && (
          <span className="text-text-muted text-xs font-semibold">{unit}</span>
        )}
      </div>
    );
  }

  if (control === "select") {
    return (
      <select
        aria-label={displayLabel}
        value={String(value ?? "")}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="border-border-light bg-surface-primary text-text-primary focus:border-primary min-w-36 rounded-lg border px-3 py-2 text-sm font-semibold outline-none disabled:opacity-50"
      >
        {(setting.enumOptions ?? []).map((option) => (
          <option key={option} value={option}>
            {formatListItem(setting, option, isAr)}
          </option>
        ))}
      </select>
    );
  }

  if (
    control === "multi-select" ||
    control === "integer-list" ||
    control === "string-list"
  ) {
    if (setting.key === SESSION_REMINDER_OFFSETS_KEY) {
      return (
        <ReminderScheduleControl
          value={value}
          isAr={isAr}
          disabled={disabled}
          onChange={onChange}
          label={displayLabel}
        />
      );
    }
    const items = Array.isArray(value) ? value : [];
    return (
      <div className="min-w-52 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, index) => (
            <button
              type="button"
              key={`${String(item)}-${index}`}
              disabled={disabled}
              onClick={() =>
                onChange(items.filter((_, itemIndex) => itemIndex !== index))
              }
              dir="ltr"
              className="border-border-light bg-surface-primary text-text-primary inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs disabled:opacity-50"
              aria-label={`${formatListItem(setting, item, isAr)} ${t("inline.remove")}`}
            >
              <span>{formatListItem(setting, item, isAr)}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
        <input
          aria-label={`${displayLabel} ${t("inline.add")}`}
          disabled={disabled}
          placeholder={t("editor.arrayAddPlaceholder")}
          className="border-border-light bg-surface-primary text-text-primary focus:border-primary w-full rounded-lg border px-3 py-2 text-xs outline-none disabled:opacity-50"
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const input = event.currentTarget;
            const raw = input.value.trim();
            if (!raw) return;
            const next = control === "integer-list" ? Number(raw) : raw;
            if (control === "integer-list" && !Number.isInteger(next)) return;
            if (items.some((item) => String(item) === String(next))) return;
            onChange([...items, next]);
            input.value = "";
          }}
        />
      </div>
    );
  }

  if (control === "structured") {
    return (
      <textarea
        aria-label={displayLabel}
        disabled={disabled}
        value={
          typeof value === "string"
            ? value
            : JSON.stringify(value ?? {}, null, 2)
        }
        onChange={(event) => {
          try {
            onChange(JSON.parse(event.target.value));
          } catch {
            onChange(event.target.value);
          }
        }}
        rows={4}
        className="border-border-light bg-surface-primary text-text-primary focus:border-primary min-w-64 rounded-lg border px-3 py-2 font-mono text-xs outline-none disabled:opacity-50"
      />
    );
  }

  return (
    <input
      aria-label={displayLabel}
      type={control === "time" ? "time" : "text"}
      disabled={disabled}
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
      className="border-border-light bg-surface-primary text-text-primary focus:border-primary min-w-48 rounded-lg border px-3 py-2 text-sm outline-none disabled:opacity-50"
    />
  );
}

export function SettingRow({
  setting,
  value,
  isAr,
  dirty,
  error,
  disabled,
  onChange,
  onReset,
  onHistory,
  historyOpen,
  history,
}: {
  setting: PlatformSetting;
  value: unknown;
  isAr: boolean;
  dirty: boolean;
  error?: string;
  disabled?: boolean;
  onChange: (value: unknown) => void;
  onReset?: () => void;
  onHistory?: () => void;
  historyOpen?: boolean;
  history?: React.ReactNode;
}) {
  const t = useTranslations("admin-platform-settings");
  const { label, description } = getSettingPresentation(setting, isAr);
  const readOnly = !(setting.capabilities?.canEdit ?? setting.editable);
  const isAdvanced = setting.primaryDomain === "advanced" || setting.capabilities?.advancedOnly;
  const technicalSummary = isAdvanced
    ? `${setting.key} · ${setting.effectiveSource ?? ""}`
    : "";

  return (
    <div
      className={`border-border-light border-b px-1 py-4 last:border-b-0 ${dirty ? "bg-primary-light/20" : ""}`}
      data-testid={`setting-row-${setting.key}`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-text-primary text-sm font-bold">{label}</h3>
            {dirty && (
              <span className="text-primary text-[11px] font-semibold">
                {t("inline.edited")}
              </span>
            )}
          </div>
          <p className="text-text-secondary mt-1 max-w-2xl text-xs leading-5">
            {description}
          </p>
          {readOnly && isAdvanced && (
            <p className="text-text-muted mt-1 text-[11px] font-semibold">
              {setting.effectiveSource === "ENVIRONMENT"
                ? t("inline.environment")
                : setting.effectiveSource === "SYSTEM_MANAGED"
                  ? t("inline.managed")
                  : setting.effectiveSource === "LEGACY"
                    ? t("inline.legacy")
                    : t("domainPage.source")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <SettingControl
            setting={setting}
            value={value}
            isAr={isAr}
            disabled={disabled || readOnly}
            onChange={onChange}
          />
          {((dirty && setting.capabilities?.canReset && onReset) ||
            (isAdvanced && onHistory)) && (
            <details className="relative">
              <summary
                aria-label={t("inline.more")}
                className="text-text-muted hover:bg-surface-secondary hover:text-text-primary flex cursor-pointer list-none items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition [&::-webkit-details-marker]:hidden"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">{t("inline.more")}</span>
              </summary>
              <div className="border-border-light bg-surface-primary absolute end-0 top-full z-10 mt-1 min-w-44 rounded-xl border p-1.5 shadow-lg">
                {setting.capabilities?.canReset && onReset && (
                  <button
                    type="button"
                    aria-label={t("inline.resetDefault")}
                    onClick={onReset}
                    className="text-text-secondary hover:bg-surface-secondary hover:text-danger flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t("inline.resetDefault")}
                  </button>
                )}
                {onHistory && (
                  <button
                    type="button"
                    aria-label={historyOpen ? t("inline.hideHistory") : t("inline.showHistory")}
                    aria-expanded={historyOpen}
                    onClick={onHistory}
                    className="text-text-secondary hover:bg-surface-secondary flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold transition"
                  >
                    <History className="h-3.5 w-3.5" />
                    {historyOpen ? t("inline.hideHistory") : t("inline.showHistory")}
                  </button>
                )}
                {technicalSummary && (
                  <div className="text-text-muted border-border-light mt-1 border-t px-2.5 pt-2 text-[10px] leading-4">
                    <p className="mb-1 font-semibold">{t("domainPage.technicalDetails")}</p>
                    <p className="font-mono">{technicalSummary}</p>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
      {error && (
        <p className="text-danger mt-2 text-xs font-semibold">{error}</p>
      )}
      {historyOpen && history}
    </div>
  );
}

export function SettingSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border-light bg-surface-primary overflow-hidden rounded-2xl border">
      <div className="border-border-light bg-surface-secondary/60 border-b px-4 py-3">
        <h2 className="text-text-primary text-sm font-black">{title}</h2>
      </div>
      <div className="px-4">{children}</div>
    </section>
  );
}

export function SaveBar({
  count,
  reason,
  onReasonChange,
  showReason,
  disabled,
  onCancel,
  onSave,
}: {
  count: number;
  reason: string;
  onReasonChange: (reason: string) => void;
  showReason: boolean;
  disabled?: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const t = useTranslations("admin-platform-settings");
  if (count === 0) return null;
  return (
    <div className="border-primary/30 bg-surface-primary/95 sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-text-primary text-sm font-bold">
          {t("saveBar.unsavedChanges", { count })}
        </p>
        {showReason && (
          <label className="block max-w-xl">
            <span className="text-text-secondary mb-1 block text-xs font-semibold">
              {t("saveBar.reason")}
            </span>
            <input
              type="text"
              aria-label={t("saveBar.reason")}
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder={t("saveBar.reasonPlaceholder")}
              className="border-border-light bg-surface-primary text-text-primary focus:border-primary w-full rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </label>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-text-secondary hover:bg-surface-secondary rounded-lg px-3 py-2 text-xs font-bold"
        >
          {t("saveBar.cancel")}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={disabled}
          className="bg-primary rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {t("saveBar.save")}
        </button>
      </div>
    </div>
  );
}

export function ChangeReview({
  changes,
  reason,
  isAr,
  isSaving,
  highRisk,
  conflict,
  onReasonChange,
  onBack,
  onConfirm,
}: {
  changes: Array<{
    setting: PlatformSetting;
    before: unknown;
    after: unknown;
    reset?: boolean;
  }>;
  reason: string;
  isAr: boolean;
  isSaving?: boolean;
  highRisk?: boolean;
  conflict?: boolean;
  onReasonChange: (reason: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("admin-platform-settings");
  return (
    <section
      className="border-primary/30 bg-primary-light/20 space-y-4 rounded-2xl border p-4"
      data-testid="change-review"
    >
      <div>
        <h2 className="text-text-primary text-base font-black">
          {t("changeReview.title")}
        </h2>
        <p className="text-text-secondary mt-1 text-xs">
          {t("changeReview.summary")}
        </p>
      </div>
      {highRisk && (
        <p className="border-warning/30 bg-warning-light/30 text-text-primary rounded-lg border p-3 text-xs font-semibold">
          {t("changeReview.highRisk")}
        </p>
      )}
      {conflict && (
        <p className="border-danger/30 bg-danger-light/30 text-danger rounded-lg border p-3 text-xs font-semibold">
          {t("inline.conflict")}
        </p>
      )}
      <div className="divide-border-light border-border-light bg-surface-primary divide-y rounded-xl border px-3">
        {changes.map(({ setting, before, after, reset }) => (
          <div
            key={setting.key}
            className="flex flex-col gap-2 py-3 text-xs md:flex-row md:items-center md:justify-between"
          >
            <span className="text-text-primary font-bold">
              {isAr ? setting.labelAr || setting.label : setting.label}
            </span>
            <span className="text-text-secondary">
              {t("changeReview.before")}:{" "}
              <strong>{formatReviewValue(setting, before, isAr)}</strong> →{" "}
              {t("changeReview.after")}:{" "}
              <strong>{formatReviewValue(setting, after, isAr)}</strong>
              {reset ? ` (${t("inline.default")})` : ""}
            </span>
          </div>
        ))}
      </div>
      <label className="text-text-primary block text-xs font-bold">
        {t("changeReview.reason")}
        <textarea
          aria-label={t("changeReview.reason")}
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder={t("changeReview.reasonPlaceholder")}
          rows={3}
          className="border-border-light bg-surface-primary text-text-primary focus:border-primary mt-2 w-full rounded-lg border px-3 py-2 text-sm font-normal outline-none"
        />
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onBack}
          className="text-text-secondary hover:bg-surface-primary rounded-lg px-3 py-2 text-xs font-bold"
        >
          {t("changeReview.back")}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!reason.trim() || isSaving}
          className="bg-primary rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {isSaving ? t("saveBar.saving") : t("changeReview.confirm")}
        </button>
      </div>
    </section>
  );
}

function formatReviewValue(
  setting: PlatformSetting,
  value: unknown,
  isAr: boolean,
) {
  return formatHumanSettingValue(setting, value, isAr);
}

function ReminderScheduleControl({
  value,
  isAr,
  disabled,
  onChange,
  label,
}: {
  value: unknown;
  isAr: boolean;
  disabled?: boolean;
  onChange: (value: unknown) => void;
  label: string;
}) {
  const items = Array.isArray(value)
    ? value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 0)
    : [];
  const uniqueItems = [...new Set(items)].sort((left, right) => right - left);
  const [newOffset, setNewOffset] = useState(30);

  const updateItem = (index: number, next: number) => {
    if (!Number.isInteger(next) || next < 0) return;
    const nextItems = [...uniqueItems];
    if (nextItems.some((item, itemIndex) => item === next && itemIndex !== index)) return;
    nextItems[index] = next;
    onChange([...new Set(nextItems)].sort((left, right) => right - left));
  };

  const addOffset = () => {
    if (!Number.isInteger(newOffset) || newOffset < 0 || uniqueItems.includes(newOffset)) return;
    onChange([...uniqueItems, newOffset].sort((left, right) => right - left));
    setNewOffset(30);
  };

  return (
    <div className="min-w-64 space-y-2" data-testid="reminder-schedule-control">
      <div className="space-y-1.5">
        {uniqueItems.map((item, index) => (
          <div
            key={item}
            className="border-border-light bg-surface-secondary/40 flex items-center gap-2 rounded-lg border px-2.5 py-2"
          >
            <input
              aria-label={`${label} ${item}`}
              type="number"
              min={0}
              step={1}
              value={item}
              disabled={disabled}
              onChange={(event) => updateItem(index, Number(event.target.value))}
              className="border-border-light bg-surface-primary text-text-primary w-16 rounded-md border px-2 py-1.5 text-center text-xs font-bold outline-none disabled:opacity-50"
            />
            <span className="text-text-secondary flex-1 text-xs font-semibold">
              {formatReminderOffset(item, isAr)}
            </span>
            <button
              type="button"
              aria-label={`${isAr ? "حذف" : "Remove"} ${formatReminderOffset(item, isAr)}`}
              disabled={disabled}
              onClick={() => onChange(uniqueItems.filter((_, itemIndex) => itemIndex !== index))}
              className="text-text-muted hover:bg-danger-light/40 hover:text-danger rounded-md p-1.5 transition disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          aria-label={isAr ? "دقائق التذكير الجديد" : "New reminder minutes"}
          type="number"
          min={0}
          step={1}
          value={newOffset}
          disabled={disabled}
          onChange={(event) => setNewOffset(Number(event.target.value))}
          className="border-border-light bg-surface-primary text-text-primary w-20 rounded-md border px-2 py-1.5 text-xs outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={addOffset}
          disabled={disabled || !Number.isInteger(newOffset) || newOffset < 0 || uniqueItems.includes(newOffset)}
          className="text-primary hover:bg-primary-light/40 rounded-md px-2.5 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAr ? "إضافة تذكير" : "Add reminder"}
        </button>
      </div>
    </div>
  );
}
