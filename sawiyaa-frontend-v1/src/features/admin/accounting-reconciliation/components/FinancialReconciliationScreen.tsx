"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CircleDashed,
  Clock3,
  Eye,
  Play,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import Button from "@/components/ui/button/Button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import {
  buildUpdatedSearchParams,
  parsePositiveIntParam,
  parseTextParam,
} from "@/components/ui/data-table";
import { Drawer, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import InputField from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import TextArea from "@/components/form/input/TextArea";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useCurrentUserPermissions } from "@/features/users/hooks/use-users";
import { Link } from "@/i18n/navigation";
import { PermissionKey } from "@/lib/auth/permissions";
import { formatUtcAuditDateTime } from "@/lib/time-formatting";
import { isStepUpRequiredError, toAppError } from "@/lib/api/errors";
import { getReconciliationIssueCopy } from "../issue-code-copy";
import {
  useAccountingReconciliationIssue,
  useAccountingReconciliationIssues,
  useAccountingReconciliationRun,
  useAccountingReconciliationRuns,
  useAccountingReconciliationStatus,
  useReviewAccountingReconciliationIssue,
  useRunAccountingReconciliation,
} from "../hooks";
import AccountingStepUpDialog from "./AccountingStepUpDialog";
import { useAdminStepUp } from "@/features/admin/users/hooks/use-admin-step-up";
import type {
  AccountingReconciliationIssueRecord,
  AccountingReconciliationIssueStatus,
  AccountingReconciliationRunRecord,
  AccountingReconciliationRunScope,
  AccountingReconciliationRunStatus,
  AccountingReconciliationRunTrigger,
  AccountingReconciliationSeverity,
} from "../types";

type RunActionKind = "PAYMENTS" | "WALLETS" | "REFUNDS" | "PACKAGE_SETTLEMENTS" | "FULL";

const RUN_SCOPE_OPTIONS: AccountingReconciliationRunScope[] = [
  "FULL",
  "PAYMENTS",
  "WALLETS",
  "REFUNDS",
  "PACKAGE_SETTLEMENTS",
];

const RUN_TRIGGER_OPTIONS: AccountingReconciliationRunTrigger[] = [
  "MANUAL",
  "ADMIN",
  "SCHEDULED",
  "SYSTEM",
];

const RUN_STATUS_OPTIONS: AccountingReconciliationRunStatus[] = [
  "RUNNING",
  "COMPLETED",
  "COMPLETED_WITH_ISSUES",
  "FAILED",
];

const ISSUE_STATUS_OPTIONS: AccountingReconciliationIssueStatus[] = [
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED",
  "IGNORED",
];

const ISSUE_SEVERITY_OPTIONS: AccountingReconciliationSeverity[] = [
  "CRITICAL",
  "ERROR",
  "WARNING",
  "INFO",
];

function normalizeLocale(locale: string) {
  return locale === "ar" ? "ar-EG" : "en-US";
}

function formatDateTime(locale: string, value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    timeZone: "UTC",
    day: "numeric",
    month: locale === "ar" ? "long" : "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function renderSummaryDateTime(locale: string, value: string | null | undefined) {
  if (!value) return "—";

  return (
    <div className="flex flex-col leading-tight">
      <span className="text-base font-semibold sm:text-lg">
        {new Intl.DateTimeFormat(normalizeLocale(locale), {
          timeZone: "UTC",
          day: "numeric",
          month: locale === "ar" ? "long" : "short",
          year: "numeric",
        }).format(new Date(value))}
      </span>
      <span className="mt-1 text-xs font-medium text-text-secondary dark:text-white/70">
        {new Intl.DateTimeFormat(normalizeLocale(locale), {
          timeZone: "UTC",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(value))}
      </span>
    </div>
  );
}

function shortId(value: string | null | undefined) {
  if (!value) return "—";
  return value.length <= 16 ? value : `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function badgeTone(tone: "neutral" | "primary" | "success" | "warning" | "danger") {
  switch (tone) {
    case "success":
      return "bg-success-50 text-success-700 dark:bg-success-500/12 dark:text-success-300";
    case "warning":
      return "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300";
    case "danger":
      return "bg-error-50 text-error-700 dark:bg-error-500/12 dark:text-error-300";
    case "primary":
      return "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light";
    default:
      return "bg-surface-secondary text-text-secondary dark:bg-white/8 dark:text-white/80";
  }
}

function StatusPill({
  tone,
  children,
}: {
  tone: "neutral" | "primary" | "success" | "warning" | "danger";
  children: string;
}) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeTone(tone)}`}>
      {children}
    </span>
  );
}

function InfoBlock({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/[0.03]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">{label}</p>
      <p className={`mt-1 text-sm text-text-primary dark:text-white/90 ${mono ? "font-mono break-all text-xs" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function CopyableInfoBlock({
  label,
  value,
  copyLabel,
  onCopy,
  mono = false,
}: {
  label: string;
  value: string;
  copyLabel: string;
  onCopy: () => void;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">{label}</p>
          <p className={`mt-1 text-sm text-text-primary dark:text-white/90 ${mono ? "break-all font-mono text-xs" : ""}`}>{value}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onCopy}>
          {copyLabel}
        </Button>
      </div>
    </div>
  );
}

function safeEntries(value: Record<string, unknown> | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).map(([key, nested]) => {
    if (nested === null || nested === undefined) return { key, value: "—" };
    if (typeof nested === "string" || typeof nested === "number" || typeof nested === "boolean") {
      return { key, value: String(nested) };
    }
    if (Array.isArray(nested)) {
      return { key, value: nested.map((item) => String(item)).join(", ") || "—" };
    }
    const preview = Object.entries(nested as Record<string, unknown>)
      .slice(0, 4)
      .map(([nestedKey, nestedValue]) => `${nestedKey}: ${String(nestedValue)}`)
      .join(", ");
    return { key, value: preview || "—" };
  });
}

function runStatusTone(status: AccountingReconciliationRunStatus) {
  if (status === "COMPLETED") return "success";
  if (status === "COMPLETED_WITH_ISSUES") return "warning";
  if (status === "FAILED") return "danger";
  return "neutral";
}

function issueSeverityTone(severity: AccountingReconciliationSeverity) {
  if (severity === "CRITICAL") return "danger";
  if (severity === "ERROR") return "warning";
  if (severity === "WARNING") return "primary";
  return "neutral";
}

function reviewStatusTone(status: AccountingReconciliationIssueStatus) {
  if (status === "RESOLVED") return "success";
  if (status === "ACKNOWLEDGED") return "primary";
  if (status === "IGNORED") return "neutral";
  return "warning";
}

function getLocalizedCurrencyLabel(currencyCode: string | null | undefined) {
  if (!currencyCode) return null;
  const normalized = currencyCode.trim().toUpperCase();
  if (normalized === "EGP") return { ar: "الجنيه المصري", en: "EGP" };
  if (normalized === "USD") return { ar: "الدولار الأمريكي", en: "USD" };
  return { ar: normalized, en: normalized };
}

function humanizeIssueDomain(scope: AccountingReconciliationRunScope, locale: string) {
  const isArabic = locale === "ar";
  switch (scope) {
    case "PAYMENTS":
      return isArabic ? "المدفوعات" : "Payments";
    case "WALLETS":
      return isArabic ? "المحافظ" : "Wallets";
    case "REFUNDS":
      return isArabic ? "الاستردادات" : "Refunds";
    case "PACKAGE_SETTLEMENTS":
      return isArabic ? "تسويات الباقات" : "Package settlements";
    default:
      return isArabic ? "شامل" : "Full";
  }
}

function humanizeEntityType(entityType: string, locale: string) {
  const normalized = entityType.trim().toLowerCase().replace(/[_-]+/g, " ");
  const isArabic = locale === "ar";
  if (normalized.includes("payment")) return isArabic ? "دفع" : "Payment";
  if (normalized.includes("refund")) return isArabic ? "استرداد" : "Refund";
  if (normalized.includes("settlement")) return isArabic ? "تسوية" : "Settlement";
  if (normalized.includes("wallet")) return isArabic ? "محفظة" : "Wallet";
  if (normalized.includes("journal")) return isArabic ? "قيد يومية" : "Journal entry";
  if (normalized.includes("package")) return isArabic ? "باقة" : "Package";
  return entityType;
}

function parseNumericValue(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function formatExpectedActualDifference(
  expectedValue: string | null | undefined,
  actualValue: string | null | undefined,
  locale: string,
) {
  const expected = parseNumericValue(expectedValue);
  const actual = parseNumericValue(actualValue);
  if (expected === null || actual === null) return null;

  const diff = actual - expected;
  const formatted = new Intl.NumberFormat(normalizeLocale(locale), {
    maximumFractionDigits: 2,
  }).format(Math.abs(diff));
  if (diff === 0) return locale === "ar" ? "لا يوجد فرق" : "No difference";
  return locale === "ar"
    ? `${diff > 0 ? "أعلى" : "أقل"} بمقدار ${formatted}`
    : `${diff > 0 ? "Higher" : "Lower"} by ${formatted}`;
}

function formatCompactNumber(locale: string, value: number) {
  return new Intl.NumberFormat(normalizeLocale(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMoneyValue(locale: string, value: string | null | undefined) {
  const parsed = parseNumericValue(value);
  if (parsed === null) return value?.trim() || "—";
  return formatCompactNumber(locale, parsed);
}

function getCurrencyDisplay(locale: string, currencyCode: string | null | undefined) {
  const localized = getLocalizedCurrencyLabel(currencyCode);
  if (!localized) return null;
  if (locale === "ar") {
    if ((currencyCode ?? "").toUpperCase() === "EGP") return "ج.م";
    return localized.ar;
  }
  return localized.en;
}

function getIssueSourceKey(issue: AccountingReconciliationIssueRecord) {
  const entityType = issue.entityType.toLowerCase();
  if (entityType.includes("journal")) return "journalEntry";
  if (entityType.includes("refund")) return "refund";
  if (entityType.includes("payment")) return "payment";
  if (entityType.includes("practitioner") && entityType.includes("wallet")) return "practitionerWallet";
  if (entityType.includes("patient") && entityType.includes("wallet")) return "patientWallet";
  if (entityType.includes("practitioner") && entityType.includes("settlement")) return "practitionerSettlement";
  if (entityType.includes("package") && entityType.includes("settlement")) return "packageSettlement";
  if (issue.scope === "PAYMENTS") return "payment";
  if (issue.scope === "REFUNDS") return "refund";
  if (issue.scope === "WALLETS") return "practitionerWallet";
  if (issue.scope === "PACKAGE_SETTLEMENTS") return "packageSettlement";
  return "other";
}

function formatIssueSourceLabel(issue: AccountingReconciliationIssueRecord, t: ReturnType<typeof useTranslations>) {
  return t(`issues.sources.${getIssueSourceKey(issue)}`);
}

function formatIssueAmountSummary(issue: AccountingReconciliationIssueRecord, locale: string, t: ReturnType<typeof useTranslations>) {
  const expected = parseNumericValue(issue.expectedValue);
  const actual = parseNumericValue(issue.actualValue);
  const currencyDisplay = getCurrencyDisplay(locale, issue.currencyCode);

  if (expected === null && actual === null) return t("common.notAvailable");

  if (expected !== null && actual !== null) {
    const difference = actual - expected;
    if (difference === 0) return t("issues.amount.noDifference");

    if (currencyDisplay) {
      const differenceText = formatCompactNumber(locale, Math.abs(difference));
      return locale === "ar"
        ? `${t("issues.amount.difference")} ${differenceText} ${currencyDisplay}`
        : `${t("issues.amount.difference")} ${currencyDisplay} ${differenceText}`;
    }

    const expectedText = formatCompactNumber(locale, expected);
    const actualText = formatCompactNumber(locale, actual);
    return `${t("issues.amount.expected")} ${expectedText} / ${t("issues.amount.actual")} ${actualText}`;
  }

  if (!currencyDisplay) return t("common.notAvailable");

  if (expected !== null) {
    return `${t("issues.amount.expected")} ${formatCompactNumber(locale, expected)} ${currencyDisplay}`;
  }

  return `${t("issues.amount.actual")} ${formatCompactNumber(locale, actual ?? 0)} ${currencyDisplay}`;
}

async function copyTextToClipboard(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    throw new Error("Clipboard API unavailable");
  }
  await navigator.clipboard.writeText(value);
}

function toSafeReferencePairs(metadataJson: Record<string, unknown> | null | undefined) {
  if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) return [];
  const keys = ["paymentId", "sessionId", "settlementId", "refundId", "payoutId", "journalEntryId"];
  return keys
    .filter((key) => key in metadataJson)
    .map((key) => {
      const value = metadataJson[key];
      return {
        key,
        value: value === null || value === undefined ? "—" : String(value),
      };
    });
}

function FilterField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
        {label}
      </span>
      {options ? (
        <select className="app-control w-full py-3" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{label}</option>
          {options.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      ) : (
        <InputField value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
        {label}
      </span>
      <input
        type="date"
        className="app-control w-full py-3"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function useAccountingReconciliationFilters() {
  const searchParams = useSearchParams();

  const runPage = parsePositiveIntParam(searchParams.get("runPage"), 1, { min: 1 });
  const runLimit = parsePositiveIntParam(searchParams.get("runLimit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 50,
  });
  const issuePage = parsePositiveIntParam(searchParams.get("issuePage"), 1, { min: 1 });
  const issueLimit = parsePositiveIntParam(searchParams.get("issueLimit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 50,
  });

  const runScope = parseTextParam(searchParams.get("runScope"), { maxLength: 32 });
  const runStatus = parseTextParam(searchParams.get("runStatus"), { maxLength: 32 });
  const runTrigger = parseTextParam(searchParams.get("runTrigger"), { maxLength: 32 });
  const runCurrencyCode = parseTextParam(searchParams.get("runCurrencyCode"), { maxLength: 3 });
  const runEntityId = parseTextParam(searchParams.get("runEntityId"), { maxLength: 80 });
  const runFrom = parseTextParam(searchParams.get("runFrom"), { maxLength: 40 });
  const runTo = parseTextParam(searchParams.get("runTo"), { maxLength: 40 });

  const issueScope = parseTextParam(searchParams.get("issueScope"), { maxLength: 32 });
  const issueSeverity = parseTextParam(searchParams.get("issueSeverity"), { maxLength: 16 });
  const issueReviewStatus = parseTextParam(searchParams.get("issueReviewStatus"), { maxLength: 32 });
  const issueCurrencyCode = parseTextParam(searchParams.get("issueCurrencyCode"), { maxLength: 3 });
  const issueEntityType = parseTextParam(searchParams.get("issueEntityType"), { maxLength: 80 });
  const issueEntityId = parseTextParam(searchParams.get("issueEntityId"), { maxLength: 80 });
  const issueCode = parseTextParam(searchParams.get("issueCode"), { maxLength: 80 });
  const issueRunId = parseTextParam(searchParams.get("issueRunId"), { maxLength: 80 });
  const issueFrom = parseTextParam(searchParams.get("issueFrom"), { maxLength: 40 });
  const issueTo = parseTextParam(searchParams.get("issueTo"), { maxLength: 40 });

  return {
    runQuery: {
      page: runPage,
      limit: runLimit,
      scope: (runScope as AccountingReconciliationRunScope | null) || undefined,
      status: (runStatus as AccountingReconciliationRunStatus | null) || undefined,
      trigger: (runTrigger as AccountingReconciliationRunTrigger | null) || undefined,
      entityId: runEntityId || undefined,
      currencyCode: runCurrencyCode || undefined,
      from: runFrom || undefined,
      to: runTo || undefined,
    },
    issueQuery: {
      page: issuePage,
      limit: issueLimit,
      scope: (issueScope as AccountingReconciliationRunScope | null) || undefined,
      severity: (issueSeverity as AccountingReconciliationSeverity | null) || undefined,
      status: (issueReviewStatus as AccountingReconciliationIssueStatus | null) || undefined,
      currencyCode: issueCurrencyCode || undefined,
      entityType: issueEntityType || undefined,
      entityId: issueEntityId || undefined,
      issueCode: issueCode || undefined,
      runId: issueRunId || undefined,
      from: issueFrom || undefined,
      to: issueTo || undefined,
    },
    runFilters: { runScope, runStatus, runTrigger, runCurrencyCode, runEntityId, runFrom, runTo, runPage, runLimit },
    issueFilters: {
      issueScope,
      issueSeverity,
      issueReviewStatus,
      issueCurrencyCode,
      issueEntityType,
      issueEntityId,
      issueCode,
      issueRunId,
      issueFrom,
      issueTo,
      issuePage,
      issueLimit,
    },
  };
}

export default function FinancialReconciliationScreen() {
  const t = useTranslations("admin-accounting");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: permissionData } = useCurrentUserPermissions(true);
  const canWrite = permissionData?.permissions?.includes(PermissionKey.ACCOUNTING_WRITE) ?? false;
  const stepUp = useAdminStepUp();

  const { runQuery, issueQuery, runFilters, issueFilters } = useAccountingReconciliationFilters();

  const statusQuery = useAccountingReconciliationStatus();
  const runsQuery = useAccountingReconciliationRuns(runQuery);
  const issuesQuery = useAccountingReconciliationIssues(issueQuery);
  const runMutation = useRunAccountingReconciliation();
  const reviewMutation = useReviewAccountingReconciliationIssue();

  const [activeTab, setActiveTab] = useState<"issues" | "checks">("issues");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const selectedRunQuery = useAccountingReconciliationRun(selectedRunId ?? undefined);
  const selectedIssueQuery = useAccountingReconciliationIssue(selectedIssueId ?? undefined);

  const updateQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const queryString = next.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const refreshAll = () => {
    void runsQuery.refetch();
    void issuesQuery.refetch();
    void statusQuery.refetch();
  };

  const handleCopyValue = async (value: string) => {
    try {
      await copyTextToClipboard(value);
      toast.success(t("common.copied"));
    } catch {
      toast.error(t("common.copyFailed"));
    }
  };

  const handleIssueSearch = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      updateQuery({ issueCode: null, issueEntityId: null, issuePage: 1 });
      return;
    }

    if (looksLikeUuid(trimmed)) {
      updateQuery({ issueEntityId: trimmed, issueCode: null, issuePage: 1 });
      return;
    }

    updateQuery({ issueCode: trimmed, issueEntityId: null, issuePage: 1 });
  };

  const handleRunSearch = (value: string) => {
    updateQuery({ runEntityId: value.trim() || null, runPage: 1 });
  };

  const executeRun = async (kind: RunActionKind) => {
    try {
      const result = await runMutation.mutateAsync({
        kind,
        scope: kind,
        query: {
          currencyCode: runFilters.runCurrencyCode || undefined,
          from: runFilters.runFrom || undefined,
          to: runFilters.runTo || undefined,
        },
      });
      if (result.issueCount > 0) {
        toast.success(t("toast.runSuccessWithIssues", { count: result.issueCount }));
      } else {
        toast.success(t("toast.runSuccessNoIssues"));
      }
      refreshAll();
    } catch (cause) {
      const appError = toAppError(cause);
      if (isStepUpRequiredError(appError)) {
        stepUp.requestStepUp(async () => {
          await executeRun(kind);
        });
        return;
      }
      toast.error(appError.message || t("states.runError"));
    }
  };

  const executeReview = async (action: "ACKNOWLEDGE" | "RESOLVE" | "IGNORE") => {
    if (!selectedIssue) return;

    try {
      await reviewMutation.mutateAsync({
        issueId: selectedIssue.id,
        action,
        payload: { note: reviewNote.trim() || undefined },
      });
      toast.success(t("toast.reviewSuccess", { action: t(`review.actions.${action.toLowerCase()}`) }));
      setReviewNote("");
      refreshAll();
    } catch (cause) {
      const appError = toAppError(cause);
      if (isStepUpRequiredError(appError)) {
        stepUp.requestStepUp(async () => {
          await executeReview(action);
        });
        return;
      }
      toast.error(appError.message || t("states.reviewError"));
    }
  };

  const status = statusQuery.data;
  const runs = runsQuery.data?.items ?? [];
  const issues = issuesQuery.data?.items ?? [];
  const selectedRun = selectedRunQuery.data?.run ?? null;
  const selectedRunIssues = selectedRunQuery.data?.issues ?? [];
  const selectedIssue = selectedIssueQuery.data?.item ?? null;
  const selectedIssueCopy = useMemo(
    () => getReconciliationIssueCopy(selectedIssue?.issueCode),
    [selectedIssue?.issueCode],
  );
  const selectedIssueCurrencyLabel = getLocalizedCurrencyLabel(selectedIssue?.currencyCode);
  const selectedIssueReferences = toSafeReferencePairs(selectedIssue?.metadataJson);
  const selectedIssueExpectedActualDifference = formatExpectedActualDifference(
    selectedIssue?.expectedValue,
    selectedIssue?.actualValue,
    locale,
  );
  const lastCheckAt =
    status?.lastFullRunAt ?? status?.lastScheduledRunAt ?? runs[0]?.completedAt ?? runs[0]?.startedAt ?? null;
  const issueSearchValue = issueFilters.issueCode ?? issueFilters.issueEntityId ?? "";
  const runSearchValue = runFilters.runEntityId ?? "";

  const runColumns = useMemo<ColumnDef<AccountingReconciliationRunRecord>[]>(
    () => [
      {
        id: "scope",
        header: t("runs.table.scope"),
        cell: (row) => (
          <div className="space-y-1">
            <p className="font-semibold text-text-primary dark:text-white/95">
              {t(`runs.scope.${row.scope.toLowerCase()}`)}
            </p>
            <p className="text-xs text-text-muted">{t(`runs.trigger.${row.trigger.toLowerCase()}`)}</p>
          </div>
        ),
      },
      {
        id: "status",
        header: t("runs.table.status"),
        cell: (row) => <StatusPill tone={runStatusTone(row.status)}>{t(`runs.status.${row.status.toLowerCase()}`)}</StatusPill>,
      },
      {
        id: "currency",
        header: t("runs.table.currency"),
        cell: (row) => row.currencyCode ?? "—",
      },
      {
        id: "startedAt",
        header: t("runs.table.startedAt"),
        cell: (row) => formatDateTime(locale, row.startedAt),
      },
      {
        id: "completedAt",
        header: t("runs.table.completedAt"),
        cell: (row) => formatDateTime(locale, row.completedAt),
      },
      {
        id: "counts",
        header: t("runs.table.counts"),
        cell: (row) => (
          <div className="text-xs text-text-secondary">
            <p>
              {t("runs.table.checked")}: {row.totalChecked}
            </p>
            <p>
              {t("runs.table.critical")}: {row.totalCritical}, {t("runs.table.warnings")}: {row.totalWarnings}
            </p>
          </div>
        ),
      },
    ],
    [locale, t],
  );

  const issueColumns = useMemo<ColumnDef<AccountingReconciliationIssueRecord>[]>(
    () => [
      {
        id: "severity",
        header: t("issues.table.severity"),
        cell: (row) => <StatusPill tone={issueSeverityTone(row.severity)}>{t(`issues.severity.${row.severity.toLowerCase()}`)}</StatusPill>,
      },
      {
        id: "problem",
        header: t("issues.table.problem"),
        cell: (row) => {
          const copy = getReconciliationIssueCopy(row.issueCode);
          return (
            <div className="space-y-1">
              <p className="font-semibold text-text-primary dark:text-white/95">
                {locale === "ar" ? copy.titleAr : copy.titleEn}
              </p>
              <p className="font-mono text-[11px] text-text-muted">{row.issueCode}</p>
            </div>
          );
        },
      },
      {
        id: "source",
        header: t("issues.table.source"),
        cell: (row) => (
          <div className="space-y-1">
            <p className="font-semibold text-text-primary dark:text-white/95">
              {formatIssueSourceLabel(row, t)}
            </p>
            <p className="text-xs text-text-muted">
              {humanizeIssueDomain(row.scope, locale)} · {humanizeEntityType(row.entityType, locale)}
            </p>
          </div>
        ),
      },
      {
        id: "amount",
        header: t("issues.table.amount"),
        cell: (row) => (
          <div className="text-sm text-text-primary dark:text-white/90">
            <p>{formatIssueAmountSummary(row, locale, t)}</p>
          </div>
        ),
      },
      {
        id: "reviewStatus",
        header: t("issues.table.reviewStatus"),
        cell: (row) => <StatusPill tone={reviewStatusTone(row.status)}>{t(`issues.reviewStatus.${row.status.toLowerCase()}`)}</StatusPill>,
      },
      {
        id: "lastSeen",
        header: t("issues.table.lastSeen"),
        cell: (row) => formatDateTime(locale, row.lastDetectedAt),
      },
      {
        id: "action",
        header: t("issues.table.action"),
        cell: (row) => (
          <Button type="button" variant="outline" size="sm" onClick={() => setSelectedIssueId(row.id)} startIcon={<Eye className="h-4 w-4" />}>
            {t("actions.view")}
          </Button>
        ),
      },
    ],
    [locale, t],
  );

  return (
    <AdminPermissionGate requiredPermissions={[PermissionKey.ACCOUNTING_READ]}>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-border-light bg-surface p-5 shadow-sm dark:border-white/8 dark:bg-surface-secondary">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                {t("page.eyebrow")}
              </p>
              <h1 className="text-2xl font-semibold text-text-primary dark:text-white/95 sm:text-3xl">
                {t("page.title")}
              </h1>
              <p className="max-w-3xl text-sm text-text-secondary">
                {t("page.description")}
              </p>
            </div>
            <div className="rounded-2xl border border-warning-200 bg-warning-50/75 px-4 py-3 text-sm text-warning-900 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-100">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{t("page.safetyNotice")}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <AdminSummaryCard
              label={t("summary.criticalIssues")}
              value={String(status?.openCriticalCount ?? 0)}
              hint={t("summary.criticalIssuesHint")}
              tone={(status?.openCriticalCount ?? 0) > 0 ? "warning" : "success"}
              icon={<ShieldAlert className="h-4 w-4" />}
            />
            <AdminSummaryCard
              label={t("summary.warnings")}
              value={String(status?.openWarningCount ?? 0)}
              hint={t("summary.warningsHint")}
              tone={(status?.openWarningCount ?? 0) > 0 ? "warning" : "success"}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            <AdminSummaryCard
              label={t("summary.lastCheck")}
              value={renderSummaryDateTime(locale, lastCheckAt)}
              tone="neutral"
              icon={<Clock3 className="h-4 w-4" />}
            />
            <AdminSummaryCard
              label={t("summary.autoCheckStatus")}
              value={status?.active ? t("summary.active") : "—"}
              hint={status?.enabled ? t("summary.enabled") : t("summary.disabled")}
              tone={status?.active ? "primary" : "neutral"}
              icon={<CircleDashed className="h-4 w-4" />}
            />
          </div>

          <details className="mt-4 rounded-2xl border border-border-light bg-surface-secondary/70 px-4 py-3 text-sm text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
            <summary className="cursor-pointer text-sm font-semibold text-text-primary dark:text-white/95">
              {t("summary.autoCheckDetails")}
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InfoBlock label={t("summary.scheduler")} value={status ? status.cron : t("common.loading")} />
              <InfoBlock
                label={t("summary.nextScheduled")}
                value={formatDateTime(locale, status?.nextScheduledRunAt)}
              />
              <InfoBlock
                label={t("summary.lastScheduled")}
                value={formatDateTime(locale, status?.lastScheduledRunAt)}
              />
              <InfoBlock
                label={t("summary.lastScheduledRunId")}
                value={status?.lastScheduledRunId ? shortId(status.lastScheduledRunId) : t("common.none")}
                mono
              />
            </div>
          </details>

          {canWrite ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => executeRun("FULL")}
                startIcon={<Play className="h-4 w-4" />}
                disabled={runMutation.isPending}
              >
                {runMutation.isPending ? t("actions.running") : t("actions.runFullCheck")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={refreshAll}
                startIcon={<RefreshCw className="h-4 w-4" />}
              >
                {t("actions.refresh")}
              </Button>
              <details className="relative">
                <summary className="inline-flex cursor-pointer list-none items-center rounded-lg border border-border-light bg-surface-secondary px-4 py-2.5 text-sm font-semibold text-text-primary shadow-sm transition hover:border-primary/30 hover:bg-primary-light/30 dark:border-white/8 dark:bg-white/[0.03]">
                  {t("actions.specificChecks")}
                </summary>
                <div className="mt-2 grid min-w-56 gap-2 rounded-2xl border border-border-light bg-surface p-2 shadow-lg dark:border-white/8 dark:bg-surface-secondary">
                  <Button type="button" variant="ghost" size="sm" onClick={() => executeRun("PAYMENTS")} disabled={runMutation.isPending}>
                    {t("actions.payments")}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => executeRun("WALLETS")} disabled={runMutation.isPending}>
                    {t("actions.wallets")}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => executeRun("REFUNDS")} disabled={runMutation.isPending}>
                    {t("actions.refunds")}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => executeRun("PACKAGE_SETTLEMENTS")} disabled={runMutation.isPending}>
                    {t("actions.packageSettlements")}
                  </Button>
                </div>
              </details>
            </div>
          ) : null}
        </section>

        <section className="rounded-[28px] border border-border-light bg-surface p-5 shadow-sm dark:border-white/8 dark:bg-surface-secondary">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-light pb-4 dark:border-white/8">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={activeTab === "issues" ? "primary" : "outline"}
                size="sm"
                onClick={() => setActiveTab("issues")}
              >
                {t("tabs.openIssues")}
              </Button>
              <Button
                type="button"
                variant={activeTab === "checks" ? "primary" : "outline"}
                size="sm"
                onClick={() => setActiveTab("checks")}
              >
                {t("tabs.recentChecks")}
              </Button>
            </div>
            <p className="text-xs text-text-muted">
              {activeTab === "issues" ? t("tabs.openIssuesHint") : t("tabs.recentChecksHint")}
            </p>
          </div>

          {activeTab === "issues" ? (
            <div className="space-y-4 pt-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <FilterField
                  label={t("filters.search")}
                  value={issueSearchValue}
                  onChange={handleIssueSearch}
                  placeholder={t("filters.searchIssuePlaceholder")}
                />
                <FilterField
                  label={t("filters.status")}
                  value={issueFilters.issueReviewStatus ?? ""}
                  onChange={(value) => updateQuery({ issueReviewStatus: value || null, issuePage: 1 })}
                  options={ISSUE_STATUS_OPTIONS.map((item) => ({ value: item, label: t(`issues.reviewStatus.${item.toLowerCase()}`) }))}
                />
                <FilterField
                  label={t("filters.severity")}
                  value={issueFilters.issueSeverity ?? ""}
                  onChange={(value) => updateQuery({ issueSeverity: value || null, issuePage: 1 })}
                  options={ISSUE_SEVERITY_OPTIONS.map((item) => ({ value: item, label: t(`issues.severity.${item.toLowerCase()}`) }))}
                />
                <DateField
                  label={t("filters.date")}
                  value={issueFilters.issueFrom ?? ""}
                  onChange={(value) => updateQuery({ issueFrom: value || null, issuePage: 1 })}
                />
              </div>

              <details className="rounded-2xl border border-border-light bg-surface-secondary/70 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]">
                <summary className="cursor-pointer text-sm font-semibold text-text-primary dark:text-white/95">
                  {t("filters.advancedFilters")}
                </summary>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <FilterField
                    label={t("filters.currency")}
                    value={issueFilters.issueCurrencyCode ?? ""}
                    onChange={(value) => updateQuery({ issueCurrencyCode: value || null, issuePage: 1 })}
                    placeholder={t("filters.currencyPlaceholder")}
                  />
                  <FilterField
                    label={t("filters.entityType")}
                    value={issueFilters.issueEntityType ?? ""}
                    onChange={(value) => updateQuery({ issueEntityType: value || null, issuePage: 1 })}
                    placeholder={t("filters.entityTypePlaceholder")}
                  />
                  <FilterField
                    label={t("filters.entityId")}
                    value={issueFilters.issueEntityId ?? ""}
                    onChange={(value) => updateQuery({ issueEntityId: value || null, issuePage: 1 })}
                    placeholder={t("filters.entityIdPlaceholder")}
                  />
                  <FilterField
                    label={t("filters.issueCode")}
                    value={issueFilters.issueCode ?? ""}
                    onChange={(value) => updateQuery({ issueCode: value || null, issuePage: 1 })}
                    placeholder={t("filters.issueCodePlaceholder")}
                  />
                  <FilterField
                    label={t("filters.runId")}
                    value={issueFilters.issueRunId ?? ""}
                    onChange={(value) => updateQuery({ issueRunId: value || null, issuePage: 1 })}
                    placeholder={t("filters.runIdPlaceholder")}
                  />
                  <FilterField
                    label={t("filters.scope")}
                    value={issueFilters.issueScope ?? ""}
                    onChange={(value) => updateQuery({ issueScope: value || null, issuePage: 1 })}
                    options={RUN_SCOPE_OPTIONS.map((item) => ({ value: item, label: t(`runs.scope.${item.toLowerCase()}`) }))}
                  />
                  <DateField
                    label={t("filters.to")}
                    value={issueFilters.issueTo ?? ""}
                    onChange={(value) => updateQuery({ issueTo: value || null, issuePage: 1 })}
                  />
                </div>
              </details>

              <div className="space-y-4">
                <div className="space-y-3 md:hidden">
                  {issues.map((row) => {
                    const copy = getReconciliationIssueCopy(row.issueCode);
                    const title = locale === "ar" ? copy.titleAr : copy.titleEn;
                    return (
                      <article
                        key={row.id}
                        className="rounded-2xl border border-border-light bg-surface-secondary/70 p-4 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <StatusPill tone={issueSeverityTone(row.severity)}>
                              {t(`issues.severity.${row.severity.toLowerCase()}`)}
                            </StatusPill>
                            <p className="text-base font-semibold text-text-primary dark:text-white/95">{title}</p>
                            <p className="break-all text-xs text-text-muted">{row.issueCode}</p>
                          </div>
                          <StatusPill tone={reviewStatusTone(row.status)}>
                            {t(`issues.reviewStatus.${row.status.toLowerCase()}`)}
                          </StatusPill>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                              {t("issues.table.source")}
                            </p>
                            <p className="mt-1 font-medium text-text-primary dark:text-white/90">{formatIssueSourceLabel(row, t)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                              {t("issues.table.amount")}
                            </p>
                            <p className="mt-1 font-medium text-text-primary dark:text-white/90">{formatIssueAmountSummary(row, locale, t)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                              {t("issues.table.lastSeen")}
                            </p>
                            <p className="mt-1 text-sm text-text-primary dark:text-white/90">{formatDateTime(locale, row.lastDetectedAt)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                              {t("runs.table.scope")}
                            </p>
                            <p className="mt-1 text-sm text-text-primary dark:text-white/90">{humanizeIssueDomain(row.scope, locale)}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedIssueId(row.id)}
                            startIcon={<Eye className="h-4 w-4" />}
                          >
                            {t("actions.view")}
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                  {issues.length === 0 && !issuesQuery.isLoading ? (
                    <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-6 text-sm text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
                      {t("states.issuesEmptyNote")}
                    </div>
                  ) : null}
                </div>
                <div className="hidden overflow-hidden rounded-2xl border border-border-light bg-surface-secondary/40 dark:border-white/8 dark:bg-white/[0.02] md:block">
                  <DataTable
                    data={issues}
                    columns={issueColumns}
                    getRowId={(row) => row.id}
                    loading={issuesQuery.isLoading}
                    error={issuesQuery.isError ? t("states.issuesError") : null}
                    errorState={{
                      title: t("states.issuesErrorTitle"),
                      description: t("states.issuesError"),
                      action: { label: t("states.retry"), onClick: () => issuesQuery.refetch() },
                    }}
                    emptyState={{
                      title: t("states.issuesEmptyTitle"),
                      description: t("states.issuesEmptyNote"),
                    }}
                    pagination={issuesQuery.data?.pagination}
                    onPageChange={(page) => updateQuery({ issuePage: page })}
                    onPageSizeChange={(limit) => updateQuery({ issueLimit: limit, issuePage: 1 })}
                    pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
                    onRowClick={(row) => setSelectedIssueId(row.id)}
                    ariaLabel={t("tabs.openIssues")}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <FilterField
                  label={t("filters.search")}
                  value={runSearchValue}
                  onChange={handleRunSearch}
                  placeholder={t("filters.searchRunPlaceholder")}
                />
                <FilterField
                  label={t("filters.status")}
                  value={runFilters.runStatus ?? ""}
                  onChange={(value) => updateQuery({ runStatus: value || null, runPage: 1 })}
                  options={RUN_STATUS_OPTIONS.map((item) => ({ value: item, label: t(`runs.status.${item.toLowerCase()}`) }))}
                />
                <DateField
                  label={t("filters.date")}
                  value={runFilters.runFrom ?? ""}
                  onChange={(value) => updateQuery({ runFrom: value || null, runPage: 1 })}
                />
                <div className="rounded-2xl border border-border-light bg-surface-secondary/70 px-4 py-3 text-xs text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
                  {t("tabs.recentChecksHint")}
                </div>
              </div>

              <details className="rounded-2xl border border-border-light bg-surface-secondary/70 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]">
                <summary className="cursor-pointer text-sm font-semibold text-text-primary dark:text-white/95">
                  {t("filters.advancedFilters")}
                </summary>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <FilterField
                    label={t("filters.scope")}
                    value={runFilters.runScope ?? ""}
                    onChange={(value) => updateQuery({ runScope: value || null, runPage: 1 })}
                    options={RUN_SCOPE_OPTIONS.map((item) => ({ value: item, label: t(`runs.scope.${item.toLowerCase()}`) }))}
                  />
                  <FilterField
                    label={t("filters.trigger")}
                    value={runFilters.runTrigger ?? ""}
                    onChange={(value) => updateQuery({ runTrigger: value || null, runPage: 1 })}
                    options={RUN_TRIGGER_OPTIONS.map((item) => ({ value: item, label: t(`runs.trigger.${item.toLowerCase()}`) }))}
                  />
                  <FilterField
                    label={t("filters.currency")}
                    value={runFilters.runCurrencyCode ?? ""}
                    onChange={(value) => updateQuery({ runCurrencyCode: value || null, runPage: 1 })}
                    placeholder={t("filters.currencyPlaceholder")}
                  />
                  <DateField
                    label={t("filters.to")}
                    value={runFilters.runTo ?? ""}
                    onChange={(value) => updateQuery({ runTo: value || null, runPage: 1 })}
                  />
                </div>
              </details>

              <div className="overflow-hidden rounded-2xl border border-border-light bg-surface-secondary/40 dark:border-white/8 dark:bg-white/[0.02]">
                <DataTable
                  data={runs}
                  columns={runColumns}
                  getRowId={(row) => row.id}
                  loading={runsQuery.isLoading}
                  error={runsQuery.isError ? t("states.runsError") : null}
                  errorState={{
                    title: t("states.runsErrorTitle"),
                    description: t("states.runsError"),
                    action: { label: t("states.retry"), onClick: () => runsQuery.refetch() },
                  }}
                  emptyState={{
                    title: t("states.runsEmptyTitle"),
                    description: t("states.runsEmptyNote"),
                  }}
                  pagination={runsQuery.data?.pagination}
                  onPageChange={(page) => updateQuery({ runPage: page })}
                  onPageSizeChange={(limit) => updateQuery({ runLimit: limit, runPage: 1 })}
                  pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
                  rowActions={(row) => (
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedRunId(row.id)} startIcon={<Eye className="h-4 w-4" />}>
                      {t("actions.view")}
                    </Button>
                  )}
                  onRowClick={(row) => setSelectedRunId(row.id)}
                  ariaLabel={t("tabs.recentChecks")}
                />
              </div>
            </div>
          )}
        </section>

        <AccountingStepUpDialog controller={stepUp} />

        <Drawer isOpen={Boolean(selectedRunId)} onClose={() => setSelectedRunId(null)} side="right" className="w-full max-w-3xl">
          <div className="flex h-full flex-col">
            <ModalHeader eyebrow={t("runDetail.eyebrow")} title={t("runDetail.title")} description={selectedRun ? t(`runs.status.${selectedRun.status.toLowerCase()}`) : undefined} />
            <ModalBody className="space-y-5">
              {!selectedRun && selectedRunQuery.isLoading ? (
                <p className="text-sm text-text-secondary">{t("states.loading")}</p>
              ) : selectedRunQuery.isError ? (
                <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
                  {t("states.runError")}
                </div>
              ) : selectedRun ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoBlock label={t("runDetail.fields.runId")} value={selectedRun.id} mono />
                    <InfoBlock label={t("runDetail.fields.scope")} value={t(`runs.scope.${selectedRun.scope.toLowerCase()}`)} />
                    <InfoBlock label={t("runDetail.fields.trigger")} value={t(`runs.trigger.${selectedRun.trigger.toLowerCase()}`)} />
                    <InfoBlock label={t("runDetail.fields.currency")} value={selectedRun.currencyCode ?? "—"} />
                    <InfoBlock label={t("runDetail.fields.startedAt")} value={formatDateTime(locale, selectedRun.startedAt)} />
                    <InfoBlock label={t("runDetail.fields.completedAt")} value={formatDateTime(locale, selectedRun.completedAt)} />
                    <InfoBlock label={t("runDetail.fields.checked")} value={String(selectedRun.totalChecked)} />
                    <InfoBlock label={t("runDetail.fields.critical")} value={String(selectedRun.totalCritical)} />
                  </div>
                  <InfoBlock label={t("runDetail.fields.summary")} value={selectedRun.summaryJson ? t("runDetail.hasSummary") : t("common.none")} />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-text-primary">{t("runDetail.issuesTitle")}</p>
                    <div className="space-y-2">
                      {selectedRunIssues.length === 0 ? (
                        <p className="text-sm text-text-secondary">{t("states.noRunIssues")}</p>
                      ) : (
                        selectedRunIssues.map((issue) => (
                          <button
                            key={issue.id}
                            type="button"
                            className="flex w-full items-start justify-between rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-left transition hover:border-primary/30 hover:bg-primary-light/40"
                            onClick={() => setSelectedIssueId(issue.id)}
                          >
                            <div className="min-w-0 space-y-1">
                              <p className="text-sm font-semibold text-text-primary">{issue.issueCode}</p>
                              <p className="text-xs text-text-secondary">
                                {issue.entityType} · {shortId(issue.entityId)}
                              </p>
                            </div>
                            <StatusPill tone={issueSeverityTone(issue.severity)}>
                              {t(`issues.severity.${issue.severity.toLowerCase()}`)}
                            </StatusPill>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" type="button" onClick={() => setSelectedRunId(null)}>
                {t("actions.close")}
              </Button>
            </ModalFooter>
          </div>
        </Drawer>

        <Drawer
          isOpen={Boolean(selectedIssueId)}
          onClose={() => {
            setSelectedIssueId(null);
            setReviewNote("");
          }}
          side="right"
          className="w-full max-w-3xl"
        >
          <div className="flex h-full flex-col" data-testid="reconciliation-issue-detail-drawer">
            <ModalHeader
              eyebrow={t("issueDetail.eyebrow")}
              title={t("issueDetail.title")}
              description={
                selectedIssue
                  ? locale === "ar"
                    ? selectedIssueCopy.titleAr
                    : selectedIssueCopy.titleEn
                  : t("issueDetail.subtitle")
              }
            />
            <ModalBody className="space-y-5">
              {!selectedIssue && (selectedIssueQuery.isLoading || selectedIssueQuery.isFetching) ? (
                <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-sm text-text-secondary" data-testid="reconciliation-issue-detail-loading">
                  {t("states.loading")}
                </div>
              ) : selectedIssueQuery.isError ? (
                <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700" data-testid="reconciliation-issue-detail-error">
                  {t("states.issuesError")}
                </div>
              ) : !selectedIssue ? (
                <div className="space-y-3 rounded-2xl border border-border-light bg-surface-secondary px-4 py-4" data-testid="reconciliation-issue-detail-content">
                  <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {t("issueDetail.notFoundTitle")}
                  </p>
                  <p className="text-sm text-text-secondary">{t("issueDetail.notFoundDescription")}</p>
                </div>
              ) : selectedIssue ? (
                <div className="space-y-5" data-testid="reconciliation-issue-detail-content">
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoBlock label={t("issueDetail.fields.severity")} value={t(`issues.severity.${selectedIssue.severity.toLowerCase()}`)} />
                    <InfoBlock label={t("issueDetail.fields.status")} value={t(`issues.reviewStatus.${selectedIssue.status.toLowerCase()}`)} />
                    <InfoBlock label={t("issueDetail.fields.scope")} value={t(`runs.scope.${selectedIssue.scope.toLowerCase()}`)} />
                    <InfoBlock label={t("issueDetail.fields.currency")} value={selectedIssueCurrencyLabel ? (locale === "ar" ? selectedIssueCurrencyLabel.ar : selectedIssueCurrencyLabel.en) : t("common.notAvailable")} />
                    <InfoBlock label={t("issueDetail.fields.entityType")} value={humanizeEntityType(selectedIssue.entityType, locale)} />
                    <CopyableInfoBlock
                      label={t("issueDetail.fields.entityId")}
                      value={selectedIssue.entityId}
                      copyLabel={t("common.copy")}
                      onCopy={() => void handleCopyValue(selectedIssue.entityId)}
                      mono
                    />
                    <InfoBlock label={t("issueDetail.fields.firstDetected")} value={formatDateTime(locale, selectedIssue.firstDetectedAt)} />
                    <InfoBlock label={t("issueDetail.fields.lastDetected")} value={formatDateTime(locale, selectedIssue.lastDetectedAt)} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoBlock label={t("issueDetail.whatTitle")} value={locale === "ar" ? selectedIssueCopy.titleAr : selectedIssueCopy.titleEn} />
                    <InfoBlock label={t("issueDetail.whereTitle")} value={`${formatIssueSourceLabel(selectedIssue, t)} · ${humanizeEntityType(selectedIssue.entityType, locale)} · ${shortId(selectedIssue.entityId)}`} />
                  </div>
                  <CopyableInfoBlock
                    label={t("issueDetail.fields.runId")}
                    value={selectedIssue.runId}
                    copyLabel={t("common.copy")}
                    onCopy={() => void handleCopyValue(selectedIssue.runId)}
                    mono
                  />
                  <InfoBlock label={t("issueDetail.messageLabel")} value={selectedIssue.message} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoBlock label={t("issueDetail.whyTitle")} value={locale === "ar" ? selectedIssueCopy.whyItMattersAr : selectedIssueCopy.whyItMattersEn} />
                    <InfoBlock label={t("issueDetail.nextStepTitle")} value={locale === "ar" ? selectedIssueCopy.recommendedActionAr : selectedIssueCopy.recommendedActionEn} />
                  </div>
                  <div className="rounded-3xl border border-border-light bg-surface-secondary/60 p-4">
                    <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                      {t("issueDetail.expectedActualTitle")}
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <InfoBlock label={t("issueDetail.fields.expected")} value={formatMoneyValue(locale, selectedIssue.expectedValue)} />
                      <InfoBlock label={t("issueDetail.fields.actual")} value={formatMoneyValue(locale, selectedIssue.actualValue)} />
                      <InfoBlock label={t("issueDetail.differenceLabel")} value={selectedIssueExpectedActualDifference ?? t("common.notAvailable")} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-text-primary">{t("issueDetail.metadataTitle")}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedIssueReferences.length === 0 ? (
                        <p className="text-sm text-text-secondary">{t("common.none")}</p>
                      ) : (
                        selectedIssueReferences.map((item) => (
                          <InfoBlock key={item.key} label={item.key} value={item.value} mono />
                        ))
                      )}
                    </div>
                    <details className="rounded-2xl border border-border-light bg-white/70 p-4 dark:bg-white/[0.03]">
                      <summary className="cursor-pointer text-sm font-semibold text-text-primary dark:text-white/95">
                        {t("issueDetail.technicalData")}
                      </summary>
                      <div className="mt-3 space-y-2">
                        {safeEntries(selectedIssue.metadataJson).length === 0 ? (
                          <p className="text-sm text-text-secondary">{t("common.none")}</p>
                        ) : (
                          safeEntries(selectedIssue.metadataJson).map((item) => (
                            <InfoBlock key={item.key} label={item.key} value={item.value} mono />
                          ))
                        )}
                      </div>
                    </details>
                  </div>
                  {canWrite ? (
                    <div className="space-y-3 rounded-3xl border border-border-light bg-surface-secondary/60 p-4">
                      <div className="space-y-1.5">
                        <Label>{t("issueDetail.reviewNoteLabel")}</Label>
                        <TextArea
                          value={reviewNote}
                          onChange={(value) => setReviewNote(value)}
                          rows={4}
                          placeholder={t("issueDetail.reviewNotePlaceholder")}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={() => void executeReview("ACKNOWLEDGE")} disabled={reviewMutation.isPending}>
                          {t("review.actions.acknowledge")}
                        </Button>
                        <Button type="button" variant="primary" onClick={() => void executeReview("RESOLVE")} disabled={reviewMutation.isPending}>
                          {t("review.actions.resolve")}
                        </Button>
                        <Button type="button" variant="danger" onClick={() => void executeReview("IGNORE")} disabled={reviewMutation.isPending}>
                          {t("review.actions.ignore")}
                        </Button>
                      </div>
                      <p className="text-xs leading-5 text-text-secondary">
                        {t("review.help")}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" type="button" onClick={() => setSelectedIssueId(null)}>
                {t("actions.close")}
              </Button>
            </ModalFooter>
          </div>
        </Drawer>
      </div>
    </AdminPermissionGate>
  );
}
