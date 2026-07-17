"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  CheckCircle2,
  Download,
  Plus,
  Search,
  CircleOff,
  Pencil,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import { Drawer, ModalBody, ModalFooter, ModalHeader, DestructiveConfirmModal } from "@/components/ui/modal";
import { DataTable, exportToExcel, buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam, parseTextParam, type ColumnDef, type SortConfig } from "@/components/ui/data-table";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useDebouncedValue } from "@/hooks/use-debounce";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import { useAdminCountries } from "@/features/admin/patients/hooks/use-admin-patients";
import type { CountryListItem } from "@/features/admin/patients/api/admin-patients.api";
import { resolveCountryLabel } from "@/features/admin/shared/utils/resolve-country-label";
import AdminUserStepUpDialog from "@/features/admin/users/components/AdminUserStepUpDialog";
import { useAdminStepUp } from "@/features/admin/users/hooks/use-admin-step-up";
import { useCurrentUserPermissions } from "@/features/users/hooks/use-users";
import { getAcademyProgramErrorKey } from "../lib/academy-program-errors";
import {
  useCreateAdminAcademyProgramEnrollment,
  useAdminAcademyProgramEnrollments,
  useCancelAdminAcademyProgramEnrollment,
  useBulkAdminAcademyProgramEnrollments,
  useExportAdminAcademyProgramEnrollments,
  useMarkCertifiedAdminAcademyProgramEnrollment,
  useMarkCompletedAdminAcademyProgramEnrollment,
  useUploadAdminAcademyProgramEnrollmentCertificate,
  useUpdateAdminAcademyProgramEnrollmentLearner,
} from "../hooks/use-academy-programs";
import type {
  AcademyProgramEnrollmentItem,
  AcademyProgramEnrollmentPaymentStatus,
  AcademyProgramEnrollmentStatus,
  ListAdminAcademyProgramEnrollmentsParams,
  UpdateAcademyProgramEnrollmentLearnerInput,
} from "../types/academy-programs.types";
import type { CreateAdminAcademyProgramEnrollmentInput } from "../types/academy-programs.types";
import { resolveAcademyCertificateDownloadUrl } from "../lib/academy-certificate";
import { resolveAcademyProgramCertificateStatusLabel } from "../lib/academy-program-localization";
import AcademyProgramTabs from "./AcademyProgramTabs";
import { isStepUpRequiredError, toAppError } from "@/lib/api/errors";

type Props = {
  programId: string;
};

type EnrollmentSortColumn = "registeredAt" | "fullName";

const SORTABLE_COLUMNS: EnrollmentSortColumn[] = ["registeredAt", "fullName"];

const ENROLLMENT_STATUS_OPTIONS: Array<AcademyProgramEnrollmentStatus | "ALL"> = [
  "ALL",
  "PENDING_PAYMENT",
  "UPCOMING",
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
  if (status === "UPCOMING" || status === "CAPTURED" || status === "ISSUED") {
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
) {
  if (!item) return "-";
  const code = item.learner.countryCode ?? item.learner.countryCodeDeclared ?? item.contactCountry ?? item.submittedCountry;
  if (!code) return "-";
  return resolveCountryLabel(code, countries, locale) || code;
}

function LearnerMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function LearnerDetailField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border-light bg-white px-4 py-3">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text-primary break-words">{value}</p>
    </div>
  );
}

function LearnerSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-3xl border border-border-light bg-surface-secondary p-5">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
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
  onCertify,
  canManageCertificate,
  certificateUploading,
  onUploadCertificate,
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
  onCertify: () => void;
  canManageCertificate: boolean;
  certificateUploading: boolean;
  onUploadCertificate: (file: File) => Promise<boolean>;
  busy: boolean;
}) {
  const t = useTranslations("academy");
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateMessage, setCertificateMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCertificateFile(null);
      setCertificateMessage(null);
      return;
    }

    setCertificateFile(null);
    setCertificateMessage(null);
  }, [isOpen, item?.id]);

  const certificateDownloadUrl =
    item?.certificate.downloadAvailable
      ? resolveAcademyCertificateDownloadUrl({
          enrollmentId: item.id,
          surface: "admin",
        })
      : null;

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
    <Drawer isOpen={isOpen} onClose={onClose} ariaLabel={t("programs.learners.detail.title")}>
      <ModalHeader
        eyebrow={t("programs.learners.detail.eyebrow")}
        title={item ? item.learner.fullName : t("programs.learners.detail.title")}
        description={item ? item.program.title ?? item.program.titleEn : t("programs.learners.detail.note")}
      />
      <ModalBody className="space-y-5 overflow-y-auto">
        {item ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <LearnerMetric label={t("programs.learners.metrics.registrationDate")} value={formatDateTime(item.registeredAt, locale)} />
              <LearnerMetric label={t("programs.learners.metrics.enrollmentStatus")} value={t(`programs.learners.statuses.${item.status}` as Parameters<typeof t>[0])} />
              <LearnerMetric label={t("programs.learners.metrics.paymentStatus")} value={t(`statuses.payment.${item.paymentStatus}` as Parameters<typeof t>[0])} />
              <LearnerMetric label={t("programs.learners.metrics.attendance")} value={formatPercent(item.attendanceSummary.attendancePercentage)} />
            </div>

            <LearnerSection title={t("programs.learners.sections.personal")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <LearnerDetailField label={t("programs.learners.fields.fullName")} value={item.learner.fullName || "-"} />
                <LearnerDetailField label={t("programs.learners.fields.email")} value={item.learner.email || "-"} />
                <LearnerDetailField label={t("programs.learners.fields.phoneNumber")} value={item.learner.phoneNumber || "-"} />
                <LearnerDetailField label={t("programs.learners.fields.whatsappNumber")} value={item.learner.whatsappNumber || "-"} />
                <LearnerDetailField label={t("programs.learners.fields.country")} value={resolveLearnerCountryLabel(item, countries, locale)} />
                <LearnerDetailField label={t("programs.learners.fields.city")} value={item.learner.city || "-"} />
                <LearnerDetailField label={t("programs.learners.fields.jobTitle")} value={item.learner.jobTitle || "-"} />
                <LearnerDetailField label={t("programs.learners.fields.employer")} value={item.learner.employer || "-"} />
                <LearnerDetailField label={t("programs.learners.fields.education")} value={item.learner.education || "-"} />
                <div className="sm:col-span-2 rounded-2xl border border-border-light bg-white px-4 py-3">
                  <p className="text-xs font-medium text-text-muted">{t("programs.learners.fields.notes")}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-text-primary">{item.learner.notes || "-"}</p>
                </div>
              </div>
            </LearnerSection>

            <LearnerSection title={t("programs.learners.sections.enrollment")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <LearnerDetailField label={t("programs.learners.fields.program")} value={item.program.title ?? item.program.titleEn ?? "-"} />
                <LearnerDetailField label={t("programs.learners.fields.registrationDate")} value={formatDateTime(item.registeredAt, locale)} />
                <LearnerDetailField label={t("programs.learners.fields.enrollmentStatus")} value={t(`programs.learners.statuses.${item.status}` as Parameters<typeof t>[0])} />
                <LearnerDetailField label={t("programs.learners.fields.paymentStatus")} value={t(`statuses.payment.${item.paymentStatus}` as Parameters<typeof t>[0])} />
                <LearnerDetailField label={t("programs.learners.fields.source")} value={resolveEnrollmentSourceLabel(item.learner.sourceLabel, t)} />
              </div>
            </LearnerSection>

            <LearnerSection title={t("programs.learners.sections.payment")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <LearnerMetric
                  label={t("programs.learners.payment.status")}
                  value={t(`statuses.payment.${item.paymentStatus}` as Parameters<typeof t>[0])}
                />
                <LearnerDetailField
                  label={t("programs.learners.payment.amount")}
                  value={formatMoney(item.selectedAmountSnapshot, item.selectedCurrencyCode, locale)}
                />
              </div>
              {!item.payment ? (
                <div className="rounded-2xl border border-border-light bg-white px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">
                    {t("programs.learners.payment.noOnlinePayment")}
                  </p>
                </div>
              ) : null}
            </LearnerSection>

            <LearnerSection title={t("programs.learners.sections.attendance")}>
              <div className="grid gap-3 sm:grid-cols-4">
                <LearnerMetric label={t("admin.detail.learners.attendance.totalSessions")} value={item.attendanceSummary.totalSessions} />
                <LearnerMetric label={t("admin.detail.learners.attendance.attendedSessions")} value={item.attendanceSummary.attendedSessions} />
                <LearnerMetric label={t("admin.detail.learners.attendance.absentSessions")} value={item.attendanceSummary.absentSessions} />
                <LearnerMetric label={t("admin.detail.learners.attendance.percentage")} value={formatPercent(item.attendanceSummary.attendancePercentage)} />
              </div>
            </LearnerSection>

            <LearnerSection title={t("programs.learners.sections.certificate")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <LearnerMetric
                  label={t("programs.learners.certificate.status")}
                  value={resolveAcademyProgramCertificateStatusLabel(item.certificate.status, t)}
                />
                <LearnerMetric label={t("programs.learners.certificate.issuedAt")} value={formatDateTime(item.certificate.issuedAt, locale)} />
                <LearnerMetric label={t("programs.learners.certificate.uploadedAt")} value={formatDateTime(item.certificate.uploadedAt, locale)} />
                <LearnerDetailField label={t("programs.learners.certificate.fileName")} value={item.certificate.fileName || "-"} />
              </div>

              {certificateDownloadUrl ? (
                <a
                  href={certificateDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-border-light bg-white px-4 py-3 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary"
                >
                  <Download className="h-4 w-4" />
                  {t("programs.learners.certificate.download")}
                </a>
              ) : (
                <div className="rounded-2xl border border-dashed border-border-light bg-white px-4 py-3 text-sm text-text-muted">
                  {t("programs.learners.certificate.noFile")}
                </div>
              )}

              {canManageCertificate && item.status === "UPCOMING" ? (
                <div className="space-y-3 rounded-2xl border border-border-light bg-surface-secondary p-4">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {item.certificate.downloadAvailable
                        ? t("programs.learners.certificate.replacePdf")
                        : t("programs.learners.certificate.uploadPdf")}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {t("programs.learners.certificate.pdfOnly")}
                    </p>
                  </div>
                  <label className="block space-y-2">
                    <span className="text-xs font-medium text-text-secondary">
                      {t("programs.learners.certificate.choosePdf")}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="block w-full text-sm text-text-secondary file:me-4 file:rounded-xl file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-hover"
                      onChange={(event) => {
                        setCertificateMessage(null);
                        const nextFile = event.target.files?.[0] ?? null;
                        setCertificateFile(nextFile);
                      }}
                    />
                  </label>
                  {certificateFile ? (
                    <p className="text-xs text-text-muted">{certificateFile.name}</p>
                  ) : null}
                  {certificateMessage ? (
                    <p
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        certificateMessage.tone === "success"
                          ? "border border-success/20 bg-success-light text-success"
                          : "border border-warning/20 bg-warning-light text-warning"
                      }`}
                    >
                      {certificateMessage.text}
                    </p>
                  ) : null}
                  <Button
                    onClick={() => void handleUpload()}
                    disabled={certificateUploading}
                    startIcon={<Download className="h-4 w-4" />}
                  >
                    {certificateUploading
                      ? t("programs.learners.certificate.uploading")
                      : item.certificate.downloadAvailable
                        ? t("programs.learners.certificate.replacePdf")
                        : t("programs.learners.certificate.uploadPdf")}
                  </Button>
                </div>
              ) : !canManageCertificate ? (
                <div className="rounded-2xl border border-dashed border-border-light bg-white px-4 py-3 text-sm text-text-muted">
                  {t("programs.learners.certificate.noAccess")}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border-light bg-white px-4 py-3 text-sm text-text-muted">
                  {t("programs.learners.certificate.noFile")}
                </div>
              )}
            </LearnerSection>
          </>
        ) : null}
      </ModalBody>
      <ModalFooter className="sticky bottom-0 border-t border-border-light bg-surface-secondary">
        {item ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" onClick={onEdit} startIcon={<Pencil className="h-4 w-4" />}>
              {t("programs.learners.actions.edit")}
            </Button>
            <Button variant="secondary" onClick={onComplete} startIcon={<CheckCircle2 className="h-4 w-4" />} disabled={busy}>
              {t("programs.learners.actions.complete")}
            </Button>
            <Button variant="secondary" onClick={onCertify} startIcon={<BadgeCheck className="h-4 w-4" />} disabled={busy}>
              {t("programs.learners.actions.certify")}
            </Button>
            <Button variant="danger" onClick={onCancel} startIcon={<CircleOff className="h-4 w-4" />} disabled={busy}>
              {t("programs.learners.actions.cancel")}
            </Button>
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
      country: initialCountry || undefined,
      sortBy: (initialSortBy === "fullName" ? "name" : "registeredAt") as ListAdminAcademyProgramEnrollmentsParams["sortBy"],
      sortDir: initialSortDir,
    }),
    [initialCountry, initialPaymentStatus, initialQuery, initialSortBy, initialSortDir, initialStatus, limit, page],
  );

  const programQuery = useAdminAcademyProgramEnrollments(programId, params);
  const programData = programQuery.data;
  const items = programData?.items ?? [];
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedEnrollmentId) ?? null,
    [items, selectedEnrollmentId],
  );

  useEffect(() => {
    if (isDetailOpen && selectedEnrollmentId && !items.some((item) => item.id === selectedEnrollmentId)) {
      setIsDetailOpen(false);
    }
  }, [isDetailOpen, items, selectedEnrollmentId]);

  const exportMutation = useExportAdminAcademyProgramEnrollments();
  const stepUp = useAdminStepUp();
  const createManualMutation = useCreateAdminAcademyProgramEnrollment();
  const updateLearnerMutation = useUpdateAdminAcademyProgramEnrollmentLearner();
  const cancelMutation = useCancelAdminAcademyProgramEnrollment();
  const completeMutation = useMarkCompletedAdminAcademyProgramEnrollment();
  const certifyMutation = useMarkCertifiedAdminAcademyProgramEnrollment();
  const uploadCertificateMutation = useUploadAdminAcademyProgramEnrollmentCertificate();
  const bulkMutation = useBulkAdminAcademyProgramEnrollments();

  const sortConfig: SortConfig = {
    column: initialSortBy,
    direction: initialSortDir,
  };

  const selectedCount = selectedRows.length;
  const hasActiveFilters =
    Boolean(initialQuery.trim()) ||
    Boolean(initialCountry) ||
    initialStatus !== "ALL" ||
    initialPaymentStatus !== "ALL";

  const selectedCountLabel = selectedCount > 0 ? `${selectedCount}` : "0";

  const columns = useMemo<ColumnDef<AcademyProgramEnrollmentItem>[]>(
    () => [
      {
        id: "fullName",
        header: t("programs.learners.columns.fullName"),
        accessor: (row) => row.learner.fullName,
        sortable: true,
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">{row.learner.fullName}</p>
            <p className="mt-1 text-xs text-text-muted">{row.program.title ?? row.program.titleEn ?? row.program.slug}</p>
          </div>
        ),
      },
      {
        id: "email",
        header: t("programs.learners.columns.email"),
        accessor: (row) => row.learner.email ?? row.contactEmail ?? "-",
        hideOnMobile: true,
      },
      {
        id: "phoneNumber",
        header: t("programs.learners.columns.mobileNumber"),
        accessor: (row) => row.learner.phoneNumber ?? row.contactPhone,
      },
      {
        id: "whatsappNumber",
        header: t("programs.learners.columns.whatsappNumber"),
        accessor: (row) => row.learner.whatsappNumber ?? row.contactWhatsapp ?? "-",
        hideOnMobile: true,
      },
      {
        id: "country",
        header: t("programs.learners.columns.country"),
        accessor: (row) => resolveLearnerCountryLabel(row, countries, locale),
      },
      {
        id: "status",
        header: t("programs.learners.columns.enrollmentStatus"),
        accessor: (row) => row.status,
        cell: (row) => (
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeTone(row.status)}`}>
            {t(`programs.learners.statuses.${row.status}` as Parameters<typeof t>[0])}
          </span>
        ),
      },
      {
        id: "paymentStatus",
        header: t("programs.learners.columns.paymentStatus"),
        accessor: (row) => row.paymentStatus,
        hideOnMobile: true,
        cell: (row) => (
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeTone(row.paymentStatus)}`}>
            {t(`statuses.payment.${row.paymentStatus}` as Parameters<typeof t>[0])}
          </span>
        ),
      },
      {
        id: "registeredAt",
        header: t("programs.learners.columns.registrationDate"),
        accessor: (row) => new Date(row.registeredAt).getTime(),
        sortable: true,
        cell: (row) => formatDateTime(row.registeredAt, locale),
      },
      {
        id: "attendancePercentage",
        header: t("programs.learners.columns.attendance"),
        accessor: (row) => row.attendanceSummary.attendancePercentage,
        cell: (row) => formatPercent(row.attendanceSummary.attendancePercentage),
        hideOnMobile: true,
      },
      {
        id: "certificate",
        header: t("programs.learners.columns.certificate"),
        accessor: (row) => row.certificate.status,
        cell: (row) => (
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeTone(row.certificate.status)}`}>
            {t(`programs.learners.certificateStatuses.${row.certificate.status}` as Parameters<typeof t>[0])}
          </span>
        ),
      },
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
    const rows = await exportMutation.mutateAsync({
      programId,
      params: {
        q: initialQuery || undefined,
        status: initialStatus === "ALL" ? undefined : initialStatus,
        paymentStatus: initialPaymentStatus === "ALL" ? undefined : initialPaymentStatus,
        country: initialCountry || undefined,
        sortBy: (initialSortBy === "fullName" ? "name" : "registeredAt") as ListAdminAcademyProgramEnrollmentsParams["sortBy"],
        sortDir: initialSortDir,
      },
    });

    await exportToExcel(
      rows,
      columns,
      `academy-program-${programId}-learners`,
    );
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
        if (isStepUpRequiredError(appError)) {
          throw appError;
        }

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
      if (isStepUpRequiredError(appError)) {
        stepUp.requestStepUp(async () => {
          await runUpload();
        });
        return false;
      }

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
        if (isStepUpRequiredError(appError)) {
          throw appError;
        }

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
      if (isStepUpRequiredError(appError)) {
        stepUp.requestStepUp(async () => {
          await runCreate();
        });
        return;
      }

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
        variant="secondary"
        disabled={selectedCount === 0}
        onClick={() => handleBulkAction("MARK_CERTIFIED")}
        startIcon={<BadgeCheck className="h-4 w-4" />}
      >
        {t("programs.learners.bulk.certify")}
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
          <Button onClick={exportLearners} startIcon={<Download className="h-4 w-4" />}>
            {t("programs.learners.export")}
          </Button>
        </div>
      }
      summaryCards={
        <>
          <AdminSummaryCard label={t("programs.learners.summary.total")} value={programData?.pagination.totalItems ?? 0} tone="primary" />
          <AdminSummaryCard label={t("programs.learners.summary.page")} value={`${programData?.pagination.page ?? page} / ${programData?.pagination.totalPages ?? 1}`} tone="success" />
          <AdminSummaryCard label={t("programs.learners.summary.selected")} value={selectedCount} tone="primary" />
        </>
      }
      filters={
        <div className="space-y-4">
          <AcademyProgramTabs programId={programId} value="learners" />

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.7fr))_auto]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("programs.learners.filters.search")}
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  value={search}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder={t("programs.learners.filters.searchPlaceholder")}
                  className="app-control w-full py-3 pe-4 ps-10"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
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
                className="h-12 w-full"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
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
                className="h-12 w-full"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
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
                className="h-12 w-full"
              />
            </label>

            <div className="flex items-end">
              <FilterClearButton
                disabled={!hasActiveFilters}
                onClick={() =>
                  updateListQuery({
                    q: null,
                    country: null,
                    status: null,
                    paymentStatus: null,
                    page: 1,
                  })
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border-light bg-surface-secondary px-4 py-3">
            <div className="text-sm text-text-secondary">
              {t("programs.learners.bulk.note")}
            </div>
            {bulkActions}
          </div>
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

      <DataTable
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
        rowActionsHeader={undefined}
        striped
      />

      <LearnerDetailDrawer
        isOpen={isDetailOpen && Boolean(selectedItem)}
        locale={locale}
        countries={countries}
        item={selectedItem}
        onClose={() => setIsDetailOpen(false)}
        onEdit={() => setIsEditOpen(true)}
        onCancel={() => setIsCancelConfirmOpen(true)}
        onComplete={handleSingleComplete}
        onCertify={handleSingleCertify}
        canManageCertificate={canManageCertificate}
        certificateUploading={uploadCertificateMutation.isPending}
        onUploadCertificate={handleCertificateUpload}
        busy={cancelMutation.isPending || completeMutation.isPending || certifyMutation.isPending || bulkMutation.isPending}
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

      <AdminUserStepUpDialog controller={stepUp} />
    </AdminOperationalListShell>
  );
}
