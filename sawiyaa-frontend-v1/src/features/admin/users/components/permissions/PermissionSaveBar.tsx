"use client";

import { useTranslations } from "next-intl";
import { RotateCcw, ArrowLeft, Check, RefreshCw, AlertCircle } from "lucide-react";
import Button from "@/components/ui/button/Button";

export interface PermissionSaveBarProps {
  changedCount: number;
  isSaving: boolean;
  error: string | null;
  onReset: () => void;
  onBack: () => void;
  onSave: () => void;
  canEdit: boolean;
}

export function PermissionSaveBar({
  changedCount,
  isSaving,
  error,
  onReset,
  onBack,
  onSave,
  canEdit,
}: PermissionSaveBarProps) {
  const t = useTranslations("admin-users");

  if (!canEdit) return null;

  return (
    <div className="sticky bottom-4 z-40 mt-6 animate-fade-in">
      <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Unsaved Changes Counter & Explainer */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400 border border-teal-200/60 dark:border-teal-900/60">
              <RefreshCw className={`h-5 w-5 ${changedCount > 0 ? "animate-spin text-teal-600" : ""}`} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-text-primary dark:text-white">
                  {changedCount > 0
                    ? t("permissions.page.unsavedChanges", { count: changedCount })
                    : t("permissions.page.noChanges")}
                </p>
                {changedCount > 0 ? (
                  <span className="rounded-full bg-amber-500/20 border border-amber-400/30 px-2 py-0.2 text-[10px] font-extrabold text-amber-800 dark:text-amber-300 animate-pulse">
                    مطلوب حفظ
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-text-secondary dark:text-slate-400 truncate">
                {t("permissions.page.saveHint")}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              startIcon={<RotateCcw className="h-4 w-4" />}
              onClick={onReset}
              disabled={changedCount === 0 || isSaving}
              className="h-10 text-xs font-bold"
            >
              {t("permissions.matrix.toolbar.resetChanges")}
            </Button>

            <Button
              variant="outline"
              startIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={onBack}
              disabled={isSaving}
              className="h-10 text-xs font-bold"
            >
              {t("permissions.page.backToUser")}
            </Button>

            <Button
              onClick={onSave}
              disabled={changedCount === 0 || isSaving}
              className="h-10 px-5 text-xs font-black shadow-md bg-teal-600 hover:bg-teal-700 active:scale-95 transition"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 me-1.5 animate-spin" />
                  <span>{t("permissions.page.saving")}</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 me-1.5" />
                  <span>{t("permissions.page.save")}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error Banner */}
        {error ? (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
