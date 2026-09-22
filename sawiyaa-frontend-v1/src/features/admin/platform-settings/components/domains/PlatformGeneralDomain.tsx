"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Globe2,
  Building2,
  UserCheck,
  ShieldCheck,
  Clock,
  KeyRound,
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
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import type { PlatformSetting } from "../../types/platform-settings.types";
import { useUpdatePlatformSetting, useResetPlatformSetting } from "../../hooks/use-platform-settings";

interface PlatformGeneralDomainProps {
  settings: PlatformSetting[];
  onOpenHistory?: (key: string) => void;
}

export default function PlatformGeneralDomain({
  settings,
  onOpenHistory,
}: PlatformGeneralDomainProps) {
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
    type: "BOOLEAN" | "NUMBER" | "STRING",
    category = "SYSTEM"
  ): PlatformSetting => {
    return (
      settings.find((s) => s.key === key) ?? {
        key,
        label: key,
        labelAr: key,
        description: "",
        descriptionAr: "",
        category,
        domain: "platform",
        valueType: type,
        value: fallbackDefault,
        defaultValue: fallbackDefault,
        source: "CATALOG_DEFAULT",
        editable: true,
        permission: "configuration.edit.system",
        enumOptions: null,
        jsonSchemaId: null,
        valueId: `val-${key}`,
        expectedUpdatedAt: null,
        changedAt: new Date().toISOString(),
        effect: "IMMEDIATE",
        status: "ACTIVE",
        deprecatedReplacementKey: null,
        deprecationReason: null,
        uiMetadata: { control: type === "BOOLEAN" ? "toggle" : type === "NUMBER" ? "integer" : "select" },
      }
    );
  };

  // General Settings
  const defaultLocaleSetting = getSetting("platform.defaultLocale", "ar", "STRING", "LOCALE");
  const adminReviewSetting = getSetting("features.practitionerApplicationAdminReviewEnabled", true, "BOOLEAN", "SYSTEM");
  const jwtTtlSetting = getSetting("security.jwt.accessTokenTtlMinutes", 30, "NUMBER", "SECURITY");
  const loginOtpTtlSetting = getSetting("auth.otp.loginTtlMinutes", 10, "NUMBER", "SECURITY");
  const resetOtpTtlSetting = getSetting("auth.passwordReset.otpTtlMinutes", 15, "NUMBER", "SECURITY");

  // Helpers to get draft or current value
  const getCurrentValue = <T,>(setting: PlatformSetting, fallback: T): T => {
    if (setting.key in localDrafts) return localDrafts[setting.key] as T;
    return (setting.value as T) ?? fallback;
  };

  const isSettingDirty = (setting: PlatformSetting): boolean => {
    if (!(setting.key in localDrafts)) return false;
    return JSON.stringify(localDrafts[setting.key]) !== JSON.stringify(setting.value);
  };

  const defaultLocale = getCurrentValue(defaultLocaleSetting, "ar");
  const adminReview = getCurrentValue(adminReviewSetting, true);
  const jwtTtl = getCurrentValue(jwtTtlSetting, 30);
  const loginOtpTtl = getCurrentValue(loginOtpTtlSetting, 10);
  const resetOtpTtl = getCurrentValue(resetOtpTtlSetting, 15);

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

  // Helper Stepper for duration settings in minutes
  const renderDurationStepper = (
    setting: PlatformSetting,
    currentMinutes: number,
    label: string,
    description: string,
    min = 1,
    max = 60
  ) => {
    const isDirty = isSettingDirty(setting);

    return (
      <div className="space-y-3 rounded-2xl border border-border-light bg-surface-secondary/30 p-4 dark:bg-white/[0.01]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-primary">{label}</span>
          <span className="font-mono text-xs font-bold text-primary">
            {currentMinutes} {t("generalDomain.labels.minutesUnit")}
          </span>
        </div>
        <p className="text-[11px] text-text-secondary">{description}</p>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="inline-flex items-center rounded-xl border border-border-light bg-surface-secondary/60 p-1 dark:bg-white/[0.03]">
            <button
              type="button"
              onClick={() => {
                const nextVal = Math.max(min, currentMinutes - 1);
                setLocalDrafts((prev) => ({ ...prev, [setting.key]: nextVal }));
              }}
              disabled={currentMinutes <= min}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary disabled:opacity-30"
              aria-label={`Decrease ${label}`}
            >
              <Minus className="h-4 w-4" />
            </button>

            <div className="flex min-w-[70px] items-center justify-center px-2 font-mono text-sm font-black text-text-primary">
              <span>{currentMinutes}</span>
              <span className="ms-1 text-xs text-text-muted">{t("generalDomain.labels.minutesUnit")}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                const nextVal = Math.min(max, currentMinutes + 1);
                setLocalDrafts((prev) => ({ ...prev, [setting.key]: nextVal }));
              }}
              disabled={currentMinutes >= max}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary disabled:opacity-30"
              aria-label={`Increase ${label}`}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {isDirty && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenConfirm(setting, currentMinutes)}
              className="h-8 px-3 text-xs font-bold"
            >
              {t("actions.save")}
            </Button>
          )}
        </div>
      </div>
    );
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

      {/* SECTION 1: Platform Identity */}
      <SurfaceCard variant="section" className="space-y-5 p-5 md:p-6">
        <div className="flex items-start justify-between border-b border-border-light pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                {t("generalDomain.sections.identity.title")}
              </h3>
              <p className="text-xs text-text-secondary">
                {t("generalDomain.sections.identity.description")}
              </p>
            </div>
          </div>

          <Badge variant="solid" color="primary" size="sm">
            <Sparkles className="me-1 h-3 w-3" />
            Healthcare Core
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border-light bg-surface-secondary/40 p-4">
            <span className="text-[11px] font-bold text-text-muted">
              {t("generalDomain.labels.platformName")}
            </span>
            <p className="mt-1 text-sm font-bold text-text-primary">
              {t("generalDomain.labels.platformNameVal")}
            </p>
          </div>

          <div className="rounded-2xl border border-border-light bg-surface-secondary/40 p-4">
            <span className="text-[11px] font-bold text-text-muted">
              {t("generalDomain.labels.platformTagline")}
            </span>
            <p className="mt-1 text-xs text-text-secondary">
              {t("generalDomain.labels.platformTaglineVal")}
            </p>
          </div>
        </div>
      </SurfaceCard>

      {/* SECTION 2: Regional & Localization Preferences */}
      <SurfaceCard variant="section" className="space-y-5 p-5 md:p-6">
        <div className="flex items-start justify-between border-b border-border-light pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                {t("generalDomain.sections.localization.title")}
              </h3>
              <p className="text-xs text-text-secondary">
                {t("generalDomain.sections.localization.description")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Default Language Selector */}
          <div className="space-y-3 rounded-2xl border border-border-light bg-surface-secondary/30 p-4 dark:bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">
                {t("generalDomain.labels.defaultLocale")}
              </span>
              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {defaultLocale === "ar" ? t("generalDomain.labels.arabicLocale") : t("generalDomain.labels.englishLocale")}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary">
              {t("generalDomain.labels.defaultLocaleDesc")}
            </p>

            <div className="flex items-center gap-2 pt-1">
              {[
                { key: "ar", label: t("generalDomain.labels.arabicLocale") },
                { key: "en", label: t("generalDomain.labels.englishLocale") },
              ].map((loc) => (
                <button
                  key={loc.key}
                  type="button"
                  onClick={() => {
                    if (loc.key !== defaultLocale) {
                      setLocalDrafts((prev) => ({ ...prev, [defaultLocaleSetting.key]: loc.key }));
                      handleOpenConfirm(defaultLocaleSetting, loc.key);
                    }
                  }}
                  className={cn(
                    "flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors",
                    defaultLocale === loc.key
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "border border-border-light bg-surface-primary text-text-secondary hover:bg-surface-secondary"
                  )}
                >
                  {loc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timezone Preference Card */}
          <div className="space-y-2 rounded-2xl border border-border-light bg-surface-secondary/30 p-4 dark:bg-white/[0.01]">
            <span className="text-xs font-bold text-text-primary">
              {t("generalDomain.labels.timezone")}
            </span>
            <p className="text-[11px] text-text-secondary">
              {isAr
                ? "التوقيت المعتمد للجدولة وحساب مواعيد الجلسات والرسائل التذكيرية."
                : "Operational timezone used for booking calendars and countdown timers."}
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center rounded-xl border border-border-light bg-surface-primary px-3 py-1.5 font-mono text-xs font-bold text-text-primary shadow-2xs">
                🕒 {t("generalDomain.labels.timezoneVal")}
              </span>
            </div>
          </div>
        </div>
      </SurfaceCard>

      {/* SECTION 3: Practitioner Governance */}
      <SurfaceCard variant="section" className="space-y-5 p-5 md:p-6">
        <div className="flex items-start justify-between border-b border-border-light pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                {t("generalDomain.sections.practitioners.title")}
              </h3>
              <p className="text-xs text-text-secondary">
                {t("generalDomain.sections.practitioners.description")}
              </p>
            </div>
          </div>

          <Badge variant="solid" color={adminReview ? "success" : "warning"} size="sm">
            {adminReview
              ? t("generalDomain.labels.adminReviewActive")
              : t("generalDomain.labels.adminReviewBypass")}
          </Badge>
        </div>

        <div className="rounded-2xl border border-border-light bg-surface-secondary/30 p-4 dark:bg-white/[0.01]">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-text-primary">
                {t("generalDomain.labels.adminReview")}
              </span>
              <p className="text-[11px] text-text-secondary">
                {t("generalDomain.labels.adminReviewDesc")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={adminReview}
                onClick={() => {
                  setLocalDrafts((prev) => ({
                    ...prev,
                    [adminReviewSetting.key]: !adminReview,
                  }));
                  handleOpenConfirm(adminReviewSetting, !adminReview);
                }}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                  adminReview ? "bg-teal-600" : "bg-border-light dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                    adminReview
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

      {/* SECTION 4: Security & Session Policies */}
      <SurfaceCard variant="section" className="space-y-5 p-5 md:p-6">
        <div className="flex items-start justify-between border-b border-border-light pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                {t("generalDomain.sections.security.title")}
              </h3>
              <p className="text-xs text-text-secondary">
                {t("generalDomain.sections.security.description")}
              </p>
            </div>
          </div>

          <Badge variant="solid" color="warning" size="sm">
            {isAr ? "سياسات الأمان" : "Security Limits"}
          </Badge>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {renderDurationStepper(
            jwtTtlSetting,
            jwtTtl,
            t("generalDomain.labels.jwtTtl"),
            t("generalDomain.labels.jwtTtlDesc"),
            5,
            120
          )}

          {renderDurationStepper(
            loginOtpTtlSetting,
            loginOtpTtl,
            t("generalDomain.labels.loginOtpTtl"),
            t("generalDomain.labels.loginOtpTtlDesc"),
            1,
            30
          )}

          {renderDurationStepper(
            resetOtpTtlSetting,
            resetOtpTtl,
            t("generalDomain.labels.resetOtpTtl"),
            t("generalDomain.labels.resetOtpTtlDesc"),
            1,
            60
          )}
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
                  {t("generalDomain.confirmModal.title")}
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
              {/* Risk Warning Alert */}
              <div className="flex gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
                <p>{t("generalDomain.confirmModal.warning")}</p>
              </div>

              {/* Before vs Proposed Comparison */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border-light bg-surface-secondary/40 p-3.5 text-xs">
                <div>
                  <span className="text-[11px] font-bold text-text-muted">
                    {t("generalDomain.confirmModal.previousValue")}
                  </span>
                  <p className="mt-1 font-mono text-xs font-bold text-text-secondary">
                    {activeEditingSetting.displayPreviousValue}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-primary">
                    {t("generalDomain.confirmModal.newValue")}
                  </span>
                  <p className="mt-1 font-mono text-xs font-bold text-primary">
                    {activeEditingSetting.displayProposedValue}
                  </p>
                </div>
              </div>

              {/* Impact Scope Note */}
              <div className="rounded-xl border border-border-light bg-surface-secondary/20 p-3 text-xs leading-relaxed">
                <span className="font-bold text-text-primary">
                  {t("generalDomain.confirmModal.impactScope")}{" "}
                </span>
                <span className="text-text-secondary">
                  {t("generalDomain.confirmModal.impactText")}
                </span>
              </div>

              {/* Mandatory Reason Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-text-primary">
                  {t("generalDomain.confirmModal.reasonLabel")} <span className="text-danger">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("generalDomain.confirmModal.reasonPlaceholder")}
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
                  {t("generalDomain.confirmModal.cancelBtn")}
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
                  {t("generalDomain.confirmModal.saveBtn")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
