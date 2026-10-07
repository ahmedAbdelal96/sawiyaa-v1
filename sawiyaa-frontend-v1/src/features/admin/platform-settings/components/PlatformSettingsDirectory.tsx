"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CreditCard,
  FileCog,
  FolderCog,
  Globe2,
  Image,
  MessageCircle,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import Badge from "@/components/ui/badge/Badge";
import { usePlatformSettings } from "../hooks/use-platform-settings";
import type {
  PlatformSettingDomain,
  PlatformSettingDomainSummary,
} from "../types/platform-settings.types";
import { getSettingPresentation } from "./inline/platform-settings-human-presentation";

const DOMAIN_ORDER: PlatformSettingDomain[] = [
  "sessions",
  "notifications",
  "messaging",
  "practitioners",
  "patientsAccounts",
  "contentAcademy",
  "general",
  "paymentsFinance",
  "advanced",
];

const DOMAIN_FALLBACKS: Record<
  PlatformSettingDomain,
  Pick<
    PlatformSettingDomainSummary,
    "title" | "titleAr" | "description" | "descriptionAr"
  >
> = {
  sessions: {
    title: "Sessions & Booking",
    titleAr: "الجلسات والحجوزات",
    description: "Session timing and package policies.",
    descriptionAr: "ضوابط توقيت الجلسات والباقات.",
  },
  notifications: {
    title: "Notifications",
    titleAr: "الإشعارات",
    description: "Reminder and delivery policies.",
    descriptionAr: "ضوابط التذكير وقنوات الإرسال.",
  },
  messaging: {
    title: "Messaging & Care Chat",
    titleAr: "المراسلات ومحادثات الرعاية",
    description: "Care chat attachment policies.",
    descriptionAr: "ضوابط مرفقات محادثات الرعاية.",
  },
  practitioners: {
    title: "Practitioners",
    titleAr: "الممارسون",
    description: "Profile and credential policies.",
    descriptionAr: "ضوابط الصور ومستندات الاعتماد.",
  },
  patientsAccounts: {
    title: "Patients & Accounts",
    titleAr: "الحسابات وملفات المستخدمين",
    description: "Account and profile image policies.",
    descriptionAr: "ضوابط صور الحسابات والملفات.",
  },
  contentAcademy: {
    title: "Content & Academy",
    titleAr: "المحتوى والأكاديمية",
    description: "Content and academy asset policies.",
    descriptionAr: "ضوابط أصول المحتوى والأكاديمية.",
  },
  general: {
    title: "General Platform",
    titleAr: "إعدادات المنصة العامة",
    description: "Verified platform defaults and locale metadata.",
    descriptionAr: "الإعدادات العامة وبيانات اللغة المؤكدة.",
  },
  paymentsFinance: {
    title: "Payments & Finance",
    titleAr: "المدفوعات والمالية",
    description: "Status for dedicated payment controls.",
    descriptionAr: "حالة الضوابط المخصصة للمدفوعات.",
  },
  advanced: {
    title: "Advanced / Technical",
    titleAr: "متقدم / تقني",
    description: "Technical policies and safe diagnostics.",
    descriptionAr: "السياسات التقنية والتشخيصات الآمنة.",
  },
};

const DOMAIN_ICONS = {
  sessions: CalendarDays,
  notifications: Bell,
  messaging: MessageCircle,
  practitioners: ShieldCheck,
  patientsAccounts: Users,
  contentAcademy: Image,
  general: Globe2,
  paymentsFinance: CreditCard,
  advanced: FileCog,
} satisfies Record<PlatformSettingDomain, typeof CalendarDays>;

function routeForDomain(
  domain: PlatformSettingDomain,
  dedicatedRoute?: string | null,
) {
  if (dedicatedRoute) return dedicatedRoute;
  const routeSegment: Record<PlatformSettingDomain, string> = {
    sessions: "sessions",
    notifications: "notifications",
    messaging: "messaging",
    practitioners: "practitioners",
    patientsAccounts: "patients-accounts",
    contentAcademy: "content-academy",
    general: "general",
    paymentsFinance: "payments-finance",
    advanced: "advanced",
  };
  return "/admin/platform-settings/" + routeSegment[domain];
}

function mergeDomainSummary(
  domain: PlatformSettingDomain,
  summary: PlatformSettingDomainSummary | undefined,
): PlatformSettingDomainSummary {
  return {
    primaryDomain: domain,
    ...DOMAIN_FALLBACKS[domain],
    count: 0,
    ordinaryCount: 0,
    customizedCount: 0,
    attentionCount: 0,
    permissionState: "VIEW_ONLY",
    lastChange: null,
    dedicatedRoute: domain === "paymentsFinance" ? "/admin/payments" : null,
    status: domain === "advanced" ? "ADVANCED" : "READY",
    ...summary,
  };
}

export default function PlatformSettingsDirectory() {
  const t = useTranslations("admin-platform-settings");
  const locale = useLocale();
  const isAr = locale.startsWith("ar");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const query = usePlatformSettings({
    search: deferredSearch.trim() || undefined,
  });
  const data = query.data;

  const domains = useMemo(() => {
    const summaries = new Map(
      (data?.domains ?? []).map((domain) => [domain.primaryDomain, domain]),
    );
    return DOMAIN_ORDER.map((domain) =>
      mergeDomainSummary(domain, summaries.get(domain)),
    );
  }, [data?.domains]);

  return (
    <div className="space-y-6 pb-12">
      <div className="space-y-2">
        <div className="text-primary flex items-center gap-2 text-xs font-bold tracking-[0.16em] uppercase">
          <FolderCog className="h-4 w-4" />
          <span>{t("directory.eyebrow")}</span>
        </div>
        <h1 className="text-text-primary text-2xl font-black tracking-tight md:text-3xl">
          {t("directory.title")}
        </h1>
        <p className="text-text-secondary max-w-3xl text-sm leading-7">
          {t("directory.description")}
        </p>
      </div>

      <SurfaceCard variant="section" className="p-4 md:p-5">
        <label className="relative block">
          <Search className="text-text-muted pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("directory.search")}
            aria-label={t("directory.search")}
            className="app-control border-border-light bg-surface-secondary/50 text-text-primary w-full rounded-xl py-3 ps-10 text-sm"
          />
        </label>
      </SurfaceCard>

      {query.isLoading ? (
        <SurfaceCard
          variant="section"
          className="text-text-secondary p-10 text-center text-sm"
        >
          {t("states.loading")}
        </SurfaceCard>
      ) : query.isError ? (
        <SurfaceCard
          variant="section"
          className="text-danger p-10 text-center text-sm"
        >
          {t("states.error")}
        </SurfaceCard>
      ) : deferredSearch.trim() ? (
        <SurfaceCard variant="section" className="space-y-3 p-4 md:p-5">
          <div className="text-text-primary flex items-center gap-2 text-sm font-bold">
            <Search className="text-primary h-4 w-4" />
            <span>{t("directory.searchResults")}</span>
          </div>
          {(data?.settings ?? []).length === 0 ? (
            <p className="text-text-muted py-8 text-center text-sm">
              {t("directory.noResults")}
            </p>
          ) : (
            <div className="divide-border-light divide-y">
              {(data?.settings ?? []).map((setting) => (
                <Link
                  key={setting.key}
                  href={routeForDomain(
                    setting.capabilities?.advancedOnly
                      ? "advanced"
                      : (setting.primaryDomain ?? "advanced"),
                    setting.dedicatedRoute,
                  )}
                  className="hover:text-primary flex items-center justify-between gap-4 py-3 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="text-text-primary block truncate text-sm font-bold">
                      {getSettingPresentation(setting, isAr).label}
                    </span>
                    <span className="text-text-muted block truncate text-xs">
                      {getSettingPresentation(setting, isAr).description}
                    </span>
                  </span>
                  {isAr ? (
                    <ChevronLeft className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </SurfaceCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {domains.map((domain) => {
              const Icon = DOMAIN_ICONS[domain.primaryDomain];
              const href = routeForDomain(
                domain.primaryDomain,
                domain.dedicatedRoute,
              );
              const title = isAr ? domain.titleAr : domain.title;
              const description = isAr
                ? domain.descriptionAr
                : domain.description;
              const displayedCount = domain.ordinaryCount || domain.count;
              const statusLabel =
                domain.status === "MANAGED_ELSEWHERE"
                  ? t("directory.managedElsewhere")
                  : domain.status === "NEEDS_ATTENTION"
                    ? t("directory.needsAttention")
                    : domain.status === "ADVANCED"
                      ? t("directory.advancedStatus")
                      : t("directory.ready");

              return (
                <Link
                  key={domain.primaryDomain}
                  href={href}
                  className="group border-border-light bg-surface-primary hover:border-primary/40 rounded-2xl border p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-xl">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge
                      variant="light"
                      color={
                        domain.status === "NEEDS_ATTENTION"
                          ? "warning"
                          : "light"
                      }
                      size="sm"
                    >
                      {statusLabel}
                    </Badge>
                  </div>
                  <h2 className="text-text-primary group-hover:text-primary mt-4 text-base font-black">
                    {title}
                  </h2>
                  <p className="text-text-secondary mt-1 min-h-10 text-xs leading-6">
                    {description}
                  </p>
                  {domain.primaryDomain === "paymentsFinance" && (
                    <p className="text-text-muted mt-3 text-xs font-semibold">
                      {t("directory.paymentNote")}
                    </p>
                  )}
                  <div className="border-border-light text-text-muted mt-5 flex items-center justify-between border-t pt-3 text-xs font-bold">
                    <span>
                      {t("directory.settingsCount", { count: displayedCount })}
                    </span>
                    <span className="text-primary inline-flex items-center gap-1">
                      {t("directory.open")}
                      {isAr ? (
                        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      )}
                    </span>
                  </div>
                  {domain.attentionCount > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                      <CircleAlert className="h-3.5 w-3.5" />
                      {t("directory.attention")}
                    </div>
                  )}
                </Link>
              );
            })}
        </div>
      )}
    </div>
  );
}
