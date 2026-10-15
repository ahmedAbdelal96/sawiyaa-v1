"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  CheckCircle2,
  Copy,
  Download,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  CircleOff,
  Pencil,
  Eye,
  Users,
  Clock,
  ExternalLink,
  Calendar,
  X,
  User,
  CreditCard,
  Award,
  ShieldCheck,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import { Drawer, ModalBody, ModalFooter, ModalHeader, DestructiveConfirmModal } from "@/components/ui/modal";
import { DataTable, exportToPdf, buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam, parseTextParam, type ColumnDef, type SortConfig } from "@/components/ui/data-table";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useDebouncedValue } from "@/hooks/use-debounce";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import { useAdminCountries } from "@/features/admin/patients/hooks/use-admin-patients";
import type { CountryListItem } from "@/features/admin/patients/api/admin-patients.api";
import { resolveCountryLabel } from "@/features/admin/shared/utils/resolve-country-label";
import { useCurrentUserPermissions } from "@/features/users/hooks/use-users";
import { getAcademyProgramErrorKey } from "../lib/academy-program-errors";
import {
  useCreateAdminAcademyProgramEnrollment,
  useAdminAcademyProgram,
  useAdminAcademyProgramEnrollments,
  useAdminAcademyRegistrationAttempts,
  useAdminAcademyProgramEnrollment,
  useAdminAcademyEnrollmentAccountStatus,
  useLookupAdminAcademyEnrollmentAccount,
  useCreateAdminAcademyEnrollmentAccount,
  useLinkAdminAcademyEnrollmentAccount,
  useResetAdminAcademyTraineePassword,
  useCancelAdminAcademyProgramEnrollment,
  useBulkAdminAcademyProgramEnrollments,
  useExportAdminAcademyProgramEnrollments,
  useMarkCertifiedAdminAcademyProgramEnrollment,
  useMarkCompletedAdminAcademyProgramEnrollment,
  useUploadAdminAcademyProgramEnrollmentCertificate,
  useUpdateAdminAcademyProgramEnrollmentLearner,
  useConfirmAdminAcademyProgramEnrollmentPayment,
} from "../hooks/use-academy-programs";
import type {
  AcademyProgramEnrollmentItem,
  AcademyAdminEnrollmentAccountStatus,
  AcademyAdminEnrollmentAccountResponse,
  AcademyProgramEnrollmentPaymentStatus,
  AcademyProgramEnrollmentStatus,
  AcademyProgramEnrollmentSegment,
  AcademyRegistrationAttemptItem,
  ListAdminAcademyProgramEnrollmentsParams,
  UpdateAcademyProgramEnrollmentLearnerInput,
} from "../types/academy-programs.types";
import type { CreateAdminAcademyProgramEnrollmentInput } from "../types/academy-programs.types";
import { resolveAcademyCertificateDownloadUrl } from "../lib/academy-certificate";
import { resolveAcademyProgramCertificateStatusLabel } from "../lib/academy-program-localization";
import AcademyProgramTabs from "./AcademyProgramTabs";
import { toAppError } from "@/lib/api/errors";
import { normalizeWhatsAppNumber } from "../lib/contact-utils";

type Props = {
  programId: string;
};

type EnrollmentSortColumn = "registeredAt" | "fullName";

const SORTABLE_COLUMNS: EnrollmentSortColumn[] = ["registeredAt", "fullName"];

const ENROLLMENT_STATUS_OPTIONS: Array<AcademyProgramEnrollmentStatus | "ALL"> = [
  "ALL",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "CANCELLED",
  "EXPIRED",
];

const PAYMENT_STATUS_OPTIONS: Array<AcademyProgramEnrollmentPaymentStatus | "ALL"> = [
  "ALL",
  "CREATED",
  "PENDING",
  "REQUIRES_ACTION",
  "AUTHORIZED",
  "CAPTURED",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
  "REFUND_PENDING",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
];

const ENROLLMENT_SEGMENT_OPTIONS: AcademyProgramEnrollmentSegment[] = [
  "ALL",
  "FOLLOW_UP",
  "REQUIRES_LOGIN",
  "PAYMENT_ISSUES",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
];

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

function formatMoney(value: string | null | undefined, currencyCode: string | null | undefined, locale: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || !currencyCode) {
    return "-";
  }

  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

function resolveEnrollmentSourceLabel(sourceLabel: string | null | undefined, t: ReturnType<typeof useTranslations>) {
  if (!sourceLabel) {
    return t("programs.learners.sourceLabels.unknown");
  }

  switch (sourceLabel) {
    case "public-academy-program":
    case "public-academy":
      return t("programs.learners.sourceLabels.publicProgram");
    case "patient-academy":
    case "patient-portal":
      return t("programs.learners.sourceLabels.patientPortal");
    case "mobile-academy":
      return t("programs.learners.sourceLabels.mobileApp");
    case "admin-manual":
      return t("programs.learners.sourceLabels.adminManual");
    default:
      return t("programs.learners.sourceLabels.unknown");
  }
}

function badgeTone(status: string) {
  if (status === "CONFIRMED" || status === "CAPTURED" || status === "ISSUED" || status === "UPLOADED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "CANCELLED" || status === "FAILED" || status === "EXPIRED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "PENDING_PAYMENT" || status === "CREATED" || status === "PENDING") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-border-light bg-surface-tertiary text-text-secondary";
}

function resolveLearnerCountryLabel(
  item: AcademyProgramEnrollmentItem | null | undefined,
  countries: CountryListItem[],
  locale: string,
  missingLabel = "-",
) {
  if (!item) return missingLabel;
  const code = item.learner.countryCode ?? item.learner.countryCodeDeclared ?? item.contactCountry ?? item.submittedCountry;
  if (!code) return missingLabel;
  return resolveCountryLabel(code, countries, locale) || code;
}

function getLearnerInitials(name?: string | null) {
  if (!name) return "م";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "م";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}${parts[1][0]}`;
}

function LearnerMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-surface-secondary/40 px-3 py-2 text-xs">
      <p className="text-[11px] font-medium text-text-muted">{label}</p>
      <div className="mt-0.5 text-xs font-bold text-text-primary">{value}</div>
      {hint ? <p className="mt-0.5 text-[11px] text-text-muted">{hint}</p> : null}
    </div>
  );
}

function RegistrationAttemptsPanel({
  items,
  loading,
  locale,
  t,
}: {
  items: AcademyRegistrationAttemptItem[];
  loading: boolean;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <section className="rounded-xl border border-border-light bg-surface-primary p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-light pb-4">
        <div>
          <h2 className="text-sm font-bold text-text-primary">{t("programs.learners.registrationAttempts.title")}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-text-muted">
            {t("programs.learners.registrationAttempts.note")}
          </p>
        </div>
        <span className="rounded-full bg-surface-secondary px-3 py-1 text-xs font-bold text-text-secondary">
          {items.length}
        </span>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-text-muted">{t("programs.learners.states.loading")}</div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center text-sm text-text-muted">
          {t("programs.learners.registrationAttempts.empty")}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const whatsappNumber = normalizeWhatsAppNumber(item.whatsappNumber ?? item.phoneNumber);
            const statusKey = `admin.detail.learners.registrationStatuses.${item.status}` as Parameters<typeof t>[0];
            const sourceKey = item.sourceLabel
              ? undefined
              : ("programs.learners.sourceLabels.unknown" as Parameters<typeof t>[0]);

            return (
              <article
                key={item.id}
                className="flex flex-col gap-3 rounded-lg border border-border-light bg-surface-secondary/20 p-3 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {getLearnerInitials(item.fullName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-text-primary">{item.fullName}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
                      {item.email ? <span dir="ltr">{item.email}</span> : null}
                      {item.phoneNumber ? <span dir="ltr">{item.phoneNumber}</span> : null}
                    </div>
                    <p className="mt-1 text-[11px] text-text-muted">
                      {formatDateTime(item.createdAt, locale)}
                      {sourceKey ? ` · ${t(sourceKey)}` : item.sourceLabel ? ` · ${item.sourceLabel}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${badgeTone(item.status)}`}>
                    {t(statusKey)}
                  </span>
                  {item.phoneNumber ? (
                    <a
                      href={`tel:${item.phoneNumber}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-border-light bg-surface-primary px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:text-primary"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {t("programs.learners.contact.call")}
                    </a>
                  ) : null}
                  {whatsappNumber ? (
                    <a
                      href={`https://wa.me/${whatsappNumber}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {t("programs.learners.contact.whatsapp")}
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function LearnerDetailField({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-2 rounded-lg bg-surface-secondary/40 px-3 py-2 text-xs ${className ?? ""}`}>
      <span className="shrink-0 font-medium text-text-muted">{label}</span>
      <span className="truncate font-semibold text-text-primary text-end">{value}</span>
    </div>
  );
}

export function LearnerContactField({
  label,
  value,
  kind,
  copyLabel,
  copiedLabel,
  actionLabel,
}: {
  label: string;
  value?: string | null;
  kind: "phone" | "email";
  copyLabel: string;
  copiedLabel: string;
  actionLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const normalizedValue = value?.trim() ?? "";

  const handleCopy = async () => {
    if (!normalizedValue) {
      return;
    }

    try {
      await navigator.clipboard?.writeText(normalizedValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-secondary/40 px-3 py-2 text-xs">
      <span className="shrink-0 font-medium text-text-muted">{label}</span>
      <div className="flex min-w-0 items-center justify-end gap-1.5">
        {normalizedValue ? (
          <a
            href={kind === "phone" ? `tel:${normalizedValue}` : `mailto:${normalizedValue}`}
            className="truncate font-semibold text-primary underline-offset-2 hover:underline"
          >
            {normalizedValue}
          </a>
        ) : (
          <span className="font-semibold text-text-muted">-</span>
        )}
        {normalizedValue ? (
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex shrink-0 items-center gap-1 rounded border border-border-light bg-surface-primary px-1.5 py-0.5 text-[11px] font-medium text-text-secondary transition hover:border-primary/30 hover:text-primary active:scale-95"
          >
            <Copy className="h-3 w-3" />
            <span>{copied ? copiedLabel : actionLabel || copyLabel}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function LearnerWhatsAppField({
  label,
  value,
  countryCode,
  copyLabel,
  whatsappLabel,
  unavailableLabel,
}: {
  label: string;
  value: string | null | undefined;
  countryCode?: string | null;
  copyLabel: string;
  whatsappLabel: string;
  unavailableLabel: string;
}) {
  const normalizedValue = value?.trim() ?? "";
  const whatsappNumber = normalizeWhatsAppNumber(normalizedValue, countryCode);
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-secondary/40 px-3 py-2 text-xs">
      <span className="shrink-0 font-medium text-text-muted">{label}</span>
      <div className="flex min-w-0 items-center justify-end gap-1.5">
        {normalizedValue ? (
          <span className="truncate font-semibold text-text-primary">{normalizedValue}</span>
        ) : (
          <span className="font-semibold text-text-muted">-</span>
        )}
        {normalizedValue ? (
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(normalizedValue)}
            className="inline-flex shrink-0 items-center gap-1 rounded border border-border-light bg-surface-primary px-1.5 py-0.5 text-[11px] font-medium text-text-secondary transition hover:border-primary/30 hover:text-primary active:scale-95"
          >
            <Copy className="h-3 w-3" />
            <span>{copyLabel}</span>
          </button>
        ) : null}
        {whatsappNumber ? (
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100 active:scale-95"
          >
            <MessageCircle className="h-3 w-3" />
            <span>{whatsappLabel}</span>
          </a>
        ) : normalizedValue ? (
          <span className="text-[11px] text-text-muted">{unavailableLabel}</span>
        ) : null}
      </div>
    </div>
  );
}

function LearnerSection({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2 rounded-xl border border-border-light/80 bg-surface-primary p-3 shadow-2xs">
      <div className="flex items-center justify-between border-b border-border-light/60 pb-1.5">
        <div className="flex items-center gap-1.5">
          {icon ? <span className="text-primary">{icon}</span> : null}
          <h3 className="text-xs font-bold tracking-tight text-text-primary">{title}</h3>
        </div>
        {badge ? <div>{badge}</div> : null}
      </div>
      {children}
    </section>
  );
}

function LearnerFormDrawer({
  isOpen,
  title,
  note,
  initialValue,
  submitLabel,
  savingLabel,
  saving,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  title: string;
  note: string;
  initialValue: AcademyProgramEnrollmentItem | null;
  submitLabel: string;
  savingLabel: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (
    input: UpdateAcademyProgramEnrollmentLearnerInput | CreateAdminAcademyProgramEnrollmentInput,
  ) => Promise<void>;
}) {
  const t = useTranslations("academy");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [employer, setEmployer] = useState("");
  const [education, setEducation] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    if (!initialValue) {
      setFullName("");
      setPhoneNumber("");
      setWhatsappNumber("");
      setEmail("");
      setCity("");
      setJobTitle("");
      setEmployer("");
      setEducation("");
      setNotes("");
      return;
    }

    setFullName(initialValue.learner.fullName ?? "");
    setPhoneNumber(initialValue.learner.phoneNumber ?? "");
    setWhatsappNumber(initialValue.learner.whatsappNumber ?? "");
    setEmail(initialValue.learner.email ?? "");
    setCity(initialValue.learner.city ?? "");
    setJobTitle(initialValue.learner.jobTitle ?? "");
    setEmployer(initialValue.learner.employer ?? "");
    setEducation(initialValue.learner.education ?? "");
    setNotes(initialValue.learner.notes ?? "");
  }, [initialValue, isOpen]);

  const handleSubmit = async () => {
    await onSubmit({
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      whatsappNumber: whatsappNumber.trim() || null,
      email: email.trim() || null,
      city: city.trim() || null,
      jobTitle: jobTitle.trim() || null,
      employer: employer.trim() || null,
      education: education.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} ariaLabel={title} side="right">
      <ModalHeader
        eyebrow={t("programs.learners.drawer.eyebrow")}
        title={title}
        description={note}
      />
      <ModalBody className="space-y-4 overflow-y-auto">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-medium text-text-secondary">{t("programs.learners.fields.fullName")}</span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="app-control w-full px-4 py-3"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-medium text-text-secondary">{t("programs.learners.fields.phoneNumber")}</span>
            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              className="app-control w-full px-4 py-3"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-medium text-text-secondary">{t("programs.learners.fields.whatsappNumber")}</span>
            <input
              value={whatsappNumber}
              onChange={(event) => setWhatsappNumber(event.target.value)}
              className="app-control w-full px-4 py-3"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-medium text-text-secondary">{t("programs.learners.fields.email")}</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="app-control w-full px-4 py-3"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-medium text-text-secondary">{t("programs.learners.fields.city")}</span>
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="app-control w-full px-4 py-3"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-medium text-text-secondary">{t("programs.learners.fields.jobTitle")}</span>
            <input
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              className="app-control w-full px-4 py-3"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-medium text-text-secondary">{t("programs.learners.fields.employer")}</span>
            <input
              value={employer}
              onChange={(event) => setEmployer(event.target.value)}
              className="app-control w-full px-4 py-3"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-medium text-text-secondary">{t("programs.learners.fields.education")}</span>
            <input
              value={education}
              onChange={(event) => setEducation(event.target.value)}
              className="app-control w-full px-4 py-3"
            />
          </label>
        </div>
        <label className="block space-y-2">
          <span className="text-xs font-medium text-text-secondary">{t("programs.learners.fields.notes")}</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={5}
            className="app-control w-full px-4 py-3"
          />
        </label>
      </ModalBody>
      <ModalFooter className="sticky bottom-0 border-t border-border-light bg-surface-secondary">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t("programs.learners.drawer.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? savingLabel : submitLabel}
          </Button>
        </div>
      </ModalFooter>
    </Drawer>
  );
}

function LearnerDetailDrawer({
  isOpen,
  locale,
  countries,
  item,
  onClose,
  onEdit,
  onCancel,
  onComplete,
  onConfirmPayment,
  onCertify,
  canManageCertificate,
  certificateUploading,
  onUploadCertificate,
  accountStatus,
  accountLoading,
  onLookupAccount,
  onCreateAccount,
  onLinkAccount,
  onResetAccount,
  busy,
}: {
  isOpen: boolean;
  locale: string;
  countries: CountryListItem[];
  item: AcademyProgramEnrollmentItem | null;
  onClose: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onComplete: () => void;
  onConfirmPayment: () => void;
  onCertify: () => void;
  canManageCertificate: boolean;
  certificateUploading: boolean;
  onUploadCertificate: (file: File) => Promise<boolean>;
  accountStatus: AcademyAdminEnrollmentAccountStatus | null;
  accountLoading: boolean;
  onLookupAccount: (email: string) => Promise<AcademyAdminEnrollmentAccountResponse | null>;
  onCreateAccount: (email: string) => Promise<{ email: string; password: string } | null>;
  onLinkAccount: (email: string) => Promise<void>;
  onResetAccount: (password: string) => Promise<void>;
  busy: boolean;
}) {
  const t = useTranslations("academy");
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateMessage, setCertificateMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [temporaryCredentials, setTemporaryCredentials] = useState<{ email: string; password: string } | null>(null);
  const [existingAccount, setExistingAccount] = useState<AcademyAdminEnrollmentAccountResponse | null>(null);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setCertificateFile(null);
      setCertificateMessage(null);
      return;
    }

    setCertificateFile(null);
    setCertificateMessage(null);
    setAccountEmail(item?.learner.email ?? "");
    setAccountMessage(null);
    setTemporaryCredentials(null);
    setExistingAccount(null);
    setNewPassword("");
  }, [isOpen, item?.id]);

  const certificateDownloadUrl =
    item?.certificate.downloadAvailable
      ? resolveAcademyCertificateDownloadUrl({
          enrollmentId: item.id,
          surface: "admin",
        })
      : null;
  const certificateProgramEnded =
    !item?.program.endAt || new Date(item.program.endAt).getTime() <= Date.now();

  const handleUpload = async () => {
    if (!certificateFile) {
      setCertificateMessage({
        tone: "error",
        text: t("programs.learners.certificate.noFile"),
      });
      return;
    }

    const succeeded = await onUploadCertificate(certificateFile);
    if (succeeded) {
      setCertificateMessage({
        tone: "success",
        text: t("programs.learners.certificate.uploadSuccess"),
      });
      setCertificateFile(null);
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} ariaLabel={t("programs.learners.detail.title")} className="w-full sm:max-w-xl lg:max-w-2xl">
      <ModalHeader
        eyebrow={t("programs.learners.detail.eyebrow")}
        className="py-3 pe-14 sm:pe-16"
        title={
          item ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover text-sm font-bold text-white shadow-xs">
                {getLearnerInitials(item.learner.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-bold tracking-tight text-text-primary sm:text-lg">
                    {item.learner.fullName}
                  </h2>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.2 text-[11px] font-bold ${badgeTone(
                      item.status,
                    )}`}
                  >
                    {t(`programs.learners.statuses.${item.status}` as Parameters<typeof t>[0])}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
                  <span className="truncate">{item.program.title ?? item.program.titleEn}</span>
                  <span>•</span>
                  <span>{formatDateTime(item.registeredAt, locale)}</span>
                </div>
              </div>
            </div>
          ) : (
            t("programs.learners.detail.title")
          )
        }
      >
        {item ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border-light/60 pt-2">
            {(() => {
              const phone = item.learner.phoneNumber ?? item.contactPhone;
              const email = item.learner.email ?? item.contactEmail;
              const whatsapp = item.learner.whatsappNumber ?? item.contactWhatsapp;
              const countryCode = item.learner.countryCode ?? item.contactCountry;
              const cleanWhatsapp = whatsapp ? normalizeWhatsAppNumber(whatsapp, countryCode) : null;
              return (
                <>
                  {cleanWhatsapp ? (
                    <a
                      href={`https://wa.me/${cleanWhatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 active:scale-95"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {t("programs.learners.contact.whatsapp")}
                    </a>
                  ) : null}
                  {phone ? (
                    <a
                      href={`tel:${phone}`}
                      className="inline-flex items-center gap-1 rounded-md border border-border-light bg-surface-primary px-2.5 py-1 text-xs font-semibold text-text-secondary transition hover:border-primary/40 hover:text-primary active:scale-95"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {t("programs.learners.contact.call")}
                    </a>
                  ) : null}
                  {email ? (
                    <a
                      href={`mailto:${email}`}
                      className="inline-flex items-center gap-1 rounded-md border border-border-light bg-surface-primary px-2.5 py-1 text-xs font-semibold text-text-secondary transition hover:border-primary/40 hover:text-primary active:scale-95"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {t("programs.learners.contact.email")}
                    </a>
                  ) : null}
                </>
              );
            })()}
          </div>
        ) : null}
      </ModalHeader>
      <ModalBody className="space-y-3 p-3.5 sm:p-4 overflow-y-auto">
        {item ? (
          <>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border-light bg-surface-secondary/40 p-2 sm:grid-cols-4">
              <div className="px-2 py-0.5">
                <p className="text-[11px] font-medium text-text-muted">{t("programs.learners.metrics.registrationDate")}</p>
                <p className="mt-0.5 truncate text-xs font-bold text-text-primary">{formatDateTime(item.registeredAt, locale)}</p>
              </div>
              <div className="px-2 py-0.5">
                <p className="text-[11px] font-medium text-text-muted">{t("programs.learners.payment.amount")}</p>
                <p className="mt-0.5 truncate text-xs font-bold text-text-primary">
                  {Number(item.selectedAmountSnapshot) === 0
                    ? t("programs.learners.payment.free")
                    : !item.payment && item.learner.sourceLabel === "admin-manual"
                      ? t("programs.learners.payment.manual")
                      : item.payment
                        ? formatMoney(item.payment.amountTotal, item.payment.currencyCode, locale)
                        : formatMoney(item.selectedAmountSnapshot, item.selectedCurrencyCode, locale)}
                </p>
              </div>
              <div className="px-2 py-0.5">
                <p className="text-[11px] font-medium text-text-muted">{t("programs.learners.metrics.attendance")}</p>
                <p className="mt-0.5 truncate text-xs font-bold text-text-primary">
                  {formatPercent(item.attendanceSummary.attendancePercentage)} ({item.attendanceSummary.attendedSessions}/{item.attendanceSummary.totalSessions})
                </p>
              </div>
              <div className="px-2 py-0.5">
                <p className="text-[11px] font-medium text-text-muted">{t("programs.learners.certificate.status")}</p>
                <p className="mt-0.5 truncate text-xs font-bold text-text-primary">
                  {resolveAcademyProgramCertificateStatusLabel(item.certificate.status, t)}
                </p>
              </div>
            </div>

            <LearnerSection title={t("programs.learners.sections.personal")} icon={<User className="h-3.5 w-3.5" />}>
              <div className="grid gap-x-5 gap-y-0.5 sm:grid-cols-2">
                <LearnerContactField
                  label={t("programs.learners.fields.email")}
                  value={item.learner.email ?? item.contactEmail}
                  kind="email"
                  copyLabel={t("programs.learners.contact.copy")}
                  copiedLabel={t("programs.learners.contact.copied")}
                  actionLabel={t("programs.learners.contact.email")}
                />
                <LearnerContactField
                  label={t("programs.learners.fields.phoneNumber")}
                  value={item.learner.phoneNumber ?? item.contactPhone}
                  kind="phone"
                  copyLabel={t("programs.learners.contact.copy")}
                  copiedLabel={t("programs.learners.contact.copied")}
                  actionLabel={t("programs.learners.contact.call")}
                />
                <LearnerWhatsAppField
                  label={t("programs.learners.fields.whatsappNumber")}
                  value={item.learner.whatsappNumber ?? item.contactWhatsapp}
                  countryCode={item.learner.countryCode ?? item.contactCountry}
                  copyLabel={t("programs.learners.contact.copy")}
                  whatsappLabel={t("programs.learners.contact.whatsapp")}
                  unavailableLabel={t("programs.learners.contact.whatsappUnavailable")}
                />
                <LearnerDetailField
                  label={t("programs.learners.fields.country")}
                  value={resolveLearnerCountryLabel(item, countries, locale, t("programs.learners.countryUnknown"))}
                />
                <LearnerDetailField label={t("programs.learners.fields.city")} value={item.learner.city || "-"} />
                <LearnerDetailField label={t("programs.learners.fields.jobTitle")} value={item.learner.jobTitle || "-"} />
                <LearnerDetailField label={t("programs.learners.fields.employer")} value={item.learner.employer || "-"} />
                <LearnerDetailField label={t("programs.learners.fields.education")} value={item.learner.education || "-"} />
              </div>
              {item.learner.notes ? (
                <div className="mt-2 rounded-lg border border-amber-200/60 bg-amber-50/60 px-3 py-1.5 text-xs">
                  <span className="font-bold text-amber-900">{t("programs.learners.fields.notes")}: </span>
                  <span className="text-amber-950">{item.learner.notes}</span>
                </div>
              ) : null}
            </LearnerSection>

            <div className="grid gap-3 sm:grid-cols-2">
              <LearnerSection title={t("programs.learners.sections.enrollment")} icon={<CreditCard className="h-3.5 w-3.5" />}>
                <div className="space-y-0.5">
                  <LearnerDetailField
                    label={t("programs.learners.fields.enrollmentStatus")}
                    value={
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.2 text-[11px] font-bold ${badgeTone(item.status)}`}>
                        {t(`programs.learners.statuses.${item.status}` as Parameters<typeof t>[0])}
                      </span>
                    }
                  />
                  <LearnerDetailField
                    label={t("programs.learners.fields.paymentStatus")}
                    value={
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.2 text-[11px] font-bold ${badgeTone(item.paymentStatus)}`}>
                        {!item.payment && item.learner.sourceLabel === "admin-manual" ? t("programs.learners.payment.manual") : Number(item.selectedAmountSnapshot) === 0 ? t("programs.learners.payment.free") : t(`statuses.payment.${item.paymentStatus}` as Parameters<typeof t>[0])}
                      </span>
                    }
                  />
                  <LearnerDetailField
                    label={t("programs.learners.payment.amount")}
                    value={Number(item.selectedAmountSnapshot) === 0 ? t("programs.learners.payment.free") : !item.payment && item.learner.sourceLabel === "admin-manual" ? t("programs.learners.payment.manual") : item.payment ? formatMoney(item.payment.amountTotal, item.payment.currencyCode, locale) : formatMoney(item.selectedAmountSnapshot, item.selectedCurrencyCode, locale)}
                  />
                  <LearnerDetailField label={t("programs.learners.fields.source")} value={resolveEnrollmentSourceLabel(item.learner.sourceLabel, t)} />
                  {item.payment?.id ? (
                    <div className="pt-1.5">
                      <Link
                        href={`/admin/payments/${item.payment.id}`}
                        className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                      >
                        <span className="flex items-center gap-1.5">
                          <CreditCard className="h-3 w-3" />
                          {locale === "ar" ? "سجل العملية المالية" : "Payment record"}
                        </span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  ) : null}
                </div>
              </LearnerSection>

              <LearnerSection title={t("programs.learners.sections.attendance")} icon={<Calendar className="h-3.5 w-3.5" />}>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, item.attendanceSummary.attendancePercentage))}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs font-bold text-primary">
                      {formatPercent(item.attendanceSummary.attendancePercentage)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                    <div className="rounded-lg bg-surface-secondary/40 py-1.5 px-1">
                      <p className="text-[11px] text-text-muted">{t("admin.detail.learners.attendance.totalSessions")}</p>
                      <p className="font-bold text-text-primary mt-0.5">{item.attendanceSummary.totalSessions}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50/70 py-1.5 px-1 text-emerald-800">
                      <p className="text-[11px]">{t("admin.detail.learners.attendance.attendedSessions")}</p>
                      <p className="font-bold mt-0.5">{item.attendanceSummary.attendedSessions}</p>
                    </div>
                    <div className="rounded-lg bg-rose-50/70 py-1.5 px-1 text-rose-800">
                      <p className="text-[11px]">{t("admin.detail.learners.attendance.absentSessions")}</p>
                      <p className="font-bold mt-0.5">{item.attendanceSummary.absentSessions}</p>
                    </div>
                  </div>
                </div>
              </LearnerSection>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <LearnerSection title={t("programs.learners.sections.certificate")} icon={<Award className="h-3.5 w-3.5" />}>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-border-light/50 pb-1.5">
                    <span className="text-text-muted">{t("programs.learners.certificate.status")}</span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.2 text-[11px] font-bold ${badgeTone(item.certificate.status)}`}>
                      {resolveAcademyProgramCertificateStatusLabel(item.certificate.status, t)}
                    </span>
                  </div>
                  {certificateDownloadUrl ? (
                    <a
                      href={certificateDownloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1.5 font-bold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      <span className="flex items-center gap-1.5">
                        <Download className="h-3.5 w-3.5 text-emerald-600" />
                        {t("programs.learners.certificate.download")}
                      </span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="rounded-lg bg-surface-secondary/30 p-1.5 text-center text-[11px] text-text-muted">
                      {t("programs.learners.certificate.noFile")}
                    </p>
                  )}

                  {canManageCertificate && item.status === "CONFIRMED" && certificateProgramEnded ? (
                    <div className="space-y-1.5 border-t border-border-light/60 pt-1.5">
                      <input
                        type="file"
                        accept="application/pdf"
                        className="block w-full text-[11px] text-text-secondary file:me-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-white hover:file:bg-primary-hover"
                        onChange={(event) => {
                          setCertificateMessage(null);
                          const nextFile = event.target.files?.[0] ?? null;
                          setCertificateFile(nextFile);
                        }}
                      />
                      {certificateFile ? <p className="truncate text-[11px] text-text-primary">{certificateFile.name}</p> : null}
                      {certificateMessage ? (
                        <p className={`rounded p-1 text-[11px] font-medium ${certificateMessage.tone === "success" ? "bg-success-light text-success" : "bg-warning-light text-warning"}`}>
                          {certificateMessage.text}
                        </p>
                      ) : null}
                      <Button
                        size="sm"
                        onClick={() => void handleUpload()}
                        disabled={certificateUploading}
                        startIcon={<Download className="h-3 w-3" />}
                      >
                        {certificateUploading ? t("programs.learners.certificate.uploading") : t("programs.learners.certificate.uploadPdf")}
                      </Button>
                    </div>
                  ) : !certificateProgramEnded ? (
                    <p className="text-[11px] text-amber-800 text-center">{t("programs.learners.certificate.programNotEnded")}</p>
                  ) : null}
                </div>
              </LearnerSection>

              <LearnerSection title={t("programs.learners.sections.account")} icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between border-b border-border-light/50 pb-1.5">
                    <span className="text-text-muted">{t("programs.learners.account.type")}</span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.2 text-[11px] font-bold ${accountStatus?.account.type === "TRAINEE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border-light bg-surface-secondary text-text-secondary"}`}>
                      {accountStatus?.account.type ?? "NONE"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between truncate border-b border-border-light/50 pb-1.5">
                    <span className="text-text-muted shrink-0">{t("programs.learners.account.email")}</span>
                    <span className="font-semibold text-text-primary truncate ps-2">{accountStatus?.account.email ?? item.learner.email ?? "-"}</span>
                  </div>

                  {accountStatus?.canCreate || accountStatus?.canLink ? (
                    <div className="space-y-1.5 pt-1">
                      <input
                        type="email"
                        value={accountEmail}
                        onChange={(event) => setAccountEmail(event.target.value)}
                        placeholder={t("programs.learners.account.emailPlaceholder")}
                        className="h-7 w-full rounded-md border border-border-light bg-surface-primary px-2 text-xs text-text-primary outline-none transition focus:border-primary"
                      />
                      <div className="flex gap-1.5">
                        {accountStatus.canCreate ? (
                          <Button size="sm" variant="secondary" disabled={!accountEmail.trim() || accountLoading} onClick={async () => {
                            try {
                              const result = await onCreateAccount(accountEmail.trim());
                              if (result) {
                                setTemporaryCredentials(result);
                                setAccountMessage(t("programs.learners.account.created"));
                              }
                            } catch {
                              setAccountMessage(t("programs.learners.account.failure"));
                            }
                          }}>
                            {t("programs.learners.account.create")}
                          </Button>
                        ) : null}
                        {accountStatus.canLink ? (
                          <Button size="sm" variant="secondary" disabled={!accountEmail.trim() || accountLoading} onClick={async () => {
                            try {
                              const result = await onLookupAccount(accountEmail.trim());
                              setExistingAccount(result);
                              setAccountMessage(result ? t("programs.learners.account.confirmLink") : t("programs.learners.account.failure"));
                            } catch {
                              setAccountMessage(t("programs.learners.account.failure"));
                            }
                          }}>
                            {t("programs.learners.account.link")}
                          </Button>
                        ) : null}
                      </div>
                      {existingAccount ? (
                        <div className="rounded border border-primary/20 bg-primary/5 p-1.5 text-xs">
                          <p className="font-bold">{existingAccount.account.name ?? "-"}</p>
                          <p className="text-[11px] text-text-secondary">{existingAccount.account.email ?? accountEmail}</p>
                          <Button size="sm" className="mt-1" disabled={accountLoading} onClick={async () => {
                            try {
                              await onLinkAccount(accountEmail.trim());
                              setAccountMessage(t("programs.learners.account.linked"));
                              setExistingAccount(null);
                            } catch {
                              setAccountMessage(t("programs.learners.account.failure"));
                            }
                          }}>
                            {t("programs.learners.account.confirm")}
                          </Button>
                        </div>
                      ) : null}
                      {temporaryCredentials ? (
                        <div className="rounded border border-amber-200 bg-amber-50 p-1.5 text-xs text-amber-900">
                          <p className="font-bold">{t("programs.learners.account.credentialsOnce")}</p>
                          <p className="font-mono text-xs">{temporaryCredentials.email} / {temporaryCredentials.password}</p>
                          <div className="mt-1 flex gap-2 text-[11px]">
                            <button type="button" className="underline" onClick={() => void navigator.clipboard?.writeText(temporaryCredentials.email)}>{t("programs.learners.account.copyEmail")}</button>
                            <button type="button" className="underline" onClick={() => void navigator.clipboard?.writeText(temporaryCredentials.password)}>{t("programs.learners.account.copyPassword")}</button>
                          </div>
                        </div>
                      ) : null}
                      {accountMessage ? <p className="text-[11px] text-primary">{accountMessage}</p> : null}
                    </div>
                  ) : null}

                  {accountStatus?.account.type === "TRAINEE" ? (
                    <div className="space-y-1.5 pt-1">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder={t("programs.learners.account.resetPlaceholder")}
                        className="h-7 w-full rounded-md border border-border-light bg-surface-primary px-2 text-xs outline-none focus:border-primary"
                      />
                      <Button size="sm" variant="secondary" disabled={newPassword.length < 8 || accountLoading} onClick={async () => {
                        try {
                          await onResetAccount(newPassword);
                          setNewPassword("");
                          setAccountMessage(t("programs.learners.account.resetSuccess"));
                        } catch {
                          setAccountMessage(t("programs.learners.account.failure"));
                        }
                      }}>
                        {t("programs.learners.account.reset")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </LearnerSection>
            </div>
          </>
        ) : null}
      </ModalBody>
      <ModalFooter className="sticky bottom-0 border-t border-border-light/80 bg-surface-primary/95 backdrop-blur-sm">
        {item ? (
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t("programs.learners.drawer.cancel")}
            </Button>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button variant="secondary" size="sm" onClick={onEdit} startIcon={<Pencil className="h-3.5 w-3.5" />}>
                {t("programs.learners.actions.edit")}
              </Button>
              <Button variant="secondary" size="sm" onClick={onComplete} startIcon={<CheckCircle2 className="h-3.5 w-3.5" />} disabled={busy}>
                {t("programs.learners.actions.complete")}
              </Button>
              {item.status === "PENDING_PAYMENT" ? (
                <Button variant="primary" size="sm" onClick={onConfirmPayment} disabled={busy}>
                  {t("programs.learners.actions.confirmPayment")}
                </Button>
              ) : null}
              <Button variant="danger" size="sm" onClick={onCancel} startIcon={<CircleOff className="h-3.5 w-3.5" />} disabled={busy}>
                {t("programs.learners.actions.cancel")}
              </Button>
            </div>
          </div>
        ) : null}
      </ModalFooter>
    </Drawer>
  );
}

export default function AdminAcademyProgramLearnersScreen({ programId }: Props) {
  const t = useTranslations("academy");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: countries = [] } = useAdminCountries();
  const { data: permissionData } = useCurrentUserPermissions(true);
  const permissions = useMemo(
    () => new Set(permissionData?.permissions ?? []),
    [permissionData?.permissions],
  );
  const canManageCertificate = permissions.has("patients.update.admin");

  const initialQuery = parseTextParam(searchParams.get("q"), { maxLength: 80 });
  const initialCountry = parseTextParam(searchParams.get("country"), { maxLength: 10 });
  const initialSegment = parseEnumParam<AcademyProgramEnrollmentSegment>(
    searchParams.get("segment"),
    ENROLLMENT_SEGMENT_OPTIONS,
    "ALL",
  );
  const initialStatus = parseEnumParam<AcademyProgramEnrollmentStatus | "ALL">(
    searchParams.get("status"),
    ENROLLMENT_STATUS_OPTIONS,
    "ALL",
  );
  const initialPaymentStatus = parseEnumParam<AcademyProgramEnrollmentPaymentStatus | "ALL">(
    searchParams.get("paymentStatus"),
    PAYMENT_STATUS_OPTIONS,
    "ALL",
  );
  const initialSortBy = parseEnumParam<EnrollmentSortColumn>(
    searchParams.get("sortBy"),
    SORTABLE_COLUMNS,
    "registeredAt",
  );
  const initialSortDir = parseEnumParam<"asc" | "desc">(
    searchParams.get("sortDir"),
    ["asc", "desc"],
    "desc",
  );
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 50,
  });

  const [search, setSearch] = useState(initialQuery);
  const debouncedSearch = useDebouncedValue(search, 300);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [bulkCancelReason, setBulkCancelReason] = useState("");
  const [toastMessage, setToastMessage] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    setSearch(initialQuery);
  }, [initialQuery]);

  const updateListQuery = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const normalized = debouncedSearch.trim();
    if (normalized === initialQuery) return;
    updateListQuery({ q: normalized || null, page: 1 });
  }, [debouncedSearch, initialQuery, updateListQuery]);

  const params = useMemo(
    () => ({
      page,
      limit,
      q: initialQuery || undefined,
      status: initialStatus === "ALL" ? undefined : initialStatus,
      paymentStatus: initialPaymentStatus === "ALL" ? undefined : initialPaymentStatus,
      segment: initialSegment,
      country: initialCountry || undefined,
      sortBy: (initialSortBy === "fullName" ? "name" : "registeredAt") as ListAdminAcademyProgramEnrollmentsParams["sortBy"],
      sortDir: initialSortDir,
    }),
    [initialCountry, initialPaymentStatus, initialQuery, initialSegment, initialSortBy, initialSortDir, initialStatus, limit, page],
  );

  const programQuery = useAdminAcademyProgramEnrollments(programId, params);
  const registrationAttemptsQuery = useAdminAcademyRegistrationAttempts(programId, {
    page,
    limit,
    q: initialQuery || undefined,
    status: "REQUIRES_LOGIN",
  });
  const programDetailQuery = useAdminAcademyProgram(programId);
  const programData = programQuery.data;
  const programDetail = programDetailQuery.data;
  const items = programData?.items ?? [];
  const selectedListItem = useMemo(
    () => items.find((item) => item.id === selectedEnrollmentId) ?? null,
    [items, selectedEnrollmentId],
  );
  const selectedDetailQuery = useAdminAcademyProgramEnrollment(selectedEnrollmentId, isDetailOpen);
  const selectedItem = selectedDetailQuery.data?.item ?? selectedListItem;
  const accountStatusQuery = useAdminAcademyEnrollmentAccountStatus(selectedEnrollmentId);

  // Operational metrics derived from program detail and list
  const operationalStats = useMemo(() => {
    const totalEnrolled = programData?.pagination.totalItems ?? items.length;
    const confirmedCount = programData?.summary?.confirmed ?? items.filter((item) => item.status === "CONFIRMED").length;
    const requiresLoginCount = programData?.summary?.requiresLogin ?? items.filter((item) => item.registration?.status === "REQUIRES_LOGIN").length;
    const pendingCount = programData?.summary?.followUp ?? items.filter(
      (item) => item.status === "PENDING_PAYMENT" || item.paymentStatus === "PENDING" || item.paymentStatus === "CREATED",
    ).length;

    const targetSeats = programDetail?.targetLearnerCount ?? programDetail?.maxSeats ?? null;
    const activeSeats = programDetail?.activeLearnerCount ?? confirmedCount;

    return {
      total: totalEnrolled,
      confirmed: confirmedCount,
      pending: pendingCount,
      requiresLogin: requiresLoginCount,
      targetSeats,
      activeSeats,
    };
  }, [items, programData?.pagination.totalItems, programData?.summary, programDetail]);

  useEffect(() => {
    if (isDetailOpen && selectedEnrollmentId && !items.some((item) => item.id === selectedEnrollmentId)) {
      setIsDetailOpen(false);
    }
  }, [isDetailOpen, items, selectedEnrollmentId]);

  const exportMutation = useExportAdminAcademyProgramEnrollments();
  const createManualMutation = useCreateAdminAcademyProgramEnrollment();
  const updateLearnerMutation = useUpdateAdminAcademyProgramEnrollmentLearner();
  const cancelMutation = useCancelAdminAcademyProgramEnrollment();
  const completeMutation = useMarkCompletedAdminAcademyProgramEnrollment();
  const certifyMutation = useMarkCertifiedAdminAcademyProgramEnrollment();
  const uploadCertificateMutation = useUploadAdminAcademyProgramEnrollmentCertificate();
  const bulkMutation = useBulkAdminAcademyProgramEnrollments();
  const createAccountMutation = useCreateAdminAcademyEnrollmentAccount();
  const lookupAccountMutation = useLookupAdminAcademyEnrollmentAccount();
  const linkAccountMutation = useLinkAdminAcademyEnrollmentAccount();
  const resetAccountMutation = useResetAdminAcademyTraineePassword();
  const confirmPaymentMutation = useConfirmAdminAcademyProgramEnrollmentPayment();

  const sortConfig: SortConfig = {
    column: initialSortBy,
    direction: initialSortDir,
  };

  const selectedCount = selectedRows.length;
  const hasActiveFilters =
    Boolean(initialQuery.trim()) ||
    Boolean(initialCountry) ||
    initialStatus !== "ALL" ||
    initialSegment !== "ALL" ||
    initialPaymentStatus !== "ALL";

  const selectedCountLabel = selectedCount > 0 ? `${selectedCount}` : "0";

  const columns = useMemo<ColumnDef<AcademyProgramEnrollmentItem>[]>(
    () => [
      {
        id: "trainee",
        header: t("programs.learners.columns.fullName"),
        accessor: (row) => row.learner.fullName,
        sortable: true,
        className: "min-w-[200px]",
        cell: (row) => {
          const email = row.learner.email ?? row.contactEmail;
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                {(row.learner.fullName || "—").trim().charAt(0) || "T"}
              </div>
              <div className="min-w-0 max-w-[210px]">
                <p className="truncate text-sm font-semibold text-text-primary" title={row.learner.fullName}>
                  {row.learner.fullName || "—"}
                </p>
                {email ? (
                  <p className="truncate text-xs text-text-muted" title={email}>
                    {email}
                  </p>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        id: "contact",
        header: t("programs.learners.columns.mobileNumber"),
        accessor: (row) => row.learner.phoneNumber ?? row.contactPhone,
        className: "min-w-[170px]",
        cell: (row) => {
          const phone = row.learner.phoneNumber ?? row.contactPhone;
          const whatsapp = normalizeWhatsAppNumber(
            row.learner.whatsappNumber ?? row.contactWhatsapp ?? phone,
            row.learner.countryCode ?? row.contactCountry,
          );

          if (!phone && !whatsapp) {
            return <span className="text-xs text-text-muted">—</span>;
          }

          return (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-secondary dir-ltr">
                {phone || "—"}
              </span>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {whatsapp ? (
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                    title={t("programs.learners.contact.whatsapp")}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                ) : null}
                {phone ? (
                  <a
                    href={`tel:${phone}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-light bg-surface-secondary text-text-secondary transition hover:border-primary/40 hover:text-primary"
                    title={t("programs.learners.contact.call")}
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        id: "country",
        header: t("programs.learners.columns.country"),
        accessor: (row) => resolveLearnerCountryLabel(row, countries, locale, t("programs.learners.countryUnknown")),
        hideOnMobile: true,
        className: "whitespace-nowrap text-xs text-text-secondary",
        cell: (row) => (
          <span className="inline-flex items-center rounded-md bg-surface-secondary px-2 py-1 text-xs font-medium text-text-secondary">
            {resolveLearnerCountryLabel(row, countries, locale, t("programs.learners.countryUnknown"))}
          </span>
        ),
      },
      {
        id: "statusAndPayment",
        header: t("programs.learners.columns.enrollmentStatus"),
        accessor: (row) => `${row.status}_${row.paymentStatus}`,
        className: "min-w-[190px]",
        cell: (row) => {
          const isManual = !row.payment && row.learner.sourceLabel === "admin-manual";
          const isFree = Number(row.selectedAmountSnapshot) === 0;
          const moneyStr = isFree
            ? t("programs.learners.payment.free")
            : isManual
              ? t("programs.learners.payment.manual")
              : row.payment
                ? formatMoney(row.payment.amountTotal, row.payment.currencyCode, locale)
                : formatMoney(row.selectedAmountSnapshot, row.selectedCurrencyCode, locale);

          return (
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeTone(row.status)}`}>
                  {t(`programs.learners.statuses.${row.status}` as Parameters<typeof t>[0])}
                </span>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${badgeTone(row.paymentStatus)}`}>
                  {isManual ? t("programs.learners.payment.manual") : t(`statuses.payment.${row.paymentStatus}` as Parameters<typeof t>[0])}
                </span>
              </div>
              {row.registration?.status && row.registration.status !== "CONVERTED" ? (
                <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                  {t(`admin.detail.learners.registrationStatuses.${row.registration.status}` as Parameters<typeof t>[0])}
                </span>
              ) : null}
              <p className="text-xs font-semibold text-text-primary">
                {moneyStr}
              </p>
            </div>
          );
        },
      },
      {
        id: "registeredAt",
        header: t("programs.learners.columns.registrationDate"),
        accessor: (row) => new Date(row.registeredAt).getTime(),
        sortable: true,
        hideOnMobile: true,
        className: "whitespace-nowrap",
        cell: (row) => {
          const d = new Date(row.registeredAt);
          if (Number.isNaN(d.getTime())) return <span className="text-xs text-text-muted">-</span>;
          const datePart = d.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          const timePart = d.toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: !locale.startsWith("ar"),
          });

          return (
            <div className="text-xs text-text-secondary">
              <p className="font-medium text-text-primary">{datePart}</p>
              <p className="text-[11px] text-text-muted">{timePart}</p>
            </div>
          );
        },
      },
      {
        id: "attendancePercentage",
        header: t("programs.learners.columns.attendance"),
        accessor: (row) => row.attendanceSummary.attendancePercentage,
        hideOnMobile: true,
        className: "min-w-[120px]",
        cell: (row) => {
          const pct = Math.max(0, Math.min(100, Math.round(row.attendanceSummary.attendancePercentage ?? 0)));
          const barColor = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-border-light";

          return (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-primary">{pct}%</span>
                <span className="text-[11px] text-text-muted">
                  {row.attendanceSummary.attendedSessions}/{row.attendanceSummary.totalSessions}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
                <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        },
      },
      {
        id: "certificate",
        header: t("programs.learners.columns.certificate"),
        accessor: (row) => row.certificate.status,
        hideOnMobile: true,
        className: "whitespace-nowrap",
        cell: (row) => (
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeTone(row.certificate.status)}`}>
            {t(`programs.learners.certificateStatuses.${row.certificate.status}` as Parameters<typeof t>[0])}
          </span>
        ),
      },
      {
        id: "actions",
        header: t("programs.learners.columns.actions"),
        accessor: () => "",
        className: "w-20 text-center",
        cell: (row) => (
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openSelectedItem(row)}
              className="h-8 px-2.5 text-xs"
              startIcon={<Eye className="h-3.5 w-3.5" />}
            >
              {t("programs.learners.openDetail")}
            </Button>
          </div>
        ),
      },
    ],
    [countries, locale, t],
  );

  const pdfColumns = useMemo<ColumnDef<AcademyProgramEnrollmentItem>[]>(
    () => [
      { id: "fullName", header: t("programs.learners.columns.fullName"), accessor: (row) => row.learner.fullName },
      { id: "country", header: t("programs.learners.columns.country"), accessor: (row) => resolveLearnerCountryLabel(row, countries, locale, t("programs.learners.countryUnknown")) },
      { id: "phone", header: t("programs.learners.columns.mobileNumber"), accessor: (row) => row.learner.phoneNumber ?? row.contactPhone ?? "-" },
      { id: "email", header: t("programs.learners.columns.email"), accessor: (row) => row.learner.email ?? row.contactEmail ?? "-" },
      { id: "registeredAt", header: t("programs.learners.columns.registrationDate"), accessor: (row) => formatDateTime(row.registeredAt, locale) },
      { id: "status", header: t("programs.learners.columns.enrollmentStatus"), accessor: (row) => t(`programs.learners.statuses.${row.status}` as Parameters<typeof t>[0]) },
      { id: "paymentStatus", header: t("programs.learners.columns.paymentStatus"), accessor: (row) => !row.payment && row.learner.sourceLabel === "admin-manual" ? t("programs.learners.payment.manual") : t(`statuses.payment.${row.paymentStatus}` as Parameters<typeof t>[0]) },
      { id: "amount", header: t("programs.learners.payment.amount"), accessor: (row) => {
        if (Number(row.selectedAmountSnapshot) === 0) return t("programs.learners.payment.free");
        if (!row.payment && row.learner.sourceLabel === "admin-manual") return t("programs.learners.payment.manual");
        return row.payment ? formatMoney(row.payment.amountTotal, row.payment.currencyCode, locale) : t("programs.learners.payment.noAmount");
      } },
    ],
    [countries, locale, t],
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleSortChange = (nextSort: SortConfig) => {
    updateListQuery({
      sortBy: nextSort.column === "fullName" ? "name" : "registeredAt",
      sortDir: nextSort.direction,
    });
  };

  const refreshList = async () => {
    await programQuery.refetch();
  };

  const exportLearners = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const rows = await exportMutation.mutateAsync({
        programId,
        params: {
          q: initialQuery || undefined,
          status: initialStatus === "ALL" ? undefined : initialStatus,
          paymentStatus: initialPaymentStatus === "ALL" ? undefined : initialPaymentStatus,
          segment: initialSegment,
          country: initialCountry || undefined,
          sortBy: (initialSortBy === "fullName" ? "name" : "registeredAt") as ListAdminAcademyProgramEnrollmentsParams["sortBy"],
          sortDir: initialSortDir,
        },
      });
      if (rows.length === 0) {
        setToastMessage({ tone: "error", message: t("programs.learners.exportEmpty") });
        return;
      }
      const program = programDetailQuery.data ?? rows[0]?.program;
      const slug = (program?.slug ?? programId).replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "") || programId;
      const dates = [program?.startAt, program?.endAt].filter(Boolean).map((value) => formatDateTime(value, locale)).join(" – ");
      await exportToPdf(rows, pdfColumns, `training-registrants-${slug}-${new Date().toISOString().slice(0, 10)}`, {
        title: t("programs.learners.exportPdf"),
        subtitle: [program?.title ?? program?.titleEn ?? program?.slug, dates].filter(Boolean).join(" · "),
        countLabel: t("programs.learners.summary.total"),
        direction: locale === "ar" ? "rtl" : "ltr",
      });
    } catch (cause) {
      setToastMessage({ tone: "error", message: cause instanceof Error && cause.message === "EMPTY_EXPORT" ? t("programs.learners.exportEmpty") : t("programs.learners.exportFailure") });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const updateSelectedCount = (next: string[]) => {
    setSelectedRows(next);
  };

  const selectedItems = items.filter((item) => selectedRows.includes(item.id));

  const openSelectedItem = (item: AcademyProgramEnrollmentItem) => {
    setSelectedEnrollmentId(item.id);
    setIsDetailOpen(true);
  };

  const handleSingleCancel = async () => {
    if (!selectedItem) return;
    const reason = cancelReason.trim();
    if (!reason) {
      setToastMessage({ tone: "error", message: t("programs.learners.cancelConfirm.reasonRequired") });
      return;
    }
    await cancelMutation.mutateAsync({ enrollmentId: selectedItem.id, reason });
    setToastMessage({ tone: "success", message: t("programs.learners.feedback.cancelSuccess") });
    setIsCancelConfirmOpen(false);
    setCancelReason("");
    await refreshList();
  };

  const handleSingleComplete = async () => {
    if (!selectedItem) return;
    await completeMutation.mutateAsync(selectedItem.id);
    setToastMessage({ tone: "success", message: t("programs.learners.feedback.completeSuccess") });
    await refreshList();
  };

  const handleSingleCertify = async () => {
    if (!selectedItem) return;
    await certifyMutation.mutateAsync(selectedItem.id);
    setToastMessage({ tone: "success", message: t("programs.learners.feedback.certifySuccess") });
    await refreshList();
  };

  const handleCertificateUpload = async (file: File) => {
    if (!selectedItem) {
      return false;
    }

    const runUpload = async () => {
      try {
        await uploadCertificateMutation.mutateAsync({
          enrollmentId: selectedItem.id,
          input: { file },
        });
        setToastMessage({
          tone: "success",
          message: t("programs.learners.certificate.uploadSuccess"),
        });
        await refreshList();
        return true;
      } catch (cause) {
        const appError = toAppError(cause);
        const errorKey = getAcademyProgramErrorKey(appError);
        setToastMessage({
          tone: "error",
          message: t(errorKey as Parameters<typeof t>[0]),
        });
        return false;
      }
    };

    try {
      return await runUpload();
    } catch (cause) {
      const appError = toAppError(cause);
      setToastMessage({
        tone: "error",
        message: t("programs.learners.feedback.certificateUploadFailure"),
      });
      return false;
    }
  };

  const handleManualEnrollment = async (
    input: CreateAdminAcademyProgramEnrollmentInput | UpdateAcademyProgramEnrollmentLearnerInput,
  ) => {
    const runCreate = async () => {
      try {
        await createManualMutation.mutateAsync({
          programId,
          input: input as CreateAdminAcademyProgramEnrollmentInput,
        });
        setToastMessage({ tone: "success", message: t("programs.learners.feedback.manualCreateSuccess") });
        setIsCreateOpen(false);
        void refreshList();
        return true;
      } catch (cause) {
        const appError = toAppError(cause);
        const errorKey = getAcademyProgramErrorKey(appError);
        setToastMessage({
          tone: "error",
          message: t(errorKey as Parameters<typeof t>[0]),
        });
        return false;
      }
    };

    try {
      await runCreate();
    } catch (cause) {
      const appError = toAppError(cause);
      setToastMessage({
        tone: "error",
        message: t("programs.learners.feedback.manualCreateFailure"),
      });
    }
  };

  const handleBulkAction = async (action: "CANCEL_ENROLLMENT" | "MARK_COMPLETED" | "MARK_CERTIFIED") => {
    const enrollmentIds = selectedRows.slice();
    if (enrollmentIds.length === 0) return;
    const reason = action === "CANCEL_ENROLLMENT" ? bulkCancelReason.trim() : undefined;
    if (action === "CANCEL_ENROLLMENT" && !reason) {
      setToastMessage({ tone: "error", message: t("programs.learners.bulkCancelConfirm.reasonRequired") });
      return;
    }

    await bulkMutation.mutateAsync({
      programId,
      input: {
        action: action as "CANCEL_ENROLLMENT" | "MARK_COMPLETED" | "MARK_CERTIFIED",
        enrollmentIds,
        ...(reason ? { reason } : {}),
      },
    });
    setSelectedRows([]);
    if (action === "CANCEL_ENROLLMENT") setBulkCancelReason("");
    setToastMessage({
      tone: "success",
      message:
        action === "CANCEL_ENROLLMENT"
          ? t("programs.learners.feedback.bulkCancelSuccess")
          : action === "MARK_CERTIFIED"
            ? t("programs.learners.feedback.bulkCertifySuccess")
            : t("programs.learners.feedback.bulkCompleteSuccess"),
    });
    await refreshList();
  };

  const bulkActions = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full border border-border-light bg-surface-tertiary px-3 py-2 text-xs font-semibold text-text-secondary">
        {t("programs.learners.selectionCount", { count: selectedCountLabel })}
      </span>
      <Button
        variant="secondary"
        disabled={selectedCount === 0}
        onClick={() => handleBulkAction("MARK_COMPLETED")}
        startIcon={<CheckCircle2 className="h-4 w-4" />}
      >
        {t("programs.learners.bulk.complete")}
      </Button>
      <Button
        variant="danger"
        disabled={selectedCount === 0}
        onClick={() => setBulkCancelOpen(true)}
        startIcon={<CircleOff className="h-4 w-4" />}
      >
        {t("programs.learners.bulk.cancel")}
      </Button>
    </div>
  );

  return (
    <AdminOperationalListShell
      title={t("programs.learners.title")}
      description={t("programs.learners.note")}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => router.push(`/admin/academy/programs/${programId}` as never)}
          >
            {t("programs.learners.back")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setIsCreateOpen(true);
              setIsDetailOpen(false);
              setSelectedEnrollmentId(null);
            }}
            startIcon={<Plus className="h-4 w-4" />}
          >
            {t("programs.learners.addLearner")}
          </Button>
          <Button onClick={exportLearners} disabled={isExportingPdf} startIcon={<Download className="h-4 w-4" />}>
            {isExportingPdf ? t("programs.learners.exportingPdf") : t("programs.learners.exportPdf")}
          </Button>
        </div>
      }
      summaryCards={
        <>
          <AdminSummaryCard
            label={t("programs.learners.summary.total")}
            value={operationalStats.total}
            tone="primary"
            icon={<Users className="h-5 w-5" />}
          />
          <AdminSummaryCard
            label={t("programs.learners.summary.confirmed")}
            value={operationalStats.confirmed}
            tone="success"
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <AdminSummaryCard
            label={t("programs.learners.summary.pending")}
            value={operationalStats.pending}
            tone="warning"
            icon={<Clock className="h-5 w-5" />}
          />
          <AdminSummaryCard
            label={t("programs.learners.summary.requiresLogin")}
            value={operationalStats.requiresLogin}
            tone="warning"
            icon={<User className="h-5 w-5" />}
          />
          <AdminSummaryCard
            label={t("programs.learners.summary.target")}
            value={
              operationalStats.targetSeats !== null
                ? `${operationalStats.activeSeats} / ${operationalStats.targetSeats}`
                : `${operationalStats.activeSeats}`
            }
            tone="neutral"
            icon={<BadgeCheck className="h-5 w-5" />}
          />
        </>
      }
      filters={
        <div className="space-y-4">
          <AcademyProgramTabs programId={programId} value="learners" />

          {/* Quick Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border-light/80 pb-2">
            {[
              { id: "ALL", label: t("programs.learners.segments.ALL") },
              { id: "FOLLOW_UP", label: t("programs.learners.segments.FOLLOW_UP") },
              { id: "REQUIRES_LOGIN", label: t("programs.learners.segments.REQUIRES_LOGIN") },
              { id: "PAYMENT_ISSUES", label: t("programs.learners.segments.PAYMENT_ISSUES") },
              { id: "CONFIRMED", label: t("programs.learners.segments.CONFIRMED") },
              { id: "COMPLETED", label: t("programs.learners.segments.COMPLETED") },
              { id: "CANCELLED", label: t("programs.learners.segments.CANCELLED") },
            ].map((tab) => {
              const active = initialSegment === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    updateListQuery({
                      segment: tab.id === "ALL" ? null : tab.id,
                      status: null,
                      page: 1,
                    })
                  }
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-primary text-white shadow-xs"
                      : "bg-surface-secondary text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block sm:col-span-2 lg:col-span-1">
              <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
                {t("programs.learners.filters.search")}
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  value={search}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder={t("programs.learners.filters.searchPlaceholder")}
                  className="app-control w-full py-2.5 pe-4 ps-9 text-xs sm:text-sm"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
                {t("programs.learners.filters.enrollmentStatus")}
              </span>
              <Select
                key={`status-${initialStatus}`}
                defaultValue={initialStatus}
                onChange={(value) => updateListQuery({ status: value === "ALL" ? null : value, page: 1 })}
                options={ENROLLMENT_STATUS_OPTIONS.map((status) => ({
                  value: status,
                  label:
                    status === "ALL"
                      ? t("programs.learners.filters.all")
                      : t(`programs.learners.statuses.${status}` as Parameters<typeof t>[0]),
                }))}
                className="h-10 w-full text-xs"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
                {t("programs.learners.filters.paymentStatus")}
              </span>
              <Select
                key={`payment-${initialPaymentStatus}`}
                defaultValue={initialPaymentStatus}
                onChange={(value) => updateListQuery({ paymentStatus: value === "ALL" ? null : value, page: 1 })}
                options={PAYMENT_STATUS_OPTIONS.map((status) => ({
                  value: status,
                  label:
                    status === "ALL"
                      ? t("programs.learners.filters.all")
                      : t(`statuses.payment.${status}` as Parameters<typeof t>[0]),
                }))}
                className="h-10 w-full text-xs"
              />
            </label>

            <div className="flex items-end gap-2">
              <label className="block flex-1">
                <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
                  {t("programs.learners.filters.country")}
                </span>
                <Select
                  key={`country-${initialCountry || "all"}`}
                  defaultValue={initialCountry || "ALL"}
                  onChange={(value) => updateListQuery({ country: value === "ALL" ? null : value, page: 1 })}
                  options={[
                    { value: "ALL", label: t("programs.learners.filters.all") },
                    ...countries.map((country) => ({
                      value: country.isoCode,
                      label: resolveCountryLabel(country.isoCode, countries, locale),
                    })),
                  ]}
                  className="h-10 w-full text-xs"
                />
              </label>

              {hasActiveFilters ? (
                <div className="shrink-0 pb-0.5">
                  <FilterClearButton
                    disabled={!hasActiveFilters}
                    onClick={() =>
                      updateListQuery({
                        q: null,
                        country: null,
                        status: null,
                        paymentStatus: null,
                        segment: null,
                        page: 1,
                      })
                    }
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* Floating / Conditional Bulk Actions Bar when rows are selected */}
          {selectedCount > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {selectedCount}
                </span>
                <span className="text-xs font-semibold text-text-primary">
                  {t("programs.learners.bulk.note")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {bulkActions}
                <button
                  type="button"
                  onClick={() => setSelectedRows([])}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-light bg-white text-text-muted transition hover:bg-surface-tertiary hover:text-text-primary"
                  title="إلغاء التحديد"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      }
    >
      {toastMessage ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            toastMessage.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {toastMessage.message}
        </div>
      ) : null}

      {initialSegment === "REQUIRES_LOGIN" ? (
        <RegistrationAttemptsPanel
          items={registrationAttemptsQuery.data?.items ?? []}
          loading={registrationAttemptsQuery.isLoading}
          locale={locale}
          t={t}
        />
      ) : null}

      {initialSegment !== "REQUIRES_LOGIN" ? <DataTable
        data={items}
        columns={columns}
        getRowId={(row) => row.id}
        loading={programQuery.isLoading}
        error={programQuery.isError ? t("programs.learners.states.error") : null}
        errorState={{
          title: t("programs.learners.states.error"),
          action: { label: t("programs.learners.retry"), onClick: () => programQuery.refetch() },
        }}
        sortConfig={sortConfig}
        onSortChange={handleSortChange}
        selectable
        selectedRows={selectedRows}
        onSelectionChange={updateSelectedCount}
        onRowClick={openSelectedItem}
        pagination={programData ? {
          page: programData.pagination.page,
          limit: programData.pagination.limit,
          total: programData.pagination.totalItems,
          totalPages: programData.pagination.totalPages,
          hasNextPage: programData.pagination.page < programData.pagination.totalPages,
          hasPrevPage: programData.pagination.page > 1,
        } : undefined}
        onPageChange={(nextPage) => updateListQuery({ page: nextPage })}
        onPageSizeChange={(nextLimit) => updateListQuery({ limit: nextLimit, page: 1 })}
        pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
        emptyState={{
          title: t("programs.learners.states.empty"),
          description: t("programs.learners.states.emptyNote"),
        }}
        ariaLabel={t("programs.learners.title")}
        caption={t("programs.learners.title")}
        tableClassName="min-w-[680px] table-auto"
        rowActionsHeader={undefined}
        striped
      /> : null}

      <LearnerDetailDrawer
        isOpen={isDetailOpen && Boolean(selectedItem)}
        locale={locale}
        countries={countries}
        item={selectedItem}
        onClose={() => setIsDetailOpen(false)}
        onEdit={() => setIsEditOpen(true)}
        onCancel={() => setIsCancelConfirmOpen(true)}
        onComplete={handleSingleComplete}
        onConfirmPayment={async () => {
          if (!selectedItem || selectedItem.status !== "PENDING_PAYMENT") return;
          if (!window.confirm(t("programs.learners.confirmPayment.confirm"))) return;
          await confirmPaymentMutation.mutateAsync({ enrollmentId: selectedItem.id, input: {} });
          setToastMessage({ tone: "success", message: t("programs.learners.feedback.confirmPaymentSuccess") });
          await refreshList();
        }}
        onCertify={handleSingleCertify}
        canManageCertificate={canManageCertificate}
        certificateUploading={uploadCertificateMutation.isPending}
        onUploadCertificate={handleCertificateUpload}
        accountStatus={accountStatusQuery.data ?? null}
        accountLoading={accountStatusQuery.isFetching || lookupAccountMutation.isPending || createAccountMutation.isPending || linkAccountMutation.isPending || resetAccountMutation.isPending}
        onLookupAccount={async (email) => {
          if (!selectedItem) return null;
          return lookupAccountMutation.mutateAsync({ enrollmentId: selectedItem.id, email });
        }}
        onCreateAccount={async (email) => {
          if (!selectedItem) return null;
          const result = await createAccountMutation.mutateAsync({ enrollmentId: selectedItem.id, email });
          return result.temporaryCredentials;
        }}
        onLinkAccount={async (email) => {
          if (!selectedItem) return;
          await linkAccountMutation.mutateAsync({ enrollmentId: selectedItem.id, email });
        }}
        onResetAccount={async (password) => {
          if (!selectedItem) return;
          await resetAccountMutation.mutateAsync({ enrollmentId: selectedItem.id, newPassword: password });
        }}
        busy={cancelMutation.isPending || completeMutation.isPending || certifyMutation.isPending || confirmPaymentMutation.isPending || bulkMutation.isPending || createAccountMutation.isPending || linkAccountMutation.isPending || resetAccountMutation.isPending}
      />

      <LearnerFormDrawer
        isOpen={isEditOpen}
        title={t("programs.learners.drawer.editTitle")}
        note={t("programs.learners.drawer.editNote")}
        initialValue={selectedItem}
        submitLabel={t("programs.learners.drawer.save")}
        savingLabel={t("programs.learners.drawer.saving")}
        saving={updateLearnerMutation.isPending}
        onClose={() => setIsEditOpen(false)}
        onSubmit={async (input) => {
          if (!selectedItem) return;
          await updateLearnerMutation.mutateAsync({
            enrollmentId: selectedItem.id,
            input,
          });
          setToastMessage({ tone: "success", message: t("programs.learners.feedback.updateSuccess") });
          setIsEditOpen(false);
          await refreshList();
        }}
      />

      <LearnerFormDrawer
        isOpen={isCreateOpen}
        title={t("programs.learners.drawer.createTitle")}
        note={t("programs.learners.drawer.createNote")}
        initialValue={null}
        submitLabel={t("programs.learners.drawer.create")}
        savingLabel={t("programs.learners.drawer.creating")}
        saving={createManualMutation.isPending}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleManualEnrollment}
      />

      <DestructiveConfirmModal
        isOpen={isCancelConfirmOpen}
        onClose={() => {
          setIsCancelConfirmOpen(false);
          setCancelReason("");
        }}
        title={t("programs.learners.cancelConfirm.title")}
        description={t("programs.learners.cancelConfirm.description")}
        confirmLabel={cancelMutation.isPending ? t("programs.learners.cancelConfirm.saving") : t("programs.learners.cancelConfirm.confirm")}
        cancelLabel={t("programs.learners.cancelConfirm.close")}
        onConfirm={handleSingleCancel}
        loading={cancelMutation.isPending}
      >
        {selectedItem ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            <p className="font-medium">{selectedItem.learner.fullName}</p>
            <p className="mt-1 text-xs text-rose-600">{selectedItem.learner.phoneNumber}</p>
            <label className="mt-4 block text-xs font-semibold text-text-primary" htmlFor="academy-cancel-reason">
              {t("programs.learners.cancelConfirm.reasonLabel")}
            </label>
            <textarea
              id="academy-cancel-reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t("programs.learners.cancelConfirm.reasonPlaceholder")}
              className="mt-2 w-full rounded-xl border border-border-light bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
            />
          </div>
        ) : null}
      </DestructiveConfirmModal>

      <DestructiveConfirmModal
        isOpen={bulkCancelOpen}
        onClose={() => {
          setBulkCancelOpen(false);
          setBulkCancelReason("");
        }}
        title={t("programs.learners.bulkCancelConfirm.title")}
        description={t("programs.learners.bulkCancelConfirm.description")}
        confirmLabel={bulkMutation.isPending ? t("programs.learners.bulkCancelConfirm.saving") : t("programs.learners.bulkCancelConfirm.confirm")}
        cancelLabel={t("programs.learners.bulkCancelConfirm.close")}
        onConfirm={async () => {
          if (!bulkCancelReason.trim()) {
            setToastMessage({ tone: "error", message: t("programs.learners.bulkCancelConfirm.reasonRequired") });
            return;
          }
          await handleBulkAction("CANCEL_ENROLLMENT");
          setBulkCancelOpen(false);
        }}
        loading={bulkMutation.isPending}
      >
        <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          <p className="font-medium">{t("programs.learners.bulkCancelConfirm.summary", { count: selectedCount })}</p>
          <ul className="list-disc space-y-1 ps-4 text-xs text-rose-600">
            {selectedItems.slice(0, 5).map((item) => (
              <li key={item.id}>{item.learner.fullName}</li>
            ))}
          </ul>
          <label className="mt-4 block text-xs font-semibold text-text-primary" htmlFor="academy-bulk-cancel-reason">
            {t("programs.learners.bulkCancelConfirm.reasonLabel")}
          </label>
          <textarea
            id="academy-bulk-cancel-reason"
            value={bulkCancelReason}
            onChange={(event) => setBulkCancelReason(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder={t("programs.learners.bulkCancelConfirm.reasonPlaceholder")}
            className="mt-2 w-full rounded-xl border border-border-light bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
          />
        </div>
      </DestructiveConfirmModal>

    </AdminOperationalListShell>
  );
}
