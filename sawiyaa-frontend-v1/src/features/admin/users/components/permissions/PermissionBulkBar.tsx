"use client";

import { useTranslations } from "next-intl";
import { Check, ShieldAlert, RotateCcw, X, Layers } from "lucide-react";

export interface PermissionBulkBarProps {
  selectedCount: number;
  onGrantSelected: () => void;
  onDenySelected: () => void;
  onResetSelected: () => void;
  onClearSelection: () => void;
}

export function PermissionBulkBar({
  selectedCount,
  onGrantSelected,
  onDenySelected,
  onResetSelected,
  onClearSelection,
}: PermissionBulkBarProps) {
  const t = useTranslations("admin-users");

  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-20 z-30 mb-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-500/30 bg-slate-900/95 p-3 text-white shadow-xl backdrop-blur-md dark:bg-slate-950/95">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300">
            <Layers className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-teal-200">
            {t("permissions.table.bulk.selected", { count: selectedCount })}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Grant Selected */}
          <button
            type="button"
            onClick={onGrantSelected}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition active:scale-95"
          >
            <Check className="h-3.5 w-3.5" />
            <span>{t("permissions.table.bulk.grantSelected")}</span>
          </button>

          {/* Deny Selected */}
          <button
            type="button"
            onClick={onDenySelected}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition active:scale-95"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>{t("permissions.table.bulk.denySelected")}</span>
          </button>

          {/* Reset Selected to Role Inherited */}
          <button
            type="button"
            onClick={onResetSelected}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition"
          >
            <RotateCcw className="h-3.5 w-3.5 text-teal-300" />
            <span>{t("permissions.table.bulk.resetSelected")}</span>
          </button>

          {/* Clear Selection */}
          <button
            type="button"
            onClick={onClearSelection}
            className="p-1 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition"
            title={t("permissions.table.bulk.clearSelection")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
