"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  Sliders,
  Sparkles,
  Lock,
  FolderGit2,
  Search,
  Globe,
  Cpu,
  Bell,
  Calendar,
  CreditCard,
  Check,
  Copy,
  History,
  Edit3,
  ExternalLink,
  RotateCcw,
  X,
  AlertCircle,
  CheckCircle2,
  Shield,
  Layers,
  FileText,
  User,
  Clock,
  ChevronRight,
  RefreshCw,
  Plus,
  Trash2,
  Tag,
} from "lucide-react";
import {
  usePlatformSettingHistory,
  usePlatformSettings,
  useResetPlatformSetting,
  useUpdatePlatformSetting,
} from "../hooks/use-platform-settings";
import type { PlatformSetting } from "../types/platform-settings.types";
import { EditorControl, SessionReminderScheduleEditor, formatMinutesToHuman } from "./editors";
import { cn } from "@/lib/utils";

// Category Icons Mapper
function getCategoryIcon(category: string) {
  const cat = category.toUpperCase();
  if (cat.includes("LOCALE") || cat.includes("LANGUAGE")) return Globe;
  if (cat.includes("SYSTEM") || cat.includes("FEATURE")) return Cpu;
  if (cat.includes("NOTIF")) return Bell;
  if (cat.includes("BOOKING") || cat.includes("PACKAGE")) return Calendar;
  if (
    cat.includes("PAYMENT") ||
    cat.includes("PAYMOB") ||
    cat.includes("STRIPE")
  )
    return CreditCard;
  if (cat === "SESSION_SCHEDULE") return Clock;
  return Layers;
}

export default function AdminPlatformSettingsScreen() {
  const t = useTranslations("admin-platform-settings");
  const locale = useLocale();
  const isAr = locale.startsWith("ar");

  // Filter States
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [stateFilter, setStateFilter] = useState<string>("");

  // Modals & Active Setting States
  const [selectedSetting, setSelectedSetting] =
    useState<PlatformSetting | null>(null);
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<unknown>(null);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<"saved" | "reset" | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isEditorValid, setIsEditorValid] = useState(true);

  // Queries & Mutations
  const query = usePlatformSettings();
  const updateMutation = useUpdatePlatformSetting();
  const resetMutation = useResetPlatformSetting();
  const historyQuery = usePlatformSettingHistory(historyKey);

  const rawSettings = useMemo(
    () => query.data?.settings ?? [],
    [query.data?.settings],
  );
  const categories = useMemo(
    () => query.data?.categories ?? [],
    [query.data?.categories],
  );

  // Filtered Settings based on search, activeCategory, and stateFilter
  const filteredSettings = useMemo(() => {
    let result = [...rawSettings];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.label.toLowerCase().includes(q) ||
          s.key.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      );
    }

    if (activeCategory) {
      if (activeCategory === SESSION_SCHEDULE_GROUP) {
        result = result.filter((s) => s.domain === "sessions");
      } else {
        result = result.filter((s) => s.category === activeCategory && s.domain !== "sessions");
      }
    }

    if (stateFilter) {
      if (stateFilter === "editable") result = result.filter((s) => s.editable);
      if (stateFilter === "readonly")
        result = result.filter((s) => !s.editable);
      if (stateFilter === "changed")
        result = result.filter((s) => s.source === "OVERRIDE");
      if (stateFilter === "default")
        result = result.filter((s) => s.source === "CATALOG_DEFAULT");
    }

    return result;
  }, [rawSettings, search, activeCategory, stateFilter]);

  // Summary Statistics (calculated over all settings)
  const stats = useMemo(() => {
    const total = rawSettings.length;
    const overridden = rawSettings.filter(
      (s) => s.source === "OVERRIDE",
    ).length;
    const readonly = rawSettings.filter((s) => !s.editable).length;
    const catsCount = categories.length;
    return { total, overridden, readonly, catsCount };
  }, [rawSettings, categories]);

  // Virtual group key for session-schedule settings (UI-only, not a real backend category)
  const SESSION_SCHEDULE_GROUP = "SESSION_SCHEDULE";

  // Grouped Settings by Category (from filtered settings)
  // Session-domain settings are extracted into a dedicated SESSION_SCHEDULE group shown first
  const grouped = useMemo(() => {
    const map = filteredSettings.reduce<Record<string, PlatformSetting[]>>(
      (acc, item) => {
        const groupKey =
          item.domain === "sessions"
            ? SESSION_SCHEDULE_GROUP
            : item.category;
        (acc[groupKey] ??= []).push(item);
        return acc;
      },
      {},
    );
    // Place SESSION_SCHEDULE group first if it exists
    const {[SESSION_SCHEDULE_GROUP]: sessionGroup, ...rest} = map;
    if (sessionGroup) return {[SESSION_SCHEDULE_GROUP]: sessionGroup, ...rest};
    return rest;
  }, [filteredSettings]);

  // Copy Key Helper
  function handleCopyKey(key: string) {
    void navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  // Open Editor Modal
  function openEditor(setting: PlatformSetting) {
    setSelectedSetting(setting);
    setEditValue(setting.value);
    setReason("");
    setFeedback(null);
    setIsEditorValid(true);
  }

  // Save Modified Setting
  function handleSave() {
    if (!selectedSetting || !reason.trim()) return;
    updateMutation.mutate(
      {
        key: selectedSetting.key,
        value: editValue,
        reason: reason.trim(),
        expectedUpdatedAt: selectedSetting.expectedUpdatedAt,
      },
      {
        onSuccess: () => {
          setFeedback("saved");
          setSelectedSetting(null);
        },
      },
    );
  }

  // Reset Setting to Catalog Default
  function handleResetSetting() {
    if (!selectedSetting || !reason.trim()) return;
    resetMutation.mutate(
      {
        key: selectedSetting.key,
        reason: reason.trim(),
        expectedUpdatedAt: selectedSetting.expectedUpdatedAt,
      },
      {
        onSuccess: () => {
          setFeedback("reset");
          setSelectedSetting(null);
        },
      },
    );
  }

  // Reload Latest Data on Conflict
  async function handleReloadLatest() {
    const result = await query.refetch();
    const latest = result.data?.settings.find(
      (s) => s.key === selectedSetting?.key,
    );
    if (latest) openEditor(latest);
  }

  // Translate Category Label Safely
  function getCategoryLabel(catKey: string) {
    if (catKey === SESSION_SCHEDULE_GROUP) {
      return isAr ? "مواعيد وتذكيرات الجلسات" : "Session Schedule & Reminders";
    }
    try {
      return t(`categories.${catKey}` as any);
    } catch {
      return catKey;
    }
  }

  return (
    <div className="space-y-4 pb-8" dir={isAr ? "rtl" : "ltr"}>
      {/* Top Header Section (Compact) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-4 text-white shadow-md md:p-5">
        <div className="absolute -top-12 -left-12 h-48 w-48 rounded-full bg-teal-500/10 blur-2xl" />
        <div className="absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="max-w-xl space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md">
              <Shield className="h-3 w-3 text-teal-300" />
              <span>{t("page.eyebrow")}</span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-white md:text-2xl">
              {t("page.title")}
            </h1>
            <p className="line-clamp-1 text-[11px] leading-normal text-teal-100/80">
              {t("page.description")}
            </p>
          </div>

          {/* Feedback Status Alert */}
          {feedback && (
            <div
              role="status"
              className="animate-fade-in inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-200 shadow-md backdrop-blur-md"
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span>{t(`states.${feedback}`)}</span>
            </div>
          )}
        </div>

        {/* Quick KPI Stat Cards (Compact Row) */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-white/10 pt-3.5 lg:grid-cols-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/10 p-2.5 backdrop-blur-md">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wide text-teal-200/80 uppercase">
                {t("stats.total")}
              </p>
              <p className="text-base font-black text-white">{stats.total}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/10 p-2.5 backdrop-blur-md">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wide text-indigo-200/80 uppercase">
                {t("stats.overridden")}
              </p>
              <p className="text-base font-black text-white">
                {stats.overridden}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/10 p-2.5 backdrop-blur-md">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wide text-amber-200/80 uppercase">
                {t("stats.readonly")}
              </p>
              <p className="text-base font-black text-white">
                {stats.readonly}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/10 p-2.5 backdrop-blur-md">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
              <FolderGit2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wide text-purple-200/80 uppercase">
                {t("stats.categories")}
              </p>
              <p className="text-base font-black text-white">
                {stats.catsCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Category Navigation */}
      <div className="space-y-3">
        {/* Category Tabs Scrollable (Compact Pills) */}
        <div className="custom-scrollbar flex items-center gap-1.5 overflow-x-auto scroll-smooth pb-1">
          <button
            type="button"
            onClick={() => setActiveCategory("")}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-sm transition-all",
              activeCategory === ""
                ? "border-teal-600 bg-teal-600 text-white shadow-teal-600/20"
                : "text-text-secondary border-slate-200/80 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/5",
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{t("categories.all")}</span>
            <span className="py-0.2 ms-1 rounded-full bg-white/20 px-1.5 text-[10px] font-extrabold">
              {rawSettings.length}
            </span>
          </button>

          {/* Session Schedule & Reminders virtual category pill */}
          {(() => {
            const sessionCount = rawSettings.filter((s) => s.domain === "sessions").length;
            if (sessionCount === 0) return null;
            const isActive = activeCategory === SESSION_SCHEDULE_GROUP;
            return (
              <button
                key={SESSION_SCHEDULE_GROUP}
                type="button"
                onClick={() => setActiveCategory(isActive ? "" : SESSION_SCHEDULE_GROUP)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-sm transition-all",
                  isActive
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-indigo-600/20"
                    : "text-text-secondary border-indigo-200/60 bg-indigo-50/60 hover:bg-indigo-50 dark:border-indigo-900/30 dark:bg-indigo-950/20 dark:text-indigo-300 dark:hover:bg-indigo-950/30",
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>{isAr ? "مواعيد الجلسات" : "Session Schedule"}</span>
                <span className={cn(
                  "py-0.2 ms-0.5 rounded-full px-1.5 text-[10px] font-extrabold",
                  isActive ? "bg-white/20 text-white" : "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300",
                )}
                >
                  {sessionCount}
                </span>
              </button>
            );
          })()}

          {categories.map((catKey) => {
            const Icon = getCategoryIcon(catKey);
            const count = rawSettings.filter(
              (s) => s.category === catKey && s.domain !== "sessions",
            ).length;
            const isActive = activeCategory === catKey;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setActiveCategory(catKey)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-sm transition-all",
                  isActive
                    ? "border-teal-600 bg-teal-600 text-white shadow-teal-600/20"
                    : "text-text-secondary border-slate-200/80 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/5",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{getCategoryLabel(catKey)}</span>
                <span
                  className={cn(
                    "py-0.2 ms-0.5 rounded-full px-1.5 text-[10px] font-extrabold",
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-text-muted bg-slate-100 dark:bg-white/10",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & State Filter Bar (Compact Height) */}
        <div className="flex flex-col items-center justify-between gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm sm:flex-row dark:border-white/10 dark:bg-slate-900">
          <div className="relative w-full flex-1">
            <Search className="text-text-muted absolute top-2.5 left-3 h-3.5 w-3.5 rtl:right-3 rtl:left-auto" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("filters.search")}
              className="text-text-primary h-8 w-full rounded-xl border border-slate-200 bg-slate-50/50 pr-3 pl-9 text-xs font-medium shadow-sm transition-all outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 rtl:pr-9 rtl:pl-3 dark:border-white/10 dark:bg-slate-950/30 dark:text-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-text-muted hover:text-text-primary absolute top-2 right-2.5 p-0.5 rtl:right-auto rtl:left-2.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="text-text-primary h-8 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold shadow-sm outline-none focus:border-teal-500 sm:w-auto dark:border-white/10 dark:bg-slate-950/30 dark:text-white"
            >
              <option value="">{t("filters.allStates")}</option>
              <option value="editable">{t("states.editable")}</option>
              <option value="readonly">{t("states.readonly")}</option>
              <option value="changed">{t("states.changed")}</option>
              <option value="default">{t("states.default")}</option>
            </select>

            <button
              type="button"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              className="text-text-secondary hover:text-text-primary flex h-8 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold shadow-sm transition dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              <RefreshCw
                className={cn("h-3 w-3", query.isFetching && "animate-spin")}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Main Settings Display (Compact Cards Grid) */}
      {query.isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-slate-900">
          <RefreshCw className="mb-2 h-6 w-6 animate-spin text-teal-600" />
          <p className="text-text-secondary text-xs font-bold dark:text-slate-300">
            {t("states.loading")}
          </p>
        </div>
      ) : query.isError ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/50 p-12 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
          <AlertCircle className="mb-2 h-8 w-8 animate-bounce text-rose-500" />
          <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
            {t("states.error")}
          </h3>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-md transition hover:bg-rose-700"
          >
            <RefreshCw className="h-3 w-3" />
            <span>{t("actions.reloadLatest")}</span>
          </button>
        </div>
      ) : filteredSettings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-slate-900">
          <Sliders className="mb-2 h-10 w-10 text-slate-300 dark:text-slate-700" />
          <h3 className="text-text-primary text-sm font-bold dark:text-white">
            {t("states.empty")}
          </h3>
          <p className="text-text-muted mt-0.5 text-xs">
            {isAr
              ? "جرب تغيير كلمات البحث أو المرشحات لعرض الإعدادات."
              : "Try adjusting your search terms or active filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([groupCatKey, groupItems]) => {
            const CatIcon = getCategoryIcon(groupCatKey);
            return (
              <div key={groupCatKey} className="space-y-3">
                {/* Category Section Header */}
                <div className="flex items-center gap-2 border-b border-slate-200/70 pb-1.5 dark:border-white/10">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-teal-200/50 bg-teal-50 text-teal-600 dark:border-teal-900/50 dark:bg-teal-950/50 dark:text-teal-400">
                    <CatIcon className="h-3.5 w-3.5" />
                  </div>
                  <h2 className="text-text-primary text-sm font-extrabold dark:text-white">
                    {getCategoryLabel(groupCatKey)}
                  </h2>
                  <span className="py-0.2 text-text-muted rounded-full bg-slate-100 px-2 text-[10px] font-bold dark:bg-white/10">
                    {groupItems.length}
                  </span>
                </div>

                {/* Dense Settings Grid (3 cols on XL) */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {groupItems.map((setting) => {
                    const isOverride = setting.source === "OVERRIDE";
                    const isReadOnly = !setting.editable;

                    return (
                      <div
                        key={setting.key}
                        className={cn(
                          "group relative flex flex-col justify-between rounded-2xl border bg-white p-3.5 shadow-sm transition-all duration-200 hover:shadow-md dark:bg-slate-900",
                          isOverride
                            ? "border-indigo-200/80 ring-1 ring-indigo-500/10 dark:border-indigo-900/50"
                            : "border-slate-200/80 dark:border-white/10",
                        )}
                      >
                        <div>
                          {/* Card Top Badges */}
                          <div className="mb-2 flex items-center justify-between gap-1.5">
                            <span className="text-text-secondary inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold dark:bg-white/10 dark:text-slate-300">
                              <Tag className="h-2.5 w-2.5 text-teal-600 dark:text-teal-400" />
                              {setting.valueType}
                            </span>

                            <div className="flex items-center gap-1">
                              {isOverride ? (
                                <span className="py-0.2 inline-flex items-center gap-0.5 rounded-full border border-indigo-200 bg-indigo-50 px-2 text-[9px] font-bold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300">
                                  <Sparkles className="h-2.5 w-2.5" />
                                  {t("states.changed")}
                                </span>
                              ) : (
                                <span className="py-0.2 text-text-muted inline-flex items-center gap-0.5 rounded-full border border-slate-200/60 bg-slate-100 px-2 text-[9px] font-bold dark:border-white/5 dark:bg-white/5">
                                  {t("states.default")}
                                </span>
                              )}

                              {isReadOnly ? (
                                <span className="py-0.2 inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-2 text-[9px] font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400">
                                  <Lock className="h-2.5 w-2.5" />
                                  {t("states.readonly")}
                                </span>
                              ) : (
                                <span className="py-0.2 inline-flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 text-[9px] font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                                  <Check className="h-2.5 w-2.5" />
                                  {t("states.editable")}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Setting Title & Description */}
                          <h3 className="text-text-primary text-xs leading-snug font-bold transition-colors group-hover:text-teal-600 md:text-sm dark:text-white">
                            {setting.label}
                          </h3>
                          <p className="text-text-secondary mt-0.5 line-clamp-2 text-[11px] leading-snug dark:text-slate-400">
                            {setting.description}
                          </p>

                          {/* Setting Key Snippet + Copy */}
                          <div className="mt-2.5 flex items-center justify-between gap-1.5 rounded-lg border border-slate-200/60 bg-slate-50 px-2 py-1 font-mono text-[10px] dark:border-white/5 dark:bg-slate-950/60">
                            <code className="truncate text-slate-600 select-all dark:text-slate-400">
                              {setting.key}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopyKey(setting.key)}
                              className="text-text-muted hover:text-text-primary shrink-0 rounded p-0.5 transition hover:bg-slate-200/60 dark:hover:bg-white/10"
                              title={t("actions.copyKey")}
                            >
                              {copiedKey === setting.key ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>

                          {/* Formatted Value Preview */}
                          <div className="mt-2.5 space-y-1 rounded-xl border border-slate-200/60 bg-slate-50/80 p-2 dark:border-white/5 dark:bg-slate-950/30">
                            <span className="text-text-muted text-[9px] font-bold tracking-wider uppercase">
                              {t("editor.value")}:
                            </span>
                            <div>
                              <ValueFormattedPreview setting={setting} />
                            </div>
                          </div>
                        </div>

                        {/* Action Bar (Compact) */}
                        <div className="mt-3 flex items-center justify-between gap-1.5 border-t border-slate-100 pt-2.5 dark:border-white/5">
                          <button
                            type="button"
                            onClick={() => {
                              setHistoryKey(setting.key);
                              setSelectedSetting(setting);
                            }}
                            className="text-text-secondary hover:text-text-primary inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold shadow-sm transition dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
                          >
                            <History className="h-3 w-3 text-teal-600" />
                            <span>{t("actions.history")}</span>
                          </button>

                          {setting.editable ? (
                            <button
                              type="button"
                              onClick={() => openEditor(setting)}
                              className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1 text-[11px] font-bold text-white shadow-sm transition hover:bg-teal-700 active:scale-95"
                            >
                              <Edit3 className="h-3 w-3" />
                              <span>{t("actions.edit")}</span>
                            </button>
                          ) : setting.readOnlyReason ===
                            "DEDICATED_PAYMENT_CONTROL" ? (
                            <Link
                              href="/admin/payments/gateway-control"
                              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300"
                            >
                              <span>{t("actions.openPaymentControl")}</span>
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Setting Modal */}
      {selectedSetting && !historyKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="animate-fade-in relative my-8 w-full max-w-lg space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xl md:p-6 dark:border-white/10 dark:bg-slate-900">
            {selectedSetting.key === "SESSION_REMINDER_OFFSETS_MINUTES" ? (
              <SessionReminderScheduleEditor
                setting={selectedSetting}
                value={editValue}
                onChange={setEditValue}
                onValidationChange={setIsEditorValid}
                reason={reason}
                onReasonChange={setReason}
                onSave={handleSave}
                onCancel={() => setSelectedSetting(null)}
                onReset={handleResetSetting}
                isPending={updateMutation.isPending}
                isResetPending={resetMutation.isPending}
                isError={updateMutation.isError || resetMutation.isError}
                onReloadLatest={handleReloadLatest}
                isFetching={query.isFetching}
              />
            ) : (
              <div className="space-y-4 font-sans">
                {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 dark:border-white/10">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400">
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>{t("editor.title")}</span>
                </div>
                <h2 className="text-text-primary mt-0.5 text-base font-extrabold dark:text-white">
                  {selectedSetting.label}
                </h2>
                <code className="text-text-muted block font-mono text-[10px]">
                  {selectedSetting.key}
                </code>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSetting(null)}
                className="text-text-muted hover:text-text-primary rounded-xl p-1.5 transition hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Input Editor Section */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-text-primary block text-[11px] font-extrabold tracking-wider uppercase dark:text-white">
                  {t("editor.value")}
                </label>
                <EditorControl
                  setting={selectedSetting}
                  value={editValue}
                  onChange={setEditValue}
                  onValidationChange={setIsEditorValid}
                />
              </div>

              {/* Mandatory Reason Field */}
              <div className="space-y-1.5 pt-1">
                <label className="text-text-primary block text-[11px] font-extrabold tracking-wider uppercase dark:text-white">
                  {t("editor.reason")} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2.5}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("editor.reasonPlaceholder")}
                  aria-label={t("editor.reason")}
                  className="text-text-primary w-full resize-none rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-xs shadow-sm transition outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 dark:border-white/10 dark:bg-slate-950/40 dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Error or Conflict Message */}
            {(updateMutation.isError || resetMutation.isError) && (
              <div
                role="alert"
                className="space-y-1.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
              >
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{t("states.conflict")}</span>
                </div>
                <button
                  type="button"
                  onClick={handleReloadLatest}
                  disabled={query.isFetching}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-rose-700"
                >
                  <RefreshCw
                    className={cn(
                      "h-3 w-3",
                      query.isFetching && "animate-spin",
                    )}
                  />
                  <span>{t("actions.reloadLatest")}</span>
                </button>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
              <button
                type="button"
                disabled={!selectedSetting.valueId || resetMutation.isPending}
                onClick={handleResetSetting}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200/80 bg-rose-50/50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400"
              >
                <RotateCcw className="h-3 w-3" />
                <span>{t("actions.reset")}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSetting(null)}
                  className="text-text-secondary hover:text-text-primary rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold transition dark:border-white/10"
                >
                  {t("actions.cancel")}
                </button>

                <button
                  type="button"
                  disabled={
                    !reason.trim() ||
                    !isEditorValid ||
                    updateMutation.isPending ||
                    resetMutation.isPending
                  }
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {updateMutation.isPending ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>{t("states.saving")}</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>{t("actions.save")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )}

      {/* History Modal */}
      {historyKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="animate-fade-in relative my-8 w-full max-w-xl space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xl md:p-6 dark:border-white/10 dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 dark:border-white/10">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400">
                  <History className="h-3.5 w-3.5" />
                  <span>{t("history.title")}</span>
                </div>
                <h2 className="text-text-primary mt-0.5 text-base font-extrabold dark:text-white">
                  {selectedSetting?.label || historyKey}
                </h2>
                <code className="text-text-muted block font-mono text-[10px]">
                  {historyKey}
                </code>
              </div>
              <button
                type="button"
                onClick={() => setHistoryKey(null)}
                className="text-text-muted hover:text-text-primary rounded-xl p-1.5 transition hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Timeline Items */}
            {historyQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <RefreshCw className="mb-2 h-6 w-6 animate-spin text-teal-600" />
                <p className="text-text-muted text-xs font-bold">
                  {t("states.loading")}
                </p>
              </div>
            ) : historyQuery.data?.items.length ? (
              <div className="custom-scrollbar max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                {historyQuery.data.items.map((item) => (
                  <div
                    key={item.id}
                    className="relative space-y-1.5 border-l-2 border-teal-500/30 py-1 pl-5 rtl:border-r-2 rtl:border-l-0 rtl:pr-5 rtl:pl-0"
                  >
                    <span className="absolute top-2 -left-[5px] h-2 w-2 rounded-full bg-teal-600 ring-2 ring-teal-500/20 rtl:-right-[5px] rtl:left-auto" />

                    <div className="flex items-center justify-between gap-2">
                      <span className="py-0.2 inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 text-[9px] font-bold text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/50 dark:text-teal-300">
                        {item.changeAction}
                      </span>
                      <time className="text-text-muted flex items-center gap-1 text-[10px] font-medium">
                        <Clock className="h-3 w-3" />
                        {new Date(item.changedAt).toLocaleString(locale)}
                      </time>
                    </div>

                    {/* Actor info */}
                    {item.changedByUser && (
                      <div className="text-text-secondary flex items-center gap-1 text-[11px] font-semibold dark:text-slate-300">
                        <User className="text-text-muted h-3 w-3" />
                        <span>{t("history.by")}</span>
                        <span className="text-text-primary font-bold dark:text-white">
                          {item.changedByUser.displayName ||
                            item.changedByUser.emails[0]?.email}
                        </span>
                      </div>
                    )}

                    {/* Change Reason */}
                    <p className="text-text-secondary rounded-xl border border-slate-200/60 bg-slate-50 p-2 text-[11px] leading-relaxed dark:border-white/5 dark:bg-slate-950/40 dark:text-slate-300">
                      <span className="text-text-primary mb-0.5 block font-bold dark:text-white">
                        {t("editor.reason")}:
                      </span>
                      {item.reason ?? t("history.noReason")}
                    </p>

                    {/* Diffs Preview */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="rounded-lg border border-rose-200/60 bg-rose-50/50 p-1.5 dark:border-rose-900/40 dark:bg-rose-950/20">
                        <span className="mb-0.5 block text-[9px] font-bold text-rose-700 dark:text-rose-400">
                          {isAr ? "القيمة السابقة:" : "Old Value:"}
                        </span>
                        <code className="font-mono break-words text-rose-900 dark:text-rose-200">
                          {JSON.stringify(item.oldValueSnapshot)}
                        </code>
                      </div>

                      <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/50 p-1.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                        <span className="mb-0.5 block text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
                          {isAr ? "القيمة الجديدة:" : "New Value:"}
                        </span>
                        <code className="font-mono break-words text-emerald-900 dark:text-emerald-200">
                          {JSON.stringify(item.newValueSnapshot)}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-text-muted p-8 text-center text-xs font-medium">
                {t("history.empty")}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-slate-100 pt-3 dark:border-white/10">
              <button
                type="button"
                onClick={() => setHistoryKey(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-slate-800 dark:bg-white dark:text-slate-900"
              >
                {t("actions.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Formatted Value Preview inside cards
function ValueFormattedPreview({ setting }: { setting: PlatformSetting }) {
  const locale = useLocale();
  const isAr = locale.startsWith("ar");
  const value = setting.value;

  if (setting.key === "SESSION_REMINDER_OFFSETS_MINUTES" || (setting.domain === "sessions" && Array.isArray(value))) {
    const list = Array.isArray(value) ? (value as number[]).map((v) => Number(v)).filter((v) => !isNaN(v)) : [];
    if (list.length === 0) {
      return <span className="text-text-muted text-[10px] italic">{isAr ? "لا توجد تذكيرات" : "No reminders"}</span>;
    }
    const formattedList = list.slice().sort((a, b) => b - a).map((m) => formatMinutesToHuman(m, isAr));
    return (
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {formattedList.map((item, idx) => (
          <span key={idx} className="rounded-md border border-indigo-200/80 bg-indigo-50/80 px-2 py-0.5 text-[10px] font-bold text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-200">
            {item}
          </span>
        ))}
      </div>
    );
  }

  if (setting.valueType === "BOOLEAN") {
    const isTrue = Boolean(value);
    return (
      <div className="inline-flex items-center gap-1.5">
        <span
          className={cn(
            "h-2 w-2 animate-pulse rounded-full",
            isTrue ? "bg-emerald-500" : "bg-slate-400",
          )}
        />
        <span
          className={cn(
            "text-[11px] font-bold",
            isTrue
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-slate-500 dark:text-slate-400",
          )}
        >
          {isTrue ? "Enabled (True)" : "Disabled (False)"}
        </span>
      </div>
    );
  }

  if (setting.valueType === "STRING_ARRAY" && Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <span className="text-text-muted text-[10px] italic">[Empty List]</span>
      );
    }
    return (
      <div className="flex flex-wrap gap-1 pt-0.5">
        {value.map((item, idx) => (
          <span
            key={idx}
            className="py-0.2 rounded-md border border-teal-200/60 bg-teal-50 px-1.5 font-mono text-[10px] font-semibold text-teal-800 dark:border-teal-900/40 dark:bg-teal-950/40 dark:text-teal-300"
          >
            {String(item)}
          </span>
        ))}
      </div>
    );
  }

  if (typeof value === "object" && value !== null) {
    return (
      <pre className="custom-scrollbar max-h-20 overflow-auto font-mono text-[10px] text-slate-700 dark:text-slate-300">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  return (
    <span className="text-text-primary font-mono text-[11px] font-bold break-all dark:text-white">
      {String(value ?? "")}
    </span>
  );
}

