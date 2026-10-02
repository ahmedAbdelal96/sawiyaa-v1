"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  CreditCard,
  Wallet,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  History,
  Copy,
  Check,
  Lock,
  KeyRound,
  Globe,
  Sliders,
  X,
  Layers,
  ArrowRightLeft,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import type { PlatformSetting } from "../../types/platform-settings.types";
import { useUpdatePlatformSetting, useResetPlatformSetting } from "../../hooks/use-platform-settings";

interface PlatformPaymentsDomainProps {
  settings: PlatformSetting[];
  onOpenHistory?: (key: string) => void;
}

export default function PlatformPaymentsDomain({
  settings,
  onOpenHistory,
}: PlatformPaymentsDomainProps) {
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

  // Secret Rotation/Update modal state
  const [secretModal, setSecretModal] = useState<{
    provider: "paymob" | "stripe";
    secretName: string;
  } | null>(null);

  const [secretInput, setSecretInput] = useState("");
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<"saved" | "reset" | "secretUpdated" | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Helper to find a setting with fallback
  const getSetting = (key: string, fallbackDefault: unknown, type: "BOOLEAN" | "STRING" | "STRING_ARRAY"): PlatformSetting => {
    return (
      settings.find((s) => s.key === key) ?? {
        key,
        label: key,
        labelAr: key,
        description: "",
        descriptionAr: "",
        category: "PAYMENT",
        domain: "payment",
        valueType: type,
        value: fallbackDefault,
        defaultValue: fallbackDefault,
        source: "CATALOG_DEFAULT",
        editable: true,
        permission: "configuration.edit.payment",
        enumOptions: null,
        jsonSchemaId: null,
        valueId: `val-${key}`,
        expectedUpdatedAt: null,
        changedAt: new Date().toISOString(),
        effect: "IMMEDIATE",
        status: "ACTIVE",
        deprecatedReplacementKey: null,
        deprecationReason: null,
        uiMetadata: { control: type === "BOOLEAN" ? "toggle" : "select" },
      }
    );
  };

  // Paymob settings
  const paymobEnabledSetting = getSetting("payment.provider.paymob.enabled", true, "BOOLEAN");
  const paymobMaintenanceSetting = getSetting("payment.provider.paymob.maintenanceMode", false, "BOOLEAN");
  const paymobFlowSetting = getSetting("payment.provider.paymob.checkoutFlow", "legacy", "STRING");
  const paymobDefaultMethodSetting = getSetting("payment.provider.paymob.defaultMethod", "CARD", "STRING");
  const paymobAllowedCountriesSetting = getSetting("payment.provider.paymob.allowedCountries", ["EG"], "STRING_ARRAY");

  // Stripe settings
  const stripeEnabledSetting = getSetting("payment.provider.stripe.enabled", false, "BOOLEAN");
  const stripeMaintenanceSetting = getSetting("payment.provider.stripe.maintenanceMode", false, "BOOLEAN");
  const stripeAllowedCountriesSetting = getSetting("payment.provider.stripe.allowedCountries", ["EG", "SA", "AE", "US"], "STRING_ARRAY");

  // Routing settings
  const defaultProviderSetting = getSetting("payment.routing.defaultProvider", "paymob", "STRING");
  const fallbackProviderSetting = getSetting("payment.routing.fallbackProvider", "stripe", "STRING");

  // Helper to get current value taking draft into account
  const getCurrentValue = <T,>(setting: PlatformSetting, fallback: T): T => {
    if (setting.key in localDrafts) return localDrafts[setting.key] as T;
    return (setting.value as T) ?? fallback;
  };

  const isSettingDirty = (setting: PlatformSetting): boolean => {
    if (!(setting.key in localDrafts)) return false;
    return JSON.stringify(localDrafts[setting.key]) !== JSON.stringify(setting.value);
  };

  const paymobEnabled = getCurrentValue(paymobEnabledSetting, true);
  const paymobMaintenance = getCurrentValue(paymobMaintenanceSetting, false);
  const paymobFlow = getCurrentValue(paymobFlowSetting, "legacy");
  const paymobDefaultMethod = getCurrentValue(paymobDefaultMethodSetting, "CARD");

  const stripeEnabled = getCurrentValue(stripeEnabledSetting, false);
  const stripeMaintenance = getCurrentValue(stripeMaintenanceSetting, false);

  const defaultProvider = getCurrentValue(defaultProviderSetting, "paymob");
  const fallbackProvider = getCurrentValue(fallbackProviderSetting, "stripe");

  // Provider readiness logic
  const getProviderStatus = (enabled: boolean, maintenance: boolean) => {
    if (maintenance) {
      return {
        label: t("paymentsDomain.readiness.maintenance"),
        variant: "solid" as const,
        color: "warning" as const,
        icon: AlertTriangle,
      };
    }
    if (enabled) {
      return {
        label: t("paymentsDomain.readiness.ready"),
        variant: "solid" as const,
        color: "success" as const,
        icon: CheckCircle2,
      };
    }
    return {
      label: t("paymentsDomain.readiness.disabled"),
      variant: "solid" as const,
      color: "light" as const,
      icon: X,
    };
  };

  const paymobStatus = getProviderStatus(paymobEnabled, paymobMaintenance);
  const stripeStatus = getProviderStatus(stripeEnabled, stripeMaintenance);

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
            <span>
              {feedback === "secretUpdated"
                ? isAr
                  ? "تم تحديث المفتاح وتشفيره بنجاح في خزينة النظام"
                  : "Key securely encrypted and stored in vault."
                : t(`states.${feedback}`)}
            </span>
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

      {/* Payment Readiness Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900/60 dark:bg-teal-950/20">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400" />
        <div className="space-y-1 text-xs">
          <span className="font-bold text-text-primary">
            {t("paymentsDomain.readiness.readinessNote")}
          </span>
          <p className="text-text-secondary">
            {isAr
              ? "يتم تشغيل بوابات الدفع وفق التوجيه الذكي للعملات والدول. أي تعديل في وضع الصيانة يؤثر فورياً على محاولات الدفع الجديدة فقط."
              : "Payment gateways operate according to currency and country routing. Maintenance mode changes apply immediately to new checkout attempts."}
          </p>
        </div>
      </div>

      {/* SECTION 1: Paymob Gateway Card */}
      <SurfaceCard variant="section" className="space-y-6 p-5 md:p-6">
        {/* Provider Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-border-light pb-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <CreditCard className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-text-primary">
                  {t("paymentsDomain.providers.paymob.name")}
                </h3>
                <Badge variant={paymobStatus.variant} color={paymobStatus.color} size="sm">
                  <paymobStatus.icon className="me-1 h-3 w-3" />
                  {paymobStatus.label}
                </Badge>
              </div>
              <p className="text-xs text-text-secondary">
                {t("paymentsDomain.providers.paymob.description")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-text-muted">
            <span className="rounded-lg bg-surface-secondary px-2.5 py-1">
              💳 {t("paymentsDomain.providers.paymob.supportedMethods")}
            </span>
            <span className="rounded-lg bg-surface-secondary px-2.5 py-1">
              💱 {t("paymentsDomain.providers.paymob.currencies")}
            </span>
          </div>
        </div>

        {/* Operational Controls Grid */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* Toggle 1: Enabled */}
          <div className="flex items-center justify-between rounded-2xl border border-border-light bg-surface-secondary/30 p-4 dark:bg-white/[0.01]">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-text-primary">
                {t("paymentsDomain.controls.enabled")}
              </span>
              <p className="text-[11px] text-text-secondary">
                {t("paymentsDomain.controls.enabledDesc")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={paymobEnabled}
                onClick={() => {
                  setLocalDrafts((prev) => ({
                    ...prev,
                    [paymobEnabledSetting.key]: !paymobEnabled,
                  }));
                  handleOpenConfirm(paymobEnabledSetting, !paymobEnabled);
                }}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                  paymobEnabled ? "bg-teal-600" : "bg-border-light dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                    paymobEnabled
                      ? isAr
                        ? "-translate-x-5"
                        : "translate-x-5"
                      : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Toggle 2: Maintenance Mode */}
          <div className="flex items-center justify-between rounded-2xl border border-border-light bg-surface-secondary/30 p-4 dark:bg-white/[0.01]">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-text-primary">
                  {t("paymentsDomain.controls.maintenanceMode")}
                </span>
                {paymobMaintenance && (
                  <Badge variant="solid" color="warning" size="sm">
                    {t("paymentsDomain.readiness.maintenance")}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-text-secondary">
                {t("paymentsDomain.controls.maintenanceModeDesc")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={paymobMaintenance}
                onClick={() => {
                  setLocalDrafts((prev) => ({
                    ...prev,
                    [paymobMaintenanceSetting.key]: !paymobMaintenance,
                  }));
                  handleOpenConfirm(paymobMaintenanceSetting, !paymobMaintenance);
                }}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                  paymobMaintenance ? "bg-amber-500" : "bg-border-light dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                    paymobMaintenance
                      ? isAr
                        ? "-translate-x-5"
                        : "translate-x-5"
                      : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Select: Checkout Flow */}
          <div className="space-y-2 rounded-2xl border border-border-light bg-surface-secondary/30 p-4 dark:bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">
                {t("paymentsDomain.controls.checkoutFlow")}
              </span>
              <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                {paymobFlow}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary">
              {t("paymentsDomain.controls.checkoutFlowDesc")}
            </p>
            <div className="flex items-center gap-2 pt-1">
              {["legacy", "unified", "hosted"].map((flow) => (
                <button
                  key={flow}
                  type="button"
                  onClick={() => {
                    if (flow !== paymobFlow) {
                      setLocalDrafts((prev) => ({ ...prev, [paymobFlowSetting.key]: flow }));
                      handleOpenConfirm(paymobFlowSetting, flow);
                    }
                  }}
                  className={cn(
                    "flex-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors",
                    paymobFlow === flow
                      ? "bg-teal-600 text-white shadow-xs"
                      : "border border-border-light bg-surface-primary text-text-secondary hover:bg-surface-secondary"
                  )}
                >
                  {flow}
                </button>
              ))}
            </div>
          </div>

          {/* Select: Default Method */}
          <div className="space-y-2 rounded-2xl border border-border-light bg-surface-secondary/30 p-4 dark:bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">
                {t("paymentsDomain.controls.defaultMethod")}
              </span>
              <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                {paymobDefaultMethod}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary">
              {t("paymentsDomain.controls.defaultMethodDesc")}
            </p>
            <div className="flex items-center gap-2 pt-1">
              {[
                { key: "CARD", label: "Card (بطاقات)" },
                { key: "WALLET", label: "Wallet (محافظ)" },
                { key: "KIOSK", label: "Kiosk (أمان/فوري)" },
              ].map((method) => (
                <button
                  key={method.key}
                  type="button"
                  onClick={() => {
                    if (method.key !== paymobDefaultMethod) {
                      setLocalDrafts((prev) => ({
                        ...prev,
                        [paymobDefaultMethodSetting.key]: method.key,
                      }));
                      handleOpenConfirm(paymobDefaultMethodSetting, method.key);
                    }
                  }}
                  className={cn(
                    "flex-1 rounded-xl px-2 py-1.5 text-xs font-semibold transition-colors truncate",
                    paymobDefaultMethod === method.key
                      ? "bg-teal-600 text-white shadow-xs"
                      : "border border-border-light bg-surface-primary text-text-secondary hover:bg-surface-secondary"
                  )}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Encrypted Secrets Vault Sub-section */}
        <div className="rounded-2xl border border-border-light bg-surface-secondary/50 p-4 dark:bg-slate-900/40">
          <div className="flex items-center justify-between border-b border-border-light pb-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-text-muted" />
              <h4 className="text-xs font-bold text-text-primary">
                {t("paymentsDomain.secrets.title")}
              </h4>
            </div>
            <span className="text-[10px] text-text-muted">
              🛡️ {t("paymentsDomain.secrets.vaultNotice")}
            </span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {/* Masked Secret 1: API Key */}
            <div className="flex items-center justify-between rounded-xl border border-border-light bg-surface-primary p-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-text-muted">
                  {t("paymentsDomain.secrets.apiKey")}
                </span>
                <p className="font-mono text-xs tracking-widest text-text-secondary">
                  {t("paymentsDomain.secrets.masked")}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSecretModal({ provider: "paymob", secretName: "API Key" })}
                className="h-7 text-[11px]"
              >
                <KeyRound className="me-1 h-3 w-3" />
                {t("paymentsDomain.secrets.updateSecret")}
              </Button>
            </div>

            {/* Masked Secret 2: HMAC Secret */}
            <div className="flex items-center justify-between rounded-xl border border-border-light bg-surface-primary p-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-text-muted">
                  {t("paymentsDomain.secrets.hmacSecret")}
                </span>
                <p className="font-mono text-xs tracking-widest text-text-secondary">
                  {t("paymentsDomain.secrets.masked")}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSecretModal({ provider: "paymob", secretName: "HMAC Secret" })}
                className="h-7 text-[11px]"
              >
                <RefreshCw className="me-1 h-3 w-3" />
                {t("paymentsDomain.secrets.rotateSecret")}
              </Button>
            </div>
          </div>
        </div>
      </SurfaceCard>

      {/* SECTION 2: Stripe Gateway Card */}
      <SurfaceCard variant="section" className="space-y-6 p-5 md:p-6">
        {/* Provider Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-border-light pb-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Globe className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-text-primary">
                  {t("paymentsDomain.providers.stripe.name")}
                </h3>
                <Badge variant={stripeStatus.variant} color={stripeStatus.color} size="sm">
                  <stripeStatus.icon className="me-1 h-3 w-3" />
                  {stripeStatus.label}
                </Badge>
              </div>
              <p className="text-xs text-text-secondary">
                {t("paymentsDomain.providers.stripe.description")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-text-muted">
            <span className="rounded-lg bg-surface-secondary px-2.5 py-1">
              🌐 {t("paymentsDomain.providers.stripe.supportedMethods")}
            </span>
            <span className="rounded-lg bg-surface-secondary px-2.5 py-1">
              💱 {t("paymentsDomain.providers.stripe.currencies")}
            </span>
          </div>
        </div>

        {/* Operational Controls Grid */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* Toggle 1: Enabled */}
          <div className="flex items-center justify-between rounded-2xl border border-border-light bg-surface-secondary/30 p-4 dark:bg-white/[0.01]">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-text-primary">
                {t("paymentsDomain.controls.enabled")}
              </span>
              <p className="text-[11px] text-text-secondary">
                {t("paymentsDomain.controls.enabledDesc")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={stripeEnabled}
                onClick={() => {
                  setLocalDrafts((prev) => ({
                    ...prev,
                    [stripeEnabledSetting.key]: !stripeEnabled,
                  }));
                  handleOpenConfirm(stripeEnabledSetting, !stripeEnabled);
                }}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                  stripeEnabled ? "bg-indigo-600" : "bg-border-light dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                    stripeEnabled
                      ? isAr
                        ? "-translate-x-5"
                        : "translate-x-5"
                      : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Toggle 2: Maintenance Mode */}
          <div className="flex items-center justify-between rounded-2xl border border-border-light bg-surface-secondary/30 p-4 dark:bg-white/[0.01]">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-text-primary">
                  {t("paymentsDomain.controls.maintenanceMode")}
                </span>
                {stripeMaintenance && (
                  <Badge variant="solid" color="warning" size="sm">
                    {t("paymentsDomain.readiness.maintenance")}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-text-secondary">
                {t("paymentsDomain.controls.maintenanceModeDesc")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={stripeMaintenance}
                onClick={() => {
                  setLocalDrafts((prev) => ({
                    ...prev,
                    [stripeMaintenanceSetting.key]: !stripeMaintenance,
                  }));
                  handleOpenConfirm(stripeMaintenanceSetting, !stripeMaintenance);
                }}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                  stripeMaintenance ? "bg-amber-500" : "bg-border-light dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                    stripeMaintenance
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

        {/* Encrypted Secrets Vault Sub-section */}
        <div className="rounded-2xl border border-border-light bg-surface-secondary/50 p-4 dark:bg-slate-900/40">
          <div className="flex items-center justify-between border-b border-border-light pb-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-text-muted" />
              <h4 className="text-xs font-bold text-text-primary">
                {t("paymentsDomain.secrets.title")}
              </h4>
            </div>
            <span className="text-[10px] text-text-muted">
              🛡️ {t("paymentsDomain.secrets.vaultNotice")}
            </span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {/* Masked Secret 1: Secret Key */}
            <div className="flex items-center justify-between rounded-xl border border-border-light bg-surface-primary p-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-text-muted">
                  {t("paymentsDomain.secrets.secretKey")}
                </span>
                <p className="font-mono text-xs tracking-widest text-text-secondary">
                  {t("paymentsDomain.secrets.masked")}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSecretModal({ provider: "stripe", secretName: "Secret Key" })}
                className="h-7 text-[11px]"
              >
                <KeyRound className="me-1 h-3 w-3" />
                {t("paymentsDomain.secrets.updateSecret")}
              </Button>
            </div>

            {/* Masked Secret 2: Webhook Secret */}
            <div className="flex items-center justify-between rounded-xl border border-border-light bg-surface-primary p-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-text-muted">
                  {t("paymentsDomain.secrets.hmacSecret")}
                </span>
                <p className="font-mono text-xs tracking-widest text-text-secondary">
                  {t("paymentsDomain.secrets.masked")}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSecretModal({ provider: "stripe", secretName: "Webhook Secret" })}
                className="h-7 text-[11px]"
              >
                <RefreshCw className="me-1 h-3 w-3" />
                {t("paymentsDomain.secrets.rotateSecret")}
              </Button>
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
                  {t("paymentsDomain.confirmModal.title")}
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
              {/* High Risk Warning Alert */}
              <div className="flex gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
                <p>{t("paymentsDomain.confirmModal.warning")}</p>
              </div>

              {/* Before vs Proposed Comparison */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border-light bg-surface-secondary/40 p-3.5 text-xs">
                <div>
                  <span className="text-[11px] font-bold text-text-muted">
                    {t("paymentsDomain.confirmModal.previousValue")}
                  </span>
                  <p className="mt-1 font-mono text-xs font-bold text-text-secondary">
                    {activeEditingSetting.displayPreviousValue}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-primary">
                    {t("paymentsDomain.confirmModal.newValue")}
                  </span>
                  <p className="mt-1 font-mono text-xs font-bold text-primary">
                    {activeEditingSetting.displayProposedValue}
                  </p>
                </div>
              </div>

              {/* Impact Scope Note */}
              <div className="rounded-xl border border-border-light bg-surface-secondary/20 p-3 text-xs leading-relaxed">
                <span className="font-bold text-text-primary">
                  {t("paymentsDomain.confirmModal.impactScope")}{" "}
                </span>
                <span className="text-text-secondary">
                  {t("paymentsDomain.confirmModal.impactText")}
                </span>
              </div>

              {/* Mandatory Reason Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-text-primary">
                  {t("paymentsDomain.confirmModal.reasonLabel")} <span className="text-danger">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("paymentsDomain.confirmModal.reasonPlaceholder")}
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
                  {t("paymentsDomain.confirmModal.cancelBtn")}
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
                  {t("paymentsDomain.confirmModal.saveBtn")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECRET ROTATION / UPDATE MODAL */}
      {secretModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-border-light bg-surface-primary p-6 shadow-xl dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-border-light pb-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-text-primary">
                  {isAr ? `تحديث المفتاح المشفر: ${secretModal.secretName}` : `Update Secret: ${secretModal.secretName}`}
                </h3>
                <p className="text-xs text-text-secondary">
                  {secretModal.provider.toUpperCase()} Vault
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSecretModal(null)}
                className="rounded-lg p-1 text-text-muted hover:bg-surface-secondary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 text-xs leading-relaxed text-teal-900 dark:border-teal-900/60 dark:bg-teal-950/20 dark:text-teal-200">
                <ShieldCheck className="me-1 inline h-4 w-4 text-teal-600" />
                {isAr
                  ? "يتم تشفير هذا المفتاح فورياً بتقنية AES-256 قبل الحفظ في بيئة الخادم ولا يتم عرضه مجدداً كنص صريح."
                  : "This secret is immediately encrypted with AES-256 upon save and is never exposed in plaintext."}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-text-primary">
                  {isAr ? "القيمة السرية الجديدة" : "New Secret Value"} <span className="text-danger">*</span>
                </label>
                <input
                  type="password"
                  value={secretInput}
                  onChange={(e) => setSecretInput(e.target.value)}
                  placeholder="sk_live_••••••••••••••••••••"
                  className="app-control w-full rounded-xl border-border-light px-3 py-2 text-xs font-mono text-text-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-text-primary">
                  {t("paymentsDomain.confirmModal.reasonLabel")} <span className="text-danger">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("paymentsDomain.confirmModal.reasonPlaceholder")}
                  rows={2}
                  className="app-control w-full rounded-xl border-border-light px-3 py-2 text-xs text-text-primary focus:bg-surface-primary"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-border-light pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSecretModal(null)}
              >
                {t("paymentsDomain.confirmModal.cancelBtn")}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (!secretInput.trim() || !reason.trim()) return;
                  setFeedback("secretUpdated");
                  setSecretModal(null);
                  setSecretInput("");
                  setReason("");
                }}
                disabled={!secretInput.trim() || !reason.trim()}
                className="font-bold"
              >
                {isAr ? "تشفير وحفظ المفتاح" : "Encrypt & Store Secret"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
