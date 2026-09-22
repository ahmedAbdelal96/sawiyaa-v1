"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuthState } from "@/stores/auth-store";
import {
  AlertCircle,
  Award,
  BookOpen,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  GraduationCap,
  Search,
  SlidersHorizontal,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import PatientSectionFrame from "@/components/patient/PatientSectionFrame";
import { StateCard } from "@/components/shared/ContentStates";
import { Skeleton } from "@/components/shared/LoadingStates";
import { usePatientAcademyProgramEnrollments } from "../hooks/use-academy-programs";
import {
  resolveAcademyProgramEnrollmentStatusLabel,
  resolveAcademyProgramLocalizedValue,
  resolveAcademyProgramDeliveryMethodLabel,
} from "../lib/academy-program-localization";
import type { AcademyProgramEnrollmentItem } from "../types/academy-programs.types";

const PAGE_SIZE = 9;

function formatDate(value: string | null, locale: string) {
  if (!value) return null;

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatMoney(amount: string | null, currency: string | null, locale: string) {
  if (!amount || !currency) return null;

  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    return `${amount} ${currency}`;
  }

  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch {
    return `${amount} ${currency}`;
  }
}

function resolveProgramTitle(enrollment: AcademyProgramEnrollmentItem, locale: string) {
  return (
    resolveAcademyProgramLocalizedValue({
      locale,
      primary: enrollment.program.titleAr,
      secondary: enrollment.program.titleEn,
      fallback: enrollment.program.title ?? enrollment.program.slug,
    }) || enrollment.program.slug
  );
}

function resolveProgramDescription(enrollment: AcademyProgramEnrollmentItem, locale: string) {
  return (
    resolveAcademyProgramLocalizedValue({
      locale,
      primary: enrollment.program.descriptionAr,
      secondary: enrollment.program.descriptionEn,
      fallback: enrollment.program.description ?? null,
    }) || null
  );
}

function resolveEnrollmentBadge(
  status: AcademyProgramEnrollmentItem["status"],
  t: ReturnType<typeof useTranslations>,
) {
  const label = resolveAcademyProgramEnrollmentStatusLabel(status, t);
  switch (status) {
    case "CONFIRMED":
      return {
        label,
        className: "bg-emerald-500/90 text-white border-emerald-400/30",
        icon: CheckCircle2,
      };
    case "PENDING_PAYMENT":
      return {
        label,
        className: "bg-amber-500/90 text-white border-amber-400/30",
        icon: Clock,
      };
    case "CANCELLED":
    case "EXPIRED":
      return {
        label,
        className: "bg-slate-600/90 text-white border-slate-500/30",
        icon: AlertCircle,
      };
    default:
      return {
        label,
        className: "bg-primary/90 text-white border-primary/30",
        icon: Sparkles,
      };
  }
}

function EnrollmentCard({
  enrollment,
  locale,
  t,
  academyBase,
}: {
  enrollment: AcademyProgramEnrollmentItem;
  locale: string;
  t: ReturnType<typeof useTranslations>;
  academyBase: string;
}) {
  const title = resolveProgramTitle(enrollment, locale);
  const description = resolveProgramDescription(enrollment, locale);
  const badge = resolveEnrollmentBadge(enrollment.status, t);
  const BadgeIcon = badge.icon;
  const startDate = formatDate(enrollment.program.startAt, locale);
  const endDate = formatDate(enrollment.program.endAt, locale);
  const amountLabel =
    formatMoney(
      enrollment.payment?.amountTotal ?? enrollment.selectedAmountSnapshot,
      enrollment.payment?.currencyCode ?? enrollment.selectedCurrencyCode,
      locale,
    ) ?? t("public.detail.free");

  const isPendingPayment =
    enrollment.status === "PENDING_PAYMENT" && Boolean(enrollment.payment);
  const isConfirmed = enrollment.status === "CONFIRMED";
  const actionHref = isPendingPayment
    ? `${academyBase}/program-enrollments/${enrollment.id}/pay`
    : `${academyBase}/program-enrollments/${enrollment.id}`;

  const actionLabel = isPendingPayment
    ? "إكمال الدفع الآن"
    : isConfirmed
      ? "دخول الدورة والجدول"
      : "عرض تفاصيل الدورة";

  const totalSessions =
    enrollment.attendanceSummary?.totalSessions ??
    enrollment.program.sessions?.length ??
    0;
  const attendedSessions = enrollment.attendanceSummary?.attendedSessions ?? 0;
  const attendancePercentage =
    enrollment.attendanceSummary?.attendancePercentage ??
    (totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0);

  const hasCertificate =
    enrollment.certificate?.status === "ISSUED" ||
    enrollment.certificate?.downloadAvailable;

  const categoryTitle =
    enrollment.program.category
      ? resolveAcademyProgramLocalizedValue({
          locale,
          primary: enrollment.program.category.titleAr,
          secondary: enrollment.program.category.titleEn,
          fallback: enrollment.program.category.title,
        })
      : null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border-light/80 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md dark:border-border-dark dark:bg-surface-secondary">
      {/* Visual Thumbnail Header */}
      <div className="relative h-44 w-full overflow-hidden bg-linear-to-br from-primary/15 via-surface-tertiary to-primary/5">
        {enrollment.program.coverImageUrl ? (
          <Image
            src={enrollment.program.coverImageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-tr from-primary/20 via-primary/10 to-teal-500/10">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 text-primary shadow-xs backdrop-blur-xs dark:bg-surface-secondary/80">
              <GraduationCap className="h-8 w-8" />
            </div>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/20" />

        {/* Top Badges */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md shadow-xs ${badge.className}`}
          >
            <BadgeIcon className="h-3 w-3" />
            <span>{badge.label}</span>
          </span>

          {categoryTitle ? (
            <span className="rounded-lg bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
              {categoryTitle}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
              <Sparkles className="h-3 w-3 text-amber-300" />
              <span>دورة تدريبية</span>
            </span>
          )}
        </div>

        {/* Bottom Thumbnail Overlay Info */}
        <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between text-[11px] text-white/90">
          {totalSessions > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-black/40 px-2 py-0.5 backdrop-blur-xs">
              <Video className="h-3 w-3 text-primary-light" />
              <span>{totalSessions} محاضرات</span>
            </span>
          ) : <span />}

          <span className="inline-flex items-center gap-1 rounded-md bg-black/40 px-2 py-0.5 font-semibold backdrop-blur-xs">
            <CreditCard className="h-3 w-3 text-amber-300" />
            <span>{amountLabel}</span>
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
        <div className="space-y-2.5">
          <h3 className="text-base font-bold leading-snug text-text-primary line-clamp-2 transition-colors group-hover:text-primary dark:text-white">
            {title}
          </h3>

          {description ? (
            <p className="text-xs leading-relaxed text-text-secondary line-clamp-2 dark:text-text-muted">
              {description}
            </p>
          ) : null}

          {/* Dates Metadata */}
          {startDate || endDate ? (
            <div className="flex items-center gap-1.5 text-xs text-text-secondary pt-1">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              <span className="truncate">
                {startDate ?? "-"} {endDate ? `— ${endDate}` : ""}
              </span>
            </div>
          ) : null}

          {/* Attendance Progress (for active enrollments with sessions) */}
          {isConfirmed && totalSessions > 0 ? (
            <div className="pt-1 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-text-secondary">
                <span>نسبة الحضور</span>
                <span className="font-semibold text-primary">
                  {attendedSessions}/{totalSessions} ({attendancePercentage}%)
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary dark:bg-surface-tertiary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, attendancePercentage))}%` }}
                />
              </div>
            </div>
          ) : null}

          {/* Certificate Ready Badge */}
          {hasCertificate ? (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Award className="h-3.5 w-3.5" />
              <span>الشهادة جاهزة للتحميل</span>
            </div>
          ) : null}
        </div>

        {/* Card Footer CTA Button */}
        <div className="border-t border-border-light/60 pt-3 dark:border-border-dark">
          <Link
            href={actionHref}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold transition-all ${
              isPendingPayment
                ? "bg-amber-500 text-white shadow-xs hover:bg-amber-600 active:scale-[0.98]"
                : isConfirmed
                  ? "bg-primary text-white shadow-xs hover:bg-primary-hover active:scale-[0.98]"
                  : "border border-border-light bg-surface-tertiary text-text-primary hover:border-primary/40 hover:text-primary dark:bg-surface-secondary dark:border-border-dark"
            }`}
          >
            <span>{actionLabel}</span>
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}

type TabKey = "all" | "confirmed" | "pending" | "ended";
type SortOption = "newest" | "oldest" | "start-date";

export default function PatientAcademyProgramEnrollmentsScreen() {
  const t = useTranslations("academy");
  const locale = useLocale();
  const { user } = useAuthState();

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const academyBase = user?.role === "TRAINEE" ? "/trainee/academy" : "/patient/academy";
  const { data, isLoading, isError, refetch } = usePatientAcademyProgramEnrollments({
    page: 1,
    limit: 100,
  });

  const enrollments = data?.items ?? [];

  // Filter & Search Logic
  const filteredAndSearchedEnrollments = useMemo(() => {
    let result = [...enrollments];

    // Status Tab Filter
    switch (activeTab) {
      case "confirmed":
        result = result.filter((item) => item.status === "CONFIRMED");
        break;
      case "pending":
        result = result.filter((item) => item.status === "PENDING_PAYMENT");
        break;
      case "ended":
        result = result.filter(
          (item) => item.status === "CANCELLED" || item.status === "EXPIRED",
        );
        break;
      default:
        break;
    }

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((item) => {
        const title = resolveProgramTitle(item, locale).toLowerCase();
        const desc = (resolveProgramDescription(item, locale) ?? "").toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "start-date") {
        const timeA = new Date(a.program.startAt ?? 0).getTime();
        const timeB = new Date(b.program.startAt ?? 0).getTime();
        return timeB - timeA;
      }
      if (sortBy === "oldest") {
        const timeA = new Date(a.registeredAt ?? 0).getTime();
        const timeB = new Date(b.registeredAt ?? 0).getTime();
        return timeA - timeB;
      }
      // default: newest
      const timeA = new Date(a.registeredAt ?? 0).getTime();
      const timeB = new Date(b.registeredAt ?? 0).getTime();
      return timeB - timeA;
    });

    return result;
  }, [enrollments, activeTab, searchQuery, sortBy, locale]);

  // Pagination
  const totalItems = filteredAndSearchedEnrollments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const paginatedEnrollments = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSearchedEnrollments.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredAndSearchedEnrollments, currentPage]);

  const counts = useMemo(
    () => ({
      all: enrollments.length,
      confirmed: enrollments.filter((e) => e.status === "CONFIRMED").length,
      pending: enrollments.filter((e) => e.status === "PENDING_PAYMENT").length,
      ended: enrollments.filter(
        (e) => e.status === "CANCELLED" || e.status === "EXPIRED",
      ).length,
    }),
    [enrollments],
  );

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <PatientSectionFrame
        title={t("patient.home.title")}
        description={t("patient.home.note")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </PatientSectionFrame>
    );
  }

  if (isError) {
    return (
      <PatientSectionFrame
        title={t("patient.home.title")}
        description={t("patient.home.note")}
      >
        <StateCard
          icon={<AlertCircle className="h-6 w-6 text-primary" />}
          title={t("patient.home.error.title")}
          note={t("patient.home.error.note")}
          action={{
            label: t("patient.home.error.retry") || "إعادة المحاولة",
            onClick: () => refetch(),
          }}
          className="rounded-2xl"
        />
      </PatientSectionFrame>
    );
  }

  return (
    <PatientSectionFrame
      title={t("patient.home.title")}
      description={t("patient.home.note")}
    >
      {enrollments.length > 0 ? (
        <div className="space-y-6">
          {/* Controls Bar: Search + Tabs + Sort */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { key: "all", label: "الكل", count: counts.all },
                {
                  key: "confirmed",
                  label: "المؤكدة والجارية",
                  count: counts.confirmed,
                },
                {
                  key: "pending",
                  label: "في انتظار الدفع",
                  count: counts.pending,
                },
                {
                  key: "ended",
                  label: "المنتهية",
                  count: counts.ended,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key as TabKey)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                    activeTab === tab.key
                      ? "bg-primary text-white shadow-xs"
                      : "border border-border-light bg-white text-text-secondary hover:border-primary/30 hover:text-text-primary dark:bg-surface-secondary dark:border-border-dark"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 ? (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        activeTab === tab.key
                          ? "bg-white/20 text-white"
                          : "bg-surface-tertiary text-text-muted"
                      }`}
                    >
                      {tab.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {/* Search & Sort Controls */}
            <div className="flex items-center gap-2.5">
              {/* Search Box */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="ابحث في دوراتك..."
                  className="w-full rounded-xl border border-border-light bg-white py-2 ps-9 pe-8 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-hidden dark:bg-surface-secondary dark:border-border-dark"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => handleSearchChange("")}
                    className="absolute end-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              {/* Sort Selector */}
              <div className="relative shrink-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="rounded-xl border border-border-light bg-white py-2 px-3 text-xs font-medium text-text-secondary focus:border-primary focus:outline-hidden dark:bg-surface-secondary dark:border-border-dark cursor-pointer"
                >
                  <option value="newest">الأحدث تسجيلاً</option>
                  <option value="oldest">الأقدم تسجيلاً</option>
                  <option value="start-date">تاريخ بدء الدورة</option>
                </select>
              </div>
            </div>
          </div>

          {/* Course Cards Responsive Grid */}
          {paginatedEnrollments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {paginatedEnrollments.map((enrollment) => (
                <EnrollmentCard
                  key={enrollment.id}
                  enrollment={enrollment}
                  locale={locale}
                  t={t}
                  academyBase={academyBase}
                />
              ))}
            </div>
          ) : (
            <StateCard
              icon={<Search className="h-6 w-6 text-primary" />}
              title="لم يتم العثور على دورات مطابقة"
              note="جرّب تغيير كلمات البحث أو تغيير التبويب المختار لعرض بقية الدورات."
              action={{
                label: "إعادة تعيين البحث",
                onClick: () => {
                  setSearchQuery("");
                  setActiveTab("all");
                },
              }}
              className="rounded-2xl py-10"
            />
          )}

          {/* Pagination Controls */}
          {totalPages > 1 ? (
            <div className="flex flex-col gap-3 border-t border-border-light/60 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-border-dark">
              <p className="text-xs text-text-secondary">
                عرض {paginatedEnrollments.length} من أصل {totalItems} دورة
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-border-light bg-white px-3 text-xs font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:bg-surface-secondary dark:border-border-dark cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span>السابق</span>
                </button>

                <span className="px-2 text-xs font-medium text-text-secondary">
                  صفحة {currentPage} من {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-border-light bg-white px-3 text-xs font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:bg-surface-secondary dark:border-border-dark cursor-pointer"
                >
                  <span>التالي</span>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-3xl border border-dashed border-border-light bg-white p-8 text-center sm:p-12 dark:bg-surface-secondary dark:border-border-dark">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-text-primary dark:text-white">
            {t("patient.home.empty.title")}
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-text-secondary dark:text-text-muted">
            {t("patient.home.empty.note")}
          </p>
          <div className="mt-6">
            <Link
              href="/academy"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-primary-hover active:scale-[0.98]"
            >
              <span>{t("patient.home.empty.action")}</span>
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      )}
    </PatientSectionFrame>
  );
}


