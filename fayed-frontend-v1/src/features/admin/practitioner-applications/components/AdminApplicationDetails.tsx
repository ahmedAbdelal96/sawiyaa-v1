"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  useAdminPractitionerApplicationDetails,
  useApprovePractitionerApplication,
  useCreateAdminPractitionerApplicationCredential,
  useDeleteAdminPractitionerApplicationCredential,
  useRejectPractitionerApplication,
  useRequestPractitionerApplicationChanges,
  useUpdateAdminPractitionerApplicationCredential,
  useUpdatePractitionerApplicationDraft,
} from "../hooks/use-practitioner-applications";
import type { PractitionerApplicationDetailsResponse } from "../types/practitioner-applications.types";
import { Skeleton } from "@/components/shared/LoadingStates";
import { cn } from "@/lib/utils";
import { isAppError } from "@/lib/api/errors";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import MultiSelect from "@/components/form/MultiSelect";
import { useSpecialties, useSpecialtyCategories } from "@/features/specialties/hooks/use-specialties";
import { SUPPORTED_COUNTRY_CODE_OPTIONS } from "@/constants/reference-data";
import type {
  CredentialReviewStatus,
  CredentialType,
  PractitionerApplicationStatus,
  PractitionerGender,
  PractitionerPayoutMethodType,
  PractitionerType,
} from "@/features/practitioners/types/practitioners.types";

const statusColour: Record<PractitionerApplicationStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  SUBMITTED: "bg-primary-light text-text-brand dark:bg-primary/20 dark:text-primary-light",
  UNDER_REVIEW: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  APPROVED: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  CHANGES_REQUESTED: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  ARCHIVED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

const credStatusColour: Record<CredentialReviewStatus, string> = {
  PENDING: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  APPROVED: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  EXPIRED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const PRACTITIONER_TYPES: PractitionerType[] = [
  "PSYCHOLOGIST",
  "PSYCHIATRIST",
  "NUTRITIONIST",
  "WEIGHT_LOSS_SPECIALIST",
  "COUNSELOR",
  "OTHER",
];

const PAYOUT_METHODS: PractitionerPayoutMethodType[] = [
  "BANK_ACCOUNT",
  "IBAN",
  "WALLET",
  "OTHER",
];

const CREDENTIAL_TYPES: CredentialType[] = [
  "LICENSE",
  "DEGREE",
  "CERTIFICATION",
  "NATIONAL_ID",
  "PASSPORT",
  "MEMBERSHIP",
  "OTHER",
];

const CREDENTIAL_REVIEW_STATUSES: CredentialReviewStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
];

type EditableDraftForm = {
  displayName: string;
  practitionerType: PractitionerType;
  practitionerGender: PractitionerGender | "";
  professionalTitle: string;
  bio: string;
  yearsOfExperience: string;
  countryCode: string;
  languageCodes: string[];
  primarySpecialtyCategoryId: string;
  specialtyIds: string[];
  payoutMethodType: PractitionerPayoutMethodType | "";
  accountHolderName: string;
  bankName: string;
  bankAccountNumber: string;
  iban: string;
  walletProvider: string;
  walletIdentifier: string;
  otherDetails: string;
};

type EditableCredentialForm = {
  credentialType: CredentialType;
  fileUrl: string;
  reviewStatus: CredentialReviewStatus;
  reviewNotes: string;
  expiresAt: string;
};

type Props = { applicationId: string };
type ReviewTab = "overview" | "compare" | "credentials" | "decision";

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{heading}</h2>
      {children}
    </div>
  );
}

function ReviewTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-semibold transition",
        active
          ? "border-primary/30 bg-primary text-white shadow-[0_14px_28px_-20px_rgba(68,161,148,0.5)]"
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800",
      )}
    >
      {label}
    </button>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="w-full text-xs font-medium text-gray-400 dark:text-gray-500 sm:w-44 sm:shrink-0">
        {label}
      </dt>
      <dd className="text-sm text-gray-700 dark:text-gray-300">{value}</dd>
    </div>
  );
}

function getReadableValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "string" && value.trim().length === 0) {
    return "-";
  }
  return String(value);
}

function EditField({
  label,
  previousLabel,
  previousValue,
  children,
}: {
  label: string;
  previousLabel: string;
  previousValue: string | number | null | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium text-gray-600 dark:text-gray-300">{previousLabel}:</span>{" "}
        {getReadableValue(previousValue)}
      </p>
    </div>
  );
}

function formatSpecialtyList(
  specialties: Array<{ specialtyId: string; slug: string; title: string | null; isPrimary: boolean }>,
  primaryLabel: string,
) {
  if (specialties.length === 0) {
    return "-";
  }

  return specialties
    .map((item) => `${item.title ?? item.slug}${item.isPrimary ? ` (${primaryLabel})` : ""}`)
    .join(", ");
}

function normalizeForDiff(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function normalizeTextList(values: string[]) {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
    .join(" | ");
}

function formatMoneyValue(value: number | null | undefined, locale: string) {
  if (value === null || value === undefined) {
    return "-";
  }

  try {
    return new Intl.NumberFormat(locale.startsWith("ar") ? "ar-EG" : "en-GB", {
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return String(value);
  }
}

function PayoutValue({ value }: { value: string | null }) {
  return value || "-";
}

type DraftIssueMap = Partial<Record<keyof EditableDraftForm, string>>;

function normalizeYearsValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const years = Number(trimmed);
  if (!Number.isFinite(years)) {
    return null;
  }

  return years;
}

function createInitialDraftForm(details: PractitionerApplicationDetailsResponse["details"]): EditableDraftForm {
  return {
    displayName: details.applicant.displayName ?? "",
    practitionerType: details.profile.practitionerType,
    practitionerGender: details.profile.practitionerGender ?? "",
    professionalTitle: details.profile.professionalTitle ?? "",
    bio: details.profile.bio ?? "",
    yearsOfExperience:
      details.profile.yearsOfExperience != null ? String(details.profile.yearsOfExperience) : "",
    countryCode: details.applicant.countryCode ?? "",
    languageCodes: details.profile.languages ?? [],
    primarySpecialtyCategoryId: details.profile.primarySpecialtyCategoryId ?? "",
    specialtyIds: details.profile.specialties.map((item) => item.specialtyId),
    payoutMethodType: details.payoutDestination?.methodType ?? "",
    accountHolderName: details.payoutDestination?.accountHolderName ?? "",
    bankName: details.payoutDestination?.bankName ?? "",
    bankAccountNumber: details.payoutDestination?.bankAccountNumber ?? "",
    iban: details.payoutDestination?.iban ?? "",
    walletProvider: details.payoutDestination?.walletProvider ?? "",
    walletIdentifier: details.payoutDestination?.walletIdentifier ?? "",
    otherDetails: details.payoutDestination?.otherDetails ?? "",
  };
}

function createInitialCredentialForm(
  credential: PractitionerApplicationDetailsResponse["details"]["credentials"][number]
): EditableCredentialForm {
  return {
    credentialType: credential.credentialType,
    fileUrl: credential.fileUrl,
    reviewStatus: credential.reviewStatus,
    reviewNotes: credential.reviewNotes ?? "",
    expiresAt: credential.expiresAt ? credential.expiresAt.slice(0, 10) : "",
  };
}

export default function AdminApplicationDetails({ applicationId }: Props) {
  const t = useTranslations("admin-area");
  const locale = useLocale();
  const { data, isLoading, isError, refetch } = useAdminPractitionerApplicationDetails(applicationId);
  const [hasMounted, setHasMounted] = useState(false);
  const { mutate: approve, isPending: isApproving } = useApprovePractitionerApplication();
  const { mutate: reject, isPending: isRejecting } = useRejectPractitionerApplication();
  const { mutate: requestChanges, isPending: isRequestingChanges } =
    useRequestPractitionerApplicationChanges();
  const { mutate: updateDraft, isPending: isUpdatingDraft } =
    useUpdatePractitionerApplicationDraft();
  const {
    mutate: createCredential,
    isPending: isCreatingCredential,
  } = useCreateAdminPractitionerApplicationCredential();
  const {
    mutate: updateCredential,
    isPending: isUpdatingCredential,
  } = useUpdateAdminPractitionerApplicationCredential();
  const {
    mutate: deleteCredential,
    isPending: isDeletingCredential,
  } = useDeleteAdminPractitionerApplicationCredential();
  const specialtyCategoriesQuery = useSpecialtyCategories(true);
  const specialtiesQuery = useSpecialties(undefined, true);

  const [approveNote, setApproveNote] = useState("");
  const [approveResult, setApproveResult] = useState<"success" | "error" | null>(null);
  const [approveErrorMessage, setApproveErrorMessage] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState(false);
  const [rejectResult, setRejectResult] = useState<"success" | "error" | null>(null);

  const [requestChangesReason, setRequestChangesReason] = useState("");
  const [requestChangesNote, setRequestChangesNote] = useState("");
  const [requestChangesReasonError, setRequestChangesReasonError] = useState(false);
  const [requestChangesResult, setRequestChangesResult] = useState<
    "success" | "error" | null
  >(null);
  const [draftSavedResult, setDraftSavedResult] = useState<"success" | "error" | null>(null);
  const [form, setForm] = useState<EditableDraftForm | null>(null);
  const [editableCredentials, setEditableCredentials] = useState<
    Record<string, EditableCredentialForm>
  >({});
  const [credentialResultById, setCredentialResultById] = useState<
    Record<string, "success" | "error">
  >({});
  const [credentialDeleteResultById, setCredentialDeleteResultById] = useState<
    Record<string, "success" | "error">
  >({});
  const [newCredentialResult, setNewCredentialResult] = useState<
    "success" | "error" | null
  >(null);
  const [newCredentialForm, setNewCredentialForm] = useState<EditableCredentialForm>({
    credentialType: "OTHER",
    fileUrl: "",
    reviewStatus: "PENDING",
    reviewNotes: "",
    expiresAt: "",
  });
  const [reviewTab, setReviewTab] = useState<ReviewTab>("overview");
  const [showAllChanges, setShowAllChanges] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted || isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <Skeleton className="mb-4 h-4 w-32" />
            <div className="space-y-3">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
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

  const {
    applicant,
    profile,
    liveApplicant,
    liveProfile,
    credentials,
    payoutDestination,
    livePayoutDestination,
    application,
    readinessSnapshot,
  } = data.details;
  const effectiveForm = form ?? createInitialDraftForm(data.details);

  const categoryOptions = (specialtyCategoriesQuery.data?.categories ?? []).map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const specialtiesForSelectedCategory = (specialtiesQuery.data?.specialties ?? []).filter((item) =>
    effectiveForm.primarySpecialtyCategoryId
      ? item.category?.id === effectiveForm.primarySpecialtyCategoryId
      : false
  );
  const specialtyOptions = specialtiesForSelectedCategory.map((item) => ({
    value: item.id,
    text: item.name ?? item.slug,
    selected: effectiveForm.specialtyIds.includes(item.id),
  }));

  const languageOptions = [
    { value: "ar", text: "Arabic", selected: effectiveForm.languageCodes.includes("ar") },
    { value: "en", text: "English", selected: effectiveForm.languageCodes.includes("en") },
  ];
  const categoryLabelById = new Map(categoryOptions.map((item) => [item.value, item.label] as const));
  const previousValueLabel = t("applicationDetails.edit.previousValue");
  const selectedPayoutMethod = effectiveForm.payoutMethodType;
  const draftFieldIssues: DraftIssueMap = {};
  const requiredForApprovalLabel = t("applicationDetails.edit.requiredForApproval");
  const yearsMustBePositiveLabel = t("applicationDetails.edit.yearsMustBePositive");
  const specialtyRequiredLabel = t("applicationDetails.edit.specialtyRequired");
  const payoutMethodRequiredLabel = t("applicationDetails.edit.payoutMethodRequired");
  const payoutFieldRequiredLabel = t("applicationDetails.edit.payoutFieldRequired");

  if (!effectiveForm.displayName.trim()) {
    draftFieldIssues.displayName = requiredForApprovalLabel;
  }
  if (!effectiveForm.practitionerType) {
    draftFieldIssues.practitionerType = requiredForApprovalLabel;
  }
  if (!effectiveForm.professionalTitle.trim()) {
    draftFieldIssues.professionalTitle = requiredForApprovalLabel;
  }
  if (!effectiveForm.bio.trim()) {
    draftFieldIssues.bio = requiredForApprovalLabel;
  }

  const parsedYearsOfExperience = normalizeYearsValue(effectiveForm.yearsOfExperience);
  if (effectiveForm.yearsOfExperience.trim()) {
    if (parsedYearsOfExperience === null || parsedYearsOfExperience <= 0) {
      draftFieldIssues.yearsOfExperience = yearsMustBePositiveLabel;
    }
  } else {
    draftFieldIssues.yearsOfExperience = requiredForApprovalLabel;
  }

  if (!effectiveForm.countryCode.trim()) {
    draftFieldIssues.countryCode = requiredForApprovalLabel;
  }
  if (effectiveForm.languageCodes.length === 0) {
    draftFieldIssues.languageCodes = requiredForApprovalLabel;
  }
  if (!effectiveForm.primarySpecialtyCategoryId.trim()) {
    draftFieldIssues.primarySpecialtyCategoryId = requiredForApprovalLabel;
  }
  if (effectiveForm.specialtyIds.length === 0) {
    draftFieldIssues.specialtyIds = specialtyRequiredLabel;
  }
  if (!selectedPayoutMethod) {
    draftFieldIssues.payoutMethodType = payoutMethodRequiredLabel;
  } else {
    if (!effectiveForm.accountHolderName.trim()) {
      draftFieldIssues.accountHolderName = payoutFieldRequiredLabel;
    }
    if (selectedPayoutMethod === "BANK_ACCOUNT") {
      if (!effectiveForm.bankName.trim()) {
        draftFieldIssues.bankName = payoutFieldRequiredLabel;
      }
      if (!effectiveForm.bankAccountNumber.trim()) {
        draftFieldIssues.bankAccountNumber = payoutFieldRequiredLabel;
      }
    }
    if (selectedPayoutMethod === "IBAN" && !effectiveForm.iban.trim()) {
      draftFieldIssues.iban = payoutFieldRequiredLabel;
    }
    if (selectedPayoutMethod === "WALLET") {
      if (!effectiveForm.walletProvider.trim()) {
        draftFieldIssues.walletProvider = payoutFieldRequiredLabel;
      }
      if (!effectiveForm.walletIdentifier.trim()) {
        draftFieldIssues.walletIdentifier = payoutFieldRequiredLabel;
      }
    }
    if (selectedPayoutMethod === "OTHER" && !effectiveForm.otherDetails.trim()) {
      draftFieldIssues.otherDetails = payoutFieldRequiredLabel;
    }
  }
  const reviewTabs: Array<{ id: ReviewTab; label: string }> = [
    { id: "overview", label: t("applicationDetails.tabs.overview") },
    { id: "compare", label: t("applicationDetails.tabs.compare") },
    { id: "credentials", label: t("applicationDetails.tabs.credentials") },
    { id: "decision", label: t("applicationDetails.tabs.decision") },
  ];
  const changeItems = [
    {
      key: "displayName",
      label: t("applicationDetails.applicant.displayName"),
      current: getReadableValue(liveApplicant.displayName),
      requested: getReadableValue(applicant.displayName),
      comparableCurrent: normalizeForDiff(liveApplicant.displayName),
      comparableRequested: normalizeForDiff(applicant.displayName),
    },
    {
      key: "practitionerType",
      label: t("applicationDetails.profile.type"),
      current: liveProfile.practitionerType
        ? t(`practitionerType.${liveProfile.practitionerType as PractitionerType}`)
        : "-",
      requested: profile.practitionerType
        ? t(`practitionerType.${profile.practitionerType as PractitionerType}`)
        : "-",
      comparableCurrent: normalizeForDiff(liveProfile.practitionerType),
      comparableRequested: normalizeForDiff(profile.practitionerType),
    },
    {
      key: "practitionerGender",
      label: t("applicationDetails.profile.gender"),
      current: liveProfile.practitionerGender
        ? t(`applicationDetails.profile.genderOptions.${liveProfile.practitionerGender}`)
        : "-",
      requested: profile.practitionerGender
        ? t(`applicationDetails.profile.genderOptions.${profile.practitionerGender}`)
        : "-",
      comparableCurrent: normalizeForDiff(liveProfile.practitionerGender),
      comparableRequested: normalizeForDiff(profile.practitionerGender),
    },
    {
      key: "professionalTitle",
      label: t("applicationDetails.profile.title"),
      current: getReadableValue(liveProfile.professionalTitle),
      requested: getReadableValue(profile.professionalTitle),
      comparableCurrent: normalizeForDiff(liveProfile.professionalTitle),
      comparableRequested: normalizeForDiff(profile.professionalTitle),
    },
    {
      key: "bio",
      label: t("applicationDetails.profile.bio"),
      current: getReadableValue(liveProfile.bio),
      requested: getReadableValue(profile.bio),
      comparableCurrent: normalizeForDiff(liveProfile.bio),
      comparableRequested: normalizeForDiff(profile.bio),
    },
    {
      key: "yearsOfExperience",
      label: t("applicationDetails.profile.years"),
      current:
        liveProfile.yearsOfExperience != null ? String(liveProfile.yearsOfExperience) : "-",
      requested: profile.yearsOfExperience != null ? String(profile.yearsOfExperience) : "-",
      comparableCurrent: normalizeForDiff(liveProfile.yearsOfExperience),
      comparableRequested: normalizeForDiff(profile.yearsOfExperience),
    },
    {
      key: "sessionPrice30Egp",
      label: t("applicationDetails.profile.sessionPrice30Egp"),
      current: formatMoneyValue(liveProfile.pricing.session30.egp, locale),
      requested: formatMoneyValue(profile.pricing.session30.egp, locale),
      comparableCurrent: normalizeForDiff(liveProfile.pricing.session30.egp),
      comparableRequested: normalizeForDiff(profile.pricing.session30.egp),
    },
    {
      key: "sessionPrice30Usd",
      label: t("applicationDetails.profile.sessionPrice30Usd"),
      current: formatMoneyValue(liveProfile.pricing.session30.usd, locale),
      requested: formatMoneyValue(profile.pricing.session30.usd, locale),
      comparableCurrent: normalizeForDiff(liveProfile.pricing.session30.usd),
      comparableRequested: normalizeForDiff(profile.pricing.session30.usd),
    },
    {
      key: "sessionPrice60Egp",
      label: t("applicationDetails.profile.sessionPrice60Egp"),
      current: formatMoneyValue(liveProfile.pricing.session60.egp, locale),
      requested: formatMoneyValue(profile.pricing.session60.egp, locale),
      comparableCurrent: normalizeForDiff(liveProfile.pricing.session60.egp),
      comparableRequested: normalizeForDiff(profile.pricing.session60.egp),
    },
    {
      key: "sessionPrice60Usd",
      label: t("applicationDetails.profile.sessionPrice60Usd"),
      current: formatMoneyValue(liveProfile.pricing.session60.usd, locale),
      requested: formatMoneyValue(profile.pricing.session60.usd, locale),
      comparableCurrent: normalizeForDiff(liveProfile.pricing.session60.usd),
      comparableRequested: normalizeForDiff(profile.pricing.session60.usd),
    },
    {
      key: "countryCode",
      label: t("applicationDetails.applicant.country"),
      current: getReadableValue(liveApplicant.countryCode),
      requested: getReadableValue(applicant.countryCode),
      comparableCurrent: normalizeForDiff(liveApplicant.countryCode),
      comparableRequested: normalizeForDiff(applicant.countryCode),
    },
    {
      key: "languages",
      label: t("applicationDetails.profile.languages"),
      current: liveProfile.languages.length > 0 ? liveProfile.languages.join(", ") : "-",
      requested: profile.languages.length > 0 ? profile.languages.join(", ") : "-",
      comparableCurrent: normalizeTextList(liveProfile.languages),
      comparableRequested: normalizeTextList(profile.languages),
    },
    {
      key: "primarySpecialtyCategoryId",
      label: t("applicationDetails.profile.primarySpecialtyCategory"),
      current: liveProfile.primarySpecialtyCategoryId
        ? categoryLabelById.get(liveProfile.primarySpecialtyCategoryId) ??
          liveProfile.primarySpecialtyCategoryId
        : "-",
      requested: profile.primarySpecialtyCategoryId
        ? categoryLabelById.get(profile.primarySpecialtyCategoryId) ??
          profile.primarySpecialtyCategoryId
        : "-",
      comparableCurrent: normalizeForDiff(liveProfile.primarySpecialtyCategoryId),
      comparableRequested: normalizeForDiff(profile.primarySpecialtyCategoryId),
    },
    {
      key: "specialties",
      label: t("applicationDetails.profile.subSpecialties"),
      current: formatSpecialtyList(liveProfile.specialties, t("applicationDetails.profile.primary")),
      requested: formatSpecialtyList(profile.specialties, t("applicationDetails.profile.primary")),
      comparableCurrent: normalizeTextList(
        liveProfile.specialties
          .map((item) => `${item.specialtyId}:${item.isPrimary ? "1" : "0"}`)
          .sort()
      ),
      comparableRequested: normalizeTextList(
        profile.specialties
          .map((item) => `${item.specialtyId}:${item.isPrimary ? "1" : "0"}`)
          .sort()
      ),
    },
    {
      key: "payoutMethodType",
      label: t("applicationDetails.payout.method"),
      current: livePayoutDestination?.methodType
        ? t(
            `applicationDetails.payout.methodOptions.${livePayoutDestination.methodType as PractitionerPayoutMethodType}`
          )
        : "-",
      requested: payoutDestination?.methodType
        ? t(
            `applicationDetails.payout.methodOptions.${payoutDestination.methodType as PractitionerPayoutMethodType}`
          )
        : "-",
      comparableCurrent: normalizeForDiff(livePayoutDestination?.methodType),
      comparableRequested: normalizeForDiff(payoutDestination?.methodType),
    },
    {
      key: "accountHolderName",
      label: t("applicationDetails.payout.accountHolderName"),
      current: getReadableValue(livePayoutDestination?.accountHolderName),
      requested: getReadableValue(payoutDestination?.accountHolderName),
      comparableCurrent: normalizeForDiff(livePayoutDestination?.accountHolderName),
      comparableRequested: normalizeForDiff(payoutDestination?.accountHolderName),
    },
    {
      key: "bankName",
      label: t("applicationDetails.payout.bankName"),
      current: getReadableValue(livePayoutDestination?.bankName),
      requested: getReadableValue(payoutDestination?.bankName),
      comparableCurrent: normalizeForDiff(livePayoutDestination?.bankName),
      comparableRequested: normalizeForDiff(payoutDestination?.bankName),
    },
    {
      key: "bankAccountNumber",
      label: t("applicationDetails.payout.bankAccountNumber"),
      current: getReadableValue(livePayoutDestination?.bankAccountNumber),
      requested: getReadableValue(payoutDestination?.bankAccountNumber),
      comparableCurrent: normalizeForDiff(livePayoutDestination?.bankAccountNumber),
      comparableRequested: normalizeForDiff(payoutDestination?.bankAccountNumber),
    },
    {
      key: "iban",
      label: "IBAN",
      current: getReadableValue(livePayoutDestination?.iban),
      requested: getReadableValue(payoutDestination?.iban),
      comparableCurrent: normalizeForDiff(livePayoutDestination?.iban),
      comparableRequested: normalizeForDiff(payoutDestination?.iban),
    },
    {
      key: "walletProvider",
      label: t("applicationDetails.payout.walletProvider"),
      current: getReadableValue(livePayoutDestination?.walletProvider),
      requested: getReadableValue(payoutDestination?.walletProvider),
      comparableCurrent: normalizeForDiff(livePayoutDestination?.walletProvider),
      comparableRequested: normalizeForDiff(payoutDestination?.walletProvider),
    },
    {
      key: "walletIdentifier",
      label: t("applicationDetails.payout.walletIdentifier"),
      current: getReadableValue(livePayoutDestination?.walletIdentifier),
      requested: getReadableValue(payoutDestination?.walletIdentifier),
      comparableCurrent: normalizeForDiff(livePayoutDestination?.walletIdentifier),
      comparableRequested: normalizeForDiff(payoutDestination?.walletIdentifier),
    },
  {
      key: "otherDetails",
      label: t("applicationDetails.payout.otherDetails"),
      current: getReadableValue(livePayoutDestination?.otherDetails),
      requested: getReadableValue(payoutDestination?.otherDetails),
      comparableCurrent: normalizeForDiff(livePayoutDestination?.otherDetails),
      comparableRequested: normalizeForDiff(payoutDestination?.otherDetails),
    },
  ].filter((item) => item.comparableCurrent !== item.comparableRequested);
  const priceChangeItems = changeItems.filter((item) => item.key.startsWith("sessionPrice"));
  const nonPriceChangeItems = changeItems.filter((item) => !item.key.startsWith("sessionPrice"));
  const visibleChangeItems = showAllChanges
    ? changeItems
    : [
        ...priceChangeItems,
        ...nonPriceChangeItems.slice(0, Math.max(4 - priceChangeItems.length, 0)),
      ];
  const hiddenChangeCount = Math.max(changeItems.length - visibleChangeItems.length, 0);
  const hasChangeSummary = changeItems.length > 0;
  const approvalBlockers = [
    draftFieldIssues.displayName && t("applicationDetails.applicant.displayName"),
    draftFieldIssues.practitionerType && t("applicationDetails.profile.type"),
    draftFieldIssues.professionalTitle && t("applicationDetails.profile.title"),
    draftFieldIssues.bio && t("applicationDetails.profile.bio"),
    draftFieldIssues.yearsOfExperience && t("applicationDetails.profile.years"),
    draftFieldIssues.countryCode && t("applicationDetails.applicant.country"),
    draftFieldIssues.languageCodes && t("applicationDetails.profile.languages"),
    draftFieldIssues.primarySpecialtyCategoryId &&
      t("applicationDetails.profile.primarySpecialtyCategory"),
    draftFieldIssues.specialtyIds && t("applicationDetails.profile.subSpecialties"),
    draftFieldIssues.payoutMethodType && t("applicationDetails.payout.method"),
    draftFieldIssues.accountHolderName && t("applicationDetails.payout.accountHolderName"),
    draftFieldIssues.bankName && t("applicationDetails.payout.bankName"),
    draftFieldIssues.bankAccountNumber && t("applicationDetails.payout.bankAccountNumber"),
    draftFieldIssues.iban && "IBAN",
    draftFieldIssues.walletProvider && t("applicationDetails.payout.walletProvider"),
    draftFieldIssues.walletIdentifier && t("applicationDetails.payout.walletIdentifier"),
    draftFieldIssues.otherDetails && t("applicationDetails.payout.otherDetails"),
  ].filter(Boolean) as string[];

  const updateForm = (patch: Partial<EditableDraftForm>) => {
    setDraftSavedResult(null);
    setForm((prev) => ({
      ...(prev ?? effectiveForm),
      ...patch,
    }));
  };

  const getEditableCredential = (
    credential: PractitionerApplicationDetailsResponse["details"]["credentials"][number]
  ): EditableCredentialForm =>
    editableCredentials[credential.credentialId] ??
    createInitialCredentialForm(credential);

  const updateCredentialForm = (
    credentialId: string,
    patch: Partial<EditableCredentialForm>,
    base?: EditableCredentialForm
  ) => {
    setCredentialResultById((prev) => {
      if (!(credentialId in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[credentialId];
      return next;
    });
    setCredentialDeleteResultById((prev) => {
      if (!(credentialId in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[credentialId];
      return next;
    });
    setEditableCredentials((prev) => ({
      ...prev,
      [credentialId]: {
        ...(base ?? prev[credentialId]),
        ...patch,
      },
    }));
  };

  const handleSaveCredential = (
    credential: PractitionerApplicationDetailsResponse["details"]["credentials"][number]
  ) => {
    const current = getEditableCredential(credential);
    if (!current.fileUrl.trim()) {
      setCredentialResultById((prev) => ({
        ...prev,
        [credential.credentialId]: "error",
      }));
      return;
    }

    updateCredential(
      {
        id: applicationId,
        credentialId: credential.credentialId,
        data: {
          credentialType: current.credentialType,
          fileUrl: current.fileUrl.trim(),
          reviewStatus: current.reviewStatus,
          reviewNotes: current.reviewNotes.trim() || null,
          expiresAt: current.expiresAt.trim() || null,
        },
      },
      {
        onSuccess: async () => {
          setCredentialResultById((prev) => ({
            ...prev,
            [credential.credentialId]: "success",
          }));
          await refetch();
        },
        onError: () => {
          setCredentialResultById((prev) => ({
            ...prev,
            [credential.credentialId]: "error",
          }));
        },
      }
    );
  };

  const handleCreateCredential = () => {
    if (!newCredentialForm.fileUrl.trim()) {
      setNewCredentialResult("error");
      return;
    }

    createCredential(
      {
        id: applicationId,
        data: {
          credentialType: newCredentialForm.credentialType,
          fileUrl: newCredentialForm.fileUrl.trim(),
          reviewStatus: newCredentialForm.reviewStatus,
          reviewNotes: newCredentialForm.reviewNotes.trim() || null,
          expiresAt: newCredentialForm.expiresAt.trim() || null,
        },
      },
      {
        onSuccess: async () => {
          setNewCredentialResult("success");
          setNewCredentialForm({
            credentialType: "OTHER",
            fileUrl: "",
            reviewStatus: "PENDING",
            reviewNotes: "",
            expiresAt: "",
          });
          await refetch();
        },
        onError: () => {
          setNewCredentialResult("error");
        },
      }
    );
  };

  const handleDeleteCredential = (
    credential: PractitionerApplicationDetailsResponse["details"]["credentials"][number]
  ) => {
    const confirmed = window.confirm(
      t("applicationDetails.credentials.deleteConfirm")
    );
    if (!confirmed) {
      return;
    }

    deleteCredential(
      {
        id: applicationId,
        credentialId: credential.credentialId,
      },
      {
        onSuccess: async () => {
          setCredentialDeleteResultById((prev) => ({
            ...prev,
            [credential.credentialId]: "success",
          }));
          setEditableCredentials((prev) => {
            const next = { ...prev };
            delete next[credential.credentialId];
            return next;
          });
          await refetch();
        },
        onError: () => {
          setCredentialDeleteResultById((prev) => ({
            ...prev,
            [credential.credentialId]: "error",
          }));
        },
      }
    );
  };

  const handleSaveDraft = () => {
    const trimmedDisplayName = effectiveForm.displayName.trim();
    const trimmedCategoryId = effectiveForm.primarySpecialtyCategoryId.trim();
    const specialtyIds = Array.from(new Set(effectiveForm.specialtyIds.filter(Boolean)));
    const languageCodes = Array.from(
      new Set(effectiveForm.languageCodes.map((code) => code.trim().toLowerCase()).filter(Boolean))
    );
    const yearsOfExperience = normalizeYearsValue(effectiveForm.yearsOfExperience);

    if (
      effectiveForm.yearsOfExperience.trim().length > 0 &&
      (yearsOfExperience === null || yearsOfExperience < 0)
    ) {
      setDraftSavedResult("error");
      return;
    }

    const specialtySelection =
      trimmedCategoryId && specialtyIds.length > 0
        ? {
            primarySpecialtyCategoryId: trimmedCategoryId,
            specialtyIds,
          }
        : undefined;

    const payoutDestination =
      selectedPayoutMethod &&
      !draftFieldIssues.payoutMethodType &&
      !draftFieldIssues.accountHolderName &&
      !draftFieldIssues.bankName &&
      !draftFieldIssues.bankAccountNumber &&
      !draftFieldIssues.iban &&
      !draftFieldIssues.walletProvider &&
      !draftFieldIssues.walletIdentifier &&
      !draftFieldIssues.otherDetails
        ? {
            methodType: selectedPayoutMethod,
            accountHolderName: effectiveForm.accountHolderName.trim() || undefined,
            bankName: effectiveForm.bankName.trim() || undefined,
            bankAccountNumber: effectiveForm.bankAccountNumber.trim() || undefined,
            iban: effectiveForm.iban.trim() || undefined,
            walletProvider: effectiveForm.walletProvider.trim() || undefined,
            walletIdentifier: effectiveForm.walletIdentifier.trim() || undefined,
            otherDetails: effectiveForm.otherDetails.trim() || undefined,
          }
        : undefined;

    updateDraft(
      {
        id: applicationId,
        data: {
          displayName: trimmedDisplayName,
          practitionerType: effectiveForm.practitionerType,
          practitionerGender: effectiveForm.practitionerGender || null,
          professionalTitle: effectiveForm.professionalTitle.trim() || null,
          bio: effectiveForm.bio.trim() || null,
          yearsOfExperience,
          countryCode: effectiveForm.countryCode.trim() || null,
          languageCodes,
          specialtySelection,
          payoutDestination,
        },
      },
      {
        onSuccess: async () => {
          setDraftSavedResult("success");
          setForm(null);
          await refetch();
        },
        onError: () => {
          setDraftSavedResult("error");
        },
      }
    );
  };

  const handleApprove = () => {
    setApproveResult(null);
    setApproveErrorMessage(null);
    approve(
      { id: applicationId, data: { note: approveNote || undefined } },
      {
        onSuccess: () => setApproveResult("success"),
        onError: (error) => {
          setApproveResult("error");

          if (!isAppError(error)) {
            return;
          }

          const missingRequirements = Array.isArray(error.details?.missingRequirements)
            ? error.details?.missingRequirements
                .filter((item): item is string => typeof item === "string")
                .join(", ")
            : null;

          setApproveErrorMessage(
            missingRequirements
              ? `${t("applicationDetails.decision.approve.error")}: ${missingRequirements}`
              : t("applicationDetails.decision.approve.error")
          );
        },
      }
    );
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      setRejectReasonError(true);
      return;
    }
    setRejectReasonError(false);
    setRejectResult(null);
    reject(
      { id: applicationId, data: { reason: rejectReason.trim(), note: rejectNote || undefined } },
      {
        onSuccess: () => setRejectResult("success"),
        onError: () => setRejectResult("error"),
      }
    );
  };

  const handleRequestChanges = () => {
    if (!requestChangesReason.trim()) {
      setRequestChangesReasonError(true);
      return;
    }
    setRequestChangesReasonError(false);
    setRequestChangesResult(null);
    requestChanges(
      {
        id: applicationId,
        data: {
          reason: requestChangesReason.trim(),
          note: requestChangesNote || undefined,
        },
      },
      {
        onSuccess: () => setRequestChangesResult("success"),
        onError: () => setRequestChangesResult("error"),
      }
    );
  };

  const statusBadge = (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusColour[application.status]}`}
    >
      {t(`status.${application.status}`)}
    </span>
  );

  const readinessBadge = (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
      {t("applicationDetails.readiness.canBeReviewed")}:{" "}
      {readinessSnapshot.canBeReviewed
        ? t("applicationDetails.readiness.yes")
        : t("applicationDetails.readiness.no")}
    </span>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              {t("applicationDetails.review.title")}
            </p>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {liveApplicant.displayName ?? t("applicationDetails.review.fallbackTitle")}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                {t("applicationDetails.review.subtitle")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {statusBadge}
            {readinessBadge}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {reviewTabs.map((tab) => (
            <ReviewTabButton
              key={tab.id}
              active={reviewTab === tab.id}
              label={tab.label}
              onClick={() => setReviewTab(tab.id)}
            />
          ))}
        </div>
      </div>

      {reviewTab === "compare" ? (
        <Section heading={t("applicationDetails.sections.profileEdit")}>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {t("applicationDetails.edit.comparisonHint")}
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <EditField
              label={t("applicationDetails.applicant.displayName")}
              previousLabel={previousValueLabel}
              previousValue={liveApplicant.displayName}
            >
              <InputField
                type="text"
                value={effectiveForm.displayName}
                onChange={(e) => updateForm({ displayName: e.target.value })}
                error={Boolean(draftFieldIssues.displayName)}
                hint={draftFieldIssues.displayName}
              />
            </EditField>

            <EditField
              label={t("applicationDetails.profile.type")}
              previousLabel={previousValueLabel}
              previousValue={
                liveProfile.practitionerType
                  ? t(`practitionerType.${liveProfile.practitionerType as PractitionerType}`)
                  : "-"
              }
            >
              <Select
                key={`edit-practitioner-type-${effectiveForm.practitionerType}`}
                options={PRACTITIONER_TYPES.map((type) => ({
                  value: type,
                  label: t(`practitionerType.${type}`),
                }))}
                defaultValue={effectiveForm.practitionerType}
                onChange={(value) =>
                  updateForm({ practitionerType: value as PractitionerType })
                }
                error={Boolean(draftFieldIssues.practitionerType)}
                hint={draftFieldIssues.practitionerType}
              />
            </EditField>

            <EditField
              label={t("applicationDetails.profile.gender")}
              previousLabel={previousValueLabel}
              previousValue={
                liveProfile.practitionerGender
                  ? t(`applicationDetails.profile.genderOptions.${liveProfile.practitionerGender}`)
                  : "-"
              }
            >
              <Select
                key={`edit-practitioner-gender-${effectiveForm.practitionerGender || "none"}`}
                options={[
                  {
                    value: "MALE",
                    label: t("applicationDetails.profile.genderOptions.MALE"),
                  },
                  {
                    value: "FEMALE",
                    label: t("applicationDetails.profile.genderOptions.FEMALE"),
                  },
                ]}
                defaultValue={effectiveForm.practitionerGender}
                onChange={(value) =>
                  updateForm({ practitionerGender: value as PractitionerGender })
                }
              />
            </EditField>

            <EditField
              label={t("applicationDetails.profile.title")}
              previousLabel={previousValueLabel}
              previousValue={liveProfile.professionalTitle}
            >
              <InputField
                type="text"
                value={effectiveForm.professionalTitle}
                onChange={(e) => updateForm({ professionalTitle: e.target.value })}
                error={Boolean(draftFieldIssues.professionalTitle)}
                hint={draftFieldIssues.professionalTitle}
              />
            </EditField>

            <EditField
              label={t("applicationDetails.profile.years")}
              previousLabel={previousValueLabel}
              previousValue={
                liveProfile.yearsOfExperience != null ? String(liveProfile.yearsOfExperience) : "-"
              }
            >
              <InputField
                type="number"
                min={0}
                value={effectiveForm.yearsOfExperience}
                onChange={(e) => updateForm({ yearsOfExperience: e.target.value })}
                error={Boolean(draftFieldIssues.yearsOfExperience)}
                hint={draftFieldIssues.yearsOfExperience}
              />
            </EditField>

            <EditField
              label={t("applicationDetails.applicant.country")}
              previousLabel={previousValueLabel}
              previousValue={liveApplicant.countryCode}
            >
              <Select
                key={`edit-country-${SUPPORTED_COUNTRY_CODE_OPTIONS.length}-${effectiveForm.countryCode}`}
                options={SUPPORTED_COUNTRY_CODE_OPTIONS}
                defaultValue={effectiveForm.countryCode}
                onChange={(value) => updateForm({ countryCode: value })}
                error={Boolean(draftFieldIssues.countryCode)}
                hint={draftFieldIssues.countryCode}
              />
            </EditField>

            <EditField
              label={t("applicationDetails.profile.languages")}
              previousLabel={previousValueLabel}
              previousValue={liveProfile.languages.length > 0 ? liveProfile.languages.join(", ") : "-"}
            >
              <MultiSelect
                key={`edit-languages-${effectiveForm.languageCodes.join("-")}`}
                label=""
                options={languageOptions}
                defaultSelected={effectiveForm.languageCodes}
                onChange={(selected) => updateForm({ languageCodes: selected })}
                error={Boolean(draftFieldIssues.languageCodes)}
                hint={draftFieldIssues.languageCodes}
              />
            </EditField>

            <EditField
              label={t("applicationDetails.profile.bio")}
              previousLabel={previousValueLabel}
              previousValue={liveProfile.bio}
            >
              <TextArea
                rows={4}
                value={effectiveForm.bio}
                onChange={(value) => updateForm({ bio: value })}
                error={Boolean(draftFieldIssues.bio)}
                hint={draftFieldIssues.bio}
              />
            </EditField>
          </div>

          <div className="space-y-3">
            <EditField
              label={t("applicationDetails.profile.primarySpecialtyCategory")}
              previousLabel={previousValueLabel}
              previousValue={
                liveProfile.primarySpecialtyCategoryId
                  ? categoryLabelById.get(liveProfile.primarySpecialtyCategoryId) ??
                    liveProfile.primarySpecialtyCategoryId
                  : "-"
              }
            >
              <Select
                key={`edit-category-${effectiveForm.primarySpecialtyCategoryId || "none"}`}
                options={categoryOptions}
                defaultValue={effectiveForm.primarySpecialtyCategoryId}
                onChange={(value) =>
                  updateForm({
                    primarySpecialtyCategoryId: value,
                    specialtyIds: [],
                  })
                }
                error={Boolean(draftFieldIssues.primarySpecialtyCategoryId)}
                hint={draftFieldIssues.primarySpecialtyCategoryId}
              />
            </EditField>

            <EditField
              label={t("applicationDetails.profile.subSpecialties")}
              previousLabel={previousValueLabel}
              previousValue={formatSpecialtyList(
                liveProfile.specialties,
                t("applicationDetails.profile.primary"),
              )}
            >
              <MultiSelect
                key={`edit-specialties-${effectiveForm.primarySpecialtyCategoryId || "none"}`}
                label=""
                options={specialtyOptions}
                defaultSelected={effectiveForm.specialtyIds}
                disabled={
                  !effectiveForm.primarySpecialtyCategoryId ||
                  specialtyOptions.length === 0
                }
                onChange={(selected) => updateForm({ specialtyIds: selected })}
                error={Boolean(draftFieldIssues.specialtyIds)}
                hint={draftFieldIssues.specialtyIds}
              />
            </EditField>

            <EditField
              label={t("applicationDetails.payout.method")}
              previousLabel={previousValueLabel}
              previousValue={
                livePayoutDestination?.methodType
                  ? t(
                      `applicationDetails.payout.methodOptions.${livePayoutDestination.methodType as PractitionerPayoutMethodType}`
                    )
                  : "-"
              }
            >
              <Select
                key={`edit-payout-${selectedPayoutMethod || "none"}`}
                options={PAYOUT_METHODS.map((method) => ({
                  value: method,
                  label: t(`applicationDetails.payout.methodOptions.${method}`),
                }))}
                defaultValue={selectedPayoutMethod}
                onChange={(value) =>
                  updateForm({
                    payoutMethodType: value as PractitionerPayoutMethodType,
                  })
                }
                error={Boolean(draftFieldIssues.payoutMethodType)}
                hint={draftFieldIssues.payoutMethodType}
              />
            </EditField>

            {selectedPayoutMethod ? (
              <div className="grid gap-3 rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                <EditField
                  label={t("applicationDetails.payout.accountHolderName")}
                  previousLabel={previousValueLabel}
                  previousValue={livePayoutDestination?.accountHolderName}
                >
                  <InputField
                    type="text"
                    value={effectiveForm.accountHolderName}
                    onChange={(e) =>
                      updateForm({ accountHolderName: e.target.value })
                    }
                    error={Boolean(draftFieldIssues.accountHolderName)}
                    hint={draftFieldIssues.accountHolderName}
                  />
                </EditField>
                {selectedPayoutMethod === "BANK_ACCOUNT" ? (
                  <>
                    <EditField
                      label={t("applicationDetails.payout.bankName")}
                      previousLabel={previousValueLabel}
                      previousValue={livePayoutDestination?.bankName}
                    >
                      <InputField
                        type="text"
                        value={effectiveForm.bankName}
                        onChange={(e) => updateForm({ bankName: e.target.value })}
                        error={Boolean(draftFieldIssues.bankName)}
                        hint={draftFieldIssues.bankName}
                      />
                    </EditField>
                    <EditField
                      label={t("applicationDetails.payout.bankAccountNumber")}
                      previousLabel={previousValueLabel}
                      previousValue={livePayoutDestination?.bankAccountNumber}
                    >
                      <InputField
                        type="text"
                        value={effectiveForm.bankAccountNumber}
                        onChange={(e) =>
                          updateForm({ bankAccountNumber: e.target.value })
                        }
                        error={Boolean(draftFieldIssues.bankAccountNumber)}
                        hint={draftFieldIssues.bankAccountNumber}
                      />
                    </EditField>
                  </>
                ) : null}
                {selectedPayoutMethod === "IBAN" ? (
                  <EditField
                    label="IBAN"
                    previousLabel={previousValueLabel}
                    previousValue={livePayoutDestination?.iban}
                  >
                    <InputField
                      type="text"
                      value={effectiveForm.iban}
                      onChange={(e) => updateForm({ iban: e.target.value })}
                      error={Boolean(draftFieldIssues.iban)}
                      hint={draftFieldIssues.iban}
                    />
                  </EditField>
                ) : null}
                {selectedPayoutMethod === "WALLET" ? (
                  <>
                    <EditField
                      label={t("applicationDetails.payout.walletProvider")}
                      previousLabel={previousValueLabel}
                      previousValue={livePayoutDestination?.walletProvider}
                    >
                      <InputField
                        type="text"
                        value={effectiveForm.walletProvider}
                        onChange={(e) =>
                          updateForm({ walletProvider: e.target.value })
                        }
                        error={Boolean(draftFieldIssues.walletProvider)}
                        hint={draftFieldIssues.walletProvider}
                      />
                    </EditField>
                    <EditField
                      label={t("applicationDetails.payout.walletIdentifier")}
                      previousLabel={previousValueLabel}
                      previousValue={livePayoutDestination?.walletIdentifier}
                    >
                      <InputField
                        type="text"
                        value={effectiveForm.walletIdentifier}
                        onChange={(e) =>
                          updateForm({ walletIdentifier: e.target.value })
                        }
                        error={Boolean(draftFieldIssues.walletIdentifier)}
                        hint={draftFieldIssues.walletIdentifier}
                      />
                    </EditField>
                  </>
                ) : null}
                {selectedPayoutMethod === "OTHER" ? (
                  <EditField
                    label={t("applicationDetails.payout.otherDetails")}
                    previousLabel={previousValueLabel}
                    previousValue={livePayoutDestination?.otherDetails}
                  >
                    <TextArea
                      rows={3}
                      value={effectiveForm.otherDetails}
                      onChange={(value) => updateForm({ otherDetails: value })}
                      error={Boolean(draftFieldIssues.otherDetails)}
                      hint={draftFieldIssues.otherDetails}
                    />
                  </EditField>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {t("applicationDetails.edit.save.note")}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isUpdatingDraft}
            className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUpdatingDraft
              ? t("applicationDetails.edit.save.submitting")
              : t("applicationDetails.edit.save.submit")}
          </button>
          {draftSavedResult === "success" ? (
            <span className="text-sm font-medium text-success-600 dark:text-success-400">
              {t("applicationDetails.edit.save.success")}
            </span>
          ) : null}
          {draftSavedResult === "error" ? (
            <span className="text-sm font-medium text-error-500">
              {t("applicationDetails.edit.save.error")}
            </span>
          ) : null}
        </div>
        </Section>
      ) : null}

      {reviewTab === "overview" ? (
        <>
          <Section heading={t("applicationDetails.review.changesHeading")}>
            {hasChangeSummary ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("applicationDetails.review.changesIntro")}
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  {visibleChangeItems.map((item) => (
                    <div
                      key={item.key}
                      className="flex h-full flex-col rounded-xl border border-orange-100 bg-orange-50/30 px-3 py-3 dark:border-orange-900/40 dark:bg-orange-900/10"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">
                          {item.label}
                        </p>
                        <button
                          type="button"
                          onClick={() => setReviewTab("compare")}
                          className="inline-flex items-center rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-medium text-orange-700 transition hover:bg-orange-100 dark:border-orange-900/40 dark:bg-gray-900 dark:text-orange-300 dark:hover:bg-orange-900/20"
                        >
                          {t("applicationDetails.review.openComparison")}
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <span className="inline-flex max-w-full items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                          <span className="ml-2 text-xs font-medium text-gray-400">
                            {t("applicationDetails.review.liveValue")}:
                          </span>
                          <span className="truncate">{item.current}</span>
                        </span>
                        <span className="text-orange-500">→</span>
                        <span className="inline-flex max-w-full items-center rounded-full border border-orange-200 bg-white px-3 py-1 text-gray-800 dark:border-orange-900/40 dark:bg-gray-900 dark:text-white">
                          <span className="ml-2 text-xs font-medium text-orange-500">
                            {t("applicationDetails.review.requestedValue")}:
                          </span>
                          <span className="truncate">{item.requested}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {hiddenChangeCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllChanges((prev) => !prev)}
                    className="inline-flex items-center rounded-full border border-orange-200 bg-white px-4 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 dark:border-orange-900/40 dark:bg-gray-900 dark:text-orange-300 dark:hover:bg-orange-900/20"
                  >
                    {showAllChanges
                      ? t("applicationDetails.review.showFewerChanges")
                      : t("applicationDetails.review.showMoreChanges", { count: hiddenChangeCount })}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("applicationDetails.review.noChanges")}
              </p>
            )}
          </Section>

          <Section heading={t("applicationDetails.sections.applicant")}>
        <dl className="space-y-3">
          <Field label={t("applicationDetails.applicant.displayName")} value={liveApplicant.displayName ?? "-"} />
          <Field label={t("applicationDetails.applicant.email")} value={liveApplicant.email.address ?? "-"} />
          <Field label={t("applicationDetails.applicant.phone")} value={liveApplicant.phone.number ?? "-"} />
          <Field label={t("applicationDetails.applicant.country")} value={liveApplicant.countryCode ?? "-"} />
          <Field label={t("applicationDetails.applicant.accountStatus")} value={liveApplicant.accountStatus} />
          </dl>
        </Section>

          <Section heading={t("applicationDetails.sections.profile")}>
        <dl className="space-y-3">
          <Field label={t("applicationDetails.profile.type")} value={t(`practitionerType.${liveProfile.practitionerType as PractitionerType}`)} />
          <Field label={t("applicationDetails.profile.profileStatus")} value={liveProfile.profileStatus} />
          <Field label={t("applicationDetails.profile.title")} value={liveProfile.professionalTitle ?? "-"} />
          <Field label={t("applicationDetails.profile.bio")} value={liveProfile.bio ?? "-"} />
          <Field label={t("applicationDetails.profile.years")} value={liveProfile.yearsOfExperience != null ? String(liveProfile.yearsOfExperience) : "-"} />
          <Field label={t("applicationDetails.profile.languages")} value={liveProfile.languages.length > 0 ? liveProfile.languages.join(", ") : "-"} />
          <Field
            label={t("applicationDetails.profile.specialties")}
            value={
              liveProfile.specialties.length === 0 ? (
                t("applicationDetails.profile.noSpecialties")
              ) : (
                <ul className="space-y-1">
                  {liveProfile.specialties.map((s) => (
                    <li key={s.specialtyId}>
                      {s.title ?? s.slug}
                      {s.isPrimary ? ` (${t("applicationDetails.profile.primary")})` : ""}
                    </li>
                  ))}
                </ul>
              )
            }
          />
        </dl>
      </Section>

          <Section heading={t("applicationDetails.sections.payout")}>
        <dl className="space-y-3">
          <Field
            label={t("applicationDetails.payout.method")}
            value={
              livePayoutDestination?.methodType
                ? t(
                    `applicationDetails.payout.methodOptions.${livePayoutDestination.methodType as PractitionerPayoutMethodType}`
                  )
                : "-"
            }
          />
          <Field
            label={t("applicationDetails.payout.accountHolderName")}
            value={<PayoutValue value={livePayoutDestination?.accountHolderName ?? null} />}
          />
          <Field
            label={t("applicationDetails.payout.bankName")}
            value={<PayoutValue value={livePayoutDestination?.bankName ?? null} />}
          />
          <Field
            label={t("applicationDetails.payout.bankAccountNumber")}
            value={<PayoutValue value={livePayoutDestination?.bankAccountNumber ?? null} />}
          />
          <Field
            label="IBAN"
            value={<PayoutValue value={livePayoutDestination?.iban ?? null} />}
          />
          <Field
            label={t("applicationDetails.payout.walletProvider")}
            value={<PayoutValue value={livePayoutDestination?.walletProvider ?? null} />}
          />
          <Field
            label={t("applicationDetails.payout.walletIdentifier")}
            value={<PayoutValue value={livePayoutDestination?.walletIdentifier ?? null} />}
          />
          <Field
            label={t("applicationDetails.payout.otherDetails")}
            value={<PayoutValue value={livePayoutDestination?.otherDetails ?? null} />}
          />
        </dl>
      </Section>

          <Section heading={t("applicationDetails.sections.application")}>
        <dl className="space-y-3">
          <Field
            label={t("applicationDetails.application.status")}
            value={statusBadge}
          />
          <Field
            label={t("applicationDetails.application.submittedAt")}
            value={application.submittedAt ? new Date(application.submittedAt).toLocaleDateString(locale) : "-"}
          />
          <Field
            label={t("applicationDetails.application.reviewedAt")}
            value={application.reviewedAt ? new Date(application.reviewedAt).toLocaleDateString(locale) : "-"}
          />
          <Field
            label={t("applicationDetails.application.reviewedByUserId")}
            value={application.reviewedByUserId ?? "-"}
          />
          <Field
            label={t("applicationDetails.application.reviewDecisionReason")}
            value={application.reviewDecisionReason ?? "-"}
          />
          <Field
            label={t("applicationDetails.application.reviewNotes")}
            value={application.reviewNotes ?? t("applicationDetails.application.noNotes")}
          />
        </dl>
      </Section>

          <Section heading={t("applicationDetails.sections.readiness")}>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              ["profileComplete", readinessSnapshot.isProfileCompleted],
              ["specialties", readinessSnapshot.hasRequiredSpecialties],
              ["credentials", readinessSnapshot.hasRequiredCredentials],
              ["payoutDestination", readinessSnapshot.hasPayoutDestination],
              ["canBeReviewed", readinessSnapshot.canBeReviewed],
              ["canBeApproved", readinessSnapshot.canBeApproved],
              ["canRequestChanges", readinessSnapshot.canRequestChanges],
            ] as [string, boolean][]
          ).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 dark:border-gray-800">
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t(`applicationDetails.readiness.${key}`)}
              </dt>
              <dd className="text-sm font-semibold">
                {value
                  ? t("applicationDetails.readiness.yes")
                  : t("applicationDetails.readiness.no")}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
        </>
      ) : null}

      {reviewTab === "credentials" ? (
        <Section heading={t("applicationDetails.sections.credentials")}>
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-700">
            <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-white">
              {t("applicationDetails.credentials.addHeading")}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>{t("applicationDetails.credentials.credentialType")}</Label>
                <Select
                  key={`new-credential-type-${newCredentialForm.credentialType}`}
                  options={CREDENTIAL_TYPES.map((type) => ({
                    value: type,
                    label: t(`applicationDetails.credentials.type.${type}`),
                  }))}
                  defaultValue={newCredentialForm.credentialType}
                  onChange={(value) =>
                    setNewCredentialForm((prev) => ({
                      ...prev,
                      credentialType: value as CredentialType,
                    }))
                  }
                />
              </div>
              <div>
                <Label>{t("applicationDetails.credentials.reviewStatus")}</Label>
                <Select
                  key={`new-credential-status-${newCredentialForm.reviewStatus}`}
                  options={CREDENTIAL_REVIEW_STATUSES.map((status) => ({
                    value: status,
                    label: t(`applicationDetails.credentials.status.${status}`),
                  }))}
                  defaultValue={newCredentialForm.reviewStatus}
                  onChange={(value) =>
                    setNewCredentialForm((prev) => ({
                      ...prev,
                      reviewStatus: value as CredentialReviewStatus,
                    }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Label>{t("applicationDetails.credentials.fileUrl")}</Label>
                <InputField
                  type="url"
                  value={newCredentialForm.fileUrl}
                  onChange={(e) =>
                    setNewCredentialForm((prev) => ({
                      ...prev,
                      fileUrl: e.target.value,
                    }))
                  }
                  placeholder={t("applicationDetails.credentials.fileUrlPlaceholder")}
                />
              </div>
              <div>
                <Label>{t("applicationDetails.credentials.expiresAtOptional")}</Label>
                <InputField
                  type="date"
                  value={newCredentialForm.expiresAt}
                  onChange={(e) =>
                    setNewCredentialForm((prev) => ({
                      ...prev,
                      expiresAt: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>{t("applicationDetails.credentials.reviewNotes")}</Label>
                <InputField
                  type="text"
                  value={newCredentialForm.reviewNotes}
                  onChange={(e) =>
                    setNewCredentialForm((prev) => ({
                      ...prev,
                      reviewNotes: e.target.value,
                    }))
                  }
                  placeholder={t("applicationDetails.credentials.reviewNotesPlaceholder")}
                />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={handleCreateCredential}
                disabled={isCreatingCredential}
                className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreatingCredential
                  ? t("applicationDetails.credentials.addSubmitting")
                  : t("applicationDetails.credentials.addSubmit")}
              </button>
              {newCredentialResult === "success" ? (
                <span className="text-sm font-medium text-success-600 dark:text-success-400">
                  Credential added.
                </span>
              ) : null}
              {newCredentialResult === "error" ? (
                <span className="text-sm font-medium text-error-500">
                  {t("applicationDetails.credentials.addError")}
                </span>
              ) : null}
            </div>
          </div>

          {credentials.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("applicationDetails.credentials.empty")}
            </p>
          ) : (
            <div className="space-y-3">
              {credentials.map((cred) => {
                const editable = getEditableCredential(cred);
                const statusResult = credentialResultById[cred.credentialId];
                const deleteStatusResult =
                  credentialDeleteResultById[cred.credentialId];
                return (
                  <div
                    key={cred.credentialId}
                    className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-800 dark:text-white">
                        {t(
                          `applicationDetails.credentials.type.${cred.credentialType as CredentialType}`
                        )}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          credStatusColour[cred.reviewStatus]
                        }`}
                      >
                        {t(
                          `applicationDetails.credentials.status.${cred.reviewStatus as CredentialReviewStatus}`
                        )}
                      </span>
                    </div>
                    <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                      {t("applicationDetails.credentials.uploadedAt", {
                        date: new Date(cred.uploadedAt).toLocaleDateString(locale),
                      })}{" "}
                      • Reviewed by: {cred.reviewedByUserId ?? "-"}
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <Label>Credential type</Label>
                        <Select
                          key={`credential-type-${cred.credentialId}-${editable.credentialType}`}
                          options={CREDENTIAL_TYPES.map((type) => ({
                            value: type,
                            label: t(`applicationDetails.credentials.type.${type}`),
                          }))}
                          defaultValue={editable.credentialType}
                          onChange={(value) =>
                            updateCredentialForm(
                              cred.credentialId,
                              { credentialType: value as CredentialType },
                              editable
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label>Review status</Label>
                        <Select
                          key={`credential-status-${cred.credentialId}-${editable.reviewStatus}`}
                          options={CREDENTIAL_REVIEW_STATUSES.map((status) => ({
                            value: status,
                            label: t(`applicationDetails.credentials.status.${status}`),
                          }))}
                          defaultValue={editable.reviewStatus}
                          onChange={(value) =>
                            updateCredentialForm(
                              cred.credentialId,
                              { reviewStatus: value as CredentialReviewStatus },
                              editable
                            )
                          }
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>File URL</Label>
                        <InputField
                          type="url"
                          value={editable.fileUrl}
                          onChange={(e) =>
                            updateCredentialForm(
                              cred.credentialId,
                              { fileUrl: e.target.value },
                              editable
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label>Expires at</Label>
                        <InputField
                          type="date"
                          value={editable.expiresAt}
                          onChange={(e) =>
                            updateCredentialForm(
                              cred.credentialId,
                              { expiresAt: e.target.value },
                              editable
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label>Review notes</Label>
                        <InputField
                          type="text"
                          value={editable.reviewNotes}
                          onChange={(e) =>
                            updateCredentialForm(
                              cred.credentialId,
                              { reviewNotes: e.target.value },
                              editable
                            )
                          }
                          placeholder="Optional review note"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleSaveCredential(cred)}
                        disabled={isUpdatingCredential}
                        className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUpdatingCredential ? "Saving..." : "Save credential"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCredential(cred)}
                        disabled={isDeletingCredential}
                        className="inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                      >
                        {isDeletingCredential ? "Deleting..." : "Delete credential"}
                      </button>
                      {statusResult === "success" ? (
                        <span className="text-sm font-medium text-success-600 dark:text-success-400">
                          Credential updated.
                        </span>
                      ) : null}
                      {statusResult === "error" ? (
                        <span className="text-sm font-medium text-error-500">
                          {t("applicationDetails.credentials.updateError")}
                        </span>
                      ) : null}
                      {deleteStatusResult === "success" ? (
                        <span className="text-sm font-medium text-success-600 dark:text-success-400">
                          {t("applicationDetails.credentials.deleteSuccess")}
                        </span>
                      ) : null}
                      {deleteStatusResult === "error" ? (
                        <span className="text-sm font-medium text-error-500">
                          {t("applicationDetails.credentials.deleteError")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Section>
      ) : null}

      {reviewTab === "decision" ? (
        <Section heading={t("applicationDetails.sections.decision")}>
        {!readinessSnapshot.canBeReviewed ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("applicationDetails.decision.notReviewable")}
          </p>
        ) : approveResult === "success" ||
          rejectResult === "success" ||
          requestChangesResult === "success" ? (
          <p className="text-sm font-medium text-success-600 dark:text-success-400">
            {approveResult === "success"
              ? t("applicationDetails.decision.approve.success")
              : rejectResult === "success"
                ? t("applicationDetails.decision.reject.success")
                : t("applicationDetails.decision.requestChanges.success")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-3">
              {!readinessSnapshot.canBeApproved ? (
                <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4 text-sm text-orange-900 dark:border-orange-900/40 dark:bg-orange-900/10 dark:text-orange-100">
                  <p className="font-semibold">
                    {t("applicationDetails.decision.blockedHeading")}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-orange-800/90 dark:text-orange-200/80">
                    {t("applicationDetails.decision.blockedHint")}
                  </p>
                  {approvalBlockers.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-xs">
                      {approvalBlockers.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-orange-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("applicationDetails.decision.approve.title")}
              </p>
              <textarea
                rows={3}
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                placeholder={t("applicationDetails.decision.approve.notePlaceholder")}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button
                type="button"
                disabled={!readinessSnapshot.canBeApproved || isApproving}
                onClick={handleApprove}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isApproving ? t("applicationDetails.decision.approve.submitting") : t("applicationDetails.decision.approve.submit")}
              </button>
              {approveResult === "error" ? (
                <p className="text-xs font-medium text-error-500">
                  {approveErrorMessage ?? t("applicationDetails.decision.approve.error")}
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("applicationDetails.decision.requestChanges.title")}
              </p>
              <input
                type="text"
                value={requestChangesReason}
                onChange={(e) => {
                  setRequestChangesReason(e.target.value);
                  if (requestChangesReasonError) setRequestChangesReasonError(false);
                }}
                placeholder={t(
                  "applicationDetails.decision.requestChanges.reasonPlaceholder"
                )}
                className={`w-full rounded-xl border px-3 py-2 text-sm text-gray-800 dark:bg-gray-800 dark:text-white ${
                  requestChangesReasonError
                    ? "border-red-400"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              />
              {requestChangesReasonError ? (
                <p className="text-xs text-error-500">
                  {t(
                    "applicationDetails.decision.requestChanges.reasonRequired"
                  )}
                </p>
              ) : null}
              <textarea
                rows={3}
                value={requestChangesNote}
                onChange={(e) => setRequestChangesNote(e.target.value)}
                placeholder={t(
                  "applicationDetails.decision.requestChanges.notePlaceholder"
                )}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button
                type="button"
                disabled={!readinessSnapshot.canRequestChanges || isRequestingChanges}
                onClick={handleRequestChanges}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRequestingChanges
                  ? t("applicationDetails.decision.requestChanges.submitting")
                  : t("applicationDetails.decision.requestChanges.submit")}
              </button>
              {requestChangesResult === "error" ? (
                <p className="text-xs text-error-500">
                  {t("applicationDetails.decision.requestChanges.error")}
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("applicationDetails.decision.reject.title")}
              </p>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (rejectReasonError) setRejectReasonError(false);
                }}
                placeholder={t("applicationDetails.decision.reject.reasonPlaceholder")}
                className={`w-full rounded-xl border px-3 py-2 text-sm text-gray-800 dark:bg-gray-800 dark:text-white ${
                  rejectReasonError
                    ? "border-red-400"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              />
              {rejectReasonError ? (
                <p className="text-xs text-error-500">{t("applicationDetails.decision.reject.reasonRequired")}</p>
              ) : null}
              <textarea
                rows={3}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder={t("applicationDetails.decision.reject.notePlaceholder")}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button
                type="button"
                disabled={isRejecting}
                onClick={handleReject}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRejecting ? t("applicationDetails.decision.reject.submitting") : t("applicationDetails.decision.reject.submit")}
              </button>
            </div>
          </div>
        )}
      </Section>
      ) : null}
    </div>
  );
}
