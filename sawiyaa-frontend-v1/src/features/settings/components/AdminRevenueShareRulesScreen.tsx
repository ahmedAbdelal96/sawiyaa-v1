"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { SurfaceCard, SurfaceHeader, SurfaceToolbar, SurfaceActionLink } from "@/components/shared/SurfaceShell";
import {
  useAdminRevenueShareRules,
  useUpdateAdminRevenueShareRules,
} from "@/features/admin/finance/hooks/use-revenue-share-rules";

type FormState = {
  localPlatformRatePercent: string;
  localPractitionerRatePercent: string;
  crossBorderPlatformRatePercent: string;
  crossBorderPractitionerRatePercent: string;
};

function toNumber(value: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizePercent(value: string) {
  const numeric = toNumber(value);
  if (numeric === null) return "";
  return numeric.toFixed(2);
}

export default function AdminRevenueShareRulesScreen() {
  const t = useTranslations("admin-settings");
  const rulesQuery = useAdminRevenueShareRules();
  const updateMutation = useUpdateAdminRevenueShareRules();

  const [form, setForm] = useState<FormState>({
    localPlatformRatePercent: "30.00",
    localPractitionerRatePercent: "70.00",
    crossBorderPlatformRatePercent: "50.00",
    crossBorderPractitionerRatePercent: "50.00",
  });
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );

  useEffect(() => {
    const item = rulesQuery.data?.item;
    if (!item) return;

    const nextForm: FormState = {
      localPlatformRatePercent: item.local.platformRatePercent,
      localPractitionerRatePercent: item.local.practitionerRatePercent,
      crossBorderPlatformRatePercent: item.crossBorder.platformRatePercent,
      crossBorderPractitionerRatePercent: item.crossBorder.practitionerRatePercent,
    };

    queueMicrotask(() => setForm(nextForm));
  }, [rulesQuery.data?.item]);

  const validation = useMemo(() => {
    const localPlatform = toNumber(form.localPlatformRatePercent);
    const localPractitioner = toNumber(form.localPractitionerRatePercent);
    const crossPlatform = toNumber(form.crossBorderPlatformRatePercent);
    const crossPractitioner = toNumber(form.crossBorderPractitionerRatePercent);

    const localValid =
      localPlatform !== null &&
      localPractitioner !== null &&
      localPlatform >= 0 &&
      localPractitioner >= 0 &&
      Math.abs(localPlatform + localPractitioner - 100) < 0.0001;

    const crossValid =
      crossPlatform !== null &&
      crossPractitioner !== null &&
      crossPlatform >= 0 &&
      crossPractitioner >= 0 &&
      Math.abs(crossPlatform + crossPractitioner - 100) < 0.0001;

    return {
      localValid,
      crossValid,
      isValid: localValid && crossValid,
    };
  }, [form]);

  const handleSave = async () => {
    setFeedback(null);
    if (!validation.isValid) {
      setFeedback({ tone: "error", message: t("revenueShare.validation.invalidSplit") });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        localPlatformRatePercent: normalizePercent(form.localPlatformRatePercent),
        localPractitionerRatePercent: normalizePercent(form.localPractitionerRatePercent),
        crossBorderPlatformRatePercent: normalizePercent(form.crossBorderPlatformRatePercent),
        crossBorderPractitionerRatePercent: normalizePercent(form.crossBorderPractitionerRatePercent),
      });
      setFeedback({ tone: "success", message: t("revenueShare.feedback.saved") });
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error && typeof error.message === "string"
          ? error.message
          : t("revenueShare.feedback.saveFailed");
      setFeedback({ tone: "error", message });
    }
  };

  return (
    <div className="space-y-6">
      <SurfaceCard variant="page">
        <SurfaceHeader
          eyebrow={t("revenueShare.eyebrow")}
          title={t("revenueShare.title")}
          description={t("revenueShare.description")}
          actions={
            <>
              <SurfaceActionLink href="/admin/settings" variant="secondary">
                {t("revenueShare.back")}
              </SurfaceActionLink>
              <Button onClick={handleSave} disabled={updateMutation.isPending || !validation.isValid}>
                {updateMutation.isPending ? t("revenueShare.saving") : t("revenueShare.save")}
              </Button>
            </>
          }
        />
      </SurfaceCard>

      <SurfaceToolbar>
        <p className="text-sm text-text-secondary">{t("revenueShare.note")}</p>
      </SurfaceToolbar>

      <div className="grid gap-4 lg:grid-cols-2">
        <SurfaceCard variant="section">
          <h2 className="text-sm font-semibold text-text-primary">{t("revenueShare.local.title")}</h2>
          <p className="mt-1 text-xs text-text-muted">{t("revenueShare.local.hint")}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("revenueShare.platform")}
              </span>
              <input
                inputMode="decimal"
                value={form.localPlatformRatePercent}
                onChange={(e) => setForm((s) => ({ ...s, localPlatformRatePercent: e.target.value }))}
                className="app-control w-full px-4 py-3"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("revenueShare.practitioner")}
              </span>
              <input
                inputMode="decimal"
                value={form.localPractitionerRatePercent}
                onChange={(e) =>
                  setForm((s) => ({ ...s, localPractitionerRatePercent: e.target.value }))
                }
                className="app-control w-full px-4 py-3"
              />
            </label>
          </div>

          {!validation.localValid ? (
            <p className="mt-3 text-sm text-error-600">{t("revenueShare.validation.sumTo100")}</p>
          ) : null}
        </SurfaceCard>

        <SurfaceCard variant="section">
          <h2 className="text-sm font-semibold text-text-primary">{t("revenueShare.crossBorder.title")}</h2>
          <p className="mt-1 text-xs text-text-muted">{t("revenueShare.crossBorder.hint")}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("revenueShare.platform")}
              </span>
              <input
                inputMode="decimal"
                value={form.crossBorderPlatformRatePercent}
                onChange={(e) =>
                  setForm((s) => ({ ...s, crossBorderPlatformRatePercent: e.target.value }))
                }
                className="app-control w-full px-4 py-3"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("revenueShare.practitioner")}
              </span>
              <input
                inputMode="decimal"
                value={form.crossBorderPractitionerRatePercent}
                onChange={(e) =>
                  setForm((s) => ({ ...s, crossBorderPractitionerRatePercent: e.target.value }))
                }
                className="app-control w-full px-4 py-3"
              />
            </label>
          </div>

          {!validation.crossValid ? (
            <p className="mt-3 text-sm text-error-600">{t("revenueShare.validation.sumTo100")}</p>
          ) : null}
        </SurfaceCard>
      </div>

      {feedback ? (
        <SurfaceCard variant="compact" className={feedback.tone === "error" ? "border-error-200" : "border-emerald-200"}>
          <p className={feedback.tone === "error" ? "text-sm text-error-700" : "text-sm text-emerald-700"}>
            {feedback.message}
          </p>
        </SurfaceCard>
      ) : null}
    </div>
  );
}
