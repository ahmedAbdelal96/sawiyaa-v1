"use client";

import { ArrowLeft, ArrowRight, CreditCard, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SurfaceCard, SurfaceHeader } from "@/components/shared/SurfaceShell";
import { usePlatformSettings, useUpdatePlatformSetting } from "../hooks/use-platform-settings";
import AdminManualPaymentsScreen from "@/features/admin/manual-payments/components/AdminManualPaymentsScreen";
import AdminPaymentGatewayControlScreen from "@/features/admin/payment-gateway-control/components/AdminPaymentGatewayControlScreen";

export type PaymentSettingsTab = "automatic" | "manual";

const MANUAL_PAYMENT_ENABLED_DOMAINS_KEY = "payments.manualPayment.enabledDomains";

type Props = {
  activeTab: PaymentSettingsTab;
};

export default function PaymentSettingsScreen({ activeTab }: Props) {
  const locale = useLocale();
  const t = useTranslations("admin-platform-settings");
  const manualT = useTranslations("admin-manual-payments");
  const isAr = locale.startsWith("ar");
  const settingsQuery = usePlatformSettings({ domain: "paymentsFinance" });
  const updateSetting = useUpdatePlatformSetting();
  const setting = settingsQuery.data?.settings.find(
    (item) => item.key === MANUAL_PAYMENT_ENABLED_DOMAINS_KEY,
  );
  const enabledDomains = Array.isArray(setting?.value)
    ? setting.value.filter((value): value is string => typeof value === "string")
    : [];
  const academyEnabled = enabledDomains.includes("ACADEMY");
  const canEditAcademy = setting?.capabilities?.canEdit === true;

  const toggleAcademy = async () => {
    if (!setting || !canEditAcademy || updateSetting.isPending) return;
    const nextValue = academyEnabled
      ? enabledDomains.filter((domain) => domain !== "ACADEMY")
      : [...enabledDomains, "ACADEMY"];
    await updateSetting.mutateAsync({
      key: setting.key,
      value: nextValue,
      reason: isAr
        ? "تحديث إتاحة الدفع اليدوي للتدريب من إعدادات الدفع"
        : "Update Academy manual payment availability from Payment Settings",
      expectedUpdatedAt: setting.expectedUpdatedAt,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <SurfaceHeader
        eyebrow={t("paymentsSettings.eyebrow")}
        title={t("paymentsSettings.title")}
        description={t("paymentsSettings.description")}
        actions={
          <Link
            href="/admin/platform-settings"
            className="inline-flex items-center gap-2 rounded-full border border-border-light px-4 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-primary/40 hover:text-primary"
          >
            {isAr ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            {t("paymentsSettings.backToDirectory")}
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2" role="tablist" aria-label={t("paymentsSettings.title")}>
        {([
          ["automatic", t("paymentsSettings.automaticTab"), CreditCard],
          ["manual", t("paymentsSettings.manualTab"), ShieldCheck],
        ] as const).map(([tab, label, Icon]) => (
          <Link
            key={tab}
            href={`/admin/platform-settings/payments?tab=${tab}`}
            role="tab"
            aria-selected={activeTab === tab}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${activeTab === tab ? "border-primary bg-primary text-white" : "border-border-light bg-surface-primary text-text-secondary hover:border-primary/40 hover:text-primary"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>

      {settingsQuery.isLoading ? (
        <SurfaceCard variant="section" className="p-10 text-center text-sm text-text-secondary">
          {t("paymentsSettings.loading")}
        </SurfaceCard>
      ) : settingsQuery.isError ? (
        <SurfaceCard variant="section" className="p-10 text-center text-sm text-danger">
          {t("paymentsSettings.error")}
        </SurfaceCard>
      ) : activeTab === "automatic" ? (
        <AdminPaymentGatewayControlScreen />
      ) : (
        <div className="space-y-6">
          <SurfaceCard as="section" variant="section" className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {t("paymentsSettings.manualAvailability")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                {t("paymentsSettings.manualAvailabilityDescription")}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-light bg-surface-primary p-4">
              <div className="min-w-0">
                <p className="font-semibold text-text-primary">
                  {t("paymentsSettings.academyLabel")}
                </p>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
                  {t("paymentsSettings.academyDescription")}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={academyEnabled}
                aria-label={t("paymentsSettings.academyLabel")}
                disabled={!canEditAcademy || updateSetting.isPending}
                onClick={() => void toggleAcademy().catch(() => undefined)}
                className={`inline-flex min-w-28 items-center justify-center rounded-full px-4 py-2 text-sm font-bold transition-colors ${academyEnabled ? "bg-success text-white" : "bg-surface-tertiary text-text-secondary"} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {updateSetting.isPending
                  ? "…"
                  : academyEnabled
                    ? t("paymentsSettings.enabled")
                    : t("paymentsSettings.disabled")}
              </button>
            </div>
            {!canEditAcademy ? (
              <p className="text-sm text-text-muted">
                {t("paymentsSettings.managedByPermission")}
              </p>
            ) : null}
            {updateSetting.isError ? (
              <p className="text-sm text-danger">{t("paymentsSettings.saveError")}</p>
            ) : null}
          </SurfaceCard>

          <SurfaceCard as="section" variant="section" className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">
                  {manualT("methods")}
                </h2>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  {t("paymentsSettings.manualMethodsDescription")}
                </p>
              </div>
              <Link
                href="/admin/manual-payments"
                className="text-sm font-semibold text-primary hover:underline"
              >
                {t("paymentsSettings.reviewQueue")}
              </Link>
            </div>
            <AdminManualPaymentsScreen mode="configuration" embedded />
          </SurfaceCard>
        </div>
      )}
    </div>
  );
}
