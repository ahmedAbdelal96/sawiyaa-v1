"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Bell,
  Mail,
  Smartphone,
  Clock,
  UserX,
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  History,
  Copy,
  Check,
  Plus,
  Minus,
  X,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import type { PlatformSetting } from "../../types/platform-settings.types";
import { useUpdatePlatformSetting, useResetPlatformSetting } from "../../hooks/use-platform-settings";
import { formatMinutesToHuman } from "../editors/SessionReminderScheduleEditor";

interface PlatformNotificationsDomainProps {
  settings: PlatformSetting[];
  onOpenHistory?: (key: string) => void;
  onOpenScheduleEditor?: (setting: PlatformSetting) => void;
}

export default function PlatformNotificationsDomain({
  settings,
  onOpenHistory,
  onOpenScheduleEditor,
}: PlatformNotificationsDomainProps) {
  const t = useTranslations("admin-platform-settings");
  const locale = useLocale();
  const isAr = locale.startsWith("ar");

  const updateMutation = useUpdatePlatformSetting();
  const resetMutation = useResetPlatformSetting();

  // Local drafts state
  const [localDrafts, setLocalDrafts] = useState<Record<string, unknown>>({});

  // Confirmation modal state
  const [activeEditingSetting, setActiveEditingSetting] = useState<{
    setting: PlatformSetting;
    proposedValue: unknown;
    displayProposedValue: string;
    displayPreviousValue: string;
  } | null>(null);

  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<"saved" | "reset" | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Helper to find a setting with fallback
  const getSetting = (
    key: string,
    fallbackDefault: unknown,
    type: "BOOLEAN" | "INTEGER" | "JSON",
    category = "NOTIFICATION"
  ): PlatformSetting => {
    return (
      settings.find((s) => s.key === key) ?? {
        key,
        label: key,
        labelAr: key,
        description: "",
        descriptionAr: "",
        category,
        domain: "sessions",
        valueType: type,
        value: fallbackDefault,
        defaultValue: fallbackDefault,
        source: "CATALOG_DEFAULT",
        editable: true,
        permission: "configuration.edit.operational",
        enumOptions: null,
        jsonSchemaId: null,
        valueId: `val-${key}`,
        expectedUpdatedAt: null,
        changedAt: new Date().toISOString(),
        effect: "IMMEDIATE",
        status: "ACTIVE",
        deprecatedReplacementKey: null,
        deprecationReason: null,
        uiMetadata: {
          control: type === "BOOLEAN" ? "toggle" : type === "INTEGER" ? "integer" : "integer-list",
        },
      }
    );
  };

  // Notification Settings
  const inAppRemindersSetting = getSetting("SESSION_IN_APP_REMINDERS_ENABLED", true, "BOOLEAN");
  const emailRemindersSetting = getSetting("SESSION_EMAIL_REMINDERS_ENABLED", true, "BOOLEAN");
  const reminderOffsetsSetting = getSetting("SESSION_REMINDER_OFFSETS_MINUTES", [60, 15, 0], "JSON");
  const lateReminderEnabledSetting = getSetting("SESSION_LATE_REMINDER_ENABLED", true, "BOOLEAN");
  const lateReminderDelaySetting = getSetting("SESSION_LATE_REMINDER_MINUTES_AFTER_START", 5, "INTEGER");

  // Helper to get current value taking draft into account
  const getCurrentValue = <T,>(setting: PlatformSetting, fallback: T): T => {
    if (setting.key in localDrafts) return localDrafts[setting.key] as T;
    return (setting.value as T) ?? fallback;
  };

  const isSettingDirty = (setting: PlatformSetting): boolean => {
    if (!(setting.key in localDrafts)) return false;
    return JSON.stringify(localDrafts[setting.key]) !== JSON.stringify(setting.value);
  };

  const inAppEnabled = getCurrentValue(inAppRemindersSetting, true);
  const emailEnabled = getCurrentValue(emailRemindersSetting, true);
  const lateReminderEnabled = getCurrentValue(lateReminderEnabledSetting, true);
  const lateReminderDelay = getCurrentValue(lateReminderDelaySetting, 5);

  const rawOffsets = getCurrentValue(reminderOffsetsSetting, [60, 15, 0]);
  const activeOffsets = useMemo(() => {
    if (Array.isArray(rawOffsets)) {
      return [...rawOffsets].sort((a, b) => Number(b) - Number(a));
    }
    return [60, 15, 0];
  }, [rawOffsets]);

  const handleOpenConfirm = (setting: PlatformSetting, proposedValue: unknown) => {
    setActiveEditingSetting({
      setting,
      proposedValue,
      displayProposedValue: String(proposedValue),
      displayPreviousValue: String(setting.value),
    });
    setReason("");
  };

  const handleSaveConfirm = async () => {
    if (!activeEditingSetting || !reason.trim()) return;

    try {
      await updateMutation.mutateAsync({
        key: activeEditingSetting.setting.key,
        value: activeEditingSetting.proposedValue,
        reason: reason.trim(),
        expectedUpdatedAt: activeEditingSetting.setting.expectedUpdatedAt,
      });

      setLocalDrafts((prev) => {
        const next = { ...prev };
        delete next[activeEditingSetting.setting.key];
        return next;
      });

      setFeedback("saved");
      setActiveEditingSetting(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleResetConfirm = async (setting: PlatformSetting) => {
    if (!reason.trim()) return;

    try {
      await resetMutation.mutateAsync({
        key: setting.key,
        reason: reason.trim(),
        expectedUpdatedAt: setting.expectedUpdatedAt,
      });

      setLocalDrafts((prev) => {
        const next = { ...prev };
        delete next[setting.key];
        return next;
      });

      setFeedback("reset");
      setActiveEditingSetting(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleCopyKey = (key: string) => {
    void navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Toast Feedback */}
      {feedback && (
        <div
          role="status"
          className="animate-fade-in flex items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-800 dark:text-emerald-200"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{t(`states.${feedback}`)}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* SECTION 1: Delivery Channels Matrix */}
      <SurfaceCard variant="section" className="space-y-5 p-5 md:p-6">
        <div className="flex items-start justify-between border-b border-border-light pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                {t("notificationsDomain.sections.channels.title")}
              </h3>
              <p className="text-xs text-text-secondary">
                {t("notificationsDomain.sections.channels.description")}
              </p>
            </div>
          </div>

          <Badge variant="solid" color="success" size="sm">
            <CheckCircle2 className="me-1 h-3 w-3" />
            {isAr ? "القنوات جاهزة" : "Channels Active"}
          </Badge>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Channel 1: In-App Push */}
          <div className="flex items-center justify-between rounded-2xl border border-border-light bg-surface-secondary/30 p-4 dark:bg-white/[0.01]">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Smartphone className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-text-primary">
                  {t("notificationsDomain.labels.inApp")}
                </span>
                <p className="text-[11px] text-text-secondary">
                  {t("notificationsDomain.labels.inAppDesc")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={inAppEnabled}
                onClick={() => {
                  setLocalDrafts((prev) => ({
                    ...prev,
                    [inAppRemindersSetting.key]: !inAppEnabled,
                  }));
                  handleOpenConfirm(inAppRemindersSetting, !inAppEnabled);
                }}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                  inAppEnabled ? "bg-primary" : "bg-border-light dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                    inAppEnabled
                      ? isAr
                        ? "-translate-x-5"
                        : "translate-x-5"
                      : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Channel 2: Transactional Emails */}
          <div className="flex items-center justify-between rounded-2xl border border-border-light bg-surface-secondary/30 p-4 dark:bg-white/[0.01]">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Mail className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-text-primary">
                  {t("notificationsDomain.labels.email")}
                </span>
                <p className="text-[11px] text-text-secondary">
                  {t("notificationsDomain.labels.emailDesc")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={emailEnabled}
                onClick={() => {
                  setLocalDrafts((prev) => ({
                    ...prev,
                    [emailRemindersSetting.key]: !emailEnabled,
                  }));
                  handleOpenConfirm(emailRemindersSetting, !emailEnabled);
                }}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                  emailEnabled ? "bg-teal-600" : "bg-border-light dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                    emailEnabled
                      ? isAr
                        ? "-translate-x-5"
                        : "translate-x-5"
                      : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </SurfaceCard>

      {/* SECTION 2: Scheduled Pre-Session Reminders */}
      <SurfaceCard variant="section" className="space-y-5 p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-border-light pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                {t("notificationsDomain.sections.schedule.title")}
              </h3>
              <p className="text-xs text-text-secondary">
                {t("notificationsDomain.sections.schedule.description")}
              </p>
            </div>
          </div>

          {onOpenScheduleEditor && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenScheduleEditor(reminderOffsetsSetting)}
              className="gap-1.5 text-xs font-bold"
            >
              <Sliders className="h-3.5 w-3.5" />
              {isAr ? "تعديل جدول التذكيرات المتقدم" : "Configure Reminder Schedule"}
            </Button>
          )}
        </div>

        {/* Reminder Offsets Timeline Grid */}
        <div className="rounded-2xl border border-indigo-200/60 bg-indigo-50/20 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-primary">
              {t("notificationsDomain.labels.scheduleTimeline")}
            </span>
            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {activeOffsets.length} {isAr ? "فواصل زمنية" : "intervals"}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {activeOffsets.map((offset) => (
              <div
                key={offset}
                className="flex items-center gap-2.5 rounded-xl border border-border-light bg-surface-primary p-3 shadow-2xs"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                  {offset}m
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-text-primary">
                    {formatMinutesToHuman(offset, isAr)}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    {offset === 0
                      ? isAr
                        ? "لحظة موعد البدء الفعلي"
                        : "At exact start time"
                      : isAr
                        ? `قبل ${offset} دقيقة من البدء`
                        : `${offset} minutes prior`}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-indigo-200/40 pt-3 text-[10px] text-text-muted dark:border-indigo-900/40">
            <button
              type="button"
              onClick={() => handleCopyKey(reminderOffsetsSetting.key)}
              className="group inline-flex items-center gap-1 font-mono hover:text-text-primary"
            >
              <span>{reminderOffsetsSetting.key}</span>
              {copiedKey === reminderOffsetsSetting.key ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100" />
              )}
            </button>

            {onOpenHistory && (
              <button
                type="button"
                onClick={() => onOpenHistory(reminderOffsetsSetting.key)}
                className="inline-flex items-center gap-1 hover:text-text-primary"
              >
                <History className="h-3 w-3" />
                <span>{t("actions.history")}</span>
              </button>
            )}
          </div>
        </div>
      </SurfaceCard>

      {/* SECTION 3: Late Attendance Alerts */}
      <SurfaceCard variant="section" className="space-y-5 p-5 md:p-6">
        <div className="flex items-start justify-between border-b border-border-light pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <UserX className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                {t("notificationsDomain.sections.lateAlerts.title")}
              </h3>
              <p className="text-xs text-text-secondary">
                {t("notificationsDomain.sections.lateAlerts.description")}
              </p>
            </div>
          </div>

          <Badge variant="solid" color="warning" size="sm">
            {isAr ? "تنبيه تشغيلي" : "Operational Alert"}
          </Badge>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Toggle: Late Reminder Enabled */}
          <div className="flex items-center justify-between rounded-2xl border border-border-light bg-surface-secondary/30 p-4 dark:bg-white/[0.01]">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-text-primary">
                {t("notificationsDomain.labels.lateEnabled")}
              </span>
              <p className="text-[11px] text-text-secondary">
                {t("notificationsDomain.labels.lateEnabledDesc")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={lateReminderEnabled}
                onClick={() => {
                  setLocalDrafts((prev) => ({
                    ...prev,
                    [lateReminderEnabledSetting.key]: !lateReminderEnabled,
                  }));
                  handleOpenConfirm(lateReminderEnabledSetting, !lateReminderEnabled);
                }}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                  lateReminderEnabled ? "bg-rose-600" : "bg-border-light dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                    lateReminderEnabled
                      ? isAr
                        ? "-translate-x-5"
                        : "translate-x-5"
                      : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Stepper: Late Reminder Delay */}
          <div className="space-y-3 rounded-2xl border border-border-light bg-surface-secondary/30 p-4 dark:bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">
                {t("notificationsDomain.labels.lateDelay")}
              </span>
              <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                {lateReminderDelay} {t("notificationsDomain.labels.minutesUnit")}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary">
              {t("notificationsDomain.labels.lateDelayDesc")}
            </p>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="inline-flex items-center rounded-xl border border-border-light bg-surface-secondary/60 p-1 dark:bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = Math.max(1, lateReminderDelay - 1);
                    setLocalDrafts((prev) => ({ ...prev, [lateReminderDelaySetting.key]: nextVal }));
                  }}
                  disabled={lateReminderDelay <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary disabled:opacity-30"
                  aria-label="Decrease Late Reminder Delay"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <div className="flex min-w-[70px] items-center justify-center px-2 font-mono text-sm font-black text-text-primary">
                  <span>{lateReminderDelay}</span>
                  <span className="ms-1 text-xs text-text-muted">
                    {t("notificationsDomain.labels.minutesUnit")}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nextVal = Math.min(60, lateReminderDelay + 1);
                    setLocalDrafts((prev) => ({ ...prev, [lateReminderDelaySetting.key]: nextVal }));
                  }}
                  disabled={lateReminderDelay >= 60}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary disabled:opacity-30"
                  aria-label="Increase Late Reminder Delay"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {isSettingDirty(lateReminderDelaySetting) && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    handleOpenConfirm(lateReminderDelaySetting, lateReminderDelay)
                  }
                  className="h-8 px-3 text-xs font-bold"
                >
                  {t("actions.save")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </SurfaceCard>

      {/* CONFIRMATION & AUDIT REASON MODAL */}
      {activeEditingSetting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border-light bg-surface-primary p-6 shadow-xl dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border-light pb-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-text-primary">
                  {t("notificationsDomain.confirmModal.title")}
                </h3>
                <p className="text-xs text-text-secondary">
                  {activeEditingSetting.setting.key}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveEditingSetting(null)}
                className="rounded-lg p-1 text-text-muted hover:bg-surface-secondary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Operational Alert Warning Banner */}
              <div className="flex gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
                <p>{t("notificationsDomain.confirmModal.warning")}</p>
              </div>

              {/* Before vs Proposed Comparison */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border-light bg-surface-secondary/40 p-3.5 text-xs">
                <div>
                  <span className="text-[11px] font-bold text-text-muted">
                    {t("notificationsDomain.confirmModal.previousValue")}
                  </span>
                  <p className="mt-1 font-mono text-xs font-bold text-text-secondary">
                    {activeEditingSetting.displayPreviousValue}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-primary">
                    {t("notificationsDomain.confirmModal.newValue")}
                  </span>
                  <p className="mt-1 font-mono text-xs font-bold text-primary">
                    {activeEditingSetting.displayProposedValue}
                  </p>
                </div>
              </div>

              {/* Impact Scope Note */}
              <div className="rounded-xl border border-border-light bg-surface-secondary/20 p-3 text-xs leading-relaxed">
                <span className="font-bold text-text-primary">
                  {t("notificationsDomain.confirmModal.impactScope")}{" "}
                </span>
                <span className="text-text-secondary">
                  {t("notificationsDomain.confirmModal.impactText")}
                </span>
              </div>

              {/* Mandatory Reason Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-text-primary">
                  {t("notificationsDomain.confirmModal.reasonLabel")} <span className="text-danger">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("notificationsDomain.confirmModal.reasonPlaceholder")}
                  rows={2}
                  className="app-control w-full rounded-xl border-border-light px-3 py-2 text-xs text-text-primary focus:bg-surface-primary"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-between border-t border-border-light pt-4">
              <div>
                {activeEditingSetting.setting.source === "OVERRIDE" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResetConfirm(activeEditingSetting.setting)}
                    disabled={resetMutation.isPending || !reason.trim()}
                    className="text-xs text-danger hover:bg-danger/10"
                  >
                    <RotateCcw className="me-1 h-3.5 w-3.5" />
                    {t("actions.reset")}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveEditingSetting(null)}
                >
                  {t("notificationsDomain.confirmModal.cancelBtn")}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveConfirm}
                  disabled={!reason.trim() || updateMutation.isPending}
                  className="gap-1.5 font-bold"
                >
                  {updateMutation.isPending && (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {t("notificationsDomain.confirmModal.saveBtn")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
