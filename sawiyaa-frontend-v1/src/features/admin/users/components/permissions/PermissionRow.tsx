"use client";

import { useTranslations } from "next-intl";
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  Check,
  CheckCircle2,
  Sparkles,
  Lock,
  RotateCcw,
  Copy,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";
import { useState } from "react";
import type {
  DensityMode,
  OverrideEffect,
  PermissionRowData,
} from "./permissions.types";
import type { AdminPermissionRisk } from "../../constants/admin-permission-catalog";

export interface PermissionRowProps {
  row: PermissionRowData;
  density: DensityMode;
  isSelected: boolean;
  onToggleSelect: (key: string) => void;
  onChangeEffect: (key: string, nextEffect: OverrideEffect) => void;
  canEdit: boolean;
}

export function PermissionRow({
  row,
  density,
  isSelected,
  onToggleSelect,
  onChangeEffect,
  canEdit,
}: PermissionRowProps) {
  const t = useTranslations("admin-users");
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const label = row.catalogItem
    ? (t as any)(row.catalogItem.labelKey)
    : row.key;

  const description = row.catalogItem
    ? (t as any)(`permissions.modules.${row.catalogItem.module}.description`)
    : row.override?.reason ?? (t as any)("permissions.unknownPermissionDescription");

  const risk: AdminPermissionRisk = row.catalogItem?.risk ?? "normal";

  const handleCopyKey = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(row.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCompact = density === "compact";

  return (
    <>
      {/* Primary Simplified Row */}
      <tr
        onClick={() => setIsExpanded((prev) => !prev)}
        className={`group border-b border-slate-100 transition-colors cursor-pointer dark:border-white/5 ${
          row.isModified
            ? "bg-amber-50/40 dark:bg-amber-950/20"
            : isSelected
            ? "bg-teal-50/40 dark:bg-teal-950/20"
            : "hover:bg-slate-50/70 dark:hover:bg-white/5"
        }`}
      >
        {/* Checkbox & Permission Title (Sticky First Column) */}
        <td
          className={`sticky start-0 z-10 bg-white group-hover:bg-slate-50/90 dark:bg-slate-900 dark:group-hover:bg-slate-850 ${
            row.isModified
              ? "bg-amber-50/60 dark:bg-amber-950/40"
              : isSelected
              ? "bg-teal-50/60 dark:bg-teal-950/40"
              : ""
          } ${isCompact ? "px-3 py-2.5" : "px-3.5 py-3.5"}`}
        >
          <div className="flex items-center gap-2.5">
            {/* Multi-select Checkbox */}
            <input
              type="checkbox"
              checked={isSelected}
              disabled={!canEdit}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleSelect(row.key)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500/20 cursor-pointer disabled:cursor-not-allowed"
            />

            {/* Expand / Collapse Details Chevron */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
              className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 dark:hover:bg-white/10 transition"
              title="عرض التفاصيل الإضافية"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-teal-600" />
              ) : (
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              )}
            </button>

            {/* Title & Key Code */}
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-text-primary dark:text-white leading-snug group-hover:text-teal-600 transition-colors">
                  {label}
                </span>

                {/* Modified Indicator */}
                {row.isModified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-2 py-0.2 text-[9px] font-extrabold text-amber-800 dark:text-amber-300 animate-pulse">
                    تغيير معلق
                  </span>
                ) : null}
              </div>

              {/* Code Key Snippet */}
              <p className="font-mono text-[10px] text-text-muted truncate select-all">
                {row.key}
              </p>
            </div>
          </div>
        </td>

        {/* Effective Access Status Column */}
        <td
          className={`text-center align-middle whitespace-nowrap ${
            isCompact ? "px-3 py-2.5" : "px-3.5 py-3.5"
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            {row.effectiveAllowed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-700 dark:text-emerald-300 shadow-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{(t as any)("permissions.table.effectiveAllow")}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 px-3 py-1 text-xs font-black text-rose-700 dark:text-rose-300 shadow-xs">
                <Lock className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                <span>{(t as any)("permissions.table.effectiveDeny")}</span>
              </span>
            )}

            {/* Custom Override Tag if present */}
            {row.currentDraftEffect === "ALLOW" ? (
              <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                ✨ {(t as any)("permissions.table.explicitAllow")}
              </span>
            ) : row.currentDraftEffect === "DENY" ? (
              <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400">
                🛑 {(t as any)("permissions.table.explicitDeny")}
              </span>
            ) : null}
          </div>
        </td>

        {/* Actions Column (Tri-State Control) */}
        <td
          className={`text-center align-middle whitespace-nowrap ${
            isCompact ? "px-3 py-2.5" : "px-3.5 py-3.5"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/10 shadow-xs">
            {/* Allow Button */}
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => onChangeEffect(row.key, "ALLOW")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                row.currentDraftEffect === "ALLOW"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-text-secondary hover:text-emerald-600 dark:text-slate-300"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={(t as any)("permissions.table.actions.allow")}
            >
              <Check className="h-3 w-3" />
              <span>{(t as any)("permissions.table.actions.allow")}</span>
            </button>

            {/* Deny Button */}
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => onChangeEffect(row.key, "DENY")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                row.currentDraftEffect === "DENY"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-text-secondary hover:text-rose-600 dark:text-slate-300"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={(t as any)("permissions.table.actions.deny")}
            >
              <ShieldAlert className="h-3 w-3" />
              <span>{(t as any)("permissions.table.actions.deny")}</span>
            </button>

            {/* Inherit / Reset Button */}
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => onChangeEffect(row.key, "INHERITED")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                row.currentDraftEffect === "INHERITED"
                  ? "bg-white text-slate-800 shadow-xs dark:bg-slate-800 dark:text-white"
                  : "text-text-muted hover:text-text-primary"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={(t as any)("permissions.table.actions.inherit")}
            >
              <RotateCcw className="h-3 w-3" />
              <span>{(t as any)("permissions.table.actions.inherit")}</span>
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded Technical Details Drawer (Progressive Disclosure) */}
      {isExpanded ? (
        <tr className="bg-slate-50/90 dark:bg-slate-950/60 border-b border-slate-200/60 dark:border-white/10">
          <td colSpan={3} className="px-4 py-3.5">
            <div className="space-y-3 rounded-2xl bg-white p-3.5 border border-slate-200/80 dark:bg-slate-900 dark:border-white/10 shadow-xs text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-teal-600" />
                  <span className="font-bold text-text-primary dark:text-white">
                    التفاصيل الفنية والوراثة
                  </span>
                </div>

                {/* Risk Level Badge */}
                {risk === "critical" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                    <ShieldAlert className="h-3 w-3" />
                    مستوى الخطورة: {(t as any)("permissions.risk.critical")}
                  </span>
                ) : risk === "sensitive" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-3 w-3" />
                    مستوى الخطورة: {(t as any)("permissions.risk.sensitive")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <Shield className="h-3 w-3" />
                    مستوى الخطورة: {(t as any)("permissions.risk.normal")}
                  </span>
                )}
              </div>

              {/* Description */}
              <div>
                <p className="font-bold text-text-muted text-[11px]">الوصف:</p>
                <p className="text-text-primary dark:text-slate-200 leading-relaxed mt-0.5">
                  {description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* Role Default Info */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-2.5 border border-slate-200/60 dark:border-white/5">
                  <p className="font-bold text-text-muted text-[10px] uppercase tracking-wider">
                    افتراضي الدور (Role Inherited):
                  </p>
                  <p className="font-bold text-text-primary dark:text-slate-200 mt-1">
                    {row.defaultChecked
                      ? "✓ متاح تلقائياً عبر أدوار المستخدم"
                      : "− غير محدد في الدور الافتراضي"}
                  </p>
                </div>

                {/* Key Code & Copy */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-2.5 border border-slate-200/60 dark:border-white/5">
                  <p className="font-bold text-text-muted text-[10px] uppercase tracking-wider">
                    رمز المفتاح (Permission Key):
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <code className="font-mono text-xs font-bold text-teal-700 dark:text-teal-400 select-all">
                      {row.key}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 text-[10px] font-bold text-slate-600 hover:text-slate-900 transition"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      <span>{copied ? "تم النسخ" : "نسخ المفتاح"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
