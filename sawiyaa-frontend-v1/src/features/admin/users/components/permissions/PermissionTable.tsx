"use client";

import { useTranslations } from "next-intl";
import {
  Shield,
  Coins,
  CreditCard,
  RotateCcw,
  Calendar,
  MessageSquare,
  Users,
  HelpCircle,
  UserCheck,
  FileText,
  Bell,
  Layers,
  ChevronDown,
  ChevronUp,
  Check,
  ShieldAlert,
} from "lucide-react";
import { AdminStatusBadge } from "@/components/shared/admin/AdminDashboardKit";
import { PermissionRow } from "./PermissionRow";
import type {
  DensityMode,
  ModuleGroupData,
  OverrideEffect,
} from "./permissions.types";

function getModuleIcon(moduleKey: string) {
  switch (moduleKey) {
    case "adminUsers":
      return Shield;
    case "finance":
      return Coins;
    case "settlements":
    case "payouts":
      return CreditCard;
    case "refunds":
      return RotateCcw;
    case "sessions":
      return Calendar;
    case "careChat":
      return MessageSquare;
    case "patients":
      return Users;
    case "support":
      return HelpCircle;
    case "practitionerApplications":
      return UserCheck;
    case "audit":
      return FileText;
    case "notifications":
      return Bell;
    default:
      return Layers;
  }
}

export interface PermissionTableProps {
  moduleGroups: ModuleGroupData[];
  density: DensityMode;
  selectedKeys: Set<string>;
  onToggleSelectRow: (key: string) => void;
  onToggleSelectModule: (moduleRowsKeys: string[], forceState?: boolean) => void;
  onChangeRowEffect: (key: string, nextEffect: OverrideEffect) => void;
  onModuleBulkEffect: (moduleRowsKeys: string[], effect: OverrideEffect) => void;
  collapsedModules: Set<string>;
  onToggleCollapseModule: (moduleKey: string) => void;
  canEdit: boolean;
}

export function PermissionTable({
  moduleGroups,
  density,
  selectedKeys,
  onToggleSelectRow,
  onToggleSelectModule,
  onChangeRowEffect,
  onModuleBulkEffect,
  collapsedModules,
  onToggleCollapseModule,
  canEdit,
}: PermissionTableProps) {
  const t = useTranslations("admin-users");

  if (moduleGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 text-center shadow-sm">
        <Layers className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
        <h3 className="text-sm font-bold text-text-primary dark:text-white">
          {(t as any)("permissions.page.noMatches")}
        </h3>
        <p className="text-xs text-text-muted mt-1">
          حاول تعديل كلمات البحث أو المرشحات لعرض الصلاحيات.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {moduleGroups.map((group) => {
        const Icon = getModuleIcon(group.module);
        const isCollapsed = collapsedModules.has(group.module);
        const moduleRowKeys = group.rows.map((r) => r.key);
        const isAllModuleSelected =
          moduleRowKeys.length > 0 &&
          moduleRowKeys.every((key) => selectedKeys.has(key));

        return (
          <div
            key={group.module}
            className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-white/10 dark:bg-slate-900 transition-all"
          >
            {/* Module Accordion Header */}
            <div
              onClick={() => onToggleCollapseModule(group.module)}
              className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 hover:bg-slate-100/80 px-4 py-3.5 dark:bg-slate-950/50 dark:hover:bg-slate-950/80 border-b border-slate-200/60 dark:border-white/10 cursor-pointer transition"
            >
              {/* Left: Icon, Module Name & Metrics Summary */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-xs border border-slate-200/80 dark:bg-slate-800 dark:text-teal-400 dark:border-white/10 shrink-0">
                  <Icon className="h-4.5 w-4.5" />
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-black text-text-primary dark:text-white truncate">
                      {group.title}
                    </h3>
                    <span className="rounded-full bg-slate-200/80 dark:bg-white/10 px-2 py-0.2 text-[10px] font-bold text-text-muted">
                      {group.rows.length} صلاحية
                    </span>
                  </div>

                  {/* Clean Summary Metric Pills */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-text-secondary dark:text-slate-400">
                    <span className="text-emerald-700 dark:text-emerald-400">
                      🟢 {group.effectiveAllowedCount} مسموح
                    </span>
                    <span>•</span>
                    <span className="text-rose-700 dark:text-rose-400">
                      🔴 {group.effectiveDeniedCount} محظور
                    </span>
                    {group.modifiedCount > 0 ? (
                      <>
                        <span>•</span>
                        <span className="text-indigo-700 dark:text-indigo-300 font-bold">
                          ✨ {group.modifiedCount} استثناء مخصص
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Right: Quick Module Bulk Controls & Collapse Toggle */}
              <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {canEdit && !isCollapsed ? (
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onModuleBulkEffect(moduleRowKeys, "ALLOW")}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px] font-bold transition border border-emerald-200/60 dark:border-emerald-900/60"
                      title={(t as any)("permissions.table.bulk.moduleAllowAll")}
                    >
                      <Check className="h-3 w-3 inline me-0.5" />
                      <span>سماح للكل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onModuleBulkEffect(moduleRowKeys, "DENY")}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 text-[10px] font-bold transition border border-rose-200/60 dark:border-rose-900/60"
                      title={(t as any)("permissions.table.bulk.moduleDenyAll")}
                    >
                      <ShieldAlert className="h-3 w-3 inline me-0.5" />
                      <span>حظر للكل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onModuleBulkEffect(moduleRowKeys, "INHERITED")}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 text-[10px] font-bold transition border border-slate-200/60 dark:border-white/5"
                      title={(t as any)("permissions.table.bulk.moduleReset")}
                    >
                      <RotateCcw className="h-3 w-3 inline me-0.5" />
                      <span>افتراضي</span>
                    </button>
                  </div>
                ) : null}

                {/* Collapse Toggle Button */}
                <button
                  type="button"
                  onClick={() => onToggleCollapseModule(group.module)}
                  className="p-1.5 rounded-xl hover:bg-slate-200/60 text-text-muted hover:text-text-primary dark:hover:bg-white/10 transition"
                >
                  {isCollapsed ? (
                    <ChevronDown className="h-5 w-5 text-teal-600" />
                  ) : (
                    <ChevronUp className="h-5 w-5 text-slate-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Table Content (Rendered when expanded) */}
            {!isCollapsed ? (
              <div className="no-scrollbar overflow-x-auto">
                <table className="w-full min-w-[650px] border-collapse text-start align-middle">
                  {/* Table Header (3 Columns) */}
                  <thead className="bg-slate-50/90 text-xs font-bold text-text-muted border-b border-slate-200/80 dark:bg-slate-950/80 dark:border-white/10">
                    <tr>
                      {/* Permission Column Header */}
                      <th className="sticky start-0 z-20 bg-slate-50/90 px-4 py-2.5 text-start align-middle dark:bg-slate-950/80 min-w-[280px]">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isAllModuleSelected}
                            disabled={!canEdit}
                            onChange={() => onToggleSelectModule(moduleRowKeys)}
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500/20 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span>{(t as any)("permissions.table.columns.permission")}</span>
                        </div>
                      </th>

                      {/* Status Column Header */}
                      <th className="px-3 py-2.5 text-center align-middle whitespace-nowrap min-w-[140px]">
                        {(t as any)("permissions.table.columns.effective")}
                      </th>

                      {/* Action Column Header */}
                      <th className="px-3 py-2.5 text-center align-middle whitespace-nowrap min-w-[200px]">
                        {(t as any)("permissions.table.columns.control")}
                      </th>
                    </tr>
                  </thead>

                  {/* Table Rows */}
                  <tbody>
                    {group.rows.map((row) => (
                      <PermissionRow
                        key={row.key}
                        row={row}
                        density={density}
                        isSelected={selectedKeys.has(row.key)}
                        onToggleSelect={onToggleSelectRow}
                        onChangeEffect={onChangeRowEffect}
                        canEdit={canEdit}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
