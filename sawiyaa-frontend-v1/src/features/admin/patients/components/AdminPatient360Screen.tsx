"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import Button from "@/components/ui/button/Button";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import {
  DEFAULT_PAGE_LIMIT,
  DEFAULT_PAGE_SIZE_OPTIONS,
} from "@/constants/pagination";
import { cn } from "@/lib/utils";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import {
  CalendarClock,
  CreditCard,
  FileText,
  Wallet,
  Users,
  Copy,
  Check,
  Globe,
  Mail,
  Phone,
  User,
  AlertCircle,
  RefreshCw,
  Video,
  ShieldCheck,
  Calendar,
  KeyRound,
  Sparkles,
  Package,
  GraduationCap,
} from "lucide-react";
import AvatarText from "@/components/ui/avatar/AvatarText";
import {
  useAdminPatientDetails,
  useAdminCountries,
} from "../hooks/use-admin-patients";
import {
  useAdminPatientWalletEntries,
  useAdminPatientWalletSummary,
} from "../hooks/use-admin-patient-wallet";
import { useAdminSessions } from "@/features/admin/sessions/hooks/use-admin-sessions";
import type { AdminSessionListItem } from "@/features/admin/sessions/types/admin-sessions.types";
import type {
  PaymentItem,
  CustomerWalletEntryItem,
} from "@/features/payments/types/payments.types";
import type { PatientAssessmentHistoryItem } from "@/features/assessments/types/assessments.types";
import {
  useAdminPatientAssessments,
  useAdminPatientPayments,
} from "../hooks/use-admin-patient-financials";
import { useMySettings } from "@/features/settings/hooks/use-settings";
import {
  formatEffectiveViewerDate,
  formatEffectiveViewerDateTime,
} from "@/lib/time-formatting";
import { AdminPatientCountryChangeModal } from "./AdminPatientCountryChangeModal";
import { useCurrentUserPermissions } from "@/features/users/hooks/use-users";
import { PermissionKey } from "@/lib/auth/permissions";

type PatientTabKey =
  | "profile"
  | "wallet"
  | "sessions"
  | "payments"
  | "assessments"
  | "packages"
  | "academy";

const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;

const COMMON_COUNTRY_NAMES_AR: Record<string, string> = {
  AE: "الإمارات العربية المتحدة",
  EG: "جمهورية مصر العربية",
  SA: "المملكة العربية السعودية",
  KW: "الكويت",
  QA: "قطر",
  BH: "البحرين",
  OM: "سلطنة عمان",
  JO: "الأردن",
  LB: "لبنان",
  US: "الولايات المتحدة",
  GB: "المملكة المتحدة",
};

function formatMoney(value: string | number, currency: string, locale: string) {
  const amount = Number(value ?? 0);
  const safeLocale = locale === "ar" ? "ar-EG" : "en-US";
  return new Intl.NumberFormat(safeLocale, {
    style: "currency",
    currency: currency || "EGP",
    maximumFractionDigits: 2,
  }).format(amount);
}

function calculateAge(dobString?: string | null): number | null {
  if (!dobString) return null;
  const birth = new Date(dobString);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 ? age : null;
}

export default function AdminPatient360Screen({
  patientId,
}: {
  patientId: string;
}) {
  const t = useTranslations("admin-patients");
  const locale = useLocale();
  const settingsQuery = useMySettings();
  const viewerTimeZone = settingsQuery.data?.item.preferences.timezone;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: permissionData } = useCurrentUserPermissions(true);
  const canReadWallet =
    permissionData?.permissions?.includes(
      PermissionKey.CUSTOMER_WALLETS_READ,
    ) ?? false;

  // Default to "profile" (البيانات الأساسية)
  const requestedTab = searchParams.get("tab") as PatientTabKey | null;
  const [tab, setTab] = useState<PatientTabKey>(
    requestedTab &&
      [
        "profile",
        "wallet",
        "sessions",
        "payments",
        "assessments",
        "packages",
        "academy",
      ].includes(requestedTab)
      ? requestedTab
      : "profile",
  );
  const effectiveTab: PatientTabKey =
    tab === "wallet" && !canReadWallet ? "profile" : tab;
  const [copiedId, setCopiedId] = useState(false);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);

  const { data: countries = [] } = useAdminCountries();
  const {
    data: patient,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useAdminPatientDetails(patientId, true);

  // Lazy Fetching: Query is ONLY enabled when the respective tab is open
  const walletEnabled = effectiveTab === "wallet";
  const sessionsEnabled = effectiveTab === "sessions";
  const paymentsEnabled = effectiveTab === "payments";
  const assessmentsEnabled = effectiveTab === "assessments";

  // Wallet queries
  const [walletEntriesPage, setWalletEntriesPage] = useState(1);
  const [walletEntriesLimit, setWalletEntriesLimit] = useState(10);
  const {
    data: walletSummaryData,
    isLoading: walletSummaryLoading,
    isError: walletSummaryError,
    refetch: refetchWalletSummary,
  } = useAdminPatientWalletSummary(patientId, undefined, walletEnabled);

  const {
    data: walletEntriesData,
    isLoading: walletEntriesLoading,
    isError: walletEntriesError,
    refetch: refetchWalletEntries,
  } = useAdminPatientWalletEntries(
    patientId,
    {
      page: walletEntriesPage,
      limit: walletEntriesLimit,
    },
    walletEnabled,
  );

  const wallet = walletSummaryData?.item ?? null;
  const walletCurrency = wallet?.currencyCode ?? "EGP";

  // Sessions queries
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsLimit, setSessionsLimit] = useState(DEFAULT_PAGE_LIMIT);
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    isError: sessionsError,
    refetch: refetchSessions,
  } = useAdminSessions({
    page: sessionsPage,
    limit: sessionsLimit,
    patientId,
    sort: "newest",
  });

  // Payments queries
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsLimit, setPaymentsLimit] = useState(DEFAULT_PAGE_LIMIT);
  const {
    data: paymentsData,
    isLoading: paymentsLoading,
    isError: paymentsError,
    refetch: refetchPayments,
  } = useAdminPatientPayments(
    patientId,
    {
      page: paymentsPage,
      limit: paymentsLimit,
    },
    paymentsEnabled,
  );

  // Assessments queries
  const [assessmentsPage, setAssessmentsPage] = useState(1);
  const [assessmentsLimit, setAssessmentsLimit] = useState(DEFAULT_PAGE_LIMIT);
  const {
    data: assessmentsData,
    isLoading: assessmentsLoading,
    isError: assessmentsError,
    refetch: refetchAssessments,
  } = useAdminPatientAssessments(
    patientId,
    {
      page: assessmentsPage,
      limit: assessmentsLimit,
    },
    assessmentsEnabled,
  );

  const handleCopyId = (id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleRefreshActiveTab = () => {
    void refetch();
    if (effectiveTab === "wallet") {
      void refetchWalletSummary();
      void refetchWalletEntries();
    } else if (effectiveTab === "sessions") {
      void refetchSessions();
    } else if (effectiveTab === "payments") {
      void refetchPayments();
    } else if (effectiveTab === "assessments") {
      void refetchAssessments();
    }
  };

  // Friendly status badge helpers
  const getSessionStatusBadge = (status: string) => {
    const normalized = (status || "").toUpperCase();
    let tone = "bg-surface-secondary text-text-secondary border-border-light";
    let label = t(`patient360.sessionStatus.${normalized}` as any, {
      defaultValue: status,
    });

    if (normalized === "COMPLETED") {
      tone =
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60";
    } else if (normalized === "CONFIRMED" || normalized === "SCHEDULED") {
      tone =
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60";
    } else if (
      normalized === "IN_PROGRESS" ||
      normalized === "AWAITING_COMPLETION_CONFIRMATION"
    ) {
      tone =
        "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60";
    } else if (normalized === "CANCELLED" || normalized === "EXPIRED") {
      tone =
        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60";
    }

    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold whitespace-nowrap",
          tone,
        )}
      >
        {label}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const normalized = (status || "").toUpperCase();
    let tone = "bg-surface-secondary text-text-secondary border-border-light";
    let label = t(`patient360.paymentStatus.${normalized}` as any, {
      defaultValue: status,
    });

    if (
      normalized === "CAPTURED" ||
      normalized === "SUCCEEDED" ||
      normalized === "PAID"
    ) {
      tone =
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60";
    } else if (normalized === "REFUNDED") {
      tone =
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60";
    } else if (normalized === "PENDING") {
      tone =
        "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60";
    } else if (normalized === "FAILED" || normalized === "EXPIRED") {
      tone =
        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60";
    }

    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold whitespace-nowrap",
          tone,
        )}
      >
        {label}
      </span>
    );
  };

  const pageTitle = patient?.displayName ?? t("details.unknownName");
  const age = calculateAge(patient?.dateOfBirth);

  const patientCountryCode = patient?.countryCode;
  const matchedCountry = useMemo(() => {
    if (!patientCountryCode) return null;
    const code = patientCountryCode.toUpperCase();
    return countries.find((c) => c.isoCode.toUpperCase() === code);
  }, [countries, patientCountryCode]);

  const countryDisplayName = useMemo(() => {
    const code = (patient?.countryCode || "").toUpperCase();
    if (!code) return "-";
    if (locale === "ar") {
      if (COMMON_COUNTRY_NAMES_AR[code]) {
        return COMMON_COUNTRY_NAMES_AR[code];
      }
      if (matchedCountry?.nativeName) {
        return matchedCountry.nativeName;
      }
    }
    if (matchedCountry?.name) {
      return matchedCountry.name;
    }
    return code;
  }, [matchedCountry, locale, patient?.countryCode]);

  // Tabs Configuration (Pure Domains)
  const tabs = useMemo(
    () => [
      {
        key: "profile" as const,
        label: t("patient360.tabs.profile"),
        icon: <User className="h-4 w-4" />,
      },
      ...(canReadWallet
        ? [
            {
              key: "wallet" as const,
              label: t("patient360.tabs.wallet"),
              icon: <Wallet className="h-4 w-4" />,
            },
          ]
        : []),
      {
        key: "sessions" as const,
        label: t("patient360.tabs.sessions"),
        icon: <Users className="h-4 w-4" />,
      },
      {
        key: "payments" as const,
        label: t("patient360.tabs.payments"),
        icon: <CreditCard className="h-4 w-4" />,
      },
      {
        key: "assessments" as const,
        label: t("patient360.tabs.assessments"),
        icon: <FileText className="h-4 w-4" />,
      },
      {
        key: "packages" as const,
        label: locale === "ar" ? "الباقات" : "Packages",
        icon: <Package className="h-4 w-4" />,
      },
      {
        key: "academy" as const,
        label: locale === "ar" ? "التدريبات" : "Academy",
        icon: <GraduationCap className="h-4 w-4" />,
      },
    ],
    [canReadWallet, t],
  );

  // Table Columns Definitions
  const walletEntryColumns = useMemo<ColumnDef<CustomerWalletEntryItem>[]>(
    () => [
      {
        id: "type",
        header: t("patient360.wallet.entryType"),
        accessor: (row) => row.entryType,
        cell: (row) => (
          <span className="text-text-primary text-sm font-semibold dark:text-white/95">
            {row.entryType}
          </span>
        ),
      },
      {
        id: "direction",
        header: t("patient360.wallet.direction"),
        accessor: (row) => row.direction,
        cell: (row) => (
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-xs font-bold",
              row.direction === "CREDIT"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300",
            )}
          >
            {row.direction}
          </span>
        ),
        hideOnMobile: true,
      },
      {
        id: "amount",
        header: t("patient360.wallet.amount"),
        accessor: (row) => row.amount,
        cell: (row) => (
          <span className="text-text-primary font-mono text-sm font-bold tabular-nums dark:text-white/95">
            {row.direction === "CREDIT" ? "+" : "-"}{" "}
            {formatMoney(row.amount, row.currencyCode, locale)}
          </span>
        ),
      },
      {
        id: "effectiveAt",
        header: t("patient360.wallet.effectiveAt"),
        accessor: (row) => row.effectiveAt,
        cell: (row) => (
          <span className="text-text-secondary text-sm">
            {formatEffectiveViewerDateTime(row.effectiveAt, viewerTimeZone, {
              locale,
            })}
          </span>
        ),
        hideOnMobile: true,
      },
    ],
    [locale, t, viewerTimeZone],
  );

  const sessionColumns = useMemo<ColumnDef<AdminSessionListItem>[]>(
    () => [
      {
        id: "sessionCode",
        header: t("patient360.sessions.code"),
        accessor: (row) => row.sessionCode,
        cell: (row) => (
          <Link
            href={`/admin/sessions/runtime-inspection?sessionId=${row.id}`}
            className="text-primary font-mono text-xs font-bold hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.sessionCode}
          </Link>
        ),
      },
      {
        id: "practitioner",
        header: t("patient360.sessions.practitioner"),
        accessor: (row) =>
          row.practitioner.displayName ?? row.practitioner.slug,
        cell: (row) => (
          <span className="text-text-primary text-sm font-semibold dark:text-white/95">
            {row.practitioner.displayName ?? row.practitioner.slug}
          </span>
        ),
      },
      {
        id: "status",
        header: t("patient360.sessions.status"),
        accessor: (row) => row.status,
        cell: (row) => getSessionStatusBadge(row.status),
      },
      {
        id: "scheduledStartAt",
        header: t("patient360.sessions.start"),
        accessor: (row) => row.scheduledStartAt ?? "",
        cell: (row) => (
          <span className="text-text-secondary text-sm">
            {row.scheduledStartAt
              ? formatEffectiveViewerDateTime(
                  row.scheduledStartAt,
                  viewerTimeZone,
                  { locale },
                )
              : "-"}
          </span>
        ),
        hideOnMobile: true,
      },
      {
        id: "mode",
        header: t("patient360.sessions.mode"),
        accessor: (row) => row.sessionMode,
        cell: (row) => (
          <div className="text-text-secondary flex items-center gap-1.5 text-sm">
            <Video className="text-primary h-3.5 w-3.5" />
            <span>{row.sessionMode}</span>
          </div>
        ),
        hideOnMobile: true,
      },
    ],
    [locale, t, viewerTimeZone],
  );

  const paymentColumns = useMemo<ColumnDef<PaymentItem>[]>(
    () => [
      {
        id: "amountTotal",
        header: t("patient360.payments.total"),
        accessor: (row) => row.amountTotal,
        cell: (row) => (
          <Link
            href={`/admin/payments/${row.id}`}
            className="text-primary font-mono text-sm font-bold tabular-nums hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {formatMoney(row.amountTotal, row.currency, locale)}
          </Link>
        ),
      },
      {
        id: "status",
        header: t("patient360.payments.status"),
        accessor: (row) => row.status,
        cell: (row) => getPaymentStatusBadge(row.status),
      },
      {
        id: "provider",
        header: t("patient360.payments.provider"),
        accessor: (row) => row.provider,
        cell: (row) => (
          <span className="bg-surface-secondary text-text-secondary rounded-md px-2 py-0.5 text-xs font-bold">
            {row.provider}
          </span>
        ),
        hideOnMobile: true,
      },
      {
        id: "split",
        header: t("patient360.payments.split"),
        accessor: (row) => `${row.amountFromWallet}-${row.amountFromGateway}`,
        cell: (row) => (
          <div className="text-text-secondary space-y-0.5 text-xs">
            <p>
              {t("patient360.payments.fromWallet")}:{" "}
              {formatMoney(row.amountFromWallet, row.currency, locale)}
            </p>
            <p>
              {t("patient360.payments.fromGateway")}:{" "}
              {formatMoney(row.amountFromGateway, row.currency, locale)}
            </p>
          </div>
        ),
        hideOnMobile: true,
      },
      {
        id: "createdAt",
        header: t("patient360.payments.createdAt"),
        accessor: (row) => row.createdAt,
        cell: (row) => (
          <span className="text-text-secondary text-sm">
            {formatEffectiveViewerDateTime(row.createdAt, viewerTimeZone, {
              locale,
            })}
          </span>
        ),
        hideOnMobile: true,
      },
    ],
    [locale, t, viewerTimeZone],
  );

  const assessmentColumns = useMemo<ColumnDef<PatientAssessmentHistoryItem>[]>(
    () => [
      {
        id: "assessmentTitle",
        header: t("patient360.assessments.title"),
        accessor: (row) => row.assessmentTitle,
        cell: (row) => (
          <div className="min-w-0">
            <p className="text-text-primary truncate text-sm font-bold dark:text-white/95">
              {row.assessmentTitle}
            </p>
            <p className="text-text-muted truncate text-xs">
              {row.assessmentSlug}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        header: t("patient360.assessments.status"),
        accessor: (row) => row.status,
        cell: (row) => (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            {row.status}
          </span>
        ),
      },
      {
        id: "result",
        header: t("patient360.assessments.result"),
        accessor: (row) => row.resultBand ?? "",
        cell: (row) => (
          <span className="text-text-secondary text-sm font-semibold">
            {row.resultBand ?? "-"}
          </span>
        ),
        hideOnMobile: true,
      },
      {
        id: "completedAt",
        header: t("patient360.assessments.completedAt"),
        accessor: (row) => row.completedAt ?? "",
        cell: (row) => (
          <span className="text-text-secondary text-sm">
            {row.completedAt
              ? formatEffectiveViewerDateTime(row.completedAt, viewerTimeZone, {
                  locale,
                })
              : "-"}
          </span>
        ),
        hideOnMobile: true,
      },
    ],
    [locale, t, viewerTimeZone],
  );

  return (
    <div className="space-y-4">
      {/* ── 1. Top Bar & Navigation ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push(`/admin/patients` as any)}
          className="text-text-muted hover:text-primary inline-flex items-center gap-1.5 text-xs font-bold transition"
        >
          <DirectionalArrowIcon direction="back" className="h-4 w-4" />
          <span>{t("patient360.back")}</span>
        </button>

        <div className="flex items-center gap-2">
          {patient && (
            <button
              type="button"
              onClick={() => setIsCountryModalOpen(true)}
              className="border-border-light bg-surface text-text-secondary hover:border-primary/40 hover:text-primary inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-2xs transition active:scale-95"
            >
              <Globe className="text-primary h-3.5 w-3.5" />
              <span>{t("patient360.quickActions.changeCountry")}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRefreshActiveTab}
            disabled={isRefetching}
            className="border-border-light bg-surface text-text-secondary hover:border-primary/40 hover:text-primary inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-2xs transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw
              className={cn(
                "text-text-muted h-3.5 w-3.5",
                isRefetching && "animate-spin",
              )}
            />
            <span>{t("actions.retry")}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Unified Profile Shell ── */}
      <SurfaceCard variant="page" className="overflow-hidden p-0 shadow-xs">
        {isLoading ? (
          <div className="text-text-muted p-6 text-center text-sm font-bold">
            {t("states.loading")}
          </div>
        ) : isError || !patient ? (
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-2 text-sm font-bold text-rose-600">
              <AlertCircle className="h-4 w-4" />
              <span>{t("patient360.states.loadError")}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t("actions.retry")}
            </Button>
          </div>
        ) : (
          <div>
            {/* Identity Hero Header */}
            <div className="border-border-light bg-surface dark:bg-surface-secondary/40 border-b px-5 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                {/* Left: Avatar & Identity */}
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <AvatarText
                      name={pageTitle}
                      className="ring-border-light h-12 w-12 rounded-2xl text-sm font-black shadow-xs ring-1"
                    />
                    <span
                      className={cn(
                        "border-surface absolute -end-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 shadow-xs",
                        patient.status === "ACTIVE"
                          ? "bg-emerald-500"
                          : "bg-amber-500",
                      )}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-text-primary text-base font-extrabold dark:text-white/95">
                        {pageTitle}
                      </h1>

                      {/* Status Badge */}
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs font-bold",
                          patient.status === "ACTIVE"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
                        )}
                      >
                        {patient.status === "ACTIVE"
                          ? t("filters.statusActive")
                          : t("filters.statusPending")}
                      </span>

                      {/* Onboarding Badge */}
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs font-bold",
                          patient.onboardingCompletedAt
                            ? "border-primary/20 bg-primary/10 text-primary"
                            : "border-border-light bg-surface-secondary text-text-muted",
                        )}
                      >
                        {patient.onboardingCompletedAt
                          ? t("states.completed")
                          : t("states.incomplete")}
                      </span>
                    </div>

                    <p className="text-text-secondary text-xs">
                      {t("patient360.subtitle")}
                    </p>
                  </div>
                </div>

                {/* Right: ID Chip & Join Date */}
                <div className="flex items-center gap-2 self-start md:self-auto">
                  <button
                    type="button"
                    onClick={() => handleCopyId(patient.userId)}
                    className="border-border-light bg-surface-secondary/40 text-text-secondary hover:border-primary/40 hover:text-text-primary inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 font-mono text-xs transition"
                    title={patient.userId}
                  >
                    {copiedId ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="font-bold text-emerald-600">
                          {t("patient360.quickActions.copied")}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="text-text-muted h-3.5 w-3.5" />
                        <span>{patient.userId.slice(0, 10)}...</span>
                      </>
                    )}
                  </button>

                  <div className="border-border-light bg-surface-secondary/40 text-text-muted inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs">
                    <CalendarClock className="text-text-muted h-3.5 w-3.5" />
                    <span>
                      {formatEffectiveViewerDate(
                        patient.createdAt,
                        viewerTimeZone,
                        { locale },
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 3. High-Capacity Scalable Tabs Bar ── */}
            <div className="border-border-light bg-surface-secondary/20 border-b px-4">
              <div className="flex items-center gap-1.5 overflow-x-auto py-2">
                {tabs.map((item) => {
                  const isActive = effectiveTab === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTab(item.key)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all duration-150 active:scale-95",
                        isActive
                          ? "bg-primary text-white shadow-2xs"
                          : "text-text-secondary hover:bg-surface hover:text-text-primary",
                      )}
                    >
                      <span
                        className={cn(
                          isActive ? "text-white" : "text-text-muted",
                        )}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 4. Tab Content Panels ── */}
            <div className="p-4 sm:p-5">
              {/* TAB 1: PROFILE DETAILS (البيانات الأساسية - بدون أي تكرار) */}
              {effectiveTab === "profile" && (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Card 1: معلومات التواصل والإقامة */}
                  <div className="border-border-light bg-surface dark:bg-surface-secondary/40 rounded-2xl border p-4 shadow-2xs">
                    <div className="border-border-light flex items-center justify-between border-b pb-2.5">
                      <div className="flex items-center gap-2">
                        <User className="text-primary h-4 w-4" />
                        <span className="text-text-primary text-xs font-bold dark:text-white/95">
                          {t("details.section.profile")}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-3 text-xs">
                      {/* Name */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-muted">
                          {t("fields.displayName")}
                        </span>
                        <span className="text-text-primary font-bold dark:text-white/95">
                          {pageTitle}
                        </span>
                      </div>

                      {/* Email */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-muted">
                          {t("fields.email")}
                        </span>
                        <span className="text-text-primary font-semibold dark:text-white/90">
                          {patient.primaryEmail || "-"}
                        </span>
                      </div>

                      {/* Phone */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-muted">
                          {t("fields.phone")}
                        </span>
                        <span
                          className="text-text-primary font-mono font-semibold dark:text-white/90"
                          dir="ltr"
                        >
                          {patient.primaryPhone || "-"}
                        </span>
                      </div>

                      {/* Country */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-muted">
                          {t("patient360.profile.country")}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-text-primary font-semibold dark:text-white/90">
                            {countryDisplayName}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsCountryModalOpen(true)}
                            className="text-primary text-xs font-bold hover:underline"
                          >
                            ({t("patient360.quickActions.changeCountry")})
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: البيانات الشخصية والنظام */}
                  <div className="border-border-light bg-surface dark:bg-surface-secondary/40 rounded-2xl border p-4 shadow-2xs">
                    <div className="border-border-light flex items-center justify-between border-b pb-2.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="text-primary h-4 w-4" />
                        <span className="text-text-primary text-xs font-bold dark:text-white/95">
                          {t("patient360.profile.sectionTitle")}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-3 text-xs">
                      {/* Gender */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-muted">
                          {t("patient360.profile.gender")}
                        </span>
                        <span className="text-text-primary font-semibold dark:text-white/90">
                          {patient.gender
                            ? patient.gender === "MALE"
                              ? t("patient360.gender.MALE")
                              : patient.gender === "FEMALE"
                                ? t("patient360.gender.FEMALE")
                                : patient.gender
                            : "-"}
                        </span>
                      </div>

                      {/* Date of Birth & Age */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-muted">
                          {t("patient360.profile.dob")}
                        </span>
                        <span className="text-text-primary font-mono font-semibold dark:text-white/90">
                          {patient.dateOfBirth
                            ? `${patient.dateOfBirth}${age ? ` (${t("patient360.quickActions.yearsOld", { age })})` : ""}`
                            : "-"}
                        </span>
                      </div>

                      {/* User ID */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-muted">
                          {t("fields.userId")}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyId(patient.userId)}
                          className="text-text-secondary hover:text-primary font-mono text-xs font-bold"
                        >
                          {patient.userId}
                        </button>
                      </div>

                      {/* Created At */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-muted">
                          {t("fields.createdAt")}
                        </span>
                        <span className="text-text-primary dark:text-white/90">
                          {formatEffectiveViewerDateTime(
                            patient.createdAt,
                            viewerTimeZone,
                            { locale },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: WALLET */}
              {effectiveTab === "wallet" && (
                <div className="space-y-4">
                  <div className="border-border-light flex items-center justify-between gap-2 border-b pb-2">
                    <h2 className="text-text-primary text-xs font-extrabold dark:text-white/95">
                      {t("patient360.tabs.wallet")}
                    </h2>
                    {walletSummaryError && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchWalletSummary()}
                      >
                        {t("actions.retry")}
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                    <div className="border-border-light bg-surface rounded-2xl border p-3.5 shadow-2xs">
                      <span className="text-text-muted text-xs font-bold">
                        {t("wallet.available")}
                      </span>
                      <p className="text-text-primary mt-1 font-mono text-base font-black">
                        {walletSummaryLoading
                          ? "..."
                          : formatMoney(
                              wallet?.availableBalance ?? "0",
                              walletCurrency,
                              locale,
                            )}
                      </p>
                    </div>
                    <div className="border-border-light bg-surface rounded-2xl border p-3.5 shadow-2xs">
                      <span className="text-text-muted text-xs font-bold">
                        {t("wallet.reserved")}
                      </span>
                      <p className="text-text-primary mt-1 font-mono text-base font-black">
                        {walletSummaryLoading
                          ? "..."
                          : formatMoney(
                              wallet?.reservedBalance ?? "0",
                              walletCurrency,
                              locale,
                            )}
                      </p>
                    </div>
                  </div>

                  <DataTable
                    data={walletEntriesData?.items ?? []}
                    columns={walletEntryColumns}
                    getRowId={(row) => row.id}
                    loading={walletEntriesLoading}
                    error={
                      walletEntriesError ? t("states.walletEntriesError") : null
                    }
                    emptyState={{
                      title: t("patient360.wallet.entriesEmptyTitle"),
                      description: t(
                        "patient360.wallet.entriesEmptyDescription",
                      ),
                    }}
                    pagination={walletEntriesData?.pagination}
                    onPageChange={(next) => setWalletEntriesPage(next)}
                    onPageSizeChange={(next) => {
                      setWalletEntriesLimit(next);
                      setWalletEntriesPage(1);
                    }}
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                    hoverable
                  />
                </div>
              )}

              {/* TAB 3: SESSIONS */}
              {effectiveTab === "sessions" && (
                <div className="space-y-4">
                  <div className="border-border-light flex items-center justify-between gap-2 border-b pb-2">
                    <h2 className="text-text-primary text-xs font-extrabold dark:text-white/95">
                      {t("patient360.tabs.sessions")}
                    </h2>
                    {sessionsError && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchSessions()}
                      >
                        {t("actions.retry")}
                      </Button>
                    )}
                  </div>

                  <DataTable
                    data={sessionsData?.items ?? []}
                    columns={sessionColumns}
                    getRowId={(row) => row.id}
                    loading={sessionsLoading}
                    error={
                      sessionsError ? t("patient360.sessions.loadError") : null
                    }
                    emptyState={{
                      title: t("patient360.sessions.emptyTitle"),
                      description: t("patient360.sessions.emptyDescription"),
                    }}
                    pagination={sessionsData?.pagination}
                    onPageChange={(next) => setSessionsPage(next)}
                    onPageSizeChange={(next) => {
                      setSessionsLimit(next);
                      setSessionsPage(1);
                    }}
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                    hoverable
                  />
                </div>
              )}

              {/* TAB 4: PAYMENTS */}
              {effectiveTab === "payments" && (
                <div className="space-y-4">
                  <div className="border-border-light flex items-center justify-between gap-2 border-b pb-2">
                    <h2 className="text-text-primary text-xs font-extrabold dark:text-white/95">
                      {t("patient360.tabs.payments")}
                    </h2>
                    {paymentsError && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchPayments()}
                      >
                        {t("actions.retry")}
                      </Button>
                    )}
                  </div>

                  <DataTable
                    data={paymentsData?.items ?? []}
                    columns={paymentColumns}
                    getRowId={(row) => row.id}
                    loading={paymentsLoading}
                    error={
                      paymentsError ? t("patient360.payments.loadError") : null
                    }
                    emptyState={{
                      title: t("patient360.payments.emptyTitle"),
                      description: t("patient360.payments.emptyDescription"),
                    }}
                    pagination={paymentsData?.pagination}
                    onPageChange={(next) => setPaymentsPage(next)}
                    onPageSizeChange={(next) => {
                      setPaymentsLimit(next);
                      setPaymentsPage(1);
                    }}
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                    hoverable
                  />
                </div>
              )}

              {effectiveTab === "packages" && (
                <div className="space-y-4">
                  <h2 className="text-text-primary text-xs font-extrabold dark:text-white/95">
                    {locale === "ar" ? "الباقات المرتبطة" : "Linked packages"}
                  </h2>
                  {!patient?.packages?.length ? (
                    <div className="border-border-light text-text-muted rounded-xl border border-dashed p-6 text-center text-sm">
                      {locale === "ar"
                        ? "لا توجد باقات مرتبطة بهذا المريض."
                        : "No packages linked to this patient."}
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {patient.packages.map((pkg) => (
                        <div
                          key={pkg.id}
                          className="border-border-light bg-surface-secondary/40 rounded-2xl border p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-text-primary font-semibold">
                                {pkg.title || pkg.planCode || pkg.id}
                              </p>
                              <p className="text-text-muted text-xs">
                                {pkg.practitioner?.name || "-"}
                              </p>
                            </div>
                            <span className="text-text-secondary text-xs font-bold">
                              {pkg.status}
                            </span>
                          </div>
                          <div className="text-text-secondary mt-3 grid grid-cols-3 gap-2 text-xs">
                            <span>
                              {locale === "ar" ? "الإجمالي" : "Total"}:{" "}
                              {pkg.sessionCount}
                            </span>
                            <span>
                              {locale === "ar" ? "المتاح" : "Available"}:{" "}
                              {pkg.availableSessions}
                            </span>
                            <span>
                              {locale === "ar" ? "المكتمل" : "Completed"}:{" "}
                              {pkg.completedSessions}
                            </span>
                          </div>
                          {pkg.nextSessionAt ? (
                            <p className="text-text-muted mt-2 text-xs">
                              {locale === "ar"
                                ? "الجلسة القادمة"
                                : "Next session"}
                              :{" "}
                              {new Date(pkg.nextSessionAt).toLocaleString(
                                locale === "ar" ? "ar-EG" : "en-US",
                              )}
                            </p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {pkg.settlementId ? (
                              <Link
                                href={`/admin/package-settlements/${pkg.settlementId}`}
                                className="text-primary text-xs font-semibold hover:underline"
                              >
                                {locale === "ar"
                                  ? "عرض سياق الباقة"
                                  : "Open package context"}
                              </Link>
                            ) : pkg.planCode ? (
                              <Link
                                href={`/admin/package-plans/${pkg.planCode}`}
                                className="text-primary text-xs font-semibold hover:underline"
                              >
                                {locale === "ar"
                                  ? "عرض خطة الباقة"
                                  : "Open package plan"}
                              </Link>
                            ) : null}
                            {pkg.practitioner ? (
                              <Link
                                href={`/admin/practitioners/${pkg.practitioner.id}`}
                                className="text-primary text-xs font-semibold hover:underline"
                              >
                                {locale === "ar"
                                  ? "عرض الممارس"
                                  : "Open practitioner"}
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {effectiveTab === "academy" && (
                <div className="space-y-4">
                  <h2 className="text-text-primary text-xs font-extrabold dark:text-white/95">
                    {locale === "ar"
                      ? "التدريبات المرتبطة"
                      : "Linked academy enrollments"}
                  </h2>
                  {!patient?.academy?.length ? (
                    <div className="border-border-light text-text-muted rounded-xl border border-dashed p-6 text-center text-sm">
                      {locale === "ar"
                        ? "لا توجد تسجيلات تدريب لهذا المريض."
                        : "No academy enrollments for this patient."}
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {patient.academy.map((enrollment) => (
                        <div
                          key={enrollment.id}
                          className="border-border-light bg-surface-secondary/40 rounded-2xl border p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-text-primary font-semibold">
                                {locale === "ar"
                                  ? enrollment.programTitleAr
                                  : enrollment.programTitleEn}
                              </p>
                              <p className="text-text-muted text-xs">
                                {enrollment.status} · {enrollment.paymentStatus}
                              </p>
                            </div>
                            <span className="text-text-secondary text-xs">
                              {enrollment.currency} {enrollment.amount}
                            </span>
                          </div>
                          <div className="text-text-secondary mt-3 text-xs">
                            {locale === "ar" ? "الحضور" : "Attendance"}:{" "}
                            {enrollment.attendanceCount}/
                            {enrollment.totalSessions}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                              href={`/admin/academy/programs/${enrollment.programId}/learners`}
                              className="text-primary text-xs font-semibold hover:underline"
                            >
                              {locale === "ar"
                                ? "عرض التسجيل في التدريب"
                                : "Open academy enrollment"}
                            </Link>
                            {enrollment.paymentId ? (
                              <Link
                                href={`/admin/payments/${enrollment.paymentId}`}
                                className="text-primary text-xs font-semibold hover:underline"
                              >
                                {locale === "ar" ? "عرض الدفع" : "View payment"}
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: ASSESSMENTS */}
              {effectiveTab === "assessments" && (
                <div className="space-y-4">
                  <div className="border-border-light flex items-center justify-between gap-2 border-b pb-2">
                    <h2 className="text-text-primary text-xs font-extrabold dark:text-white/95">
                      {t("patient360.tabs.assessments")}
                    </h2>
                    {assessmentsError && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchAssessments()}
                      >
                        {t("actions.retry")}
                      </Button>
                    )}
                  </div>

                  <DataTable
                    data={assessmentsData?.items ?? []}
                    columns={assessmentColumns}
                    getRowId={(row) => row.submissionId}
                    loading={assessmentsLoading}
                    error={
                      assessmentsError
                        ? t("patient360.assessments.loadError")
                        : null
                    }
                    emptyState={{
                      title: t("patient360.assessments.emptyTitle"),
                      description: t("patient360.assessments.emptyDescription"),
                    }}
                    pagination={assessmentsData?.pagination}
                    onPageChange={(next) => setAssessmentsPage(next)}
                    onPageSizeChange={(next) => {
                      setAssessmentsLimit(next);
                      setAssessmentsPage(1);
                    }}
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                    hoverable
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </SurfaceCard>

      {/* Country Change Modal */}
      {patient && (
        <AdminPatientCountryChangeModal
          patient={patient as any}
          isOpen={isCountryModalOpen}
          onClose={() => setIsCountryModalOpen(false)}
        />
      )}
    </div>
  );
}
