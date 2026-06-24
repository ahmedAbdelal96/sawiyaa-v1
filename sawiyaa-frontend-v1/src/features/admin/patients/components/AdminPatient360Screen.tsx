"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { SurfaceCard, SurfaceHeader } from "@/components/shared/SurfaceShell";
import Button from "@/components/ui/button/Button";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { cn } from "@/lib/utils";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import {
  CalendarClock,
  CreditCard,
  FileText,
  Wallet,
  Activity,
  Users,
} from "lucide-react";
import AvatarText from "@/components/ui/avatar/AvatarText";
import { useAdminPatientDetails, useAdminCountries } from "../hooks/use-admin-patients";
import {
  useAdminPatientWalletEntries,
  useAdminPatientWalletSummary,
} from "../hooks/use-admin-patient-wallet";
import { useAdminSessions } from "@/features/admin/sessions/hooks/use-admin-sessions";
import type { AdminSessionListItem } from "@/features/admin/sessions/types/admin-sessions.types";
import type { PaymentItem } from "@/features/payments/types/payments.types";
import type { CustomerWalletEntryItem } from "@/features/payments/types/payments.types";
import type { PatientAssessmentHistoryItem } from "@/features/assessments/types/assessments.types";
import { useAdminPatientAssessments, useAdminPatientPayments } from "../hooks/use-admin-patient-financials";

type PatientTabKey = "overview" | "wallet" | "sessions" | "payments" | "assessments";

const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;
const OVERVIEW_PREVIEW_LIMIT = 5;

function formatMoney(value: string, currency: string, locale: string) {
  const amount = Number(value ?? 0);
  const safeLocale = locale === "ar" ? "ar-EG" : "en-US";
  return new Intl.NumberFormat(safeLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function TabButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-semibold transition",
        active
          ? "border-primary/30 bg-primary text-white shadow-[0_14px_26px_-18px_rgba(68,161,148,0.5)]"
          : "border-border-light bg-white text-text-primary hover:bg-brand-25 dark:bg-surface-secondary dark:text-text-primary dark:hover:bg-surface-tertiary",
      )}
    >
      <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-2xl", active ? "bg-white/14 text-white" : "bg-surface-secondary text-text-secondary")}>
        {icon}
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function KeyValueRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-text-muted">{label}</span>
      <span
        className={cn(
          "font-semibold text-text-primary dark:text-white/95 break-words",
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  );
}

export default function AdminPatient360Screen({ patientId }: { patientId: string }) {
  const t = useTranslations("admin-patients");
  const locale = useLocale();
  const router = useRouter();

  const [tab, setTab] = useState<PatientTabKey>("overview");

  const { data: countries = [] } = useAdminCountries();
  const { data: patient, isLoading, isError, refetch } = useAdminPatientDetails(patientId, true);

  useEffect(() => {
    if (localStorage.getItem("debug.adminPatients") !== "1") return;
    // eslint-disable-next-line no-console
    console.debug("[adminPatients] 360 state", {
      routePatientId: patientId,
      isLoading,
      isError,
      patient,
      tab,
    });
  }, [isError, isLoading, patient, patientId, tab]);

  const walletEnabled = tab === "overview" || tab === "wallet";
  const sessionsEnabled = tab === "overview" || tab === "sessions";
  const paymentsEnabled = tab === "overview" || tab === "payments";
  const assessmentsEnabled = tab === "overview" || tab === "assessments";

  const [walletEntriesPage, setWalletEntriesPage] = useState(1);
  const [walletEntriesLimit, setWalletEntriesLimit] = useState(10);
  const { data: walletSummaryData, isLoading: walletSummaryLoading, isError: walletSummaryError, refetch: refetchWalletSummary } =
    useAdminPatientWalletSummary(patientId, undefined, walletEnabled);
  const {
    data: walletEntriesData,
    isLoading: walletEntriesLoading,
    isError: walletEntriesError,
    refetch: refetchWalletEntries,
  } = useAdminPatientWalletEntries(
    patientId,
    {
      page: tab === "overview" ? 1 : walletEntriesPage,
      limit: tab === "overview" ? OVERVIEW_PREVIEW_LIMIT : walletEntriesLimit,
    },
    walletEnabled,
  );

  const wallet = walletSummaryData?.item ?? null;

  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsLimit, setSessionsLimit] = useState(DEFAULT_PAGE_LIMIT);
  const { data: sessionsData, isLoading: sessionsLoading, isError: sessionsError, refetch: refetchSessions } =
    useAdminSessions({
      page: tab === "overview" ? 1 : sessionsPage,
      limit: tab === "overview" ? OVERVIEW_PREVIEW_LIMIT : sessionsLimit,
      patientId,
      sort: "newest",
    });

  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsLimit, setPaymentsLimit] = useState(DEFAULT_PAGE_LIMIT);
  const { data: paymentsData, isLoading: paymentsLoading, isError: paymentsError, refetch: refetchPayments } =
    useAdminPatientPayments(
      patientId,
      { page: tab === "overview" ? 1 : paymentsPage, limit: tab === "overview" ? OVERVIEW_PREVIEW_LIMIT : paymentsLimit },
      paymentsEnabled,
    );

  const [assessmentsPage, setAssessmentsPage] = useState(1);
  const [assessmentsLimit, setAssessmentsLimit] = useState(DEFAULT_PAGE_LIMIT);
  const { data: assessmentsData, isLoading: assessmentsLoading, isError: assessmentsError, refetch: refetchAssessments } =
    useAdminPatientAssessments(
      patientId,
      { page: tab === "overview" ? 1 : assessmentsPage, limit: tab === "overview" ? OVERVIEW_PREVIEW_LIMIT : assessmentsLimit },
      assessmentsEnabled,
    );

  const pageTitle = patient?.displayName ?? t("details.unknownName");
  const subtitle = patient?.primaryEmail ?? patient?.primaryPhone ?? patient?.userId ?? "-";

  const tabs = useMemo(
    () =>
      [
        { key: "overview" as const, label: t("patient360.tabs.overview"), icon: <Activity className="h-4 w-4" /> },
        { key: "wallet" as const, label: t("patient360.tabs.wallet"), icon: <Wallet className="h-4 w-4" /> },
        { key: "sessions" as const, label: t("patient360.tabs.sessions"), icon: <Users className="h-4 w-4" /> },
        { key: "payments" as const, label: t("patient360.tabs.payments"), icon: <CreditCard className="h-4 w-4" /> },
        { key: "assessments" as const, label: t("patient360.tabs.assessments"), icon: <FileText className="h-4 w-4" /> },
      ] as const,
    [t],
  );

  const walletCurrency = wallet?.currencyCode ?? "EGP";

  const walletSummaryCards = (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="app-panel-soft rounded-[22px] p-4 sm:p-5">
        <p className="text-xs font-semibold text-text-muted">{t("wallet.available")}</p>
        <p className="mt-2 text-lg font-semibold tabular-nums text-text-primary dark:text-white/95">
          {formatMoney(wallet?.availableBalance ?? "0", walletCurrency, locale)}
        </p>
        {!wallet ? (
          <p className="mt-2 text-xs text-text-muted">{t("patient360.wallet.noWalletHint")}</p>
        ) : null}
      </div>
      <div className="app-panel-soft rounded-[22px] p-4 sm:p-5">
        <p className="text-xs font-semibold text-text-muted">{t("wallet.reserved")}</p>
        <p className="mt-2 text-lg font-semibold tabular-nums text-text-primary dark:text-white/95">
          {formatMoney(wallet?.reservedBalance ?? "0", walletCurrency, locale)}
        </p>
      </div>
    </div>
  );

  const walletEntryColumns = useMemo<ColumnDef<CustomerWalletEntryItem>[]>(
    () => [
      {
        id: "type",
        header: t("patient360.wallet.entryType"),
        accessor: (row) => row.entryType,
        cell: (row) => <span className="text-sm font-semibold text-text-primary dark:text-white/95">{row.entryType}</span>,
      },
      {
        id: "direction",
        header: t("patient360.wallet.direction"),
        accessor: (row) => row.direction,
        cell: (row) => (
          <span className={cn("text-xs font-semibold", row.direction === "CREDIT" ? "text-emerald-700" : "text-rose-700")}>
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
          <span className="text-sm font-semibold tabular-nums text-text-primary dark:text-white/95">
            {row.direction === "CREDIT" ? "+" : "-"} {formatMoney(row.amount, row.currencyCode, locale)}
          </span>
        ),
      },
      {
        id: "effectiveAt",
        header: t("patient360.wallet.effectiveAt"),
        accessor: (row) => row.effectiveAt,
        cell: (row) => <span className="text-sm text-text-secondary">{new Date(row.effectiveAt).toLocaleString(locale)}</span>,
        hideOnMobile: true,
      },
    ],
    [locale, t],
  );

  const sessionColumns = useMemo<ColumnDef<AdminSessionListItem>[]>(
    () => [
      {
        id: "sessionCode",
        header: t("patient360.sessions.code"),
        accessor: (row) => row.sessionCode,
        cell: (row) => <span className="text-sm font-semibold text-text-primary dark:text-white/95">{row.sessionCode}</span>,
      },
      {
        id: "status",
        header: t("patient360.sessions.status"),
        accessor: (row) => row.status,
        cell: (row) => <span className="text-xs font-semibold text-text-secondary">{row.status}</span>,
      },
      {
        id: "scheduledStartAt",
        header: t("patient360.sessions.start"),
        accessor: (row) => row.scheduledStartAt ?? "",
        cell: (row) => (
          <span className="text-sm text-text-secondary">
            {row.scheduledStartAt ? new Date(row.scheduledStartAt).toLocaleString(locale) : "-"}
          </span>
        ),
        hideOnMobile: true,
      },
      {
        id: "practitioner",
        header: t("patient360.sessions.practitioner"),
        accessor: (row) => row.practitioner.displayName ?? row.practitioner.slug,
        cell: (row) => (
          <span className="text-sm text-text-secondary">
            {row.practitioner.displayName ?? row.practitioner.slug}
          </span>
        ),
      },
      {
        id: "mode",
        header: t("patient360.sessions.mode"),
        accessor: (row) => row.sessionMode,
        cell: (row) => <span className="text-sm text-text-secondary">{row.sessionMode}</span>,
        hideOnMobile: true,
      },
    ],
    [locale, t],
  );

  const paymentColumns = useMemo<ColumnDef<PaymentItem>[]>(
    () => [
      {
        id: "status",
        header: t("patient360.payments.status"),
        accessor: (row) => row.status,
        cell: (row) => <span className="text-xs font-semibold text-text-secondary">{row.status}</span>,
      },
      {
        id: "amountTotal",
        header: t("patient360.payments.total"),
        accessor: (row) => row.amountTotal,
        cell: (row) => (
          <span className="text-sm font-semibold tabular-nums text-text-primary dark:text-white/95">
            {formatMoney(row.amountTotal, row.currency, locale)}
          </span>
        ),
      },
      {
        id: "split",
        header: t("patient360.payments.split"),
        accessor: (row) => `${row.amountFromWallet}-${row.amountFromGateway}`,
        cell: (row) => (
          <div className="text-xs text-text-secondary">
            <p>
              {t("patient360.payments.fromWallet")}: {formatMoney(row.amountFromWallet, row.currency, locale)}
            </p>
            <p>
              {t("patient360.payments.fromGateway")}: {formatMoney(row.amountFromGateway, row.currency, locale)}
            </p>
          </div>
        ),
        hideOnMobile: true,
      },
      {
        id: "provider",
        header: t("patient360.payments.provider"),
        accessor: (row) => row.provider,
        cell: (row) => <span className="text-sm text-text-secondary">{row.provider}</span>,
        hideOnMobile: true,
      },
      {
        id: "createdAt",
        header: t("patient360.payments.createdAt"),
        accessor: (row) => row.createdAt,
        cell: (row) => <span className="text-sm text-text-secondary">{new Date(row.createdAt).toLocaleString(locale)}</span>,
        hideOnMobile: true,
      },
    ],
    [locale, t],
  );

  const assessmentColumns = useMemo<ColumnDef<PatientAssessmentHistoryItem>[]>(
    () => [
      {
        id: "assessmentTitle",
        header: t("patient360.assessments.title"),
        accessor: (row) => row.assessmentTitle,
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
              {row.assessmentTitle}
            </p>
            <p className="mt-1 truncate text-xs text-text-muted">{row.assessmentSlug}</p>
          </div>
        ),
      },
      {
        id: "status",
        header: t("patient360.assessments.status"),
        accessor: (row) => row.status,
        cell: (row) => <span className="text-xs font-semibold text-text-secondary">{row.status}</span>,
      },
      {
        id: "result",
        header: t("patient360.assessments.result"),
        accessor: (row) => row.resultBand ?? "",
        cell: (row) => <span className="text-sm text-text-secondary">{row.resultBand ?? "-"}</span>,
        hideOnMobile: true,
      },
      {
        id: "completedAt",
        header: t("patient360.assessments.completedAt"),
        accessor: (row) => row.completedAt ?? "",
        cell: (row) => (
          <span className="text-sm text-text-secondary">
            {row.completedAt ? new Date(row.completedAt).toLocaleString(locale) : "-"}
          </span>
        ),
        hideOnMobile: true,
      },
      {
        id: "createdAt",
        header: t("patient360.assessments.createdAt"),
        accessor: (row) => row.createdAt,
        cell: (row) => <span className="text-sm text-text-secondary">{new Date(row.createdAt).toLocaleString(locale)}</span>,
        hideOnMobile: true,
      },
    ],
    [locale, t],
  );

  const overviewCards = (
    <div className="grid gap-3 md:grid-cols-4">
      <div className="app-panel-soft rounded-[22px] p-4 sm:p-5">
        <p className="text-xs font-semibold text-text-muted">{t("patient360.overview.walletAvailable")}</p>
        <p className="mt-2 text-lg font-semibold tabular-nums text-text-primary dark:text-white/95">
          {walletSummaryLoading ? t("states.loading") : formatMoney(wallet?.availableBalance ?? "0", walletCurrency, locale)}
        </p>
      </div>
      <div className="app-panel-soft rounded-[22px] p-4 sm:p-5">
        <p className="text-xs font-semibold text-text-muted">{t("patient360.overview.sessionsCount")}</p>
        <p className="mt-2 text-lg font-semibold tabular-nums text-text-primary dark:text-white/95">
          {sessionsLoading ? t("states.loading") : String(sessionsData?.pagination.totalItems ?? 0)}
        </p>
      </div>
      <div className="app-panel-soft rounded-[22px] p-4 sm:p-5">
        <p className="text-xs font-semibold text-text-muted">{t("patient360.overview.paymentsCount")}</p>
        <p className="mt-2 text-lg font-semibold tabular-nums text-text-primary dark:text-white/95">
          {paymentsLoading ? t("states.loading") : String(paymentsData?.pagination.totalItems ?? 0)}
        </p>
      </div>
      <div className="app-panel-soft rounded-[22px] p-4 sm:p-5">
        <p className="text-xs font-semibold text-text-muted">{t("patient360.overview.assessmentsCount")}</p>
        <p className="mt-2 text-lg font-semibold tabular-nums text-text-primary dark:text-white/95">
          {assessmentsLoading ? t("states.loading") : String(assessmentsData?.pagination.totalItems ?? 0)}
        </p>
      </div>
    </div>
  );

  const statusTone =
    patient?.status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : patient?.status === "SUSPENDED"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : patient?.status?.startsWith("PENDING")
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : "bg-surface-secondary text-text-secondary border-border-light";

  const overviewRow = (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-1">
        <div className="app-panel-soft rounded-[22px] p-4 sm:p-5">
          <p className="text-xs font-semibold text-text-muted">{t("patient360.profile.sectionTitle")}</p>
          <div className="mt-3 space-y-2 text-sm">
            <KeyValueRow
              label={t("fields.userId")}
              value={patient?.userId ?? "-"}
              valueClassName="break-all"
            />
            <KeyValueRow
              label={t("fields.email")}
              value={patient?.primaryEmail ?? "-"}
              valueClassName="break-all"
            />
            <KeyValueRow
              label={t("fields.phone")}
              value={patient?.primaryPhone ?? "-"}
              valueClassName="break-all"
            />
            <KeyValueRow
              label={t("patient360.profile.country")}
              value={(() => {
                const code = patient?.countryCode;
                if (!code) return "-";
                const match = countries.find((c) => c.isoCode.toUpperCase() === code.toUpperCase());
                if (match) {
                  return locale === "ar" ? (match.nativeName || match.name) : match.name;
                }
                return code.toUpperCase();
              })()}
            />
            <KeyValueRow label={t("patient360.profile.gender")} value={patient?.gender ?? "-"} />
            <KeyValueRow label={t("patient360.profile.dob")} value={patient?.dateOfBirth ?? "-"} />
            <KeyValueRow
              label={t("patient360.profile.onboarding")}
              value={patient?.onboardingCompletedAt ? t("states.completed") : t("states.incomplete")}
            />
          </div>
        </div>

        <div className="app-panel-soft rounded-[22px] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-text-muted">{t("patient360.overview.walletSectionTitle")}</p>
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() => setTab("wallet")}
            >
              {t("patient360.overview.viewAll")}
            </button>
          </div>
          <div className="mt-3">{walletSummaryCards}</div>
        </div>
      </div>

      <div className="space-y-3 lg:col-span-2">
        <div className="app-panel-soft rounded-[22px] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-text-muted">{t("patient360.overview.recentSessionsTitle")}</p>
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() => setTab("sessions")}
            >
              {t("patient360.overview.viewAll")}
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {(sessionsData?.items ?? []).slice(0, OVERVIEW_PREVIEW_LIMIT).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border-light bg-white px-4 py-3 dark:bg-surface-secondary">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
                    {s.practitioner.displayName ?? s.practitioner.slug}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {s.scheduledStartAt ? new Date(s.scheduledStartAt).toLocaleString(locale) : "-"}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-text-secondary">{s.status}</span>
              </div>
            ))}
            {sessionsLoading ? <p className="text-sm text-text-muted">{t("states.loading")}</p> : null}
            {!sessionsLoading && (sessionsData?.items?.length ?? 0) === 0 ? (
              <p className="text-sm text-text-secondary">{t("patient360.sessions.emptyDescription")}</p>
            ) : null}
            {sessionsError ? (
              <Button variant="outline" size="sm" onClick={() => refetchSessions()}>
                {t("actions.retry")}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="app-panel-soft rounded-[22px] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-text-muted">{t("patient360.overview.recentPaymentsTitle")}</p>
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() => setTab("payments")}
            >
              {t("patient360.overview.viewAll")}
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {(paymentsData?.items ?? []).slice(0, OVERVIEW_PREVIEW_LIMIT).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border-light bg-white px-4 py-3 dark:bg-surface-secondary">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
                    {formatMoney(p.amountTotal, p.currency, locale)}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {new Date(p.createdAt).toLocaleString(locale)}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-text-secondary">{p.status}</span>
              </div>
            ))}
            {paymentsLoading ? <p className="text-sm text-text-muted">{t("states.loading")}</p> : null}
            {!paymentsLoading && (paymentsData?.items?.length ?? 0) === 0 ? (
              <p className="text-sm text-text-secondary">{t("patient360.payments.emptyDescription")}</p>
            ) : null}
            {paymentsError ? (
              <Button variant="outline" size="sm" onClick={() => refetchPayments()}>
                {t("actions.retry")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <SurfaceCard variant="page">
        <SurfaceHeader
          eyebrow={t("patient360.eyebrow")}
          title={pageTitle}
          description={t("patient360.subtitle")}
          actions={
            <Button
              variant="outline"
              // next-intl router auto-prefixes the active locale (localePrefix: 'always')
              onClick={() => router.push(`/admin/patients` as any)}
              className="gap-2"
            >
              <DirectionalArrowIcon direction="back" className="h-4 w-4" />
              {t("patient360.back")}
            </Button>
          }
          meta={
            <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
              <div className="flex items-center gap-3 rounded-2xl border border-border-light bg-white px-3 py-2 dark:bg-surface-secondary">
                <AvatarText name={pageTitle} />
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {pageTitle}
                  </p>
                  <p className="text-xs text-text-muted break-all">{subtitle}</p>
                </div>
              </div>

              {patient?.status ? (
                <span className={cn("inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold", statusTone)}>
                  {(() => {
                    const normalized = patient.status.toUpperCase();
                    if (normalized === "ACTIVE") return t("filters.statusActive");
                    if (normalized === "INACTIVE") return t("filters.statusInactive");
                    if (normalized === "SUSPENDED" || normalized === "BLOCKED") return t("filters.statusSuspended");
                    if (normalized.startsWith("PENDING")) return t("filters.statusPending");
                    return patient.status;
                  })()}
                </span>
              ) : null}

              {patient?.createdAt ? (
                <span className="inline-flex items-center gap-2 rounded-2xl border border-border-light bg-white px-3 py-2 dark:bg-surface-secondary">
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                  <span className="font-semibold">{t("fields.createdAt")}</span>
                  <span className="text-text-muted">{new Date(patient.createdAt).toLocaleDateString(locale)}</span>
                </span>
              ) : null}
            </div>
          }
        />

        <div className="mt-5 space-y-4">
          {isLoading ? (
            <p className="text-sm text-text-muted">{t("states.loading")}</p>
          ) : isError ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border-light bg-surface-primary px-4 py-3">
              <p className="text-sm font-semibold text-text-primary dark:text-white/95">{t("patient360.states.loadError")}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                {t("actions.retry")}
              </Button>
            </div>
          ) : patient ? (
            <>
              <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
                {tabs.map((item) => (
                  <TabButton
                    key={item.key}
                    active={tab === item.key}
                    label={item.label}
                    icon={item.icon}
                    onClick={() => setTab(item.key)}
                  />
                ))}
              </div>

              {tab === "overview" ? (
                <div className="space-y-4">
                  {overviewCards}
                  {overviewRow}
                </div>
              ) : null}

              {tab === "wallet" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
                      {t("patient360.tabs.wallet")}
                    </h2>
                    {walletSummaryError ? (
                      <Button variant="outline" size="sm" onClick={() => refetchWalletSummary()}>
                        {t("actions.retry")}
                      </Button>
                    ) : null}
                  </div>

                  {walletSummaryLoading ? (
                    <p className="text-sm text-text-muted">{t("states.loading")}</p>
                  ) : walletSummaryError ? (
                    <p className="text-sm text-text-secondary">{t("states.walletError")}</p>
                  ) : (
                    walletSummaryCards
                  )}

                  <DataTable
                    data={walletEntriesData?.items ?? []}
                    columns={walletEntryColumns}
                    getRowId={(row) => row.id}
                    loading={walletEntriesLoading}
                    error={walletEntriesError ? t("states.walletEntriesError") : null}
                    emptyState={{
                      title: t("patient360.wallet.entriesEmptyTitle"),
                      description: t("patient360.wallet.entriesEmptyDescription"),
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
              ) : null}

              {tab === "sessions" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
                      {t("patient360.tabs.sessions")}
                    </h2>
                    {sessionsError ? (
                      <Button variant="outline" size="sm" onClick={() => refetchSessions()}>
                        {t("actions.retry")}
                      </Button>
                    ) : null}
                  </div>

                  <DataTable
                    data={sessionsData?.items ?? []}
                    columns={sessionColumns}
                    getRowId={(row) => row.id}
                    loading={sessionsLoading}
                    error={sessionsError ? t("patient360.sessions.loadError") : null}
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
              ) : null}

              {tab === "payments" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
                      {t("patient360.tabs.payments")}
                    </h2>
                    {paymentsError ? (
                      <Button variant="outline" size="sm" onClick={() => refetchPayments()}>
                        {t("actions.retry")}
                      </Button>
                    ) : null}
                  </div>

                  <DataTable
                    data={paymentsData?.items ?? []}
                    columns={paymentColumns}
                    getRowId={(row) => row.id}
                    loading={paymentsLoading}
                    error={paymentsError ? t("patient360.payments.loadError") : null}
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
              ) : null}

              {tab === "assessments" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
                      {t("patient360.tabs.assessments")}
                    </h2>
                    {assessmentsError ? (
                      <Button variant="outline" size="sm" onClick={() => refetchAssessments()}>
                        {t("actions.retry")}
                      </Button>
                    ) : null}
                  </div>

                  <DataTable
                    data={assessmentsData?.items ?? []}
                    columns={assessmentColumns}
                    getRowId={(row) => row.submissionId}
                    loading={assessmentsLoading}
                    error={assessmentsError ? t("patient360.assessments.loadError") : null}
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
              ) : null}
            </>
          ) : (
            <div className="rounded-2xl border border-border-light bg-surface-primary px-4 py-3">
              <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("patient360.states.notFound")}
              </p>
            </div>
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}
