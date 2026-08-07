"use client";

import { useTranslations } from "next-intl";
import { Check, ShieldAlert, Sparkles, Shield, HelpCircle } from "lucide-react";

export function PermissionLegend() {
  const t = useTranslations("admin-users");

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs dark:border-white/10 dark:bg-slate-900/40">
      <div className="flex items-center gap-1.5 font-bold text-text-primary dark:text-white mb-2">
        <HelpCircle className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
        <span>{t("permissions.legend.title")}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
        {/* Role Inherited Granted */}
        <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 p-2 border border-slate-200/60 dark:border-white/5 shadow-xs">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold">
            <Check className="h-3 w-3" />
          </span>
          <span className="font-semibold text-text-primary dark:text-slate-200">
            {t("permissions.legend.inherited")}
          </span>
        </div>

        {/* Role Inherited Denied */}
        <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 p-2 border border-slate-200/60 dark:border-white/5 shadow-xs">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 font-bold">
            −
          </span>
          <span className="font-semibold text-text-secondary dark:text-slate-400">
            {t("permissions.legend.inheritedDeny")}
          </span>
        </div>

        {/* Explicit Allow */}
        <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 p-2 border border-indigo-200/60 dark:border-indigo-900/40 shadow-xs">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold">
            <Sparkles className="h-3 w-3" />
          </span>
          <span className="font-bold text-indigo-700 dark:text-indigo-300">
            {t("permissions.legend.explicitAllow")}
          </span>
        </div>

        {/* Explicit Deny */}
        <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 p-2 border border-rose-200/60 dark:border-rose-900/40 shadow-xs">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-bold">
            <ShieldAlert className="h-3 w-3" />
          </span>
          <span className="font-bold text-rose-700 dark:text-rose-400">
            {t("permissions.legend.explicitDeny")}
          </span>
        </div>
      </div>
    </div>
  );
}
