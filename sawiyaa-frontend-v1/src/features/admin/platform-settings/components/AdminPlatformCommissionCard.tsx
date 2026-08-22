"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Landmark } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import {
  useAdminRevenueShareRules,
  useUpdateAdminRevenueShareRules,
} from "@/features/admin/finance/hooks/use-revenue-share-rules";

function normalizePercent(value: string) {
  if (!value.trim()) return "";
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 100
    ? numeric.toFixed(2)
    : "";
}

export default function AdminPlatformCommissionCard() {
  const t = useTranslations("admin-platform-settings");
  const locale = useLocale();
  const isAr = locale.startsWith("ar");
  const rulesQuery = useAdminRevenueShareRules();
  const updateMutation = useUpdateAdminRevenueShareRules();
  const [platformCommissionPercent, setPlatformCommissionPercent] = useState("");
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<"saved" | "error" | null>(null);

  const item = rulesQuery.data?.item;
  useEffect(() => {
    if (!item) return;
    queueMicrotask(() => {
      setPlatformCommissionPercent(item.platformCommissionPercent ?? "");
      setReason("");
    });
  }, [item]);

  const normalizedPlatform = normalizePercent(platformCommissionPercent);
  const previewPractitioner = useMemo(() => {
    if (!normalizedPlatform) return "—";
    return (100 - Number(normalizedPlatform)).toFixed(2);
  }, [normalizedPlatform]);
  const canSave = Boolean(normalizedPlatform && reason.trim() && !updateMutation.isPending);

  async function save() {
    if (!canSave) return;
    setFeedback(null);
    try {
      await updateMutation.mutateAsync({
        platformCommissionPercent: normalizedPlatform,
        reason: reason.trim(),
        expectedUpdatedAt: item?.expectedUpdatedAt ?? null,
      });
      setFeedback("saved");
    } catch {
      setFeedback("error");
    }
  }

  return (
    <SurfaceCard variant="section" className="border-teal-200/70 dark:border-teal-900/60">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
              {t("commission.eyebrow")}
            </p>
            <h2 className="mt-1 text-lg font-bold text-text-primary">{t("commission.title")}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">{t("commission.description")}</p>
          </div>
        </div>
        {item?.configurationState === "READY" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> {t("commission.ready")}
          </span>
        ) : null}
      </div>

      {item?.configurationState === "REQUIRES_UNIFICATION" ? (
        <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t("commission.mismatch")}</p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-text-primary">{t("commission.platformLabel")}</span>
          <div className="relative">
            <input
              inputMode="decimal"
              value={platformCommissionPercent}
              onChange={(event) => setPlatformCommissionPercent(event.target.value)}
              className="app-control w-full px-4 py-3 pe-12"
              aria-label={t("commission.platformLabel")}
            />
            <span className={`pointer-events-none absolute inset-y-0 ${isAr ? "start-4" : "end-4"} flex items-center text-sm font-bold text-text-muted`}>%</span>
          </div>
        </label>
        <div>
          <span className="mb-2 block text-sm font-semibold text-text-primary">{t("commission.practitionerLabel")}</span>
          <div className="flex min-h-[50px] items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-text-primary dark:border-white/10 dark:bg-white/5">
            <span className="text-xl font-bold">{previewPractitioner}</span>
            <span className="text-sm font-bold text-text-muted">%</span>
          </div>
          <p className="mt-1 text-xs text-text-muted">{t("commission.derivedHint")}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
        <label className="block flex-1">
          <span className="mb-2 block text-sm font-semibold text-text-primary">{t("commission.reasonLabel")}</span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="app-control w-full px-4 py-3"
            placeholder={t("commission.reasonPlaceholder")}
            maxLength={500}
          />
        </label>
        <Button onClick={save} disabled={!canSave}>
          {updateMutation.isPending ? t("commission.saving") : t("commission.save")}
        </Button>
      </div>

      <p className="mt-3 text-xs leading-5 text-text-muted">{t("commission.note")}</p>
      {feedback ? (
        <p className={`mt-3 text-sm font-semibold ${feedback === "saved" ? "text-emerald-700" : "text-error-700"}`} role="status">
          {feedback === "saved" ? t("commission.saved") : t("commission.error")}
        </p>
      ) : null}
    </SurfaceCard>
  );
}
