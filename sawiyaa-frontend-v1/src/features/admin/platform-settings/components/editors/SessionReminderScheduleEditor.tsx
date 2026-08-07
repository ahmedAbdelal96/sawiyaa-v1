"use client";

import { useState, useMemo, useEffect } from "react";
import { useLocale } from "next-intl";
import {
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  Check,
  RotateCcw,
  X,
  ChevronDown,
  Info,
  RefreshCw,
} from "lucide-react";
import type { PlatformSetting } from "../../types/platform-settings.types";
import { cn } from "@/lib/utils";

export type SessionReminderScheduleEditorProps = {
  setting: PlatformSetting;
  value: unknown;
  onChange: (val: number[]) => void;
  onValidationChange?: (isValid: boolean) => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
  isPending: boolean;
  isResetPending: boolean;
  isError: boolean;
  onReloadLatest: () => void;
  isFetching: boolean;
};

/**
 * Format minutes into localized human-readable duration phrases.
 */
export function formatMinutesToHuman(minutes: number, isAr: boolean): string {
  if (minutes === 0) {
    return isAr ? "عند بدء الجلسة" : "At session start";
  }
  if (minutes === 60) {
    return isAr ? "قبل الجلسة بساعة" : "1 hour before session";
  }
  if (minutes === 120) {
    return isAr ? "قبل الجلسة بساعتين" : "2 hours before session";
  }
  if (minutes === 1440) {
    return isAr ? "قبل الجلسة بيوم" : "1 day before session";
  }
  if (minutes === 2880) {
    return isAr ? "قبل الجلسة بيومين" : "2 days before session";
  }
  if (minutes === 10080) {
    return isAr ? "قبل الجلسة بأسبوع" : "1 week before session";
  }
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return isAr ? `قبل الجلسة بـ ${days} أيام` : `${days} days before session`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return isAr ? `قبل الجلسة بـ ${hours} ساعات` : `${hours} hours before session`;
  }
  return isAr ? `قبل الجلسة بـ ${minutes} دقيقة` : `${minutes} minutes before session`;
}

/**
 * Short phrase for timeline steps (e.g. "قبلها بـ 15 دقيقة" or "15 minutes before")
 */
export function formatTimelineStep(minutes: number, index: number, isAr: boolean): string {
  if (minutes === 0) {
    return isAr ? "عند بدء الجلسة" : "At session start";
  }
  if (index === 0) {
    return formatMinutesToHuman(minutes, isAr);
  }
  if (minutes === 60) {
    return isAr ? "قبلها بساعة" : "1 hour before";
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return isAr ? `قبلها بـ ${hours} ساعات` : `${hours} hours before`;
  }
  return isAr ? `قبلها بـ ${minutes} دقيقة` : `${minutes} minutes before`;
}

export function SessionReminderScheduleEditor({
  setting,
  value,
  onChange,
  onValidationChange,
  reason,
  onReasonChange,
  onSave,
  onCancel,
  onReset,
  isPending,
  isResetPending,
  isError,
  onReloadLatest,
  isFetching,
}: SessionReminderScheduleEditorProps) {
  const locale = useLocale();
  const isAr = locale.startsWith("ar");

  // Parse raw value array into positive before-session offsets and session-start toggle
  const rawArray = useMemo<number[]>(() => {
    if (Array.isArray(value)) {
      return value.map((v) => Number(v)).filter((v) => !isNaN(v));
    }
    return [60, 15, 0];
  }, [value]);

  const initialHasStart = rawArray.includes(0);
  const initialBeforeOffsets = useMemo(
    () => rawArray.filter((v) => v > 0).sort((a, b) => b - a),
    [rawArray]
  );

  const [hasStartReminder, setHasStartReminder] = useState(initialHasStart);
  const [beforeOffsets, setBeforeOffsets] = useState<number[]>(initialBeforeOffsets);
  const [showTechnicalKey, setShowTechnicalKey] = useState(false);
  const [confirmingRestoreDefault, setConfirmingRestoreDefault] = useState(false);

  const maxAllowed = setting.maximum ?? 10080;

  // Validation checks
  const validationError = useMemo<string | null>(() => {
    if (beforeOffsets.length === 0 && !hasStartReminder) {
      return isAr
        ? "يلزم تحديد تذكير واحد على الأقل قبل الجلسة أو عند بدايتها."
        : "At least one reminder is required before or at session start.";
    }

    for (const offset of beforeOffsets) {
      if (isNaN(offset) || offset <= 0) {
        return isAr
          ? "يرجى إدخال عدد دقائق إيجابي صحيح لكل تذكير."
          : "Please enter a valid positive minute duration for each reminder.";
      }
      if (offset > maxAllowed) {
        return isAr
          ? `لا يمكن أن تتجاوز مدة التذكير ${maxAllowed} دقيقة (7 أيام).`
          : `Reminder duration cannot exceed ${maxAllowed} minutes (7 days).`;
      }
    }

    const uniqueSet = new Set(beforeOffsets);
    if (uniqueSet.size !== beforeOffsets.length) {
      return isAr
        ? "توجد مواعيد تذكير مكررة. يرجى تعديل أو إزالة التكرار."
        : "Duplicate reminder durations detected. Please adjust or remove duplicates.";
    }

    return null;
  }, [beforeOffsets, hasStartReminder, isAr, maxAllowed]);

  // Sync validation status to parent container
  useEffect(() => {
    onValidationChange?.(validationError === null);
  }, [validationError, onValidationChange]);

  // Emit serialized array to parent whenever schedule state changes
  const updateSchedule = (newOffsets: number[], newHasStart: boolean) => {
    const sorted = [...newOffsets].sort((a, b) => b - a);
    setBeforeOffsets(sorted);
    setHasStartReminder(newHasStart);

    const serialized = [...sorted];
    if (newHasStart) {
      serialized.push(0);
    }
    onChange(serialized);
  };

  const handleOffsetChange = (index: number, newMinutes: number) => {
    const updated = [...beforeOffsets];
    updated[index] = newMinutes;
    updateSchedule(updated, hasStartReminder);
  };

  const handleRemoveOffset = (index: number) => {
    const updated = beforeOffsets.filter((_, i) => i !== index);
    updateSchedule(updated, hasStartReminder);
  };

  const handleAddOffset = () => {
    // Intelligently choose default new offset
    let newMinutes = 30;
    if (beforeOffsets.includes(30)) newMinutes = 45;
    if (beforeOffsets.includes(45)) newMinutes = 120;
    if (beforeOffsets.includes(120)) newMinutes = 240;
    const updated = [...beforeOffsets, newMinutes];
    updateSchedule(updated, hasStartReminder);
  };

  const handleToggleStartReminder = () => {
    updateSchedule(beforeOffsets, !hasStartReminder);
  };

  // Format default schedule for restore confirmation
  const defaultArray = Array.isArray(setting.defaultValue)
    ? (setting.defaultValue as number[])
    : [60, 15, 0];
  const formattedDefault = defaultArray
    .slice()
    .sort((a, b) => b - a)
    .map((m) => formatMinutesToHuman(m, isAr))
    .join(" ، ");

  const formattedCurrent = [...beforeOffsets, ...(hasStartReminder ? [0] : [])]
    .map((m) => formatMinutesToHuman(m, isAr))
    .join(" ، ");

  return (
    <div className="space-y-5" dir={isAr ? "rtl" : "ltr"}>
      {/* 1. Header: Localized Business Title & Description */}
      <div className="space-y-1 border-b border-slate-100 pb-3 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
              <Clock className="h-4 w-4" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              {isAr ? "مواعيد تذكير الجلسة" : "Session reminder schedule"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
            aria-label={isAr ? "إغلاق" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {isAr
            ? "حدد متى يتلقى المريض والمختص تذكيرات قبل موعد الجلسة وعند بدايتها."
            : "Set when the patient and practitioner receive reminders before and at the start of the session."}
        </p>

        {/* 2. Technical Details Disclosure (Hidden by default) */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowTechnicalKey(!showTechnicalKey)}
            className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                showTechnicalKey && "rotate-180"
              )}
            />
            <span>{isAr ? "التفاصيل التقنية" : "Technical details"}</span>
          </button>
          {showTechnicalKey && (
            <div className="mt-1.5 rounded-lg border border-slate-200/60 bg-slate-50 p-2 font-mono text-[10px] text-slate-600 dark:border-white/5 dark:bg-slate-950/40 dark:text-slate-400">
              <span>Config Key: </span>
              <code className="font-bold">{setting.key}</code>
            </div>
          )}
        </div>
      </div>

      {/* 3. Before-session Reminders Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          {isAr ? "التذكيرات قبل موعد الجلسة" : "Before-session reminders"}
        </h3>

        {beforeOffsets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-500 dark:border-white/10">
            {isAr
              ? "لا توجد تذكيرات محددة قبل موعد الجلسة حالياً."
              : "No before-session reminders configured currently."}
          </div>
        ) : (
          <div className="space-y-2">
            {beforeOffsets.map((offset, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 transition-all hover:border-slate-300 dark:border-white/10 dark:bg-slate-950/30"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={maxAllowed}
                    value={offset}
                    onChange={(e) => handleOffsetChange(idx, Number(e.target.value))}
                    aria-label={
                      isAr
                        ? `تذكير رقم ${idx + 1} بالدقائق قبل الجلسة`
                        : `Reminder ${idx + 1} minutes before session`
                    }
                    className="w-20 rounded-lg border border-slate-300 bg-white p-1.5 text-center font-mono text-xs font-bold text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isAr ? "دقيقة قبل الجلسة" : "minutes before the session"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveOffset(idx)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200/80 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                  aria-label={isAr ? `حذف تذكير ${offset} دقيقة` : `Delete ${offset} minute reminder`}
                >
                  <Trash2 className="h-3 w-3" />
                  <span>{isAr ? "حذف" : "Delete"}</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Reminder Action with explicit text */}
        <button
          type="button"
          onClick={handleAddOffset}
          className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2 text-xs font-bold text-teal-700 shadow-sm transition hover:bg-teal-100 dark:border-teal-900/50 dark:bg-teal-950/40 dark:text-teal-300"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>
            {isAr ? "+ إضافة تذكير قبل الجلسة" : "+ Add a reminder before the session"}
          </span>
        </button>
      </div>

      {/* 4. Session-start Reminder Toggle */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-white/10 dark:bg-slate-950/30">
        <span className="text-xs font-bold text-slate-900 dark:text-white">
          {isAr ? "إرسال تذكير عند بدء الجلسة" : "Send a reminder when the session starts"}
        </span>

        <button
          type="button"
          role="switch"
          aria-checked={hasStartReminder}
          onClick={handleToggleStartReminder}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500/20",
            hasStartReminder ? "bg-teal-600" : "bg-slate-300 dark:bg-slate-700"
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out rtl:translate-x-0",
              hasStartReminder ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>

      {/* 5. Validation Error Display */}
      {validationError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{validationError}</span>
        </div>
      )}

      {/* 6. Timeline Preview */}
      <div className="space-y-1.5 rounded-xl border border-teal-200/60 bg-teal-50/40 p-3.5 dark:border-teal-900/30 dark:bg-teal-950/20">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-800 dark:text-teal-300">
          <Clock className="h-3.5 w-3.5 text-teal-600" />
          <span>{isAr ? "المعاينة الحية للجدول الزمني" : "Timeline preview"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1 font-semibold text-xs text-slate-800 dark:text-slate-200">
          {beforeOffsets.length === 0 && !hasStartReminder ? (
            <span className="italic text-slate-400">{isAr ? "لا توجد تذكيرات" : "No reminders"}</span>
          ) : (
            <>
              {beforeOffsets.map((offset, idx) => (
                <span key={idx} className="inline-flex items-center gap-2">
                  <span className="rounded-lg border border-teal-200 bg-white px-2.5 py-1 text-xs font-bold text-teal-900 shadow-sm dark:border-teal-900/50 dark:bg-slate-900 dark:text-teal-200">
                    {formatTimelineStep(offset, idx, isAr)}
                  </span>
                  <span className="text-slate-400 rtl:rotate-180">→</span>
                </span>
              ))}
              {hasStartReminder && (
                <span className="rounded-lg border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950 dark:text-emerald-200">
                  {isAr ? "عند بدء الجلسة" : "At session start"}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* 7. Impact Explanation Notice */}
      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-slate-100/70 p-3 text-xs text-slate-700 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <p className="leading-relaxed">
          {isAr
            ? "يُطبق هذا التغيير على الجلسات الجديدة والجلسات التي يُعاد جدولتها. تحتفظ الجلسات الحالية بسياسة التوقيت المحفوظة الخاصة بها."
            : "This change applies to newly booked and explicitly rescheduled sessions. Existing session revisions keep their saved timing policy."}
        </p>
      </div>

      {/* 8. Audit Reason Field (Placed after schedule editor and preview) */}
      <div className="space-y-1.5">
        <label className="block text-xs font-extrabold text-slate-900 dark:text-white">
          {isAr ? "سبب التعديل" : "Reason for modification"}{" "}
          <span className="text-rose-500">*</span>
        </label>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder={
            isAr
              ? "مثال: تقليل عدد التذكيرات بناءً على ملاحظات المستخدمين."
              : "Example: Reduced reminder frequency based on user feedback."
          }
          aria-label={isAr ? "سبب التعديل" : "Reason for modification"}
          className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-xs shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-white/10 dark:bg-slate-950/50 dark:text-white"
          required
        />
      </div>

      {/* 9. Revision Conflict Banner */}
      {isError && (
        <div
          role="alert"
          className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
        >
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>
              {isAr
                ? "تنبيه: تم تحديث هذا الإعداد بواسطة مسؤول آخر. يُرجى إعادة تحميل أحدث البيانات."
                : "Conflict: This setting was updated by another administrator. Reload latest values."}
            </span>
          </div>
          <button
            type="button"
            onClick={onReloadLatest}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700"
          >
            <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
            <span>{isAr ? "تحميل أحدث قيمة" : "Reload latest"}</span>
          </button>
        </div>
      )}

      {/* 10. Quiet Restore Default with Human-Readable Confirmation */}
      {confirmingRestoreDefault ? (
        <div className="space-y-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/30">
          <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
            {isAr ? "تأكيد إعادة الضبط للافتراضي" : "Confirm Schedule Reset"}
          </h4>
          <div className="space-y-1 text-xs text-amber-800 dark:text-amber-300">
            <p>
              <span className="font-bold">{isAr ? "الجدول الحالي: " : "Current schedule: "}</span>
              {formattedCurrent || (isAr ? "لا توجد تذكيرات" : "No reminders")}
            </p>
            <p>
              <span className="font-bold">{isAr ? "الجدول الافتراضي: " : "Default schedule: "}</span>
              {formattedDefault}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isResetPending}
              onClick={() => {
                onReset();
                setConfirmingRestoreDefault(false);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-800 disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" />
              <span>{isAr ? "تأكيد الاستعادة" : "Confirm Restore"}</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmingRestoreDefault(false)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/10">
          <button
            type="button"
            onClick={() => setConfirmingRestoreDefault(true)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline decoration-slate-300 underline-offset-4"
          >
            {isAr ? "إعادة الضبط للافتراضي" : "Restore default"}
          </button>

          {/* Save and Cancel Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>

            <button
              type="button"
              disabled={!reason.trim() || validationError !== null || isPending || isResetPending}
              onClick={onSave}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md transition hover:bg-teal-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>{isAr ? "جارٍ الحفظ..." : "Saving..."}</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>{isAr ? "حفظ التغييرات" : "Save Changes"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
