"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/shared/LoadingStates";
import { cn } from "@/lib/utils";
import { getProfessionalTitleLabel } from "@/constants/reference-data";
import { isAppError } from "@/lib/api/errors";
import { API_BASE_URL } from "@/config/api";
import httpClient from "@/lib/api/http-client";
import { getLocalizedCountryOptions } from "@/features/practitioners/constants/country-options";
import { getLocalizedLanguageLabel } from "@/constants/reference-data";
import {
  getLocalizedSpecialtyCategoryName,
  getLocalizedSpecialtyName,
} from "@/features/specialties/utils/localized-specialty";
import {
  getCatalogItemCountryCodes,
  resolveBankLabel,
  resolveWalletProviderLabel,
} from "@/lib/catalogs/payout";
import type {
  CredentialReviewStatus,
  CredentialType,
  PractitionerApplicationStatus,
  PractitionerPayoutMethodType,
  PractitionerType,
} from "@/features/practitioners/types/practitioners.types";
import {
  useAdminPractitionerApplicationDetails,
  useApprovePractitionerApplication,
  useRejectPractitionerApplication,
  useRequestPractitionerApplicationChanges,
  useUpdateAdminPractitionerApplicationCredential,
  useViewAdminPractitionerApplicationCredentialFile,
} from "../hooks/use-practitioner-applications";
import { useAdminPractitioners } from "@/features/admin/practitioners/hooks/use-admin-practitioners";
import {
  useAdminSpecialties,
  useAdminSpecialtyCategories,
} from "@/features/specialties/hooks/use-specialties";
import type { PractitionerApplicationDetailsResponse } from "../types/practitioner-applications.types";
import AdminApplicationReviewHeader from "./AdminApplicationReviewHeader";
import AdminApplicationReviewWizard from "./AdminApplicationReviewWizard";
import AdminApplicationStepIdentity from "./AdminApplicationStepIdentity";
import AdminApplicationStepProfessional from "./AdminApplicationStepProfessional";
import AdminApplicationStepDocumentsPayout from "./AdminApplicationStepDocumentsPayout";
import AdminApplicationStepDecision from "./AdminApplicationStepDecision";
import AdminApplicationDecisionSummary from "./AdminApplicationDecisionSummary";
import { deriveAdminReviewDecision } from "../utils/admin-review-decision";

type ReviewReasonItem = {
  id: string;
  label: string;
  helper: string;
};

type DecisionReasonDraft = {
  id: string;
  value: string;
};

function createDecisionReasonDraft(): DecisionReasonDraft {
  return { id: crypto.randomUUID(), value: "" };
}

type Props = { applicationId: string };

const statusColour: Record<PractitionerApplicationStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  SUBMITTED: "bg-primary-light text-text-brand dark:bg-primary/20 dark:text-primary-light",
  UNDER_REVIEW: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  APPROVED: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  CHANGES_REQUESTED: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  ARCHIVED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};


const ACCOUNT_STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  ACTIVE: { ar: "نشط", en: "Active" },
  INACTIVE: { ar: "غير نشط", en: "Inactive" },
  SUSPENDED: { ar: "معلق", en: "Suspended" },
  PENDING_VERIFICATION: { ar: "بانتظار التحقق", en: "Pending verification" },
  PENDING_APPROVAL: { ar: "بانتظار الموافقة", en: "Pending approval" },
  DELETED: { ar: "محذوف", en: "Deleted" },
};

function normalizeAvatarUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getReadableValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string" && value.trim().length === 0) return "-";
  return String(value);
}

function normalizeForDiff(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function maskSensitiveValue(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "-";
  if (trimmed.length <= 8) return trimmed;
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}

function getLocalizedCountryLabel(locale: string, countryCode?: string | null) {
  const normalized = countryCode?.trim().toUpperCase() ?? "";
  if (!normalized) return "-";
  const options = getLocalizedCountryOptions(locale);
  return options.find((item) => item.value === normalized)?.label ?? normalized;
}

function getLocalizedStatusLabel(locale: string, status?: string | null) {
  const normalized = status?.trim() ?? "";
  if (!normalized) return "-";
  const label = ACCOUNT_STATUS_LABELS[normalized];
  return label ? (locale === "ar" ? label.ar : label.en) : normalized;
}

function formatLanguageLabel(locale: string, value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "-";
  return getLocalizedLanguageLabel(normalized, locale);
}

function formatReviewToken(locale: string, value: string) {
  const labels: Record<string, { ar: string; en: string }> = {
    PROFILE: { ar: "الملف المهني", en: "Profile" },
    SPECIALTIES: { ar: "التخصصات", en: "Specialties" },
    IDENTITY: { ar: "الهوية", en: "Identity" },
    ACADEMIC_CREDENTIALS: { ar: "المؤهلات الأكاديمية", en: "Academic credentials" },
    PROFESSIONAL_CREDENTIALS: { ar: "المستندات المهنية", en: "Professional credentials" },
    BANKING: { ar: "البيانات البنكية", en: "Banking" },
    COMPLIANCE: { ar: "الالتزام", en: "Compliance" },
    PENDING: { ar: "قيد المراجعة", en: "Pending" },
    CHANGES_REQUESTED: { ar: "مطلوب تعديلات", en: "Changes requested" },
    OPEN: { ar: "مفتوح", en: "Open" },
    SUBMITTED: { ar: "تم الإرسال", en: "Submitted" },
    SATISFIED: { ar: "تم الاستيفاء", en: "Satisfied" },
    APPROVED: { ar: "معتمد", en: "Approved" },
    REJECTED: { ar: "مرفوض", en: "Rejected" },
  };
  return labels[value]?.[locale === "ar" ? "ar" : "en"] ?? value;
}

function formatLanguageList(locale: string, values: string[]) {
  const safeValues = Array.isArray(values) ? values : [];
  if (safeValues.length === 0) return "-";
  return safeValues.map((value) => formatLanguageLabel(locale, value)).join("، ");
}

function formatMoneyValue(value: number | null | undefined, locale: string) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat(locale.startsWith("ar") ? "ar-EG" : "en-GB", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCredentialStatusLabel(
  t: ReturnType<typeof useTranslations>,
  status?: CredentialReviewStatus | null,
) {
  if (!status) return t("applicationDetails.review.notVerifiedYet");
  if (status === "PENDING") return t("applicationDetails.review.pendingManualVerification");
  if (status === "APPROVED") return t("applicationDetails.review.reviewedApproved");
  if (status === "REJECTED") return t("applicationDetails.review.reviewedRejected");
  return t("applicationDetails.review.notVerifiedYet");
}

function formatApplicationStatusLabel(
  t: ReturnType<typeof useTranslations>,
  status?: PractitionerApplicationStatus | null,
) {
  if (!status) return "-";
  return t(`status.${status}` as Parameters<typeof t>[0]);
}

function getCredentialStatusTone(status?: CredentialReviewStatus | null) {
  if (status === "APPROVED") return "success" as const;
  if (status === "PENDING") return "warning" as const;
  if (status === "REJECTED" || status === "EXPIRED") return "danger" as const;
  return "neutral" as const;
}

function getCredentialTypeLabel(locale: string, type: CredentialType) {
  const isAr = locale === "ar";
  const labels: Record<CredentialType, string> = {
    LICENSE: isAr ? "ترخيص" : "License",
    DEGREE: isAr ? "شهادة علمية" : "Degree",
    CERTIFICATION: isAr ? "شهادة اعتماد" : "Certification",
    NATIONAL_ID_FRONT: isAr ? "بطاقة الهوية - الوجه الأمامي" : "National ID - Front",
    NATIONAL_ID_BACK: isAr ? "بطاقة الهوية - الوجه الخلفي" : "National ID - Back",
    NATIONAL_ID: isAr ? "بطاقة رقم قومي" : "National ID",
    PASSPORT: isAr ? "جواز سفر" : "Passport",
    MEMBERSHIP: isAr ? "كارنيه النقابة" : "Syndicate card",
    OTHER: isAr ? "أخرى" : "Other",
  };
  return labels[type];
}

function formatPayoutMethodLabel(
  t: ReturnType<typeof useTranslations>,
  methodType?: PractitionerPayoutMethodType | null,
) {
  if (!methodType) return "-";
  return t(`applicationDetails.payout.methodOptions.${methodType}` as Parameters<typeof t>[0]);
}

function formatSpecialtyList(
  specialties: any[] | null | undefined,
  locale: string,
  primaryLabel: string,
  catalogSpecialties?: Array<{ id: string; name: string; nameAr: string | null; nameEn: string | null; slug: string }>,
) {
  const safeSpecialties = Array.isArray(specialties) ? specialties : [];
  if (safeSpecialties.length === 0) return "-";
  const formatted = safeSpecialties
    .map((item: any) => {
      const rawTitle = item?.title?.trim();
      const rawNameAr = item?.nameAr?.trim() || item?.specialtyNameAr?.trim();
      const rawNameEn = item?.nameEn?.trim() || item?.specialtyNameEn?.trim();
      const rawName = item?.name?.trim() || item?.specialtyName?.trim() || item?.slug?.trim();

      let label = rawTitle;
      if (!label) {
        label = locale === "ar" ? (rawNameAr || rawName || rawNameEn) : (rawNameEn || rawName || rawNameAr);
      }
      if (!label || label === "undefined" || /^[0-9a-fA-F-]{36}$/.test(label)) {
        const id = item?.specialtyId || item?.id;
        const fromCatalog = catalogSpecialties?.find((c) => c.id === id || c.slug === item?.slug);
        if (fromCatalog) {
          label = locale === "ar" ? (fromCatalog.nameAr || fromCatalog.name) : (fromCatalog.nameEn || fromCatalog.name);
        }
      }
      if (!label || label === "undefined" || /^[0-9a-fA-F-]{36}$/.test(label)) {
        label = item?.slug || "-";
      }
      if (!label || label === "-" || label === "undefined") {
        return null;
      }
      return `${label}${item?.isPrimary ? ` (${primaryLabel})` : ""}`;
    })
    .filter(Boolean);

  return formatted.length > 0 ? formatted.join("، ") : "-";
}

function getReadinessRecommendation(
  readinessSnapshot: PractitionerApplicationDetailsResponse["details"]["readinessSnapshot"],
  locale: string,
) {
  if (!readinessSnapshot.canBeReviewed) {
    return {
      title:
        locale === "ar"
          ? "الطلب غير قابل للمراجعة بسبب نقص البيانات"
          : "Application is not reviewable due to missing data",
      tone: "neutral" as const,
    };
  }
  if (readinessSnapshot.canBeApproved) {
    return {
      title:
        locale === "ar"
          ? "البيانات مكتملة — ما زال يلزم تحقق يدوي من المراجع"
          : "Data is complete — reviewer verification is still required",
      tone: "success" as const,
    };
  }
  return {
    title:
      locale === "ar"
        ? "توجد بيانات ناقصة قبل القرار"
        : "Missing data must be resolved before a decision",
    tone: "warning" as const,
  };
}

function getCompletionIssueLabel(
  t: ReturnType<typeof useTranslations>,
  locale: string,
  code: string,
) {
  if (code === "QUALIFICATIONS_ACADEMIC_CERTIFICATE_REQUIRED") {
    return locale === "ar" ? "شهادة علمية غير مرفوعة" : "Academic certificate is missing";
  }
  if (code === "DOCUMENTS_IDENTITY_EVIDENCE_REQUIRED") {
    return locale === "ar" ? "مستند الهوية غير مكتمل" : "Identity document is incomplete";
  }
  if (code === "DOCUMENTS_NATIONAL_ID_FRONT_MISSING") {
    return locale === "ar" ? "صورة البطاقة الأمامية غير مرفوعة" : "National ID front is missing";
  }
  if (code === "DOCUMENTS_NATIONAL_ID_BACK_MISSING") {
    return locale === "ar" ? "صورة البطاقة الخلفية غير مرفوعة" : "National ID back is missing";
  }
  if (code === "PAYOUT_DESTINATION_REQUIRED") {
    return locale === "ar" ? "بيانات المستحقات غير مكتملة" : "Payout details are missing";
  }
  if (code === "PAYOUT_ACCOUNT_HOLDER_REQUIRED") {
    return locale === "ar" ? "اسم صاحب الحساب غير موجود" : "Account holder name is missing";
  }
  if (code === "PAYOUT_BANK_NAME_REQUIRED") {
    return locale === "ar" ? "اسم البنك غير موجود" : "Bank name is missing";
  }
  if (code === "PAYOUT_BANK_ACCOUNT_REQUIRED") {
    return locale === "ar" ? "رقم الحساب البنكي غير موجود" : "Bank account number is missing";
  }
  if (code === "DOCUMENTS_CREDENTIAL_NOT_APPROVED") {
    return locale === "ar" ? "مستندات مرفوعة وتحتاج مراجعة الإدارة" : "Uploaded documents still need admin review";
  }
  return t("applicationDetails.review.missing");
}

function getCompletionIssueHelper(
  locale: string,
  code: string,
) {
  if (code === "QUALIFICATIONS_ACADEMIC_CERTIFICATE_REQUIRED") {
    return locale === "ar"
      ? "اطلب من المعالج رفع شهادة علمية قبل متابعة الاعتماد."
      : "Ask the practitioner to upload an academic certificate before approval.";
  }
  if (code === "DOCUMENTS_IDENTITY_EVIDENCE_REQUIRED" || code === "DOCUMENTS_NATIONAL_ID_FRONT_MISSING" || code === "DOCUMENTS_NATIONAL_ID_BACK_MISSING") {
    return locale === "ar"
      ? "اطلب من المعالج استكمال مستندات الهوية المطلوبة."
      : "Ask the practitioner to complete the required identity documents.";
  }
  if (code.startsWith("PAYOUT_")) {
    return locale === "ar"
      ? "اطلب من المعالج استكمال بيانات استلام المستحقات."
      : "Ask the practitioner to complete the payout details.";
  }
  return locale === "ar" ? "اطلب من المعالج استكمال البيانات الناقصة." : "Ask the practitioner to complete the missing information.";
}

function getCredentialPresenceState(
  t: ReturnType<typeof useTranslations>,
  credential?: { reviewStatus: CredentialReviewStatus } | null,
) {
  if (!credential) return t("applicationDetails.review.missing");
  if (credential.reviewStatus === "PENDING") return t("applicationDetails.review.pendingManualVerification");
  if (credential.reviewStatus === "REJECTED" || credential.reviewStatus === "EXPIRED") {
    return t("applicationDetails.review.needsCorrection");
  }
  return t("applicationDetails.review.reviewed");
}

export default function AdminApplicationDetails({ applicationId }: Props) {
  const t = useTranslations("admin-area");
  const locale = useLocale();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useAdminPractitionerApplicationDetails(applicationId);
  const { mutate: approve, isPending: isApproving } = useApprovePractitionerApplication();
  const { mutate: reject, isPending: isRejecting } = useRejectPractitionerApplication();
  const { mutate: requestChanges, isPending: isRequestingChanges } = useRequestPractitionerApplicationChanges();
  const { mutate: updateCredential, isPending: isUpdatingCredential } = useUpdateAdminPractitionerApplicationCredential();
  const { mutateAsync: viewCredential, isPending: isOpeningCredential } = useViewAdminPractitionerApplicationCredentialFile();

  const [activeStep, setActiveStep] = useState(0);
  const [approveNote, setApproveNote] = useState("");
  const [approveResult, setApproveResult] = useState<"success" | "error" | null>(null);
  const [approveErrorMessage, setApproveErrorMessage] = useState<string | null>(null);
  const [approveAttemptedBlocked, setApproveAttemptedBlocked] = useState(false);
  const [rejectReasons, setRejectReasons] = useState<DecisionReasonDraft[]>([createDecisionReasonDraft()]);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState(false);
  const [rejectResult, setRejectResult] = useState<"success" | "error" | null>(null);
  const [requestChangeReasons, setRequestChangeReasons] = useState<DecisionReasonDraft[]>([createDecisionReasonDraft()]);
  const [requestChangesNote, setRequestChangesNote] = useState("");
  const [requestChangesReasonError, setRequestChangesReasonError] = useState(false);
  const [requestChangesResult, setRequestChangesResult] = useState<"success" | "error" | null>(null);
  const [credentialReviewNotes, setCredentialReviewNotes] = useState<Record<string, string>>({});
  const [credentialActionMessage, setCredentialActionMessage] = useState<string | null>(null);
  const [openingCredentialId, setOpeningCredentialId] = useState<string | null>(null);
  const [credentialActionError, setCredentialActionError] = useState<string | null>(null);
  const [authenticatedAvatarUrl, setAuthenticatedAvatarUrl] = useState<string | null>(null);

  const handleOpenCredential = async (credentialId: string) => {
    if (isOpeningCredential) return;

    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      setCredentialActionError(t("errors.generic"));
      return;
    }
    previewWindow.opener = null;
    setOpeningCredentialId(credentialId);
    setCredentialActionError(null);
    let objectUrl: string | null = null;

    try {
      const blob = await viewCredential({ applicationId, credentialId });
      objectUrl = URL.createObjectURL(blob);
      previewWindow.location.href = objectUrl;
      const previewUrl = objectUrl;
      window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60_000);
    } catch (error) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      previewWindow.close();
      setCredentialActionError(error instanceof Error ? error.message : t("errors.generic"));
    } finally {
      setOpeningCredentialId(null);
    }
  };

  const liveApplicantSearch = data?.details.liveApplicant.displayName?.trim() ?? "";
  const directoryPractitionersQuery = useAdminPractitioners(
    { search: liveApplicantSearch || undefined, page: 1, limit: 25 },
    Boolean(liveApplicantSearch),
  );

  useEffect(() => {
    if (!data) {
      setAuthenticatedAvatarUrl(null);
      return;
    }

    const { applicant, profile, liveApplicant, liveProfile, application } = data.details;
    const hasAvatar = Boolean(
      normalizeAvatarUrl(
        applicant.avatarUrl ?? profile.avatarUrl ?? liveApplicant.avatarUrl ?? liveProfile?.avatarUrl ?? null,
      ),
    );
    if (!hasAvatar) {
      setAuthenticatedAvatarUrl(null);
      return;
    }

    let disposed = false;
    let objectUrl: string | null = null;
    void httpClient
      .get<Blob>(`/admin/practitioner-applications/${application.applicationId}/avatar`, {
        responseType: "blob",
      })
      .then(({ data: blob }) => {
        if (disposed) return;
        objectUrl = URL.createObjectURL(blob);
        setAuthenticatedAvatarUrl(objectUrl);
      })
      .catch(() => {
        if (!disposed) setAuthenticatedAvatarUrl(null);
      });

    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setAuthenticatedAvatarUrl(null);
    };
  }, [data]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !data) {
      return;
    }

    const {
      applicant,
      profile,
      liveApplicant,
      credentials,
      payoutDestination,
      livePayoutDestination,
      application,
      readinessSnapshot,
      completion,
    } = data.details;
    const directoryPractitioner = directoryPractitionersQuery.data?.items.find((item) => item.id === liveApplicant.practitionerProfileId);
    const reviewAvatarUrl = authenticatedAvatarUrl;
    const debugDecision = deriveAdminReviewDecision({
      locale,
      application,
      readinessSnapshot,
      completion,
      credentials,
      payoutDestination,
      livePayoutDestination,
      reviewAvatarUrl,
      applicant,
      liveApplicant,
      profile,
    });

    console.group("[AdminReviewDebug]");
    console.log({
      applicationId,
      applicationStatus: application.status,
      readinessSnapshot,
      completionBlockers: completion.blockers,
      completionWarnings: completion.warnings,
      completionSteps: completion.steps,
      credentials: credentials.map((credential) => ({
        id: credential.credentialId,
        type: credential.credentialType,
        status: credential.reviewStatus,
      })),
      derivedDecisionGroups: {
        missingFromPractitioner: debugDecision.missingFromPractitioner.map((item) => item.code),
        needsAdminReview: debugDecision.needsAdminReview.map((item) => item.code),
        rejectedOrNeedsCorrection: debugDecision.rejectedOrNeedsCorrection.map((item) => item.code),
        readyChecks: debugDecision.readyChecks.map((item) => item.code),
        internalInconsistencies: debugDecision.internalInconsistencies.map((item) => item.code),
      },
      approveDisabled: !debugDecision.canApprove,
      approveDisabledReasons: debugDecision.approveDisabledReasons.map((item) => item.code),
    });
    console.groupEnd();
  }, [applicationId, authenticatedAvatarUrl, data, directoryPractitionersQuery.data?.items, locale]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <Skeleton className="mb-4 h-4 w-48" />
            <div className="space-y-3">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="mb-4 text-sm font-medium text-gray-800 dark:text-white">
            {t("applicationDetails.feedback.loadError")}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t("applicationDetails.feedback.retry")}
          </button>
        </div>
      </div>
    );
  }

  const { applicant, profile, liveApplicant, liveProfile, credentials, payoutDestination, livePayoutDestination, application, readinessSnapshot, completion, reviewCase } = data.details;
  const directoryPractitioner = directoryPractitionersQuery.data?.items.find((item) => item.id === liveApplicant.practitionerProfileId);

  // The protected avatar is loaded as a Blob before it is used by the UI.
  const reviewAvatarUrl = authenticatedAvatarUrl;

  const applicantCountryLabel = getLocalizedCountryLabel(locale, applicant.countryCode);
  const liveApplicantCountryLabel = getLocalizedCountryLabel(locale, liveApplicant.countryCode);
  const submittedAtLabel = application.submittedAt ? new Date(application.submittedAt).toLocaleDateString(locale) : t("applicationDetails.application.never");
  const statusLabel = formatApplicationStatusLabel(t, application.status);
  const statusBadge = (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-medium", statusColour[application.status])}>
      {statusLabel}
    </span>
  );

  const credentialTypeSet = new Set(credentials.map((credential) => credential.credentialType));
  const hasNationalIdFront =
    credentialTypeSet.has("NATIONAL_ID_FRONT") || credentialTypeSet.has("NATIONAL_ID");
  const hasNationalIdBack =
    credentialTypeSet.has("NATIONAL_ID_BACK") || credentialTypeSet.has("NATIONAL_ID");
  const hasPassport = credentialTypeSet.has("PASSPORT");
  const hasIdentityDocument = hasPassport || (hasNationalIdFront && hasNationalIdBack);
  const hasAcademicCertificate = credentials.some((credential) => credential.credentialType === "DEGREE");
  const passportCredential = credentials.find((credential) => credential.credentialType === "PASSPORT");
  const nationalIdFrontCredential =
    credentials.find((credential) => credential.credentialType === "NATIONAL_ID_FRONT") ??
    credentials.find((credential) => credential.credentialType === "NATIONAL_ID");
  const nationalIdBackCredential =
    credentials.find((credential) => credential.credentialType === "NATIONAL_ID_BACK") ??
    credentials.find((credential) => credential.credentialType === "NATIONAL_ID");
  const academicCredential = credentials.find((credential) => credential.credentialType === "DEGREE");

  const missingItems = [
    !reviewAvatarUrl ? t("applicationDetails.review.missingProfilePhoto") : null,
    !hasIdentityDocument ? t("applicationDetails.review.missingIdentityDocument") : null,
    !hasAcademicCertificate ? t("applicationDetails.review.missingAcademicCertificate") : null,
    !readinessSnapshot.hasPayoutDestination ? t("applicationDetails.review.missingPayoutDetails") : null,
  ].filter(Boolean) as string[];

  const missingFromPractitioner = completion.blockers
    .filter((issue) => issue.requirementScope === "SUBMISSION" && issue.code !== "APPLICATION_SUBMITTED")
    .map<ReviewReasonItem>((issue) => ({
      id: issue.code,
      label: getCompletionIssueLabel(t, locale, issue.code),
      helper: getCompletionIssueHelper(locale, issue.code),
    }));

  const pendingAdminReview = credentials
    .filter((credential) => credential.reviewStatus === "PENDING")
    .map<ReviewReasonItem>((credential) => ({
      id: credential.credentialId,
      label:
        locale === "ar"
          ? `${getCredentialTypeLabel(locale, credential.credentialType)} مرفوعة وتحتاج مراجعة الإدارة`
          : `${getCredentialTypeLabel(locale, credential.credentialType)} is uploaded and needs admin review`,
      helper:
        locale === "ar"
          ? "افتح الملف ثم علّم المستند كمُراجع أو يحتاج تصحيح."
          : "Open the file, then mark the document as reviewed or needing correction.",
    }));

  const rejectedOrInvalid = credentials
    .filter((credential) => credential.reviewStatus === "REJECTED" || credential.reviewStatus === "EXPIRED")
    .map<ReviewReasonItem>((credential) => ({
      id: credential.credentialId,
      label:
        locale === "ar"
          ? `${getCredentialTypeLabel(locale, credential.credentialType)} يحتاج تصحيح`
          : `${getCredentialTypeLabel(locale, credential.credentialType)} needs correction`,
      helper:
        locale === "ar"
          ? "اطلب من المعالج تحديث هذا المستند أو ارفض الطلب إذا كان غير صالح."
          : "Ask the practitioner to update this document, or reject the application if it is invalid.",
    }));

  const readyForApprovalItems: ReviewReasonItem[] = readinessSnapshot.canBeApproved
    ? [
        {
          id: "ready",
          label:
            locale === "ar"
              ? "كل البيانات المطلوبة موجودة وتمت مراجعة المستندات اللازمة"
              : "All required data is present and the required documents have been reviewed",
          helper:
            locale === "ar"
              ? "يمكنك اعتماد الطلب الآن إذا كانت المراجعة اليدوية مكتملة."
              : "You can approve the application now if your manual review is complete.",
        },
      ]
    : [];

  const summaryChips = [
    ...missingFromPractitioner.map((item) => (locale === "ar" ? `ناقص: ${item.label.replace(/^ناقص:\s*/, "").replace(/ غير مرفوعة$/, "")}` : `Missing: ${item.label}`)),
    ...pendingAdminReview.map((item) => (locale === "ar" ? `يحتاج مراجعة: ${item.label.replace(" مرفوعة وتحتاج مراجعة الإدارة", "")}` : `Needs review: ${item.label.replace(" is uploaded and needs admin review", "")}`)),
    ...rejectedOrInvalid.map((item) => (locale === "ar" ? `يحتاج تصحيح: ${item.label.replace(" يحتاج تصحيح", "")}` : `Needs correction: ${item.label.replace(" needs correction", "")}`)),
  ];

  const derivedDecision = deriveAdminReviewDecision({
    locale,
    application,
    readinessSnapshot,
    completion,
    credentials,
    payoutDestination,
    livePayoutDestination,
    reviewAvatarUrl,
    applicant,
    liveApplicant,
    profile,
  });

  const reviewSummaryChips = derivedDecision.summaryChips;

  // Step 1 should stay focused on identity/basics; academic certificate belongs to documents/qualifications step.
  const missingIdentityItems = missingItems.filter(
    (item) => item !== t("applicationDetails.review.missingAcademicCertificate"),
  );

  const identityDifferences = [
    {
      key: "displayName",
      label: t("applicationDetails.applicant.displayName"),
      current: getReadableValue(liveApplicant.displayName),
      requested: getReadableValue(applicant.displayName),
    },
    {
      key: "countryCode",
      label: t("applicationDetails.applicant.country"),
      current: liveApplicantCountryLabel,
      requested: applicantCountryLabel,
    },
  ].filter((item) => normalizeForDiff(item.current) !== normalizeForDiff(item.requested));

  const professionalDifferences = [
    {
      key: "practitionerType",
      label: t("applicationDetails.profile.type"),
      current: liveProfile?.practitionerType ? t(`practitionerType.${liveProfile.practitionerType as PractitionerType}`) : "-",
      requested: profile.practitionerType ? t(`practitionerType.${profile.practitionerType as PractitionerType}`) : "-",
    },
    {
      key: "professionalTitle",
      label: t("applicationDetails.profile.title"),
      current: getProfessionalTitleLabel(liveProfile?.professionalTitle, locale) || getReadableValue(liveProfile?.professionalTitle),
      requested: getProfessionalTitleLabel(profile.professionalTitle, locale) || getReadableValue(profile.professionalTitle),
    },
    {
      key: "sessionPrice30Egp",
      label: t("applicationDetails.profile.sessionPrice30Egp"),
      current: formatMoneyValue(liveProfile?.pricing.session30.egp, locale),
      requested: formatMoneyValue(profile.pricing.session30.egp, locale),
    },
    {
      key: "sessionPrice60Egp",
      label: t("applicationDetails.profile.sessionPrice60Egp"),
      current: formatMoneyValue(liveProfile?.pricing.session60.egp, locale),
      requested: formatMoneyValue(profile.pricing.session60.egp, locale),
    },
    {
      key: "instantBookingPrice30Egp",
      label: t("applicationDetails.profile.instantBookingPrice30Egp"),
      current: formatMoneyValue(liveProfile?.instantBookingPrice30Egp, locale),
      requested: formatMoneyValue(profile.instantBookingPrice30Egp, locale),
    },
    {
      key: "instantBookingPrice60Egp",
      label: t("applicationDetails.profile.instantBookingPrice60Egp"),
      current: formatMoneyValue(liveProfile?.instantBookingPrice60Egp, locale),
      requested: formatMoneyValue(profile.instantBookingPrice60Egp, locale),
    },
    {
      key: "instantBookingPrice30Usd",
      label: t("applicationDetails.profile.instantBookingPrice30Usd"),
      current: formatMoneyValue(liveProfile?.instantBookingPrice30Usd, locale),
      requested: formatMoneyValue(profile.instantBookingPrice30Usd, locale),
    },
    {
      key: "instantBookingPrice60Usd",
      label: t("applicationDetails.profile.instantBookingPrice60Usd"),
      current: formatMoneyValue(liveProfile?.instantBookingPrice60Usd, locale),
      requested: formatMoneyValue(profile.instantBookingPrice60Usd, locale),
    },
  ].filter((item) => normalizeForDiff(item.current) !== normalizeForDiff(item.requested));

  const payoutCountryCode =
    getCatalogItemCountryCodes(payoutDestination?.bankName ?? "").at(0) ??
    getCatalogItemCountryCodes(payoutDestination?.walletProvider ?? "").at(0) ??
    getCatalogItemCountryCodes(livePayoutDestination?.bankName ?? "").at(0) ??
    getCatalogItemCountryCodes(livePayoutDestination?.walletProvider ?? "").at(0) ??
    "";
  const payoutCountryLabel = payoutCountryCode ? getLocalizedCountryLabel(locale, payoutCountryCode) : "-";

  const normalizedRequestChangeReasons = requestChangeReasons
    .map((item) => item.value.trim())
    .filter((value) => value.length > 0);
  const normalizedRejectReasons = rejectReasons
    .map((item) => item.value.trim())
    .filter((value) => value.length > 0);

  const approveBlockedReasons = [
    ...missingFromPractitioner.map((item) =>
      locale === "ar" ? `لا يمكن اعتماد الطلب قبل استكمال ${item.label.replace(/ غير مرفوعة$/, "").replace(/^ناقص:\s*/, "")}.` : `The application cannot be approved before ${item.label.toLowerCase()} is completed.`,
    ),
    ...pendingAdminReview.map((item) =>
      locale === "ar" ? `لا يمكن اعتماد الطلب قبل مراجعة ${item.label.replace(" مرفوعة وتحتاج مراجعة الإدارة", "")}.` : `The application cannot be approved before reviewing ${item.label.replace(" is uploaded and needs admin review", "").toLowerCase()}.`,
    ),
    ...rejectedOrInvalid.map((item) =>
      locale === "ar" ? `لا يمكن اعتماد الطلب مع وجود ${item.label.replace(" يحتاج تصحيح", "")} يحتاج تصحيح.` : `The application cannot be approved while ${item.label.replace(" needs correction", "").toLowerCase()} still needs correction.`,
    ),
  ];

  const derivedApproveBlockedReasons = derivedDecision.approveDisabledReasons;

  const reviewSteps = [
    { key: "identity", index: 0, label: t("applicationDetails.review.identityAndSummary") },
    { key: "professional", index: 1, label: t("applicationDetails.review.professionalProfileAndPricing") },
    { key: "documents", index: 2, label: t("applicationDetails.review.documentsAndPayout") },
    { key: "decision", index: 3, label: t("applicationDetails.review.finalDecision") },
  ];

  const handleApprove = () => {
    if (!derivedDecision.canApprove) {
      setApproveAttemptedBlocked(true);
      setApproveResult("error");
      setApproveErrorMessage(
        derivedApproveBlockedReasons.length > 0
          ? derivedApproveBlockedReasons.map((reason) => reason.label).join(" • ")
          : derivedDecision.statusDescription,
      );
      return;
    }

    setApproveAttemptedBlocked(false);
    setApproveResult(null);
    setApproveErrorMessage(null);
    approve(
      { id: applicationId, data: { note: approveNote || undefined } },
      {
        onSuccess: () => {
          toast.success(t("applicationDetails.decision.approve.success"));
          router.replace("/admin/practitioner-applications?view=HISTORY" as never);
        },
        onError: (error) => {
          setApproveResult("error");
          if (!isAppError(error)) return;
          const missingRequirements = Array.isArray(error.details?.missingRequirements)
            ? error.details?.missingRequirements.filter((item): item is string => typeof item === "string").join(", ")
            : null;
          setApproveErrorMessage(
            missingRequirements
              ? `${t("applicationDetails.decision.approve.error")}: ${missingRequirements}`
              : t("applicationDetails.decision.approve.error"),
          );
        },
      },
    );
  };

  const handleReject = () => {
    if (normalizedRejectReasons.length === 0) {
      setRejectReasonError(true);
      return;
    }
    setRejectResult(null);
    reject(
      { id: applicationId, data: { reason: normalizedRejectReasons.join("\n"), note: rejectNote || undefined } },
      {
        onSuccess: () => {
          toast.success(t("applicationDetails.decision.reject.success"));
          router.replace("/admin/practitioner-applications?view=HISTORY" as never);
        },
        onError: () => setRejectResult("error"),
      },
    );
  };

  const handleRequestChanges = () => {
    if (normalizedRequestChangeReasons.length === 0) {
      setRequestChangesReasonError(true);
      return;
    }
    setRequestChangesResult(null);
    requestChanges(
      {
        id: applicationId,
        data: {
          reason: normalizedRequestChangeReasons.join("\n"),
          note: requestChangesNote || undefined,
          requirements: normalizedRequestChangeReasons.map((reason) => ({
            section: "COMPLIANCE",
            title: locale === "ar" ? "متطلب مراجعة" : "Review requirement",
            reason,
            severity: "BLOCKING" as const,
          })),
        },
      },
      {
        onSuccess: async () => {
          await refetch();
          toast.success(t("applicationDetails.decision.requestChanges.success"));
          setApproveAttemptedBlocked(false);
          setRequestChangesResult("success");
        },
        onError: () => setRequestChangesResult("error"),
      },
    );
  };

  const handleCredentialReview = (
    credentialId: string,
    reviewStatus: CredentialReviewStatus,
  ) => {
    const reviewNotes = credentialReviewNotes[credentialId]?.trim();
    setCredentialActionMessage(null);
    setCredentialActionError(null);
    if (reviewStatus === "REJECTED" && !reviewNotes) {
      setCredentialActionError(t("applicationDetails.credentials.reviewNotesRequired"));
      return;
    }
    updateCredential(
      {
        id: applicationId,
        credentialId,
        data: {
          reviewStatus,
          reviewNotes: reviewNotes ? reviewNotes : undefined,
        },
      },
      {
        onSuccess: async () => {
          setApproveAttemptedBlocked(false);
          setCredentialActionMessage(
            reviewStatus === "APPROVED"
              ? locale === "ar"
                ? "تم تحديث حالة المستند إلى تمت مراجعته."
                : "The document was marked as reviewed."
              : locale === "ar"
                ? "تم تحديث حالة المستند إلى يحتاج تصحيح."
                : "The document was marked as needing correction.",
          );
          await refetch();
        },
        onError: (error) => {
          if (isAppError(error)) {
            setCredentialActionError(error.message);
            return;
          }
          setCredentialActionError(
            locale === "ar"
              ? "تعذر تحديث حالة المستند الآن."
              : "Could not update the document status right now.",
          );
        },
      },
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5 px-4 pb-12 lg:px-6">
      <AdminApplicationReviewHeader
        avatarUrl={reviewAvatarUrl}
        name={liveApplicant.displayName ?? t("applicationDetails.review.fallbackTitle")}
        email={getReadableValue(liveApplicant.email.address)}
        phone={getReadableValue(liveApplicant.phone.number)}
        country={applicantCountryLabel}
        statusBadge={statusBadge}
        submittedAt={submittedAtLabel}
        summaryChips={reviewSummaryChips}
        photoMissingLabel={t("applicationDetails.review.noProfilePhotoUploaded")}
        previewPhotoLabel={t("applicationDetails.review.previewPhoto")}
      />

      {reviewCase ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {locale === "ar" ? "حالة المراجعة والمتطلبات" : "Review case and requirements"}
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {locale === "ar" ? "المعلومات المعتمدة تظل منفصلة عن التعديلات المقترحة." : "Approved live data remains separate from proposed changes."}
              </p>
            </div>
            <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-text-brand dark:bg-primary/20 dark:text-primary-light">
              {formatReviewToken(locale, reviewCase.status)}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {reviewCase.sections.map((section) => (
              <div key={section.section} className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{formatReviewToken(locale, section.section)}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatReviewToken(locale, section.status)}</p>
              </div>
            ))}
          </div>
          {reviewCase.requirements.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
              <table className="min-w-full text-start text-xs">
                <thead className="bg-gray-50 dark:bg-gray-950"><tr><th className="px-3 py-2">{locale === "ar" ? "المتطلب" : "Requirement"}</th><th className="px-3 py-2">{locale === "ar" ? "القسم" : "Section"}</th><th className="px-3 py-2">{locale === "ar" ? "الحالة" : "Status"}</th></tr></thead>
                <tbody>{reviewCase.requirements.map((requirement) => <tr key={requirement.id} className="border-t border-gray-100 dark:border-gray-800"><td className="px-3 py-2"><p className="font-medium">{requirement.title}</p><p className="text-gray-500">{requirement.reason}</p></td><td className="px-3 py-2">{formatReviewToken(locale, requirement.section)}</td><td className="px-3 py-2">{formatReviewToken(locale, requirement.status)}</td></tr>)}</tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      <AdminApplicationReviewWizard
        steps={reviewSteps}
        activeStep={activeStep}
        onStepChange={setActiveStep}
        onPrevious={() => setActiveStep((current) => Math.max(current - 1, 0))}
        onNext={() => setActiveStep((current) => Math.min(current + 1, reviewSteps.length - 1))}
        onBack={() => {
          window.location.href = `/${locale}/admin/practitioner-applications`;
        }}
        previousLabel={t("applicationDetails.review.previous")}
        nextLabel={t("applicationDetails.review.next")}
        backLabel={t("applicationDetails.review.backToList")}
        previousDisabled={activeStep === 0}
        nextDisabled={activeStep === reviewSteps.length - 1}
      >
        {activeStep === 0 ? (
          <AdminApplicationStepIdentity
            avatarUrl={reviewAvatarUrl}
            name={getReadableValue(applicant.displayName)}
            email={getReadableValue(liveApplicant.email.address)}
            phone={getReadableValue(liveApplicant.phone.number)}
            country={applicantCountryLabel}
            accountStatus={getLocalizedStatusLabel(locale, liveApplicant.accountStatus)}
            photoStatus={reviewAvatarUrl ? t("applicationDetails.review.provided") : t("applicationDetails.review.notUploaded")}
            noPhotoLabel={t("applicationDetails.review.noProfilePhotoUploaded")}
            guidance={t("applicationDetails.review.identityGuidance")}
            missingItems={missingIdentityItems}
            identityDifferences={identityDifferences}
            liveValueLabel={t("applicationDetails.review.liveValue")}
            requestedValueLabel={t("applicationDetails.review.requestedValue")}
            nameLabel={t("applicationDetails.applicant.displayName")}
            emailLabel={t("applicationDetails.applicant.email")}
            phoneLabel={t("applicationDetails.applicant.phone")}
            countryLabel={t("applicationDetails.applicant.country")}
            accountStatusLabel={t("applicationDetails.applicant.accountStatus")}
          />
        ) : null}

        {activeStep === 1 ? (
          <AdminApplicationStepProfessional
            profileRows={[
              { label: t("applicationDetails.profile.type"), value: profile.practitionerType ? t(`practitionerType.${profile.practitionerType as PractitionerType}`) : "-" },
              { label: t("applicationDetails.profile.title"), value: getProfessionalTitleLabel(profile.professionalTitle, locale) || getReadableValue(profile.professionalTitle) },
              { label: t("applicationDetails.profile.years"), value: profile.yearsOfExperience != null ? String(profile.yearsOfExperience) : "-" },
              {
                label: t("applicationDetails.profile.primarySpecialtyCategory"),
                value: profile.primarySpecialtyCategory
                  ? getLocalizedSpecialtyCategoryName(
                      profile.primarySpecialtyCategory,
                      locale,
                    )
                  : (profile.specialties?.find((s: any) => s.category)?.category
                      ? getLocalizedSpecialtyCategoryName(profile.specialties.find((s: any) => s.category)!.category!, locale)
                      : "-"),
              },
              {
                label: t("applicationDetails.profile.specialties"),
                value: formatSpecialtyList(
                  profile.specialties,
                  locale,
                  t("applicationDetails.profile.primary"),
                ),
              },
              { label: t("applicationDetails.profile.languages"), value: formatLanguageList(locale, profile.languages) },
            ]}
            bio={getReadableValue(profile.bio)}
            prices={[
              { label: t("applicationDetails.profile.sessionPrice30Egp"), value: formatMoneyValue(profile.pricing.session30.egp, locale) },
              { label: t("applicationDetails.profile.sessionPrice60Egp"), value: formatMoneyValue(profile.pricing.session60.egp, locale) },
              { label: t("applicationDetails.profile.sessionPrice30Usd"), value: formatMoneyValue(profile.pricing.session30.usd, locale) },
              { label: t("applicationDetails.profile.sessionPrice60Usd"), value: formatMoneyValue(profile.pricing.session60.usd, locale) },
              { label: t("applicationDetails.profile.instantBookingPrice30Egp"), value: formatMoneyValue(profile.instantBookingPrice30Egp, locale) },
              { label: t("applicationDetails.profile.instantBookingPrice60Egp"), value: formatMoneyValue(profile.instantBookingPrice60Egp, locale) },
              { label: t("applicationDetails.profile.instantBookingPrice30Usd"), value: formatMoneyValue(profile.instantBookingPrice30Usd, locale) },
              { label: t("applicationDetails.profile.instantBookingPrice60Usd"), value: formatMoneyValue(profile.instantBookingPrice60Usd, locale) },
            ]}
            differences={professionalDifferences}
            noDifferencesLabel={t("applicationDetails.review.noImportantDifferences")}
            liveValueLabel={t("applicationDetails.review.liveValue")}
            requestedValueLabel={t("applicationDetails.review.requestedValue")}
            bioLabel={t("applicationDetails.profile.bio")}
            differencesLabel={t("applicationDetails.review.importantDifferences")}
          />
        ) : null}

        {activeStep === 2 ? (
          <AdminApplicationStepDocumentsPayout
            credentialsTitle={t("applicationDetails.sections.credentials")}
            credentialsEmpty={t("applicationDetails.review.noDocumentsUploadedYet")}
            openFileLabel={t("applicationDetails.credentials.openFile")}
            reviewCredentialLabel={locale === "ar" ? "مراجعة المستند" : "Review document"}
            closeReviewLabel={locale === "ar" ? "إغلاق المراجعة" : "Close review"}
            guidance={t("applicationDetails.review.compareBeforeDecision")}
            credentials={credentials.map((cred) => ({
              id: cred.credentialId,
              typeLabel: getCredentialTypeLabel(locale, cred.credentialType as CredentialType),
              statusLabel: formatCredentialStatusLabel(t, cred.reviewStatus),
              statusTone: getCredentialStatusTone(cred.reviewStatus),
              uploadedAtLabel: t("applicationDetails.credentials.uploadedAt", { date: new Date(cred.uploadedAt).toLocaleDateString(locale) }),
              expiresAtLabel: cred.expiresAt
                ? t("applicationDetails.credentials.expiresAt", { date: new Date(cred.expiresAt).toLocaleDateString(locale) })
                : t("applicationDetails.review.notVerifiedYet"),
              notesLabel: t("applicationDetails.credentials.reviewNotes"),
              notesValue: cred.reviewNotes || t("applicationDetails.application.noNotes"),
              // Credentials are sensitive; open only through the authorized admin endpoint.
              viewUrl: `${API_BASE_URL}/admin/practitioner-applications/${application.applicationId}/credentials/${cred.credentialId}/file`,
              onOpenFile: () => void handleOpenCredential(cred.credentialId),
              isOpeningFile: openingCredentialId === cred.credentialId,
              reviewNoteDraft: credentialReviewNotes[cred.credentialId] ?? cred.reviewNotes ?? "",
              reviewNotePlaceholder: t("applicationDetails.credentials.reviewNotesPlaceholder"),
              reviewActionHint:
                cred.reviewStatus === "PENDING"
                  ? locale === "ar"
                    ? "هذا المستند مرفوع ويحتاج مراجعة الإدارة قبل الاعتماد."
                    : "This document is uploaded and needs admin review before approval."
                  : cred.reviewStatus === "REJECTED" || cred.reviewStatus === "EXPIRED"
                    ? locale === "ar"
                      ? "هذا المستند يحتاج تصحيحًا من المعالج."
                      : "This document needs correction from the practitioner."
                    : locale === "ar"
                      ? "تمت مراجعة هذا المستند."
                      : "This document has already been reviewed.",
              reviewedStateLabel:
                cred.reviewStatus === "APPROVED"
                  ? locale === "ar"
                    ? "تمت مراجعته"
                    : "Reviewed"
                  : cred.reviewStatus === "REJECTED" || cred.reviewStatus === "EXPIRED"
                    ? locale === "ar"
                      ? "يحتاج تصحيح"
                      : "Needs correction"
                    : locale === "ar"
                      ? "بانتظار المراجعة"
                      : "Pending review",
              isUpdating: isUpdatingCredential,
              onReviewNoteChange: (value: string) => {
                setCredentialReviewNotes((current) => ({
                  ...current,
                  [cred.credentialId]: value,
                }));
              },
              onApprove: () => handleCredentialReview(cred.credentialId, "APPROVED"),
              onReject: () => handleCredentialReview(cred.credentialId, "REJECTED"),
              canReview: application.status !== "APPROVED" && application.status !== "ARCHIVED",
            }))}
            approveCredentialLabel={locale === "ar" ? "تمت مراجعته" : "Mark reviewed"}
            rejectCredentialLabel={locale === "ar" ? "يحتاج تصحيح" : "Needs correction"}
            credentialStatusColumnLabel={locale === "ar" ? "الحالة" : "Status"}
            credentialDatesColumnLabel={locale === "ar" ? "التواريخ" : "Dates"}
            credentialNotesColumnLabel={locale === "ar" ? "ملاحظات المراجعة" : "Review notes"}
            credentialActionsColumnLabel={locale === "ar" ? "الإجراءات" : "Actions"}
            payoutTitle={t("applicationDetails.sections.payout")}
            payoutRows={[
              { label: t("applicationDetails.payout.country"), value: payoutCountryLabel },
              { label: t("applicationDetails.payout.method"), value: formatPayoutMethodLabel(t, livePayoutDestination?.methodType ?? null) },
              { label: t("applicationDetails.payout.accountHolderName"), value: getReadableValue(livePayoutDestination?.accountHolderName) },
              { label: t("applicationDetails.payout.bankName"), value: getReadableValue(resolveBankLabel(locale, livePayoutDestination?.bankName)) },
              { label: t("applicationDetails.payout.walletProvider"), value: getReadableValue(resolveWalletProviderLabel(locale, livePayoutDestination?.walletProvider)) },
              { label: t("applicationDetails.payout.walletIdentifier"), value: maskSensitiveValue(livePayoutDestination?.walletIdentifier) },
              { label: "IBAN", value: maskSensitiveValue(livePayoutDestination?.iban) },
              { label: t("applicationDetails.payout.bankAccountNumber"), value: maskSensitiveValue(livePayoutDestination?.bankAccountNumber) },
            ]}
            payoutMissing={!readinessSnapshot.hasPayoutDestination}
            payoutProvidedLabel={t("applicationDetails.review.payoutDetailsProvided")}
            payoutMissingLabel={t("applicationDetails.review.missingPayoutDetails")}
            payoutEmptyLabel={t("applicationDetails.review.payoutDetailsMissing")}
            identityTitle={locale === "ar" ? "مستندات الهوية الأساسية" : "Required identity documents"}
            identityHint={locale === "ar" ? "بانتظار التحقق اليدوي" : "Pending manual verification"}
            identityComplete={hasIdentityDocument}
            identityEvidenceCompleteLabel={locale === "ar" ? "مكتملة" : "Complete"}
            identityEvidenceMissingLabel={locale === "ar" ? "ناقصة" : "Incomplete"}
            identityRows={[
              {
                label: locale === "ar" ? "بطاقة الهوية - الوجه الأمامي" : "National ID front",
                state: getCredentialPresenceState(t, nationalIdFrontCredential),
              },
              {
                label: locale === "ar" ? "بطاقة الهوية - الوجه الخلفي" : "National ID back",
                state: getCredentialPresenceState(t, nationalIdBackCredential),
              },
              {
                label: locale === "ar" ? "جواز السفر" : "Passport",
                state: getCredentialPresenceState(t, passportCredential),
              },
            ]}
            qualificationsTitle={t("applicationDetails.sections.qualifications")}
            qualificationsRows={[
              {
                label: locale === "ar" ? "شهادة علمية" : "Academic certificate",
                state: getCredentialPresenceState(t, academicCredential),
              },
            ]}
            qualificationsStateLabel={getCredentialPresenceState(t, academicCredential)}
          />
        ) : null}

        {activeStep === 3 ? (
          application.status === "APPROVED" || application.status === "REJECTED" ? (
            <AdminApplicationDecisionSummary
              status={application.status}
              statusLabel={formatApplicationStatusLabel(t, application.status)}
              title={t("applicationDetails.decision.finalSummary.title")}
              dateLabel={t("applicationDetails.decision.finalSummary.date")}
              reviewedAt={application.reviewedAt}
              reviewedByLabel={t("applicationDetails.decision.finalSummary.reviewedBy")}
              reviewedByUserId={application.reviewedByUserId}
              sectionsLabel={t("applicationDetails.decision.finalSummary.sections")}
              sections={reviewCase?.sections.map((section) => ({
                label: formatReviewToken(locale, section.section),
                status: formatReviewToken(locale, section.status),
              })) ?? []}
              readOnlyNote={t("applicationDetails.decision.finalSummary.readOnlyNote")}
            />
          ) : (
          <div className="space-y-4">
            <AdminApplicationStepDecision
              statusLabel={derivedDecision.statusLabel}
              statusDescription={derivedDecision.statusDescription}
              statusTone={derivedDecision.statusTone}
              sections={[
                {
                  title: locale === "ar" ? "ناقص من المعالج" : "Missing from practitioner",
                  tone: "warning",
                  emptyLabel:
                    locale === "ar"
                      ? "لا توجد بيانات ناقصة من جهة المعالج."
                      : "Nothing is missing from the practitioner.",
                  items: derivedDecision.missingFromPractitioner,
                },
                {
                  title: locale === "ar" ? "يحتاج مراجعة من الإدارة" : "Needs admin review",
                  tone: "info",
                  emptyLabel:
                    locale === "ar"
                      ? "لا توجد مستندات بانتظار مراجعة الإدارة."
                      : "No documents are waiting for admin review.",
                  items: derivedDecision.needsAdminReview,
                },
                {
                  title: locale === "ar" ? "مرفوض أو يحتاج تصحيح" : "Rejected or needs correction",
                  tone: "danger",
                  emptyLabel:
                    locale === "ar"
                      ? "لا توجد عناصر مرفوضة أو تحتاج تصحيح."
                      : "There are no rejected or correction-needed items.",
                  items: derivedDecision.rejectedOrNeedsCorrection,
                },
                {
                  title: locale === "ar" ? "جاهز للاعتماد" : "Ready for approval",
                  tone: "success",
                  emptyLabel:
                    locale === "ar"
                      ? "لن يصبح الطلب جاهزًا للاعتماد إلا بعد زوال الأسباب أعلاه."
                      : "The application becomes ready for approval only after the items above are resolved.",
                  items: derivedDecision.readyChecks,
                },
              ]}
              approveDisabledReasons={derivedApproveBlockedReasons}
              decisionNotice={t("applicationDetails.review.finalDecisionNotice")}
              cannotApproveHint={t("applicationDetails.review.cannotApproveBeforeMissing")}
              approveAttemptedBlocked={approveAttemptedBlocked}
              canBeReviewed={readinessSnapshot.canBeReviewed}
              canBeApproved={derivedDecision.canApprove}
              canRequestChanges={readinessSnapshot.canRequestChanges}
              approveNote={approveNote}
              setApproveNote={setApproveNote}
              requestChangeReasons={requestChangeReasons}
              setRequestChangeReasons={setRequestChangeReasons}
              requestChangesNote={requestChangesNote}
              setRequestChangesNote={setRequestChangesNote}
              rejectReasons={rejectReasons}
              setRejectReasons={setRejectReasons}
              rejectNote={rejectNote}
              setRejectNote={setRejectNote}
              requestChangesReasonError={requestChangesReasonError}
              rejectReasonError={rejectReasonError}
              setRequestChangesReasonError={setRequestChangesReasonError}
              setRejectReasonError={setRejectReasonError}
              isApproving={isApproving}
              isRequestingChanges={isRequestingChanges}
              isRejecting={isRejecting}
              onApprove={handleApprove}
              onRequestChanges={handleRequestChanges}
              onReject={handleReject}
              approveLabel={t("applicationDetails.decision.approve.submit")}
              approveSubmittingLabel={t("applicationDetails.decision.approve.submitting")}
              requestChangesLabel={t("applicationDetails.decision.requestChanges.submit")}
              requestChangesSubmittingLabel={t("applicationDetails.decision.requestChanges.submitting")}
              rejectLabel={t("applicationDetails.decision.reject.submit")}
              rejectSubmittingLabel={t("applicationDetails.decision.reject.submitting")}
              approveNoteLabel={t("applicationDetails.decision.approve.noteLabel")}
              approveNotePlaceholder={t("applicationDetails.decision.approve.notePlaceholder")}
              requestReasonLabel={t("applicationDetails.decision.requestChanges.reasonLabel")}
              requestReasonPlaceholder={t("applicationDetails.decision.requestChanges.reasonPlaceholder")}
              requestReasonRequired={t("applicationDetails.decision.requestChanges.reasonRequired")}
              requestReasonsHelper={t("applicationDetails.decision.requestChanges.reasonHelper")}
              addReasonLabel={t("applicationDetails.decision.addReason")}
              removeReasonLabel={t("applicationDetails.decision.removeReason")}
              requestNotePlaceholder={t("applicationDetails.decision.requestChanges.notePlaceholder")}
              rejectReasonLabel={t("applicationDetails.decision.reject.reasonLabel")}
              rejectReasonPlaceholder={t("applicationDetails.decision.reject.reasonPlaceholder")}
              rejectReasonRequired={t("applicationDetails.decision.reject.reasonRequired")}
              rejectReasonsHelper={t("applicationDetails.decision.reject.reasonHelper")}
              rejectNotePlaceholder={t("applicationDetails.decision.reject.notePlaceholder")}
              debugData={
                process.env.NODE_ENV !== "production"
                  ? {
                      applicationStatus: application.status,
                      canBeApproved: derivedDecision.canApprove,
                      canRequestChanges: readinessSnapshot.canRequestChanges,
                      blockersCount: completion.blockers.length,
                      blockerCodes: completion.blockers.map((item) => item.code),
                      credentialStatuses: credentials.map((credential) => ({
                        id: credential.credentialId,
                        type: credential.credentialType,
                        status: credential.reviewStatus,
                      })),
                      derivedDecisionGroups: {
                        missingFromPractitioner: derivedDecision.missingFromPractitioner.map((item) => item.label),
                        needsAdminReview: derivedDecision.needsAdminReview.map((item) => item.label),
                        rejectedOrNeedsCorrection: derivedDecision.rejectedOrNeedsCorrection.map((item) => item.label),
                        readyChecks: derivedDecision.readyChecks.map((item) => item.label),
                        internalInconsistencies: derivedDecision.internalInconsistencies.map((item) => item.label),
                      },
                    }
                  : null
              }
            />

            {requestChangesResult === "success" && application.status === "CHANGES_REQUESTED" ? (
              <p className="text-sm font-medium text-success-600 dark:text-success-400">
                {t("applicationDetails.decision.requestChanges.success")}
              </p>
            ) : null}
            {credentialActionMessage ? (
              <p className="text-xs font-medium text-success-600 dark:text-success-400">{credentialActionMessage}</p>
            ) : null}
            {credentialActionError ? (
              <p className="text-xs text-error-500">{credentialActionError}</p>
            ) : null}
            {approveResult === "error" ? (
              <p className="text-xs font-medium text-error-500">{approveErrorMessage ?? t("applicationDetails.decision.approve.error")}</p>
            ) : null}
            {requestChangesResult === "error" ? (
              <p className="text-xs text-error-500">{t("applicationDetails.decision.requestChanges.error")}</p>
            ) : null}
            {rejectResult === "error" ? (
              <p className="text-xs text-error-500">{t("applicationDetails.decision.reject.error")}</p>
            ) : null}
          </div>
          )
        ) : null}
      </AdminApplicationReviewWizard>
    </div>
  );
}
