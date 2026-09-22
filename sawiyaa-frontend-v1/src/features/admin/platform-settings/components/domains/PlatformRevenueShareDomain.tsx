"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Landmark,
  Coins,
  Globe2,
  MapPin,
  ShieldAlert,
  Info,
  CheckCircle2,
  RotateCcw,
  Plus,
  Minus,
  X,
  RefreshCw,
  History,
  Copy,
  Check,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import type { PlatformSetting } from "../../types/platform-settings.types";
import { useUpdatePlatformSetting, useResetPlatformSetting } from "../../hooks/use-platform-settings";
import AdminPlatformCommissionCard from "../AdminPlatformCommissionCard";

interface PlatformRevenueShareDomainProps {
  settings: PlatformSetting[];
  onOpenHistory?: (key: string) => void;
}

export default function PlatformRevenueShareDomain({
  settings,
  onOpenHistory,
}: PlatformRevenueShareDomainProps) {
  const t = useTranslations("admin-platform-settings");
  const locale = useLocale();
  const isAr = locale.startsWith("ar");

  const updateMutation = useUpdatePlatformSetting();
  const resetMutation = useResetPlatformSetting();

  // Active confirmation modal
  const [activeEditingSetting, setActiveEditingSetting] = useState<{
    setting: PlatformSetting;
    targetField: "practitioner" | "platform";
    proposedPractitionerShare: number;
    proposedPlatformShare: number;
  } | null>(null);

  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<"saved" | "reset" | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Local drafts: stores practitioner share as stored in backend
  const [localDrafts, setLocalDrafts] = useState<Record<string, number>>({});

  const effectiveSameCountrySetting: PlatformSetting = useMemo(() => {
    return (
      settings.find((s) => s.key === "finance.practitionerSharePercent.sameCountry") ?? {
        key: "finance.practitionerSharePercent.sameCountry",
        label: "Practitioner Share Percent (Same Country)",
        labelAr: "نسبة حصة الممارس للجلسات المحلية",
        description: "Practitioner revenue share percentage for same-country patient sessions.",
        descriptionAr: "النسبة المخصصة للممارس عندما يكون المريض والممارس داخل نفس الدولة.",
        category: "PAYOUT",
        domain: "finance",
        valueType: "NUMBER",
        value: 70,
        defaultValue: 70,
        source: "CATALOG_DEFAULT",
        minimum: 0,
        maximum: 100,
        editable: true,
        permission: "configuration.edit.financial",
        enumOptions: null,
        jsonSchemaId: null,
        valueId: "val-same-country",
        expectedUpdatedAt: null,
        changedAt: new Date().toISOString(),
        effect: "NEW_SESSIONS_ONLY",
        status: "ACTIVE",
        deprecatedReplacementKey: null,
        deprecationReason: null,
        uiMetadata: { control: "percentage" },
      }
    );
  }, [settings]);

  const effectiveCrossCountrySetting: PlatformSetting = useMemo(() => {
    return (
      settings.find((s) => s.key === "finance.practitionerSharePercent.crossCountry") ?? {
        key: "finance.practitionerSharePercent.crossCountry",
        label: "Practitioner Share Percent (Cross Country)",
        labelAr: "نسبة حصة الممارس للجلسات عابرة للحدود",
        description: "Practitioner revenue share percentage for cross-country patient sessions.",
        descriptionAr: "النسبة المخصصة للممارس عندما يكون المريض والممارس في دولتين مختلفتين.",
        category: "PAYOUT",
        domain: "finance",
        valueType: "NUMBER",
        value: 50,
        defaultValue: 50,
        source: "CATALOG_DEFAULT",
        minimum: 0,
        maximum: 100,
        editable: true,
        permission: "configuration.edit.financial",
        enumOptions: null,
        jsonSchemaId: null,
        valueId: "val-cross-country",
        expectedUpdatedAt: null,
        changedAt: new Date().toISOString(),
        effect: "NEW_SESSIONS_ONLY",
        status: "ACTIVE",
        deprecatedReplacementKey: null,
        deprecationReason: null,
        uiMetadata: { control: "percentage" },
      }
    );
  }, [settings]);

  // Helper to get effective practitioner share (0-100)
  const getPractitionerShare = (setting: PlatformSetting, fallback = 70): number => {
    if (setting.key in localDrafts) return localDrafts[setting.key];
    const val = Number(setting.value);
    return Number.isFinite(val) ? val : fallback;
  };

  const localPractitionerShare = getPractitionerShare(effectiveSameCountrySetting, 70);
  const localPlatformShare = Math.max(0, Math.min(100, 100 - localPractitionerShare));

  const crossPractitionerShare = getPractitionerShare(effectiveCrossCountrySetting, 50);
  const crossPlatformShare = Math.max(0, Math.min(100, 100 - crossPractitionerShare));

  // Check if setting is dirty
  const isSettingDirty = (setting: PlatformSetting): boolean => {
    if (!(setting.key in localDrafts)) return false;
    return localDrafts[setting.key] !== Number(setting.value);
  };

  const handlePlatformShareChange = (setting: PlatformSetting, newPlatformShare: number) => {
    const clampedPlatform = Math.max(0, Math.min(100, newPlatformShare));
    const newPractitionerShare = 100 - clampedPlatform;
    setLocalDrafts((prev) => ({ ...prev, [setting.key]: newPractitionerShare }));
  };

  const handleOpenConfirm = (setting: PlatformSetting) => {
    const practitionerShare = getPractitionerShare(setting, 70);
    const platformShare = 100 - practitionerShare;

    setActiveEditingSetting({
      setting,
      targetField: "platform",
      proposedPractitionerShare: practitionerShare,
      proposedPlatformShare: platformShare,
    });
    setReason("");
  };

  const handleSaveConfirm = async () => {
    if (!activeEditingSetting || !reason.trim()) return;

    try {
      await updateMutation.mutateAsync({
        key: activeEditingSetting.setting.key,
        value: activeEditingSetting.proposedPractitionerShare,
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

      {/* SECTION 1: Local Sessions Revenue Share */}
      {effectiveSameCountrySetting && (
        <SurfaceCard variant="section" className="space-y-5 p-5 md:p-6">
          <div className="flex items-start justify-between border-b border-border-light pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  {t("revenueShareDomain.sections.local.title")}
                </h3>
                <p className="text-xs text-text-secondary">
                  {t("revenueShareDomain.sections.local.description")}
                </p>
              </div>
            </div>

            <Badge variant="solid" color="warning" size="sm">
              {t("revenueShareDomain.labels.highRiskBadge")}
            </Badge>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Split Controls */}
            <div className="space-y-4 rounded-2xl border border-border-light bg-surface-secondary/30 p-4 dark:bg-white/[0.01]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {t("revenueShareDomain.labels.platformShare")}
                </span>
                <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                  {localPlatformShare.toFixed(1)}%
                </span>
              </div>

              {/* Stepper for Platform Share */}
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-xl border border-border-light bg-surface-secondary/60 p-1 dark:bg-white/[0.03]">
                  <button
                    type="button"
                    onClick={() =>
                      handlePlatformShareChange(
                        effectiveSameCountrySetting,
                        Math.max(0, localPlatformShare - 1)
                      )
                    }
                    disabled={localPlatformShare <= 0}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary disabled:opacity-30"
                    aria-label="Decrease Local Platform Share"
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <div className="flex min-w-[80px] items-center justify-center px-2 font-mono text-base font-black text-text-primary">
                    <span>{localPlatformShare}</span>
                    <span className="ms-1 text-xs text-text-muted">%</span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handlePlatformShareChange(
                        effectiveSameCountrySetting,
                        Math.min(100, localPlatformShare + 1)
                      )
                    }
                    disabled={localPlatformShare >= 100}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary disabled:opacity-30"
                    aria-label="Increase Local Platform Share"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="text-end">
                  <span className="text-[11px] font-bold text-text-muted">
                    {t("revenueShareDomain.labels.practitionerShare")}
                  </span>
                  <p className="font-mono text-base font-black text-indigo-600 dark:text-indigo-400">
                    {localPractitionerShare.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border-light pt-3">
                <span className="text-[11px] text-text-muted">
                  {t("revenueShareDomain.labels.derivedNotice")}
                </span>

                <div className="flex items-center gap-2">
                  {isSettingDirty(effectiveSameCountrySetting) ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenConfirm(effectiveSameCountrySetting)}
                      className="h-8 px-3 text-xs font-bold"
                    >
                      {t("actions.save")}
                    </Button>
                  ) : (
                    effectiveSameCountrySetting.source === "OVERRIDE" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setLocalDrafts((prev) => ({
                            ...prev,
                            [effectiveSameCountrySetting.key]: Number(effectiveSameCountrySetting.defaultValue),
                          }));
                          handleOpenConfirm(effectiveSameCountrySetting);
                        }}
                        className="h-8 text-xs text-text-muted hover:text-text-primary"
                      >
                        <RotateCcw className="me-1 h-3 w-3" />
                        {t("actions.reset")}
                      </Button>
                    )
                  )}
                </div>
              </div>

              {/* Key metadata footer */}
              <div className="flex items-center justify-between text-[10px] text-text-muted">
                <button
                  type="button"
                  onClick={() => handleCopyKey(effectiveSameCountrySetting.key)}
                  className="group inline-flex items-center gap-1 font-mono hover:text-text-primary"
                >
                  <span>{effectiveSameCountrySetting.key}</span>
                  {copiedKey === effectiveSameCountrySetting.key ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                  )}
                </button>

                {onOpenHistory && (
                  <button
                    type="button"
                    onClick={() => onOpenHistory(effectiveSameCountrySetting.key)}
                    className="inline-flex items-center gap-1 hover:text-text-primary"
                  >
                    <History className="h-3 w-3" />
                    <span>{t("actions.history")}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Visual Split Simulation Card (1000 EGP Example) */}
            <div className="space-y-4 rounded-2xl border border-teal-200/60 bg-teal-50/20 p-4 dark:border-teal-900/40 dark:bg-teal-950/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary">
                  {t("revenueShareDomain.sections.simulation.title")}
                </span>
                <span className="rounded-md bg-teal-500/10 px-2 py-0.5 text-[11px] font-bold text-teal-700 dark:text-teal-300">
                  {t("revenueShareDomain.sections.simulation.exampleAmount")}
                </span>
              </div>

              {/* Dual Visual Progress Split */}
              <div className="space-y-1.5">
                <div className="flex h-4 w-full overflow-hidden rounded-full bg-border-light">
                  <div
                    style={{ width: `${localPlatformShare}%` }}
                    className="bg-teal-600 transition-all duration-300 dark:bg-teal-500"
                  />
                  <div
                    style={{ width: `${localPractitionerShare}%` }}
                    className="bg-indigo-600 transition-all duration-300 dark:bg-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-teal-700 dark:text-teal-300">
                    {t("revenueShareDomain.sections.simulation.platformCut")}: {localPlatformShare}%
                  </span>
                  <span className="text-indigo-700 dark:text-indigo-300">
                    {t("revenueShareDomain.sections.simulation.practitionerCut")}: {localPractitionerShare}%
                  </span>
                </div>
              </div>

              {/* Financial Calculation Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl border border-teal-300/40 bg-white/70 p-3 dark:border-teal-900/40 dark:bg-black/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                    {t("revenueShareDomain.sections.simulation.platformCut")}
                  </span>
                  <p className="mt-1 font-mono text-lg font-black text-teal-800 dark:text-teal-200">
                    {((1000 * localPlatformShare) / 100).toFixed(0)} EGP
                  </p>
                </div>

                <div className="rounded-xl border border-indigo-300/40 bg-white/70 p-3 dark:border-indigo-900/40 dark:bg-black/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                    {t("revenueShareDomain.sections.simulation.practitionerCut")}
                  </span>
                  <p className="mt-1 font-mono text-lg font-black text-indigo-800 dark:text-indigo-200">
                    {((1000 * localPractitionerShare) / 100).toFixed(0)} EGP
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SurfaceCard>
      )}

      {/* SECTION 2: Cross-Border Sessions Revenue Share */}
      {effectiveCrossCountrySetting && (
        <SurfaceCard variant="section" className="space-y-5 p-5 md:p-6">
          <div className="flex items-start justify-between border-b border-border-light pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Globe2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  {t("revenueShareDomain.sections.crossBorder.title")}
                </h3>
                <p className="text-xs text-text-secondary">
                  {t("revenueShareDomain.sections.crossBorder.description")}
                </p>
              </div>
            </div>

            <Badge variant="solid" color="warning" size="sm">
              {t("revenueShareDomain.labels.highRiskBadge")}
            </Badge>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Split Controls */}
            <div className="space-y-4 rounded-2xl border border-border-light bg-surface-secondary/30 p-4 dark:bg-white/[0.01]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {t("revenueShareDomain.labels.platformShare")}
                </span>
                <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                  {crossPlatformShare.toFixed(1)}%
                </span>
              </div>

              {/* Stepper for Cross-Border Platform Share */}
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-xl border border-border-light bg-surface-secondary/60 p-1 dark:bg-white/[0.03]">
                  <button
                    type="button"
                    onClick={() =>
                      handlePlatformShareChange(
                        effectiveCrossCountrySetting,
                        Math.max(0, crossPlatformShare - 1)
                      )
                    }
                    disabled={crossPlatformShare <= 0}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary disabled:opacity-30"
                    aria-label="Decrease Cross-Border Platform Share"
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <div className="flex min-w-[80px] items-center justify-center px-2 font-mono text-base font-black text-text-primary">
                    <span>{crossPlatformShare}</span>
                    <span className="ms-1 text-xs text-text-muted">%</span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handlePlatformShareChange(
                        effectiveCrossCountrySetting,
                        Math.min(100, crossPlatformShare + 1)
                      )
                    }
                    disabled={crossPlatformShare >= 100}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary disabled:opacity-30"
                    aria-label="Increase Cross-Border Platform Share"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="text-end">
                  <span className="text-[11px] font-bold text-text-muted">
                    {t("revenueShareDomain.labels.practitionerShare")}
                  </span>
                  <p className="font-mono text-base font-black text-indigo-600 dark:text-indigo-400">
                    {crossPractitionerShare.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border-light pt-3">
                <span className="text-[11px] text-text-muted">
                  {t("revenueShareDomain.labels.derivedNotice")}
                </span>

                <div className="flex items-center gap-2">
                  {isSettingDirty(effectiveCrossCountrySetting) ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenConfirm(effectiveCrossCountrySetting)}
                      className="h-8 px-3 text-xs font-bold"
                    >
                      {t("actions.save")}
                    </Button>
                  ) : (
                    effectiveCrossCountrySetting.source === "OVERRIDE" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setLocalDrafts((prev) => ({
                            ...prev,
                            [effectiveCrossCountrySetting.key]: Number(effectiveCrossCountrySetting.defaultValue),
                          }));
                          handleOpenConfirm(effectiveCrossCountrySetting);
                        }}
                        className="h-8 text-xs text-text-muted hover:text-text-primary"
                      >
                        <RotateCcw className="me-1 h-3 w-3" />
                        {t("actions.reset")}
                      </Button>
                    )
                  )}
                </div>
              </div>

              {/* Key metadata footer */}
              <div className="flex items-center justify-between text-[10px] text-text-muted">
                <button
                  type="button"
                  onClick={() => handleCopyKey(effectiveCrossCountrySetting.key)}
                  className="group inline-flex items-center gap-1 font-mono hover:text-text-primary"
                >
                  <span>{effectiveCrossCountrySetting.key}</span>
                  {copiedKey === effectiveCrossCountrySetting.key ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                  )}
                </button>

                {onOpenHistory && (
                  <button
                    type="button"
                    onClick={() => onOpenHistory(effectiveCrossCountrySetting.key)}
                    className="inline-flex items-center gap-1 hover:text-text-primary"
                  >
                    <History className="h-3 w-3" />
                    <span>{t("actions.history")}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Visual Split Simulation Card (Cross-Border Example) */}
            <div className="space-y-4 rounded-2xl border border-indigo-200/60 bg-indigo-50/20 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary">
                  {t("revenueShareDomain.sections.simulation.title")}
                </span>
                <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                  {t("revenueShareDomain.sections.simulation.exampleAmount")}
                </span>
              </div>

              {/* Dual Visual Progress Split */}
              <div className="space-y-1.5">
                <div className="flex h-4 w-full overflow-hidden rounded-full bg-border-light">
                  <div
                    style={{ width: `${crossPlatformShare}%` }}
                    className="bg-teal-600 transition-all duration-300 dark:bg-teal-500"
                  />
                  <div
                    style={{ width: `${crossPractitionerShare}%` }}
                    className="bg-indigo-600 transition-all duration-300 dark:bg-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-teal-700 dark:text-teal-300">
                    {t("revenueShareDomain.sections.simulation.platformCut")}: {crossPlatformShare}%
                  </span>
                  <span className="text-indigo-700 dark:text-indigo-300">
                    {t("revenueShareDomain.sections.simulation.practitionerCut")}: {crossPractitionerShare}%
                  </span>
                </div>
              </div>

              {/* Financial Calculation Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl border border-teal-300/40 bg-white/70 p-3 dark:border-teal-900/40 dark:bg-black/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                    {t("revenueShareDomain.sections.simulation.platformCut")}
                  </span>
                  <p className="mt-1 font-mono text-lg font-black text-teal-800 dark:text-teal-200">
                    {((1000 * crossPlatformShare) / 100).toFixed(0)} EGP
                  </p>
                </div>

                <div className="rounded-xl border border-indigo-300/40 bg-white/70 p-3 dark:border-indigo-900/40 dark:bg-black/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                    {t("revenueShareDomain.sections.simulation.practitionerCut")}
                  </span>
                  <p className="mt-1 font-mono text-lg font-black text-indigo-800 dark:text-indigo-200">
                    {((1000 * crossPractitionerShare) / 100).toFixed(0)} EGP
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SurfaceCard>
      )}

      {/* SECTION 3: Unified Authoritative Platform Commission Rule */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-border-light pb-2">
          <Landmark className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <h3 className="text-sm font-bold text-text-primary">
            {isAr ? "القاعدة المالية الموحدة لعمولة المنصة" : "Unified Platform Commission Rule"}
          </h3>
        </div>
        <AdminPlatformCommissionCard />
      </div>

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
                  {t("revenueShareDomain.confirmModal.title")}
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
              {/* High Financial Risk Warning Alert */}
              <div className="flex gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
                <p>{t("revenueShareDomain.confirmModal.warning")}</p>
              </div>

              {/* Before vs After Percentage Comparison */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border-light bg-surface-secondary/40 p-3.5 text-xs">
                <div>
                  <span className="text-[11px] font-bold text-text-muted">
                    {t("revenueShareDomain.confirmModal.previousValue")}
                  </span>
                  <div className="mt-1 space-y-0.5 font-mono text-xs text-text-secondary">
                    <p>
                      {t("revenueShareDomain.labels.platformShare")}:{" "}
                      <span className="font-bold">
                        {(100 - Number(activeEditingSetting.setting.value)).toFixed(1)}%
                      </span>
                    </p>
                    <p>
                      {t("revenueShareDomain.labels.practitionerShare")}:{" "}
                      <span className="font-bold">
                        {Number(activeEditingSetting.setting.value).toFixed(1)}%
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-primary">
                    {t("revenueShareDomain.confirmModal.newValue")}
                  </span>
                  <div className="mt-1 space-y-0.5 font-mono text-xs text-primary">
                    <p>
                      {t("revenueShareDomain.labels.platformShare")}:{" "}
                      <span className="font-bold">
                        {activeEditingSetting.proposedPlatformShare.toFixed(1)}%
                      </span>
                    </p>
                    <p>
                      {t("revenueShareDomain.labels.practitionerShare")}:{" "}
                      <span className="font-bold">
                        {activeEditingSetting.proposedPractitionerShare.toFixed(1)}%
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Impact Scope Note */}
              <div className="rounded-xl border border-border-light bg-surface-secondary/20 p-3 text-xs leading-relaxed">
                <span className="font-bold text-text-primary">
                  {t("revenueShareDomain.confirmModal.impactScope")}{" "}
                </span>
                <span className="text-text-secondary">
                  {t("revenueShareDomain.confirmModal.impactText")}
                </span>
              </div>

              {/* Mandatory Reason Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-text-primary">
                  {t("revenueShareDomain.confirmModal.reasonLabel")} <span className="text-danger">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("revenueShareDomain.confirmModal.reasonPlaceholder")}
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
                  {t("revenueShareDomain.confirmModal.cancelBtn")}
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
                  {t("revenueShareDomain.confirmModal.saveBtn")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
