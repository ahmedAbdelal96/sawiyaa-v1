"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import {
  Sliders,
  Sparkles,
  Lock,
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
  Clock,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Landmark,
  HardDrive,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
  ShieldCheck,
  ShieldAlert,
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
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import AdminPlatformCommissionCard from "./AdminPlatformCommissionCard";
import PlatformSessionsDomain from "./domains/PlatformSessionsDomain";
import PlatformRevenueShareDomain from "./domains/PlatformRevenueShareDomain";
import PlatformPaymentsDomain from "./domains/PlatformPaymentsDomain";
import PlatformNotificationsDomain from "./domains/PlatformNotificationsDomain";
import PlatformStorageDomain from "./domains/PlatformStorageDomain";

export type BusinessDomainId =
  | "all"
  | "sessions"
  | "notifications"
  | "revenue_share"
  | "payments"
  | "storage"
  | "general";

interface DomainConfig {
  id: BusinessDomainId;
  icon: typeof Calendar;
  color: string;
  bgColor: string;
  borderColor: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  matches: (s: PlatformSetting) => boolean;
}

const DOMAIN_DEFINITIONS: DomainConfig[] = [
  {
    id: "sessions",
    icon: Calendar,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
    borderColor: "border-blue-200 dark:border-blue-900/50",
    titleAr: "الجلسات والحجوزات",
    titleEn: "Sessions & Booking",
    descAr: "مهل الرد والدفع للجلسات الفورية، نوافذ الدخول المبكر والتمديد، وباقات الحجز.",
    descEn: "Instant booking SLAs, session join and reconnect buffers, and package plans.",
    matches: (s) =>
      s.domain === "sessions" ||
      s.domain === "instant-booking" ||
      s.domain === "packages" ||
      s.category === "SESSION" ||
      s.category === "BOOKING" ||
      s.key.startsWith("INSTANT_BOOKING") ||
      s.key.startsWith("SESSION_JOIN") ||
      s.key.startsWith("packages."),
  },
  {
    id: "notifications",
    icon: Bell,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/40",
    borderColor: "border-amber-200 dark:border-amber-900/50",
    titleAr: "الإشعارات ومواعيد التذكير",
    titleEn: "Notifications & Alerts",
    descAr: "جدول مواعيد تذكيرات الجلسات التنازلي، تنبيهات التأخر عن الحضور، وقنوات الإرسال.",
    descEn: "Session reminder countdown schedule, late arrival alerts, and default delivery channels.",
    matches: (s) =>
      s.domain === "notifications" ||
      s.category === "NOTIFICATION" ||
      s.key.startsWith("SESSION_REMINDER") ||
      s.key.startsWith("SESSION_LATE") ||
      s.key.startsWith("SESSION_IN_APP") ||
      s.key.startsWith("SESSION_EMAIL") ||
      s.key.startsWith("notifications."),
  },
  {
    id: "revenue_share",
    icon: Landmark,
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-50 dark:bg-teal-950/40",
    borderColor: "border-teal-200 dark:border-teal-900/50",
    titleAr: "توزيع الإيرادات والعمولات",
    titleEn: "Revenue Share & Commission",
    descAr: "توزيع عمولة المنصة الموحدة وحصة الممارسين من الجلسات المستقبلية.",
    descEn: "Unified platform commission rate and practitioner session earnings split.",
    matches: (s) =>
      s.category === "PAYOUT" ||
      s.domain === "finance" ||
      s.key.startsWith("finance.") ||
      s.key.includes("Commission") ||
      s.key.includes("SharePercent"),
  },
  {
    id: "payments",
    icon: CreditCard,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/40",
    borderColor: "border-purple-200 dark:border-purple-900/50",
    titleAr: "بوابات الدفع والفوترة",
    titleEn: "Payments & Gateways",
    descAr: "حالة بوابات الدفع باي موب وسترايب، وضع الصيانة، وتوجيه العملات.",
    descEn: "Paymob and Stripe providers, maintenance modes, and currency routing summary.",
    matches: (s) =>
      s.category === "PAYMENT" ||
      s.domain === "payment" ||
      s.key.startsWith("payment."),
  },
  {
    id: "storage",
    icon: HardDrive,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
    borderColor: "border-emerald-200 dark:border-emerald-900/50",
    titleAr: "سياسات الملفات والمرفقات",
    titleEn: "Media & Storage Policies",
    descAr: "أحجام المرفقات للمحادثات، الصور الشخصية، مستندات الممارسين، والشهادات.",
    descEn: "Attachment size limits for chat, profile avatars, practitioner credentials, and certificates.",
    matches: (s) =>
      s.domain === "file-uploads" || s.key.startsWith("file.uploads."),
  },
  {
    id: "general",
    icon: Globe,
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/60",
    borderColor: "border-slate-200 dark:border-slate-800",
    titleAr: "الهوية والنظام العام",
    titleEn: "General & Platform",
    descAr: "اللغة الافتراضية، حوكمة مراجعة طلبات الممارسين، ونظرة على سياسات الأمان.",
    descEn: "Default language, practitioner review governance, and security policies overview.",
    matches: (s) =>
      s.category === "LOCALE" ||
      s.category === "SYSTEM" ||
      s.category === "SECURITY" ||
      s.domain === "platform" ||
      s.domain === "auth" ||
      s.domain === "security" ||
      s.key.startsWith("platform.") ||
      s.key.startsWith("features.") ||
      s.key.startsWith("auth.") ||
      s.key.startsWith("security."),
  },
];

export default function AdminPlatformSettingsScreen() {
  const t = useTranslations("admin-platform-settings");
  const locale = useLocale();
  const isAr = locale.startsWith("ar");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Active Domain from URL search param
  const urlDomain = searchParams.get("domain");
  const activeDomain: BusinessDomainId = useMemo(() => {
    if (
      urlDomain &&
      [
        "sessions",
        "notifications",
        "revenue_share",
        "payments",
        "storage",
        "general",
      ].includes(urlDomain)
    ) {
      return urlDomain as BusinessDomainId;
    }
    return "all";
  }, [urlDomain]);

  // Filter States
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("");

  // Modals & Active Setting States
  const [selectedSetting, setSelectedSetting] = useState<PlatformSetting | null>(null);
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
    [query.data?.settings]
  );

  // Navigate Domain via URL param
  const handleSelectDomain = useCallback(
    (domainId: BusinessDomainId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (domainId === "all") {
        params.delete("domain");
      } else {
        params.set("domain", domainId);
      }
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}` as any);
    },
    [pathname, router, searchParams]
  );

  // Classify each setting into its primary business domain
  function getSettingDomain(setting: PlatformSetting): BusinessDomainId {
    for (const def of DOMAIN_DEFINITIONS) {
      if (def.matches(setting)) return def.id;
    }
    return "general";
  }

  // Domain Statistics
  const domainStats = useMemo(() => {
    const map: Record<
      BusinessDomainId,
      { total: number; overridden: number; readonly: number }
    > = {
      all: { total: rawSettings.length, overridden: 0, readonly: 0 },
      sessions: { total: 0, overridden: 0, readonly: 0 },
      notifications: { total: 0, overridden: 0, readonly: 0 },
      revenue_share: { total: 0, overridden: 0, readonly: 0 },
      payments: { total: 0, overridden: 0, readonly: 0 },
      storage: { total: 0, overridden: 0, readonly: 0 },
      general: { total: 0, overridden: 0, readonly: 0 },
    };

    for (const s of rawSettings) {
      const dom = getSettingDomain(s);
      const isOverridden = s.source === "OVERRIDE";
      const isReadonly = !s.editable;

      if (isOverridden) map.all.overridden++;
      if (isReadonly) map.all.readonly++;

      map[dom].total++;
      if (isOverridden) map[dom].overridden++;
      if (isReadonly) map[dom].readonly++;
    }

    // Revenue share has at least 1 rule card
    if (map.revenue_share.total === 0) {
      map.revenue_share.total = 1;
    }

    return map;
  }, [rawSettings]);

  // Filtered Settings based on active domain, search, and stateFilter
  const filteredSettings = useMemo(() => {
    let result = [...rawSettings];

    // Domain filter
    if (activeDomain !== "all") {
      const activeDef = DOMAIN_DEFINITIONS.find((d) => d.id === activeDomain);
      if (activeDef) {
        result = result.filter(activeDef.matches);
      }
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((s) => {
        const titleAr = s.labelAr ?? "";
        const descAr = s.descriptionAr ?? "";
        return (
          s.label.toLowerCase().includes(q) ||
          titleAr.toLowerCase().includes(q) ||
          s.key.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          descAr.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
        );
      });
    }

    // State filter
    if (stateFilter) {
      if (stateFilter === "editable") result = result.filter((s) => s.editable);
      if (stateFilter === "readonly") result = result.filter((s) => !s.editable);
      if (stateFilter === "changed") result = result.filter((s) => s.source === "OVERRIDE");
      if (stateFilter === "default") result = result.filter((s) => s.source === "CATALOG_DEFAULT");
    }

    return result;
  }, [rawSettings, activeDomain, search, stateFilter]);

  // Group filtered settings by domain
  const settingsByDomain = useMemo(() => {
    const map = new Map<BusinessDomainId, PlatformSetting[]>();
    for (const s of filteredSettings) {
      const dom = getSettingDomain(s);
      if (!map.has(dom)) map.set(dom, []);
      map.get(dom)!.push(s);
    }
    return map;
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
      }
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
      }
    );
  }

  // Reload Latest Data on Conflict
  async function handleReloadLatest() {
    const result = await query.refetch();
    const latest = result.data?.settings.find((s) => s.key === selectedSetting?.key);
    if (latest) openEditor(latest);
  }

  const activeDomainDef = DOMAIN_DEFINITIONS.find((d) => d.id === activeDomain);

  return (
    <div className="space-y-6 pb-12" dir={isAr ? "rtl" : "ltr"}>
      {/* 1. Breadcrumb & Executive Control Center Header */}
      <div className="space-y-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-text-muted">
          <Link
            href="/admin"
            className="transition-colors hover:text-text-primary"
          >
            {isAr ? "لوحة الإدارة" : "Admin"}
          </Link>
          {isAr ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <span className="font-semibold text-text-primary">
            {t("page.breadcrumb")}
          </span>
          {activeDomain !== "all" && activeDomainDef && (
            <>
              {isAr ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              <span className="font-bold text-primary">
                {isAr ? activeDomainDef.titleAr : activeDomainDef.titleEn}
              </span>
            </>
          )}
        </nav>

        {/* Header Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-5 text-white shadow-md md:p-6">
          <div className="absolute -top-12 -left-12 h-48 w-48 rounded-full bg-teal-500/10 blur-2xl" />
          <div className="absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl" />

          <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="max-w-2xl space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-xs font-semibold backdrop-blur-md">
                <ShieldCheck className="h-3.5 w-3.5 text-teal-300" />
                <span>{t("page.eyebrow")}</span>
              </div>
              <h1 className="text-xl font-black tracking-tight text-white md:text-2xl">
                {t("page.title")}
              </h1>
              <p className="text-xs leading-relaxed text-teal-100/80 md:text-sm">
                {t("page.description")}
              </p>
            </div>

            {/* Feedback Status Alert */}
            {feedback && (
              <div
                role="status"
                className="animate-fade-in inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/20 px-3.5 py-2 text-xs font-bold text-emerald-200 shadow-md backdrop-blur-md"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{t(`states.${feedback}`)}</span>
              </div>
            )}
          </div>

          {/* Quick KPI Stat Summary Cards */}
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 sm:grid-cols-4">
            {/* Total Settings */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur-md">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-teal-200/80">
                  {t("stats.total")}
                </p>
                <p className="text-lg font-black text-white">{domainStats.all.total}</p>
              </div>
            </div>

            {/* Custom Overrides */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur-md">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200/80">
                  {t("stats.overridden")}
                </p>
                <p className="text-lg font-black text-white">{domainStats.all.overridden}</p>
              </div>
            </div>

            {/* Protected System Settings */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur-md">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-500/20 text-slate-300">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-200/80">
                  {t("stats.readonly")}
                </p>
                <p className="text-lg font-black text-white">{domainStats.all.readonly}</p>
              </div>
            </div>

            {/* Business Domains */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur-md">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-200/80">
                  {t("stats.categories")}
                </p>
                <p className="text-lg font-black text-white">6</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Global Search & State Filter Toolbar */}
      <SurfaceCard variant="section" className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Universal Search Input */}
          <div className="relative flex-1">
            <Search
              className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted ${
                isAr ? "right-3.5" : "left-3.5"
              }`}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("filters.search")}
              className={`app-control w-full rounded-xl border-border-light bg-surface-secondary/50 py-2.5 text-sm transition-all focus:bg-surface-primary dark:bg-white/[0.03] ${
                isAr ? "pr-10 pl-9" : "pl-10 pr-9"
              }`}
              aria-label={t("filters.search")}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className={`absolute top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted hover:bg-surface-tertiary hover:text-text-primary ${
                  isAr ? "left-2.5" : "right-2.5"
                }`}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* State Filter */}
          <div className="flex items-center gap-2">
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="app-control rounded-xl border-border-light bg-surface-secondary/50 px-3 py-2 text-xs font-semibold text-text-primary focus:bg-surface-primary dark:bg-white/[0.03]"
              aria-label={t("filters.state")}
            >
              <option value="">{t("filters.allStates")}</option>
              <option value="editable">{t("states.editable")}</option>
              <option value="readonly">{t("states.readonly")}</option>
              <option value="changed">{t("states.changed")}</option>
              <option value="default">{t("states.default")}</option>
            </select>

            {(search || stateFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStateFilter("");
                }}
                className="gap-1 text-xs text-text-muted hover:text-text-primary"
              >
                <X className="h-3.5 w-3.5" />
                {isAr ? "مسح التصفية" : "Clear filters"}
              </Button>
            )}
          </div>
        </div>
      </SurfaceCard>

      {/* 3. Horizontal Domain Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => handleSelectDomain("all")}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all",
            activeDomain === "all"
              ? "bg-primary text-white shadow-sm shadow-primary/20"
              : "border border-border-light bg-surface-primary text-text-secondary hover:border-border-strong hover:bg-surface-secondary hover:text-text-primary dark:bg-white/[0.02]"
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span>{t("domains.all")}</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-extrabold",
              activeDomain === "all"
                ? "bg-white/20 text-white"
                : "bg-surface-tertiary text-text-muted dark:bg-white/10"
            )}
          >
            {domainStats.all.total}
          </span>
        </button>

        {DOMAIN_DEFINITIONS.map((def) => {
          const Icon = def.icon;
          const isSelected = activeDomain === def.id;
          const stats = domainStats[def.id];

          return (
            <button
              key={def.id}
              type="button"
              onClick={() => handleSelectDomain(def.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all",
                isSelected
                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                  : "border border-border-light bg-surface-primary text-text-secondary hover:border-border-strong hover:bg-surface-secondary hover:text-text-primary dark:bg-white/[0.02]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{isAr ? def.titleAr : def.titleEn}</span>
              {stats.total > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-extrabold",
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-surface-tertiary text-text-muted dark:bg-white/10"
                  )}
                >
                  {stats.total}
                </span>
              )}
              {stats.overridden > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Domain Hub Landing Cards (Rendered on 'all' view when not searching) */}
      {activeDomain === "all" && !search.trim() && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight text-text-primary md:text-base">
              {isAr ? "مجالات التحكم الستة بالمنصة" : "Platform Control Domains"}
            </h2>
            <span className="text-xs text-text-muted">
              {isAr
                ? "اختر مجالاً للتركيز على إعداداته المخصصة"
                : "Select a domain to focus on its operational policies"}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DOMAIN_DEFINITIONS.map((def) => {
              const Icon = def.icon;
              const stats = domainStats[def.id];

              return (
                <div
                  key={def.id}
                  onClick={() => handleSelectDomain(def.id)}
                  className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-border-light bg-surface-primary p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md dark:bg-white/[0.02]"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                          def.bgColor,
                          def.color
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-1.5">
                        {stats.overridden > 0 ? (
                          <Badge variant="solid" color="warning" size="sm">
                            {isAr
                              ? `${stats.overridden} مخصّص`
                              : `${stats.overridden} override${stats.overridden > 1 ? "s" : ""}`}
                          </Badge>
                        ) : (
                          <Badge variant="light" color="light" size="sm">
                            {t("domains.allDefault")}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-text-primary group-hover:text-primary">
                        {isAr ? def.titleAr : def.titleEn}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                        {isAr ? def.descAr : def.descEn}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border-light pt-3 text-xs font-semibold text-text-muted">
                    <span>
                      {t("domains.settingsCount", { count: stats.total })}
                    </span>
                    <span className="inline-flex items-center gap-1 text-primary group-hover:underline">
                      <span>{t("domains.viewDomain")}</span>
                      {isAr ? (
                        <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Focused Domain Header (Rendered when a specific domain is active) */}
      {activeDomain !== "all" && activeDomainDef && (
        <SurfaceCard
          variant="section"
          className={cn("p-5 border", activeDomainDef.borderColor, activeDomainDef.bgColor)}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-xs dark:bg-white/10",
                  activeDomainDef.color
                )}
              >
                {(() => {
                  const Icon = activeDomainDef.icon;
                  return <Icon className="h-6 w-6" />;
                })()}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-text-primary">
                    {isAr ? activeDomainDef.titleAr : activeDomainDef.titleEn}
                  </h2>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-extrabold text-text-primary shadow-xs dark:bg-white/10">
                    {t("domains.settingsCount", {
                      count: domainStats[activeDomain].total,
                    })}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-text-secondary md:text-sm">
                  {isAr ? activeDomainDef.descAr : activeDomainDef.descEn}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectDomain("all")}
              className="gap-1.5 self-start bg-white/80 font-bold shadow-xs hover:bg-white dark:bg-white/5 md:self-center"
            >
              {isAr ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
              <span>{t("domains.backToAll")}</span>
            </Button>
          </div>
        </SurfaceCard>
      )}

      {/* 6. Settings Content List */}
      {query.isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <RefreshCw className="h-7 w-7 animate-spin text-primary" />
          <p className="mt-3 text-sm font-semibold text-text-secondary">
            {t("states.loading")}
          </p>
        </div>
      ) : query.isError ? (
        <SurfaceCard variant="section" className="p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-danger" />
          <h3 className="mt-2 text-base font-bold text-text-primary">
            {t("states.error")}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            className="mt-4 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {isAr ? "إعادة المحاولة" : "Retry"}
          </Button>
        </SurfaceCard>
      ) : filteredSettings.length === 0 && activeDomain !== "revenue_share" ? (
        <SurfaceCard variant="section" className="py-12 text-center">
          <Layers className="mx-auto h-8 w-8 text-text-muted" />
          <h3 className="mt-2 text-sm font-bold text-text-primary">
            {t("states.empty")}
          </h3>
          {(search || stateFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStateFilter("");
              }}
              className="mt-3 text-xs text-primary"
            >
              {isAr ? "مسح معايير البحث والتصفية" : "Clear filters"}
            </Button>
          )}
        </SurfaceCard>
      ) : (
        <div className="space-y-8">
          {/* Sessions Domain Dedicated View */}
          {activeDomain === "sessions" && !search.trim() && !stateFilter && (
            <PlatformSessionsDomain
              settings={filteredSettings}
              onOpenHistory={setHistoryKey}
            />
          )}

          {/* Revenue Share Domain Dedicated View */}
          {activeDomain === "revenue_share" && !search.trim() && !stateFilter && (
            <PlatformRevenueShareDomain
              settings={filteredSettings}
              onOpenHistory={setHistoryKey}
            />
          )}

          {/* Payments & Gateways Domain Dedicated View */}
          {activeDomain === "payments" && !search.trim() && !stateFilter && (
            <PlatformPaymentsDomain
              settings={filteredSettings}
              onOpenHistory={setHistoryKey}
            />
          )}

          {/* Notifications & Alerts Domain Dedicated View */}
          {activeDomain === "notifications" && !search.trim() && !stateFilter && (
            <PlatformNotificationsDomain
              settings={filteredSettings}
              onOpenHistory={setHistoryKey}
              onOpenScheduleEditor={(setting) => {
                setSelectedSetting(setting);
                setEditValue(setting.value);
              }}
            />
          )}

          {/* Media & Storage Domain Dedicated View */}
          {activeDomain === "storage" && !search.trim() && !stateFilter && (
            <PlatformStorageDomain
              settings={filteredSettings}
              onOpenHistory={setHistoryKey}
            />
          )}

          {/* Grouped Settings by Domain (For non-dedicated domains or when searching/filtering) */}
          {activeDomain !== "sessions" &&
            activeDomain !== "revenue_share" &&
            activeDomain !== "payments" &&
            activeDomain !== "notifications" &&
            activeDomain !== "storage" &&
            Array.from(settingsByDomain.entries()).map(([domainId, domainSettings]) => {
              const def = DOMAIN_DEFINITIONS.find((d) => d.id === domainId);
              const Icon = def?.icon ?? Sliders;

            return (
              <div key={domainId} className="space-y-3">
                {/* Domain Section Header in 'all' view or search results */}
                {(activeDomain === "all" || Boolean(search.trim())) && (
                  <div className="flex items-center justify-between border-b border-border-light pb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", def?.color)} />
                      <h3 className="text-sm font-bold text-text-primary">
                        {isAr ? def?.titleAr : def?.titleEn}
                      </h3>
                    </div>
                    <span className="text-xs text-text-muted">
                      {t("domains.settingsCount", {
                        count: domainSettings.length,
                      })}
                    </span>
                  </div>
                )}

                {/* Settings Cards Grid */}
                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {domainSettings.map((setting) => {
                    const isOverridden = setting.source === "OVERRIDE";
                    const isReadonly = !setting.editable;

                    return (
                      <SurfaceCard
                        key={setting.key}
                        variant="section"
                        className={cn(
                          "relative flex flex-col justify-between p-4 transition-all duration-150",
                          isOverridden && "border-amber-300/80 bg-amber-50/20 dark:border-amber-800/40 dark:bg-amber-950/10"
                        )}
                      >
                        <div className="space-y-2.5">
                          {/* Header: Title + Badges */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <h4 className="text-sm font-bold text-text-primary">
                                {isAr ? (setting.labelAr || setting.label) : setting.label}
                              </h4>
                              <p className="line-clamp-2 text-xs leading-relaxed text-text-secondary">
                                {isAr
                                  ? (setting.descriptionAr || setting.description)
                                  : setting.description}
                              </p>
                            </div>

                            {/* State Badge */}
                            {isOverridden ? (
                              <Badge variant="light" color="warning" size="sm">
                                {t("states.changed")}
                              </Badge>
                            ) : isReadonly ? (
                              <Badge variant="light" color="dark" size="sm">
                                <Lock className="mr-1 h-3 w-3" />
                                {t("states.readonly")}
                              </Badge>
                            ) : (
                              <Badge variant="light" color="success" size="sm">
                                {t("states.default")}
                              </Badge>
                            )}
                          </div>

                          {/* Current Value Preview */}
                          <div className="rounded-xl border border-border-light bg-surface-secondary/40 p-2.5 text-xs dark:bg-white/[0.02]">
                            <div className="flex items-center justify-between font-mono text-[11px] text-text-muted">
                              <span>{isAr ? "القيمة الحالية:" : "Current Value:"}</span>
                              {setting.effect && (
                                <span className="font-sans text-[10px] text-text-muted">
                                  {setting.effect === "NEW_SESSIONS_ONLY"
                                    ? (isAr ? "للجلسات الجديدة فقط" : "New sessions only")
                                    : setting.effect === "IMMEDIATE"
                                      ? (isAr ? "أثر فوري" : "Immediate")
                                      : ""}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 font-semibold text-text-primary">
                              {typeof setting.value === "boolean"
                                ? setting.value
                                  ? t("editor.booleanEnabled")
                                  : t("editor.booleanDisabled")
                                : Array.isArray(setting.value)
                                  ? setting.value.join(", ")
                                  : typeof setting.value === "object" && setting.value !== null
                                    ? JSON.stringify(setting.value)
                                    : String(setting.value ?? "—")}
                            </p>
                          </div>
                        </div>

                        {/* Footer: Technical Key + Edit CTA */}
                        <div className="mt-3 flex items-center justify-between border-t border-border-light pt-2.5">
                          <button
                            type="button"
                            onClick={() => handleCopyKey(setting.key)}
                            className="group/key inline-flex items-center gap-1 font-mono text-[10px] text-text-muted hover:text-text-primary"
                            title={setting.key}
                          >
                            <span className="line-clamp-1 max-w-[140px]">{setting.key}</span>
                            {copiedKey === setting.key ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3 opacity-0 group-hover/key:opacity-100" />
                            )}
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setHistoryKey(setting.key)}
                              className="rounded-lg p-1 text-text-muted hover:bg-surface-secondary hover:text-text-primary"
                              title={t("actions.history")}
                            >
                              <History className="h-3.5 w-3.5" />
                            </button>

                            {setting.editable ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditor(setting)}
                                className="h-7 px-2.5 text-xs font-semibold"
                              >
                                <Edit3 className="mr-1 h-3 w-3" />
                                {t("actions.edit")}
                              </Button>
                            ) : (
                              setting.category === "PAYMENT" && (
                                <Link
                                  href="/admin/payments"
                                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-border-light bg-surface-secondary/50 px-2 text-[11px] font-semibold text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                                >
                                  <span>{isAr ? "تحكم الدفع" : "Gateway"}</span>
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              )
                            )}
                          </div>
                        </div>
                      </SurfaceCard>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 7. Setting Edit Modal */}
      {selectedSetting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border-light bg-surface-primary p-6 shadow-xl dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-border-light pb-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-text-primary">
                  {t("editor.title")}
                </h3>
                <p className="text-xs text-text-secondary">
                  {isAr ? (selectedSetting.labelAr || selectedSetting.label) : selectedSetting.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSetting(null)}
                className="rounded-lg p-1 text-text-muted hover:bg-surface-secondary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Dynamic Value Editor */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-text-primary">
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
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-text-primary">
                  {t("editor.reason")} <span className="text-danger">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("editor.reasonPlaceholder")}
                  rows={2}
                  className="app-control w-full rounded-xl border-border-light px-3 py-2 text-xs text-text-primary focus:bg-surface-primary"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-between border-t border-border-light pt-4">
              <div>
                {selectedSetting.source === "OVERRIDE" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetSetting}
                    disabled={resetMutation.isPending || !reason.trim()}
                    className="text-xs text-danger hover:bg-danger/10"
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    {t("actions.reset")}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSetting(null)}
                >
                  {t("actions.cancel")}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={
                    !reason.trim() ||
                    !isEditorValid ||
                    updateMutation.isPending
                  }
                  className="gap-1.5 font-bold"
                >
                  {updateMutation.isPending && (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {t("actions.save")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Audit History Slide-over Drawer / Modal */}
      {historyKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border-light bg-surface-primary p-6 shadow-xl dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-border-light pb-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-text-primary">
                  {t("history.title")}
                </h3>
                <p className="font-mono text-xs text-text-muted">{historyKey}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryKey(null)}
                className="rounded-lg p-1 text-text-muted hover:bg-surface-secondary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
              {historyQuery.isLoading ? (
                <div className="py-8 text-center">
                  <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (historyQuery.data?.items?.length ?? 0) === 0 ? (
                <p className="py-8 text-center text-xs text-text-muted">
                  {t("history.empty")}
                </p>
              ) : (
                historyQuery.data?.items?.map((item) => (
                  <div
                    key={item.id}
                    className="space-y-1.5 rounded-xl border border-border-light bg-surface-secondary/40 p-3 text-xs dark:bg-white/[0.02]"
                  >
                    <div className="flex items-center justify-between text-text-muted">
                      <span>{item.changedByUser?.displayName || item.changedByUser?.emails?.[0]?.email || "Admin"}</span>
                      <span>{new Date(item.changedAt).toLocaleDateString(isAr ? "ar-EG" : "en-US")}</span>
                    </div>
                    <p className="font-semibold text-text-primary">{item.reason || t("history.noReason")}</p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end border-t border-border-light pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryKey(null)}
              >
                {t("actions.close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
