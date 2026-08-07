"use client";

import { useTranslations } from "next-intl";
import {
  Search,
  Filter,
  SlidersHorizontal,
  RotateCcw,
  Maximize2,
  Minimize2,
  HelpCircle,
  X,
  Layers,
  ShieldAlert,
} from "lucide-react";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import type {
  DensityMode,
  RiskFilterValue,
  StateFilterValue,
} from "./permissions.types";
import { ADMIN_PERMISSION_GROUP_ORDER } from "../../constants/admin-permission-catalog";

export interface PermissionToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  moduleFilter: string;
  onModuleFilterChange: (value: string) => void;
  stateFilter: StateFilterValue;
  onStateFilterChange: (value: StateFilterValue) => void;
  riskFilter: RiskFilterValue;
  onRiskFilterChange: (value: RiskFilterValue) => void;
  density: DensityMode;
  onDensityChange: (mode: DensityMode) => void;
  isAllCollapsed: boolean;
  onToggleCollapseAll: () => void;
  showLegend: boolean;
  onToggleLegend: () => void;
  hasChanges: boolean;
  onResetChanges: () => void;
  canEdit: boolean;
}

export function PermissionToolbar({
  search,
  onSearchChange,
  moduleFilter,
  onModuleFilterChange,
  stateFilter,
  onStateFilterChange,
  riskFilter,
  onRiskFilterChange,
  density,
  onDensityChange,
  isAllCollapsed,
  onToggleCollapseAll,
  showLegend,
  onToggleLegend,
  hasChanges,
  onResetChanges,
  canEdit,
}: PermissionToolbarProps) {
  const t = useTranslations("admin-users");

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-slate-900">
      {/* Top Controls Row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-12">
        {/* Search Input */}
        <div className="space-y-1 xl:col-span-4">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            {t("permissions.search.label")}
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <InputField
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("permissions.search.placeholder")}
              className="ps-8 pe-8 h-9 text-xs font-medium rounded-xl border-slate-200/80 dark:border-white/10"
            />
            {search ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Module Filter */}
        <div className="space-y-1 xl:col-span-3">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            {t("permissions.matrix.toolbar.moduleLabel")}
          </Label>
          <select
            className="h-9 w-full rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 text-xs font-semibold text-text-primary outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 dark:border-white/10 dark:bg-slate-950/40 dark:text-white cursor-pointer"
            value={moduleFilter}
            onChange={(e) => onModuleFilterChange(e.target.value)}
          >
            <option value="all">{t("permissions.matrix.toolbar.allModules")}</option>
            {ADMIN_PERMISSION_GROUP_ORDER.map((moduleKey) => (
              <option key={moduleKey} value={moduleKey}>
                {t(`permissions.modules.${moduleKey}.title`)}
              </option>
            ))}
          </select>
        </div>

        {/* State Filter */}
        <div className="space-y-1 xl:col-span-3">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            {t("filters.status")}
          </Label>
          <select
            className="h-9 w-full rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 text-xs font-semibold text-text-primary outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 dark:border-white/10 dark:bg-slate-950/40 dark:text-white cursor-pointer"
            value={stateFilter}
            onChange={(e) => onStateFilterChange(e.target.value as StateFilterValue)}
          >
            <option value="all">{t("permissions.stateFilter.all")}</option>
            <option value="overriddenOnly">{t("permissions.stateFilter.overriddenOnly")}</option>
            <option value="inheritedOnly">{t("permissions.stateFilter.inheritedOnly")}</option>
            <option value="explicitAllow">{t("permissions.stateFilter.explicitAllow")}</option>
            <option value="explicitDeny">{t("permissions.stateFilter.explicitDeny")}</option>
            <option value="effectiveAllow">{t("permissions.stateFilter.effectiveAllow")}</option>
            <option value="effectiveDeny">{t("permissions.stateFilter.effectiveDeny")}</option>
          </select>
        </div>

        {/* Risk Level Filter */}
        <div className="space-y-1 xl:col-span-2">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            {t("permissions.riskFilter.all")}
          </Label>
          <select
            className="h-9 w-full rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 text-xs font-semibold text-text-primary outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 dark:border-white/10 dark:bg-slate-950/40 dark:text-white cursor-pointer"
            value={riskFilter}
            onChange={(e) => onRiskFilterChange(e.target.value as RiskFilterValue)}
          >
            <option value="all">{t("permissions.riskFilter.all")}</option>
            <option value="normal">{t("permissions.riskFilter.normal")}</option>
            <option value="sensitive">{t("permissions.riskFilter.sensitive")}</option>
            <option value="critical">{t("permissions.riskFilter.critical")}</option>
          </select>
        </div>
      </div>

      {/* Secondary Actions Bar (Density, Collapse/Expand, Legend, Reset) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
        {/* Left Side: Density Mode & Collapse Toggle */}
        <div className="flex items-center gap-2">
          {/* Density Selector */}
          <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 dark:bg-white/10">
            <button
              type="button"
              onClick={() => onDensityChange("compact")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                density === "compact"
                  ? "bg-white text-teal-700 shadow-xs dark:bg-slate-900 dark:text-teal-400"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {t("permissions.density.compact")}
            </button>
            <button
              type="button"
              onClick={() => onDensityChange("comfortable")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                density === "comfortable"
                  ? "bg-white text-teal-700 shadow-xs dark:bg-slate-900 dark:text-teal-400"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {t("permissions.density.comfortable")}
            </button>
          </div>

          {/* Collapse/Expand All Modules */}
          <button
            type="button"
            onClick={onToggleCollapseAll}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-slate-200/80 bg-white font-bold text-text-secondary hover:text-text-primary dark:border-white/10 dark:bg-slate-900 shadow-xs transition"
          >
            {isAllCollapsed ? (
              <>
                <Maximize2 className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                <span>إظهار جميع الأقسام</span>
              </>
            ) : (
              <>
                <Minimize2 className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                <span>طي جميع الأقسام</span>
              </>
            )}
          </button>
        </div>

        {/* Right Side: Toggle Legend & Reset Changes */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleLegend}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition ${
              showLegend
                ? "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
                : "border-slate-200/80 bg-white text-text-secondary hover:text-text-primary dark:border-white/10 dark:bg-slate-900"
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>{t("permissions.legend.title")}</span>
          </button>

          <Button
            variant="outline"
            startIcon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={onResetChanges}
            disabled={!canEdit || !hasChanges}
            className="h-8 text-xs font-bold"
          >
            {t("permissions.matrix.toolbar.resetChanges")}
          </Button>
        </div>
      </div>
    </div>
  );
}
