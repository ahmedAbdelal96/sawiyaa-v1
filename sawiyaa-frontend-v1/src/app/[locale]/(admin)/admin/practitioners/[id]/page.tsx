"use client";

import { use, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getProfessionalTitleLabel } from "@/constants/reference-data";
import {
  ArrowLeft,
  ArrowRight,
  User,
  Shield,
  FileText,
  Briefcase,
  History,
  Coins,
  FileCheck,
  Video,
  ExternalLink,
} from "lucide-react";
import { useAdminPractitionerDetails } from "@/features/admin/practitioners/hooks/use-admin-practitioners";
import { SurfaceCard, SurfaceHeader } from "@/components/shared/SurfaceShell";
import { ListStateSkeleton } from "@/components/shared/ContentStates";
import Avatar from "@/components/ui/avatar/Avatar";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { DataTable } from "@/components/ui/data-table/DataTable";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

const TAB_ICONS: Record<string, any> = {
  overview: Shield,
  basic: User,
  professional: Briefcase,
  application: FileText,
  documents: FileCheck,
  sessions: Video,
  financial: Coins,
  publication: ExternalLink,
  audit: History,
};

export default function AdminPractitionerDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const locale = useLocale();
  const isRtl = locale === "ar";
  const { data, isLoading, isError, refetch } = useAdminPractitionerDetails(id);

  const [activeTab, setActiveTab] = useState<string>("overview");

  const t = (key: string, defaults?: string) => {
    // Basic inline translator for admin practitioner detail interface
    const translations: Record<string, Record<string, string>> = {
      ar: {
        back: "العودة لقائمة المعالجين",
        heading: "تفاصيل المعالج (لوحة الإدارة)",
        preview: "معاينة الملف العام",
        overview: "نظرة عامة",
        basic: "البيانات الأساسية",
        professional: "الملف المهني",
        application: "طلب الانضمام",
        documents: "المستندات",
        sessions: "الجلسات",
        financial: "المالية",
        publication: "النشر",
        audit: "سجل التغييرات",
        id: "معرف المعالج",
        userId: "معرف المستخدم",
        name: "الاسم الكامل",
        email: "البريد الإلكتروني",
        phone: "رقم الهاتف",
        status: "حالة الحساب",
        profileStatus: "حالة الملف",
        country: "الدولة",
        timezone: "المنطقة الزمنية",
        created: "تاريخ الإنشاء",
        updated: "تاريخ التحديث",
        type: "نوع التخصص",
        title: "اللقب المهني",
        bio: "نبذة تعريفية",
        experience: "سنوات الخبرة",
        pricing30: "سعر جلسة 30 دقيقة",
        pricing60: "سعر جلسة 60 دقيقة",
        acceptsPackages: "يقبل الباقات",
        instantBooking: "الحجز الفوري",
        languages: "اللغات",
        specialties: "التخصصات",
        appStatus: "حالة الطلب",
        submittedAt: "تاريخ التقديم",
        reviewedAt: "تاريخ المراجعة",
        reviewNotes: "ملاحظات المراجعة",
        payoutMethod: "طريقة تحويل المستحقات",
        accountHolder: "اسم صاحب الحساب",
        bankName: "اسم البنك",
        accountNum: "رقم الحساب",
        iban: "رقم الآيبان IBAN",
        walletProvider: "مزود المحفظة",
        walletId: "رقم المحفظة",
        totalSessions: "إجمالي الجلسات",
        completedSessions: "الجلسات المكتملة",
        upcomingSessions: "الجلسات القادمة",
        cancelledSessions: "الجلسات الملغاة",
        emptyLogs: "لا توجد سجلات تغيير حتى الآن",
        emptyDocs: "لم يتم رفع مستندات بعد",
      },
      en: {
        back: "Back to practitioners list",
        heading: "Practitioner Details (Admin Panel)",
        preview: "Preview Public Profile",
        overview: "Overview",
        basic: "Basic Information",
        professional: "Professional Profile",
        application: "Application",
        documents: "Documents",
        sessions: "Sessions",
        financial: "Financial",
        publication: "Publication",
        audit: "Audit Log",
        id: "Practitioner ID",
        userId: "User ID",
        name: "Full Name",
        email: "Email Address",
        phone: "Phone Number",
        status: "Account Status",
        profileStatus: "Profile Status",
        country: "Country",
        timezone: "Timezone",
        created: "Created Date",
        updated: "Last Updated",
        type: "Practitioner Type",
        title: "Professional Title",
        bio: "Biography",
        experience: "Years of Experience",
        pricing30: "Session Price 30m",
        pricing60: "Session Price 60m",
        acceptsPackages: "Accepts Packages",
        instantBooking: "Instant Booking",
        languages: "Languages",
        specialties: "Specialties",
        appStatus: "Application Status",
        submittedAt: "Submitted Date",
        reviewedAt: "Reviewed Date",
        reviewNotes: "Review Notes",
        payoutMethod: "Payout Method",
        accountHolder: "Account Holder Name",
        bankName: "Bank Name",
        accountNum: "Account Number",
        iban: "IBAN",
        walletProvider: "Wallet Provider",
        walletId: "Wallet Identifier",
        totalSessions: "Total Sessions",
        completedSessions: "Completed Sessions",
        upcomingSessions: "Upcoming Sessions",
        cancelledSessions: "Cancelled Sessions",
        emptyLogs: "No audit logs found",
        emptyDocs: "No uploaded documents found",
      },
    };
    return translations[locale]?.[key] ?? defaults ?? key;
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <ListStateSkeleton items={3} heightClass="h-20" />
      </div>
    );
  }

  if (isError || !data || !data.details) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-text-primary dark:text-white">
          {locale === "ar" ? "تعذر تحميل بيانات المعالج" : "Failed to load practitioner details"}
        </h2>
        <Button onClick={() => refetch()}>{locale === "ar" ? "إعادة المحاولة" : "Retry"}</Button>
      </div>
    );
  }

  const details = data.details;

  const tabList = [
    { id: "overview", label: t("overview") },
    { id: "basic", label: t("basic") },
    { id: "professional", label: t("professional") },
    { id: "application", label: t("application") },
    { id: "documents", label: t("documents") },
    { id: "sessions", label: t("sessions") },
    { id: "financial", label: t("financial") },
    { id: "publication", label: t("publication") },
    { id: "audit", label: t("audit") },
  ];

  const credentialColumns = [
    {
      id: "type",
      header: locale === "ar" ? "نوع المستند" : "Document Type",
      accessor: (row: any) => row.credentialType,
    },
    {
      id: "status",
      header: locale === "ar" ? "حالة التحقق" : "Verification Status",
      accessor: (row: any) => row.reviewStatus,
      cell: (row: any) => {
        const tones: Record<string, "success" | "warning" | "error" | "light"> = {
          APPROVED: "success",
          PENDING: "warning",
          REJECTED: "error",
        };
        return (
          <Badge variant="solid" color={tones[row.reviewStatus] ?? "light"} size="sm">
            {row.reviewStatus}
          </Badge>
        );
      },
    },
    {
      id: "uploadedAt",
      header: locale === "ar" ? "تاريخ الرفع" : "Uploaded Date",
      accessor: (row: any) => row.uploadedAt,
      cell: (row: any) => new Date(row.uploadedAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US"),
    },
    {
      id: "notes",
      header: locale === "ar" ? "ملاحظات" : "Notes",
      accessor: (row: any) => row.reviewNotes || "-",
    },
    {
      id: "actions",
      header: locale === "ar" ? "تحميل" : "Download",
      accessor: (row: any) => row.credentialId,
      cell: (row: any) => (
        <a
          href={row.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          {locale === "ar" ? "عرض المستند" : "View Document"}
          <ExternalLink className="h-3 w-3" />
        </a>
      ),
    },
  ];

  const auditColumns = [
    {
      id: "occurredAt",
      header: locale === "ar" ? "الوقت" : "Timestamp",
      accessor: (row: any) => row.occurredAt,
      cell: (row: any) => new Date(row.occurredAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-US"),
    },
    {
      id: "typeSlug",
      header: locale === "ar" ? "نوع الحدث" : "Event Type",
      accessor: (row: any) => row.typeSlug,
    },
    {
      id: "actor",
      header: locale === "ar" ? "منفذ الإجراء" : "Actor",
      accessor: (row: any) => row.actorDisplayName || "System",
    },
    {
      id: "title",
      header: locale === "ar" ? "تفاصيل الحدث" : "Event Detail",
      accessor: (row: any) => row.titleSnapshot || "-",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/practitioners"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-primary transition-colors"
        >
          {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {t("back")}
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary dark:text-white">
              {t("heading")}
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {details.displayName}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/practitioners/${details.publicSlug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-border-light bg-white px-4 py-2.5 text-xs font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary dark:bg-white/5"
            >
              {t("preview")}
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Banner Card */}
      <SurfaceCard variant="section" className="flex flex-col md:flex-row items-center gap-6 p-6">
        <Avatar
          src={details.avatarUrl}
          name={details.displayName}
          size="xxlarge"
          className="h-20 w-20 rounded-2xl border border-border-light bg-surface shadow-xs"
        />
        <div className="flex-1 min-w-0 space-y-2 text-center md:text-start">
          <h2 className="text-xl font-bold text-text-primary dark:text-white">
            {details.displayName}
          </h2>
          <p className="text-sm text-text-muted">
            {getProfessionalTitleLabel(details.professionalTitle, locale) || "-"}
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
            <Badge variant="solid" color={details.accountStatus === "ACTIVE" ? "success" : "warning"} size="sm">
              {t("status")}: {details.accountStatus}
            </Badge>
            <Badge variant="solid" color={details.profileStatus === "APPROVED" ? "success" : "warning"} size="sm">
              {t("profileStatus")}: {details.profileStatus}
            </Badge>
          </div>
        </div>
      </SurfaceCard>

      {/* Tab Navigation List */}
      <div className="flex gap-2 border-b border-border-light dark:border-white/5 pb-1 overflow-x-auto whitespace-nowrap scrollbar-none">
        {tabList.map((tab) => {
          const IconComponent = TAB_ICONS[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-2xl transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary dark:hover:bg-white/5"
              }`}
            >
              {IconComponent && <IconComponent className="h-4 w-4" />}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Rendering */}
      <div className="min-h-[300px]">
        {activeTab === "overview" && (
          <SurfaceCard variant="section" className="space-y-6">
            <SurfaceHeader
              eyebrow={t("overview")}
              title={locale === "ar" ? "نظرة عامة على النشاط" : "Activity Overview"}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-border-light bg-surface-secondary p-4 dark:bg-white/5">
                <p className="text-xs text-text-muted uppercase font-semibold">{t("totalSessions")}</p>
                <p className="text-2xl font-bold mt-1 text-text-primary dark:text-white">{details.operations.totalSessions}</p>
              </div>
              <div className="rounded-2xl border border-border-light bg-surface-secondary p-4 dark:bg-white/5">
                <p className="text-xs text-text-muted uppercase font-semibold">{t("completedSessions")}</p>
                <p className="text-2xl font-bold mt-1 text-success-700 dark:text-success-400">{details.operations.completedSessions}</p>
              </div>
              <div className="rounded-2xl border border-border-light bg-surface-secondary p-4 dark:bg-white/5">
                <p className="text-xs text-text-muted uppercase font-semibold">{t("upcomingSessions")}</p>
                <p className="text-2xl font-bold mt-1 text-primary">{details.operations.upcomingSessions}</p>
              </div>
              <div className="rounded-2xl border border-border-light bg-surface-secondary p-4 dark:bg-white/5">
                <p className="text-xs text-text-muted uppercase font-semibold">{t("cancelledSessions")}</p>
                <p className="text-2xl font-bold mt-1 text-danger-700 dark:text-danger-400">{details.operations.cancelledSessions}</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-text-primary dark:text-white">{t("languages")}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {details.languages.map((l: string) => (
                    <Badge key={l} variant="light" color="light" size="sm">{l}</Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-text-primary dark:text-white">{t("specialties")}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {details.specialties.map((s: any) => (
                    <Badge key={s.specialtyId} variant="light" color="primary" size="sm">
                      {s.title} {s.isPrimary && "*"}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </SurfaceCard>
        )}

        {activeTab === "basic" && (
          <SurfaceCard variant="section" className="space-y-4">
            <SurfaceHeader eyebrow={t("basic")} title={t("basic")} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs text-text-muted">{t("id")}</p>
                <p className="text-sm font-semibold mt-1 text-text-primary dark:text-white">{details.id}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">{t("userId")}</p>
                <p className="text-sm font-semibold mt-1 text-text-primary dark:text-white">{details.userId}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">{t("name")}</p>
                <p className="text-sm font-semibold mt-1 text-text-primary dark:text-white">{details.displayName}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">{t("email")}</p>
                <p className="text-sm font-semibold mt-1 text-text-primary dark:text-white">{details.email || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">{t("phone")}</p>
                <p className="text-sm font-semibold mt-1 text-text-primary dark:text-white">{details.phone || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">{t("country")}</p>
                <p className="text-sm font-semibold mt-1 text-text-primary dark:text-white">{details.countryName || details.countryCode || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">{t("timezone")}</p>
                <p className="text-sm font-semibold mt-1 text-text-primary dark:text-white">{details.timezone || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">{t("created")}</p>
                <p className="text-sm font-semibold mt-1 text-text-primary dark:text-white">
                  {new Date(details.createdAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">{t("updated")}</p>
                <p className="text-sm font-semibold mt-1 text-text-primary dark:text-white">
                  {new Date(details.updatedAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}
                </p>
              </div>
            </div>
          </SurfaceCard>
        )}

        {activeTab === "professional" && (
          <SurfaceCard variant="section" className="space-y-5">
            <SurfaceHeader eyebrow={t("professional")} title={t("professional")} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs text-text-muted">{t("type")}</p>
                <p className="text-sm font-semibold mt-1 text-text-primary dark:text-white uppercase">{details.practitionerType}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">{t("title")}</p>
                <p className="text-sm font-semibold mt-1 text-text-primary dark:text-white">{getProfessionalTitleLabel(details.professionalTitle, locale) || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">{t("experience")}</p>
                <p className="text-sm font-semibold mt-1 text-text-primary dark:text-white">
                  {details.yearsOfExperience} {locale === "ar" ? "سنوات" : "years"}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">{t("pricing30")}</p>
                <p className="text-sm font-bold mt-1 text-primary">
                  {details.pricing.session30.egp ? `${details.pricing.session30.egp} EGP` : "-"} / {details.pricing.session30.usd ? `${details.pricing.session30.usd} USD` : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">{t("pricing60")}</p>
                <p className="text-sm font-bold mt-1 text-primary">
                  {details.pricing.session60.egp ? `${details.pricing.session60.egp} EGP` : "-"} / {details.pricing.session60.usd ? `${details.pricing.session60.usd} USD` : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">{t("acceptsPackages")}</p>
                <Badge variant="solid" color={details.acceptsPackages ? "success" : "light"}>
                  {details.acceptsPackages ? (locale === "ar" ? "نعم" : "Yes") : (locale === "ar" ? "لا" : "No")}
                </Badge>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <p className="text-xs text-text-muted">{t("bio")}</p>
              <p className="text-sm leading-relaxed text-text-secondary dark:text-white/80 p-4 rounded-2xl bg-surface-secondary dark:bg-white/5 border border-border-light">
                {details.bio || "-"}
              </p>
            </div>
          </SurfaceCard>
        )}

        {activeTab === "application" && (
          <SurfaceCard variant="section" className="space-y-4">
            <SurfaceHeader eyebrow={t("application")} title={t("application")} />
            {details.application ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs text-text-muted">{t("appStatus")}</p>
                  <Badge variant="solid" color={details.application.status === "APPROVED" ? "success" : "warning"}>
                    {details.application.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-text-muted">{t("submittedAt")}</p>
                  <p className="text-sm font-semibold mt-1 text-text-primary dark:text-white">
                    {details.application.submittedAt
                      ? new Date(details.application.submittedAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">{t("reviewedAt")}</p>
                  <p className="text-sm font-semibold mt-1 text-text-primary dark:text-white">
                    {details.application.reviewedAt
                      ? new Date(details.application.reviewedAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")
                      : "-"}
                  </p>
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <p className="text-xs text-text-muted">{t("reviewNotes")}</p>
                  <p className="text-sm text-text-secondary mt-1">{details.application.reviewNotes || "-"}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted">{locale === "ar" ? "لا يوجد طلب انضمام مسجل" : "No application registered"}</p>
            )}
          </SurfaceCard>
        )}

        {activeTab === "documents" && (
          <SurfaceCard variant="section" className="space-y-4">
            <SurfaceHeader eyebrow={t("documents")} title={t("documents")} />
            <DataTable
              data={details.credentials}
              columns={credentialColumns}
              getRowId={(row) => row.credentialId}
              emptyState={{
                title: t("emptyDocs"),
                description: locale === "ar" ? "لم يقم المعالج برفع أي مستندات رسمية للتحقق." : "No verification documents uploaded yet.",
              }}
            />
          </SurfaceCard>
        )}

        {activeTab === "sessions" && (
          <SurfaceCard variant="section" className="space-y-4">
            <SurfaceHeader eyebrow={t("sessions")} title={t("sessions")} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-border-light bg-surface p-4 text-center">
                <p className="text-xs text-text-muted">{t("totalSessions")}</p>
                <p className="text-3xl font-extrabold text-text-primary dark:text-white mt-1">{details.operations.totalSessions}</p>
              </div>
              <div className="rounded-2xl border border-border-light bg-surface p-4 text-center">
                <p className="text-xs text-text-muted">{t("completedSessions")}</p>
                <p className="text-3xl font-extrabold text-success-700 dark:text-success-400 mt-1">{details.operations.completedSessions}</p>
              </div>
              <div className="rounded-2xl border border-border-light bg-surface p-4 text-center">
                <p className="text-xs text-text-muted">{t("upcomingSessions")}</p>
                <p className="text-3xl font-extrabold text-primary mt-1">{details.operations.upcomingSessions}</p>
              </div>
              <div className="rounded-2xl border border-border-light bg-surface p-4 text-center">
                <p className="text-xs text-text-muted">{t("cancelledSessions")}</p>
                <p className="text-3xl font-extrabold text-danger-700 dark:text-danger-400 mt-1">{details.operations.cancelledSessions}</p>
              </div>
            </div>
          </SurfaceCard>
        )}

        {activeTab === "financial" && (
          <SurfaceCard variant="section" className="space-y-4">
            <SurfaceHeader eyebrow={t("financial")} title={t("financial")} />
            {details.payoutDestination ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs text-text-muted">{t("payoutMethod")}</p>
                  <p className="text-sm font-semibold mt-1 text-text-primary dark:text-white uppercase">{details.payoutDestination.methodType}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">{t("accountHolder")}</p>
                  <p className="text-sm font-semibold mt-1 text-text-primary dark:text-white">{details.payoutDestination.accountHolderName || "-"}</p>
                </div>
                {details.payoutDestination.methodType === "BANK" ? (
                  <>
                    <div>
                      <p className="text-xs text-text-muted">{t("bankName")}</p>
                      <p className="text-sm font-semibold mt-1 text-text-primary dark:text-white">{details.payoutDestination.bankName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">{t("accountNum")}</p>
                      <p className="text-sm font-mono font-semibold mt-1 text-text-primary dark:text-white">{details.payoutDestination.bankAccountNumber || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">{t("iban")}</p>
                      <p className="text-sm font-mono font-semibold mt-1 text-text-primary dark:text-white">{details.payoutDestination.iban || "-"}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-text-muted">{t("walletProvider")}</p>
                      <p className="text-sm font-semibold mt-1 text-text-primary dark:text-white">{details.payoutDestination.walletProvider || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">{t("walletId")}</p>
                      <p className="text-sm font-mono font-semibold mt-1 text-text-primary dark:text-white">{details.payoutDestination.walletIdentifier || "-"}</p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-muted">{locale === "ar" ? "لم يتم تحديد بيانات تحويل المستحقات" : "No payout details registered"}</p>
            )}
          </SurfaceCard>
        )}

        {activeTab === "publication" && (
          <SurfaceCard variant="section" className="space-y-4">
            <SurfaceHeader eyebrow={t("publication")} title={t("publication")} />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-text-muted">{locale === "ar" ? "الحالة المنشورة" : "Publication State"}</p>
                <Badge variant="solid" color={details.profileStatus === "APPROVED" ? "success" : "light"}>
                  {details.profileStatus === "APPROVED" ? (locale === "ar" ? "منشور للعامة" : "Published to Public") : (locale === "ar" ? "غير منشور" : "Unpublished")}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-text-muted">{locale === "ar" ? "رابط التعريف العام" : "Public Slug Route"}</p>
                <p className="text-sm font-semibold mt-1 text-text-primary dark:text-white">
                  /practitioners/{details.publicSlug || details.id}
                </p>
              </div>
            </div>
          </SurfaceCard>
        )}

        {activeTab === "audit" && (
          <SurfaceCard variant="section" className="space-y-4">
            <SurfaceHeader eyebrow={t("audit")} title={t("audit")} />
            <DataTable
              data={details.auditLogs}
              columns={auditColumns}
              getRowId={(row) => row.id}
              emptyState={{
                title: t("emptyLogs"),
                description: locale === "ar" ? "لا توجد عمليات مراجعة أو تعديل مسجلة لهذا المعالج." : "No operations recorded for this practitioner yet.",
              }}
            />
          </SurfaceCard>
        )}
      </div>
    </div>
  );
}
