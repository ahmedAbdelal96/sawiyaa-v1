"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Zap,
  Clock,
  Video,
  Layers,
  Sparkles,
  Lock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sliders,
  Plus,
  Minus,
  X,
  RefreshCw,
  History,
  Copy,
  Check,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import type { PlatformSetting } from "../../types/platform-settings.types";
import { useUpdatePlatformSetting, useResetPlatformSetting } from "../../hooks/use-platform-settings";

interface PlatformSessionsDomainProps {
  settings: PlatformSetting[];
  onOpenHistory?: (key: string) => void;
}

export default function PlatformSessionsDomain({
  settings,
  onOpenHistory,
}: PlatformSessionsDomainProps) {
  const t = useTranslations("admin-platform-settings");
  const locale = useLocale();
  const isAr = locale.startsWith("ar");

  const updateMutation = useUpdatePlatformSetting();
  const resetMutation = useResetPlatformSetting();

  // Active modal state for confirmation
  const [activeEditingSetting, setActiveEditingSetting] = useState<PlatformSetting | null>(null);
  const [draftValue, setDraftValue] = useState<unknown>(null);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<"saved" | "reset" | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Local draft values map for inline steppers/toggles
  const [localDrafts, setLocalDrafts] = useState<Record<string, unknown>>({});

  // Helper to get effective value
  const getSetting = (key: string): PlatformSetting | undefined => {
    return settings.find((s) => s.key === key);
  };

  const getEffectiveValue = (key: string): unknown => {
    if (key in localDrafts) return localDrafts[key];
    const s = getSetting(key);
    return s?.value;
  };

  // Check if a setting has dirty unsaved changes
  const isDirty = (key: string): boolean => {
    if (!(key in localDrafts)) return false;
    const s = getSetting(key);
    return localDrafts[key] !== s?.value;
  };

  // Update local draft
  const handleDraftChange = (key: string, val: unknown) => {
    setLocalDrafts((prev) => ({ ...prev, [key]: val }));
  };

  // Open confirmation modal
  const handleOpenConfirm = (setting: PlatformSetting) => {
    const currentVal = getEffectiveValue(setting.key);
    setActiveEditingSetting(setting);
    setDraftValue(currentVal);
    setReason("");
  };

  // Perform Save
  const handleSaveConfirm = async () => {
    if (!activeEditingSetting || !reason.trim()) return;

    try {
      await updateMutation.mutateAsync({
        key: activeEditingSetting.key,
        value: draftValue,
        reason: reason.trim(),
        expectedUpdatedAt: activeEditingSetting.expectedUpdatedAt,
      });

      // Clear local draft for this key
      setLocalDrafts((prev) => {
        const next = { ...prev };
        delete next[activeEditingSetting.key];
        return next;
      });

      setFeedback("saved");
      setActiveEditingSetting(null);
    } catch {
      // Error handled by mutation
    }
  };

  // Reset to default
  const handleReset = async (setting: PlatformSetting) => {
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

  // Copy Key Helper
  const handleCopyKey = (key: string) => {
    void navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Target Key References
  const instantTtlSetting = getSetting("INSTANT_BOOKING_REQUEST_TTL_MINUTES");
  const instantPaymentSetting = getSetting("INSTANT_BOOKING_PAYMENT_WINDOW_MINUTES");
  const earlyJoinSetting = getSetting("SESSION_JOIN_EARLY_MINUTES");
  const afterEndSetting = getSetting("SESSION_JOIN_AFTER_END_GRACE_MINUTES");
  const packagesEnabledSetting = getSetting("packages.enabled");
  const packagesPurchaseSetting = getSetting("packages.purchaseEnabled");

  // Fallback other session settings (if any exist beyond the 6 primary ones)
  const otherSessionSettings = useMemo(() => {
    const knownKeys = new Set([
      "INSTANT_BOOKING_REQUEST_TTL_MINUTES",
      "INSTANT_BOOKING_PAYMENT_WINDOW_MINUTES",
      "SESSION_JOIN_EARLY_MINUTES",
      "SESSION_JOIN_AFTER_END_GRACE_MINUTES",
      "packages.enabled",
      "packages.purchaseEnabled",
    ]);
    return settings.filter((s) => !knownKeys.has(s.key));
  }, [settings]);

  // Stepper helper
  const renderNumberStepper = (
    setting: PlatformSetting,
    min: number,
    max: number,
    step: number,
    unit: string,
    riskBadge?: string
  ) => {
    const currentValue = Number(getEffectiveValue(setting.key) ?? setting.value ?? min);
    const hasChanges = isDirty(setting.key);
    const isOverridden = setting.source === "OVERRIDE";

    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {/* Stepper Controls */}
            <div className="inline-flex items-center rounded-xl border border-border-light bg-surface-secondary/60 p-1 dark:bg-white/[0.03]">
              <button
                type="button"
                onClick={() => {
                  const next = Math.max(min, currentValue - step);
                  handleDraftChange(setting.key, next);
                }}
                disabled={currentValue <= min}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary disabled:opacity-30"
                aria-label="Decrease"
              >
                <Minus className="h-4 w-4" />
              </button>

              <div className="flex min-w-[70px] items-center justify-center px-2 font-mono text-sm font-black text-text-primary">
                <span>{currentValue}</span>
                <span className="ms-1 text-xs font-normal text-text-muted">{unit}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = Math.min(max, currentValue + step);
                  handleDraftChange(setting.key, next);
                }}
                disabled={currentValue >= max}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary disabled:opacity-30"
                aria-label="Increase"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <span className="text-[11px] text-text-muted">
              ({min} - {max} {unit})
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenConfirm(setting)}
                className="h-8 px-3 text-xs font-bold"
              >
                {t("actions.save")}
              </Button>
            )}
            {!hasChanges && isOverridden && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleDraftChange(setting.key, setting.defaultValue);
                  handleOpenConfirm(setting);
                }}
                className="h-8 text-xs text-text-muted hover:text-text-primary"
              >
                <RotateCcw className="me-1 h-3 w-3" />
                {t("actions.reset")}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Switch Toggle helper
  const renderToggle = (setting: PlatformSetting) => {
    const currentValue = Boolean(getEffectiveValue(setting.key));
    const hasChanges = isDirty(setting.key);

    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={currentValue ? t("editor.booleanEnabled") : t("editor.booleanDisabled")}
            onClick={() => handleDraftChange(setting.key, !currentValue)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
              currentValue ? "bg-primary" : "bg-border-strong"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out",
                currentValue
                  ? isAr
                    ? "-translate-x-5"
                    : "translate-x-5"
                  : "translate-x-0"
              )}
            />
          </button>

          <span className="text-xs font-bold text-text-primary">
            {currentValue ? t("editor.booleanEnabled") : t("editor.booleanDisabled")}
          </span>
        </div>

        {hasChanges && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenConfirm(setting)}
            className="h-8 px-3 text-xs font-bold"
          >
            {t("actions.save")}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Feedback Toast Banner */}
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

      {/* SECTION 1: Instant Booking SLAs */}
      {(instantTtlSetting || instantPaymentSetting) && (
        <SurfaceCard variant="section" className="space-y-5 p-5 md:p-6">
          <div className="flex items-start justify-between border-b border-border-light pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  {t("sessionsDomain.sections.instantBooking.title")}
                </h3>
                <p className="text-xs text-text-secondary">
                  {t("sessionsDomain.sections.instantBooking.description")}
                </p>
              </div>
            </div>

            <Badge variant="light" color="warning" size="sm">
              {t("sessionsDomain.items.instantRequestTtl.risk")}
            </Badge>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Setting 1: Instant Request Response TTL */}
            {instantTtlSetting && (
              <div className="flex flex-col justify-between rounded-2xl border border-border-light bg-surface-secondary/30 p-4 transition-all hover:border-border-strong dark:bg-white/[0.01]">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">
                        {t("sessionsDomain.items.instantRequestTtl.title")}
                      </h4>
                      <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                        {t("sessionsDomain.items.instantRequestTtl.description")}
                      </p>
                    </div>

                    {instantTtlSetting.source === "OVERRIDE" && (
                      <Badge variant="light" color="warning" size="sm">
                        {t("states.changed")}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-[11px] text-amber-700 dark:text-amber-400">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("sessionsDomain.items.instantRequestTtl.impact")}</span>
                  </div>
                </div>

                <div className="mt-4 border-t border-border-light pt-3">
                  {renderNumberStepper(
                    instantTtlSetting,
                    instantTtlSetting.minimum ?? 1,
                    instantTtlSetting.maximum ?? 30,
                    1,
                    t("sessionsDomain.items.instantRequestTtl.unit")
                  )}

                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-text-muted">
                    <button
                      type="button"
                      onClick={() => handleCopyKey(instantTtlSetting.key)}
                      className="group inline-flex items-center gap-1 font-mono hover:text-text-primary"
                    >
                      <span>{instantTtlSetting.key}</span>
                      {copiedKey === instantTtlSetting.key ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                      )}
                    </button>

                    {onOpenHistory && (
                      <button
                        type="button"
                        onClick={() => onOpenHistory(instantTtlSetting.key)}
                        className="inline-flex items-center gap-1 hover:text-text-primary"
                      >
                        <History className="h-3 w-3" />
                        <span>{t("actions.history")}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Setting 2: Instant Payment Window */}
            {instantPaymentSetting && (
              <div className="flex flex-col justify-between rounded-2xl border border-border-light bg-surface-secondary/30 p-4 transition-all hover:border-border-strong dark:bg-white/[0.01]">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">
                        {t("sessionsDomain.items.instantPaymentWindow.title")}
                      </h4>
                      <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                        {t("sessionsDomain.items.instantPaymentWindow.description")}
                      </p>
                    </div>

                    {instantPaymentSetting.source === "OVERRIDE" && (
                      <Badge variant="light" color="warning" size="sm">
                        {t("states.changed")}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-[11px] text-amber-700 dark:text-amber-400">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("sessionsDomain.items.instantPaymentWindow.impact")}</span>
                  </div>
                </div>

                <div className="mt-4 border-t border-border-light pt-3">
                  {renderNumberStepper(
                    instantPaymentSetting,
                    instantPaymentSetting.minimum ?? 1,
                    instantPaymentSetting.maximum ?? 30,
                    1,
                    t("sessionsDomain.items.instantPaymentWindow.unit")
                  )}

                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-text-muted">
                    <button
                      type="button"
                      onClick={() => handleCopyKey(instantPaymentSetting.key)}
                      className="group inline-flex items-center gap-1 font-mono hover:text-text-primary"
                    >
                      <span>{instantPaymentSetting.key}</span>
                      {copiedKey === instantPaymentSetting.key ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                      )}
                    </button>

                    {onOpenHistory && (
                      <button
                        type="button"
                        onClick={() => onOpenHistory(instantPaymentSetting.key)}
                        className="inline-flex items-center gap-1 hover:text-text-primary"
                      >
                        <History className="h-3 w-3" />
                        <span>{t("actions.history")}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </SurfaceCard>
      )}

      {/* SECTION 2: Room Access & Reconnect Buffers */}
      {(earlyJoinSetting || afterEndSetting) && (
        <SurfaceCard variant="section" className="space-y-5 p-5 md:p-6">
          <div className="flex items-start justify-between border-b border-border-light pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  {t("sessionsDomain.sections.roomAccess.title")}
                </h3>
                <p className="text-xs text-text-secondary">
                  {t("sessionsDomain.sections.roomAccess.description")}
                </p>
              </div>
            </div>

            <Badge variant="light" color="dark" size="sm">
              {t("sessionsDomain.items.earlyJoin.risk")}
            </Badge>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Setting 3: Early Join Window */}
            {earlyJoinSetting && (
              <div className="flex flex-col justify-between rounded-2xl border border-border-light bg-surface-secondary/30 p-4 transition-all hover:border-border-strong dark:bg-white/[0.01]">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">
                        {t("sessionsDomain.items.earlyJoin.title")}
                      </h4>
                      <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                        {t("sessionsDomain.items.earlyJoin.description")}
                      </p>
                    </div>

                    {earlyJoinSetting.source === "OVERRIDE" && (
                      <Badge variant="light" color="warning" size="sm">
                        {t("states.changed")}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-[11px] text-blue-700 dark:text-blue-400">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("sessionsDomain.items.earlyJoin.impact")}</span>
                  </div>
                </div>

                <div className="mt-4 border-t border-border-light pt-3">
                  {renderNumberStepper(
                    earlyJoinSetting,
                    earlyJoinSetting.minimum ?? 0,
                    earlyJoinSetting.maximum ?? 120,
                    5,
                    t("sessionsDomain.items.earlyJoin.unit")
                  )}

                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-text-muted">
                    <button
                      type="button"
                      onClick={() => handleCopyKey(earlyJoinSetting.key)}
                      className="group inline-flex items-center gap-1 font-mono hover:text-text-primary"
                    >
                      <span>{earlyJoinSetting.key}</span>
                      {copiedKey === earlyJoinSetting.key ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                      )}
                    </button>

                    {onOpenHistory && (
                      <button
                        type="button"
                        onClick={() => onOpenHistory(earlyJoinSetting.key)}
                        className="inline-flex items-center gap-1 hover:text-text-primary"
                      >
                        <History className="h-3 w-3" />
                        <span>{t("actions.history")}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Setting 4: After End Grace Period */}
            {afterEndSetting && (
              <div className="flex flex-col justify-between rounded-2xl border border-border-light bg-surface-secondary/30 p-4 transition-all hover:border-border-strong dark:bg-white/[0.01]">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">
                        {t("sessionsDomain.items.afterEndGrace.title")}
                      </h4>
                      <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                        {t("sessionsDomain.items.afterEndGrace.description")}
                      </p>
                    </div>

                    {afterEndSetting.source === "OVERRIDE" && (
                      <Badge variant="light" color="warning" size="sm">
                        {t("states.changed")}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-[11px] text-blue-700 dark:text-blue-400">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("sessionsDomain.items.afterEndGrace.impact")}</span>
                  </div>
                </div>

                <div className="mt-4 border-t border-border-light pt-3">
                  {renderNumberStepper(
                    afterEndSetting,
                    afterEndSetting.minimum ?? 0,
                    afterEndSetting.maximum ?? 120,
                    5,
                    t("sessionsDomain.items.afterEndGrace.unit")
                  )}

                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-text-muted">
                    <button
                      type="button"
                      onClick={() => handleCopyKey(afterEndSetting.key)}
                      className="group inline-flex items-center gap-1 font-mono hover:text-text-primary"
                    >
                      <span>{afterEndSetting.key}</span>
                      {copiedKey === afterEndSetting.key ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                      )}
                    </button>

                    {onOpenHistory && (
                      <button
                        type="button"
                        onClick={() => onOpenHistory(afterEndSetting.key)}
                        className="inline-flex items-center gap-1 hover:text-text-primary"
                      >
                        <History className="h-3 w-3" />
                        <span>{t("actions.history")}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </SurfaceCard>
      )}

      {/* SECTION 3: Package Plans */}
      {(packagesEnabledSetting || packagesPurchaseSetting) && (
        <SurfaceCard variant="section" className="space-y-5 p-5 md:p-6">
          <div className="flex items-start justify-between border-b border-border-light pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  {t("sessionsDomain.sections.packages.title")}
                </h3>
                <p className="text-xs text-text-secondary">
                  {t("sessionsDomain.sections.packages.description")}
                </p>
              </div>
            </div>

            <Badge variant="light" color="light" size="sm">
              {t("domains.sessions")}
            </Badge>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Setting 5: Packages Enabled */}
            {packagesEnabledSetting && (
              <div className="flex flex-col justify-between rounded-2xl border border-border-light bg-surface-secondary/30 p-4 transition-all hover:border-border-strong dark:bg-white/[0.01]">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">
                        {t("sessionsDomain.items.packagesEnabled.title")}
                      </h4>
                      <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                        {t("sessionsDomain.items.packagesEnabled.description")}
                      </p>
                    </div>

                    {packagesEnabledSetting.source === "OVERRIDE" && (
                      <Badge variant="light" color="warning" size="sm">
                        {t("states.changed")}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-[11px] text-purple-700 dark:text-purple-400">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("sessionsDomain.items.packagesEnabled.impact")}</span>
                  </div>
                </div>

                <div className="mt-4 border-t border-border-light pt-3">
                  {renderToggle(packagesEnabledSetting)}

                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-text-muted">
                    <button
                      type="button"
                      onClick={() => handleCopyKey(packagesEnabledSetting.key)}
                      className="group inline-flex items-center gap-1 font-mono hover:text-text-primary"
                    >
                      <span>{packagesEnabledSetting.key}</span>
                      {copiedKey === packagesEnabledSetting.key ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                      )}
                    </button>

                    {onOpenHistory && (
                      <button
                        type="button"
                        onClick={() => onOpenHistory(packagesEnabledSetting.key)}
                        className="inline-flex items-center gap-1 hover:text-text-primary"
                      >
                        <History className="h-3 w-3" />
                        <span>{t("actions.history")}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Setting 6: Package Purchases Enabled */}
            {packagesPurchaseSetting && (
              <div className="flex flex-col justify-between rounded-2xl border border-border-light bg-surface-secondary/30 p-4 transition-all hover:border-border-strong dark:bg-white/[0.01]">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">
                        {t("sessionsDomain.items.packagesPurchaseEnabled.title")}
                      </h4>
                      <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                        {t("sessionsDomain.items.packagesPurchaseEnabled.description")}
                      </p>
                    </div>

                    {packagesPurchaseSetting.source === "OVERRIDE" && (
                      <Badge variant="light" color="warning" size="sm">
                        {t("states.changed")}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-[11px] text-purple-700 dark:text-purple-400">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("sessionsDomain.items.packagesPurchaseEnabled.impact")}</span>
                  </div>
                </div>

                <div className="mt-4 border-t border-border-light pt-3">
                  {renderToggle(packagesPurchaseSetting)}

                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-text-muted">
                    <button
                      type="button"
                      onClick={() => handleCopyKey(packagesPurchaseSetting.key)}
                      className="group inline-flex items-center gap-1 font-mono hover:text-text-primary"
                    >
                      <span>{packagesPurchaseSetting.key}</span>
                      {copiedKey === packagesPurchaseSetting.key ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                      )}
                    </button>

                    {onOpenHistory && (
                      <button
                        type="button"
                        onClick={() => onOpenHistory(packagesPurchaseSetting.key)}
                        className="inline-flex items-center gap-1 hover:text-text-primary"
                      >
                        <History className="h-3 w-3" />
                        <span>{t("actions.history")}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </SurfaceCard>
      )}

      {/* Other Session-Related Settings (if any exist) */}
      {otherSessionSettings.length > 0 && (
        <SurfaceCard variant="section" className="space-y-4 p-5">
          <h4 className="text-sm font-bold text-text-primary">
            {isAr ? "إعدادات إضافية للجلسات" : "Additional Session Settings"}
          </h4>
          <div className="grid gap-3.5 sm:grid-cols-2">
            {otherSessionSettings.map((s) => (
              <div
                key={s.key}
                className="rounded-xl border border-border-light bg-surface-secondary/40 p-3.5 text-xs"
              >
                <p className="font-bold text-text-primary">{isAr ? s.labelAr : s.label}</p>
                <p className="text-text-muted mt-1">{String(s.value)}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>
      )}

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
                  {t("sessionsDomain.confirmModal.title")}
                </h3>
                <p className="text-xs text-text-secondary">
                  {isAr ? (activeEditingSetting.labelAr || activeEditingSetting.label) : activeEditingSetting.label}
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
              {/* High Risk Alert Banner */}
              {activeEditingSetting.key.startsWith("INSTANT_BOOKING") && (
                <div className="flex gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
                  <p>{t("sessionsDomain.confirmModal.highRiskWarning")}</p>
                </div>
              )}

              {/* Before vs After Summary */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border-light bg-surface-secondary/40 p-3 text-xs">
                <div>
                  <span className="text-[11px] font-bold text-text-muted">
                    {t("sessionsDomain.confirmModal.previousValue")}
                  </span>
                  <p className="mt-1 font-mono text-sm font-black text-text-secondary">
                    {typeof activeEditingSetting.value === "boolean"
                      ? activeEditingSetting.value
                        ? t("editor.booleanEnabled")
                        : t("editor.booleanDisabled")
                      : `${activeEditingSetting.value} ${activeEditingSetting.key.includes("MINUTES") ? (isAr ? "دقيقة" : "min") : ""}`}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-primary">
                    {t("sessionsDomain.confirmModal.newValue")}
                  </span>
                  <p className="mt-1 font-mono text-sm font-black text-primary">
                    {typeof draftValue === "boolean"
                      ? draftValue
                        ? t("editor.booleanEnabled")
                        : t("editor.booleanDisabled")
                      : `${draftValue} ${activeEditingSetting.key.includes("MINUTES") ? (isAr ? "دقيقة" : "min") : ""}`}
                  </p>
                </div>
              </div>

              {/* Impact Scope Note */}
              <div className="rounded-xl border border-border-light bg-surface-secondary/20 p-3 text-xs">
                <span className="font-bold text-text-primary">
                  {t("sessionsDomain.confirmModal.impactScope")}{" "}
                </span>
                <span className="text-text-secondary">
                  {activeEditingSetting.effect === "NEW_SESSIONS_ONLY"
                    ? isAr
                      ? "يطبق على الجلسات المجدولة الجديدة فقط ولن يغير الجلسات الحالية."
                      : "Applies to new scheduled sessions only and will not alter existing sessions."
                    : isAr
                      ? "يطبق بأثر فوري على كافة طلبات الجلسات الفورية الجديدة."
                      : "Applies immediately to all new instant session requests."}
                </span>
              </div>

              {/* Mandatory Reason Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-text-primary">
                  {t("sessionsDomain.confirmModal.reasonLabel")} <span className="text-danger">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("sessionsDomain.confirmModal.reasonPlaceholder")}
                  rows={2}
                  className="app-control w-full rounded-xl border-border-light px-3 py-2 text-xs text-text-primary focus:bg-surface-primary"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-between border-t border-border-light pt-4">
              <div>
                {activeEditingSetting.source === "OVERRIDE" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReset(activeEditingSetting)}
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
                  {t("sessionsDomain.confirmModal.cancelBtn")}
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
                  {t("sessionsDomain.confirmModal.saveBtn")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
