"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  PencilLine,
  Sparkles,
  UserRound,
  Upload,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import MultiSelect from "@/components/form/MultiSelect";
import { StateCard } from "@/components/shared/ContentStates";
import { useSpecialties, useSpecialtyCategories } from "@/features/specialties/hooks/use-specialties";
import { toAppError } from "@/lib/api/errors";
import {
  usePractitionerApplicationStatus,
  usePractitionerCredentials,
  usePractitionerProfile,
  usePractitionerReadiness,
  useRemovePractitionerAvatar,
  useSetPractitionerSpecialties,
  useSubmitPractitionerApplication,
  useUpdatePractitionerAvatar,
  useUpdatePractitionerProfile,
} from "../hooks/use-practitioners";
import type {
  PractitionerApplicationCompletionIssue,
  PractitionerApplicationCompletionSeverity,
  PractitionerApplicationCompletionStep,
  PractitionerApplicationCompletionStepKey,
  PractitionerApplicationStatus,
  PractitionerGender,
  PractitionerPayoutMethodType,
  PractitionerSpecialty,
  PractitionerType,
  SubmitPractitionerApplicationRequest,
  UpdatePractitionerProfileRequest,
} from "../types/practitioners.types";
import PractitionerCredentialsList from "./PractitionerCredentialsList";
import { getPractitionerApplicationIssueCopy } from "./practitioner-application-issue-copy";
import { getLocalizedCountryOptions } from "../constants/country-options";
import { getLocalizedProfessionalTitleOptions, normalizeProfessionalTitle } from "../constants/professional-title-options";
import { getLocalizedTimezoneOptions } from "../constants/timezone-options";
import { extractPractitionerCompletionDebug } from "../utils/extract-practitioner-completion";
import {
  getBankOptions,
  getCatalogItemCountryCodes,
  getWalletProviderOptions,
  normalizeBankValue,
  normalizeWalletProviderValue,
} from "@/lib/catalogs/payout";

type UiStepKey = "basic" | "professional" | "credentials" | "paymentSubmit";

type WizardState = {
  displayName: string;
  countryCode: string;
  locale: "ar" | "en" | "";
  timezone: string;
  practitionerGender: PractitionerGender | "";
  practitionerType: PractitionerType | "";
  professionalTitle: string;
  bio: string;
  yearsOfExperience: string;
  languageCodes: string[];
  sessionPrice30Egp: string;
  sessionPrice30Usd: string;
  sessionPrice60Egp: string;
  sessionPrice60Usd: string;
  payoutMethodType: PractitionerPayoutMethodType | "";
  payoutCountryCode: string;
  payoutAccountHolderName: string;
  payoutBankName: string;
  payoutBankAccountNumber: string;
  payoutIban: string;
  payoutWalletProvider: string;
  payoutWalletIdentifier: string;
  payoutOtherDetails: string;
  avatarUrl: string;
};

type AvatarDraftState = {
  mode: "keep" | "replace" | "remove";
  file: File | null;
  previewUrl: string | null;
};

const UI_STEPS: Array<{ key: UiStepKey; backendKeys: PractitionerApplicationCompletionStepKey[] }> = [
  { key: "basic", backendKeys: ["basicProfile"] },
  { key: "professional", backendKeys: ["professionalDetails"] },
  { key: "credentials", backendKeys: ["qualifications", "documents"] },
  { key: "paymentSubmit", backendKeys: ["pricing", "payoutDetails", "reviewSubmit"] },
];

const PRACTITIONER_TYPES: PractitionerType[] = [
  "PSYCHOLOGIST",
  "PSYCHIATRIST",
  "NUTRITIONIST",
  "WEIGHT_LOSS_SPECIALIST",
  "COUNSELOR",
  "OTHER",
];

const PRACTITIONER_GENDERS: PractitionerGender[] = ["MALE", "FEMALE"];

const PAYOUT_METHODS: PractitionerPayoutMethodType[] = [
  "BANK_ACCOUNT",
  "IBAN",
  "WALLET",
  "OTHER",
];

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const LOCKED_STATUSES: PractitionerApplicationStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "ARCHIVED",
];

function normalizeMoney(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function isCatalogValueCompatibleWithCountry(value: string, payoutCountryCode: string) {
  const selectedCountry = payoutCountryCode.trim().toUpperCase();
  if (!selectedCountry) return false;
  return getCatalogItemCountryCodes(value).includes(selectedCountry);
}

function getInitials(name: string | null | undefined): string {
  const value = name?.trim();
  if (!value) return "P";
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function createInitialState(profile: NonNullable<ReturnType<typeof usePractitionerProfile>["data"]>["profile"]): WizardState {
  return {
    displayName: profile.displayName ?? "",
    countryCode: profile.countryCode ?? "",
    locale: (profile.locale as "ar" | "en" | "") ?? "",
    timezone: profile.timezone ?? "",
    practitionerGender: profile.practitionerGender ?? "",
    practitionerType: profile.practitionerType ?? "",
    professionalTitle: normalizeProfessionalTitle(profile.professionalTitle ?? ""),
    bio: profile.bio ?? "",
    yearsOfExperience: profile.yearsOfExperience != null ? String(profile.yearsOfExperience) : "",
    languageCodes: profile.languages ?? [],
    sessionPrice30Egp: profile.pricing.session30.egp != null ? String(profile.pricing.session30.egp) : "",
    sessionPrice30Usd: profile.pricing.session30.usd != null ? String(profile.pricing.session30.usd) : "",
    sessionPrice60Egp: profile.pricing.session60.egp != null ? String(profile.pricing.session60.egp) : "",
    sessionPrice60Usd: profile.pricing.session60.usd != null ? String(profile.pricing.session60.usd) : "",
    payoutMethodType: profile.payoutDestination?.methodType ?? "",
    payoutCountryCode: profile.countryCode ?? "",
    payoutAccountHolderName: profile.payoutDestination?.accountHolderName ?? "",
    payoutBankName: normalizeBankValue(profile.payoutDestination?.bankName ?? ""),
    payoutBankAccountNumber: profile.payoutDestination?.bankAccountNumber ?? "",
    payoutIban: profile.payoutDestination?.iban ?? "",
    payoutWalletProvider: normalizeWalletProviderValue(profile.payoutDestination?.walletProvider ?? ""),
    payoutWalletIdentifier: profile.payoutDestination?.walletIdentifier ?? "",
    payoutOtherDetails: profile.payoutDestination?.otherDetails ?? "",
    avatarUrl: profile.avatarUrl ?? "",
  };
}

function getStatusTone(status: PractitionerApplicationStatus | null) {
  switch (status) {
    case "APPROVED":
      return "success";
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return "warning";
    case "REJECTED":
      return "danger";
    case "CHANGES_REQUESTED":
      return "primary";
    default:
      return "neutral";
  }
}

function getLocalizedApplicationStatus(
  t: ReturnType<typeof useTranslations>,
  status: PractitionerApplicationStatus | null,
) {
  if (!status) {
    return t("application.status.noApplication");
  }

  return t(`application.status.${status}` as Parameters<typeof t>[0]);
}

function getInitialUiStep(
  completion: PractitionerApplicationCompletionStep[] | null,
  status: PractitionerApplicationStatus | null,
): UiStepKey {
  if (status === "APPROVED" || status === "ARCHIVED") return "paymentSubmit";

  const stepStatus = (stepKey: UiStepKey) => getStepStatus(completion, stepKey);
  const firstIncomplete = UI_STEPS.find((step) => stepStatus(step.key).status !== "complete");
  return firstIncomplete?.key ?? "paymentSubmit";
}

function buildUpdatePayload(
  step: UiStepKey,
  state: WizardState,
): UpdatePractitionerProfileRequest {
  const payload: UpdatePractitionerProfileRequest = {};

  if (step === "basic") {
    payload.displayName = state.displayName.trim() || undefined;
    payload.countryCode = state.countryCode.trim().length > 0 ? state.countryCode.trim().toUpperCase() : null;
    payload.locale = state.locale === "ar" || state.locale === "en" ? state.locale : undefined;
    payload.timezone = state.timezone.trim() || undefined;
    payload.practitionerGender =
      state.practitionerGender === "MALE" || state.practitionerGender === "FEMALE"
        ? state.practitionerGender
        : null;
  }

  if (step === "professional") {
    payload.practitionerType =
      state.practitionerType && state.practitionerType.length > 0 ? state.practitionerType : undefined;
    payload.professionalTitle = normalizeProfessionalTitle(state.professionalTitle) || null;
    payload.bio = state.bio.trim() || null;
    payload.yearsOfExperience = state.yearsOfExperience.trim().length > 0 ? Number(state.yearsOfExperience) : null;
    payload.languageCodes = state.languageCodes.map((item) => item.trim()).filter(Boolean);
  }

    if (step === "paymentSubmit") {
      payload.sessionPrice30Egp = normalizeMoney(state.sessionPrice30Egp);
      payload.sessionPrice30Usd = normalizeMoney(state.sessionPrice30Usd);
      payload.sessionPrice60Egp = normalizeMoney(state.sessionPrice60Egp);
      payload.sessionPrice60Usd = normalizeMoney(state.sessionPrice60Usd);

    if (state.payoutMethodType) {
      payload.payoutDestination = {
        methodType: state.payoutMethodType,
        accountHolderName: state.payoutAccountHolderName.trim() || undefined,
        bankName:
          isCatalogValueCompatibleWithCountry(normalizeBankValue(state.payoutBankName), state.payoutCountryCode)
            ? normalizeBankValue(state.payoutBankName)
            : undefined,
        bankAccountNumber: state.payoutBankAccountNumber.trim() || undefined,
        iban: state.payoutIban.trim() || undefined,
        walletProvider:
          isCatalogValueCompatibleWithCountry(
            normalizeWalletProviderValue(state.payoutWalletProvider),
            state.payoutCountryCode,
          )
            ? normalizeWalletProviderValue(state.payoutWalletProvider)
            : undefined,
        walletIdentifier: state.payoutWalletIdentifier.trim() || undefined,
        otherDetails: state.payoutOtherDetails.trim() || undefined,
      };
    }
  }

  return payload;
}

function getStepStatus(
  completion: PractitionerApplicationCompletionStep[] | null,
  stepKey: UiStepKey,
) {
  const uiStep = UI_STEPS.find((step) => step.key === stepKey);
  const backendSteps = completion?.filter((step) => uiStep?.backendKeys.includes(step.key)) ?? [];

  const percent =
    backendSteps.length > 0
      ? Math.round(backendSteps.reduce((sum, step) => sum + step.percent, 0) / backendSteps.length)
      : 0;

  const issues = backendSteps.flatMap((step) => step.issues);
  // Practitioner submission wizard semantics:
  // - SUBMISSION blockers keep the step "incomplete"
  // - APPROVAL blockers indicate "uploaded but pending admin review" and must NOT block submission completeness
  const submissionIssues = issues.filter((issue) => issue.requirementScope === "SUBMISSION");
  const approvalBlockers = issues.filter(
    (issue) => issue.requirementScope === "APPROVAL" && issue.severity === "BLOCKER",
  );

  const hasSubmissionBlockers = submissionIssues.some((issue) => issue.severity === "BLOCKER");
  const hasWarnings = issues.some((issue) => issue.severity === "WARNING");

  // If the step has no submission blockers, it is "complete" for practitioner submission purposes.
  // Approval blockers (pending admin review) must not flip completion status; we surface them as a note.
  const status =
    backendSteps.length > 0 && !hasSubmissionBlockers
      ? hasWarnings
        ? "warning"
        : "complete"
      : hasSubmissionBlockers
        ? "incomplete"
        : backendSteps.length > 0 && backendSteps.every((step) => step.status === "complete")
          ? "complete"
          : "incomplete";

  return {
    status,
    // If submission-complete but backend percent is low due to approval-state, render it as 100% to avoid confusion.
    percent: status === "complete" ? 100 : percent,
    requiredCount: backendSteps.reduce((sum, step) => sum + step.requiredCount, 0),
    completedRequiredCount: backendSteps.reduce((sum, step) => sum + step.completedRequiredCount, 0),
    issues,
    submissionIssues,
    approvalBlockers,
    backendSteps,
  };
}

function StepTone({
  tone,
  children,
}: {
  tone: "neutral" | "primary" | "success" | "warning" | "danger";
  children: ReactNode;
}) {
  const styles: Record<typeof tone, string> = {
    neutral: "bg-surface-tertiary text-text-secondary border-border-light",
    primary: "bg-primary-light text-text-brand border-primary/15",
    success: "bg-success-50 text-success-700 border-success-200 dark:bg-success-500/10 dark:text-success-300",
    warning: "bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-500/10 dark:text-warning-300",
    danger: "bg-error-50 text-error-700 border-error-200 dark:bg-error-500/10 dark:text-error-300",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles[tone]}`}>
      {children}
    </span>
  );
}

function WizardPill({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-light bg-surface-tertiary/70 px-3 py-2.5">
      <div className="text-[11px] font-medium text-text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-text-primary">{value}</div>
    </div>
  );
}

function StepIssueStrip({
  issues,
  t,
}: {
  issues: PractitionerApplicationCompletionIssue[];
  t: ReturnType<typeof useTranslations>;
}) {
  if (issues.length === 0) return null;

  return (
    <div className="rounded-2xl border border-warning-200 bg-warning-50/75 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-warning-700" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-warning-900">{t("application.wizard.stepIssuesTitle")}</p>
          <p className="mt-1 text-sm leading-6 text-warning-900/90">{t("application.wizard.stepIssuesBody")}</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {[...issues]
          .sort((a, b) => {
            const rank = (value: string) =>
              value === "BLOCKER" ? 0 : value === "WARNING" ? 1 : 2;
            return rank(a.severity) - rank(b.severity);
          })
          .slice(0, 6)
          .map((issue) => {
          const copy = getPractitionerApplicationIssueCopy(issue.code);
          return (
            <div key={`${issue.stepKey}-${issue.code}-${issue.field ?? "all"}`} className="rounded-2xl border border-warning-200 bg-white/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{t(copy.titleKey as Parameters<typeof t>[0])}</p>
                  <p className="mt-1 text-xs text-text-secondary">{t(copy.descriptionKey as Parameters<typeof t>[0])}</p>
                </div>
                <StepTone
                  tone={
                    issue.severity === "BLOCKER"
                      ? "danger"
                      : issue.severity === "WARNING"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {t(`application.completion.severity.${issue.severity}` as Parameters<typeof t>[0])}
                </StepTone>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UiStepCircle({
  stepNumber,
  active,
  completed,
}: {
  stepNumber: number;
  active: boolean;
  completed: boolean;
}) {
  return (
    <span
      className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition ${
        completed
          ? "border-primary bg-primary text-white shadow-[0_12px_24px_-16px_rgba(68,161,148,0.45)]"
          : active
            ? "border-primary bg-primary-light text-text-brand"
            : "border-border-strong bg-white text-text-muted"
      }`}
    >
      {completed ? <CheckCircle2 className="h-5 w-5" /> : stepNumber}
    </span>
  );
}

export default function PractitionerApplicationWizardThreeStep() {
  const t = useTranslations("practitioner-area");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const NextIcon = isRtl ? ArrowLeft : ArrowRight;
  const PreviousIcon = isRtl ? ArrowRight : ArrowLeft;

  const [draftState, setDraftState] = useState<WizardState | null>(null);
  const [selectedStep, setSelectedStep] = useState<UiStepKey | null>(null);
  const [avatarDraft, setAvatarDraft] = useState<AvatarDraftState>({
    mode: "keep",
    file: null,
    previewUrl: null,
  });
  const [selectedSpecialtyCategoryId, setSelectedSpecialtyCategoryId] = useState("");
  const [selectedSpecialtyIds, setSelectedSpecialtyIds] = useState<string[]>([]);
  const [wantsOtherSpecialty, setWantsOtherSpecialty] = useState(false);
  const [specialtyDraftTouched, setSpecialtyDraftTouched] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

  const profileQuery = usePractitionerProfile();
  const credentialsQuery = usePractitionerCredentials();
  const applicationQuery = usePractitionerApplicationStatus();
  const readinessQuery = usePractitionerReadiness();
  const updateProfileMutation = useUpdatePractitionerProfile();
  const updateAvatarMutation = useUpdatePractitionerAvatar();
  const removeAvatarMutation = useRemovePractitionerAvatar();
  const submitMutation = useSubmitPractitionerApplication();
  const setSpecialtiesMutation = useSetPractitionerSpecialties();
  const specialtyCategoriesQuery = useSpecialtyCategories(true);
  const specialtiesCatalogQuery = useSpecialties(undefined, true);

  const profile = profileQuery.data?.profile ?? null;
  const application = (applicationQuery.data as any)?.application ?? null;
  const readiness = (readinessQuery.data as any)?.readiness ?? null;
  const completionDebug = extractPractitionerCompletionDebug(
    applicationQuery.data as any,
    readinessQuery.data as any,
  );
  const completion = completionDebug.completion;
  const completionReady = Boolean(completion);

  // Debug for verification (opt-in): set `NEXT_PUBLIC_DEBUG_PRACTITIONER_WIZARD=1`.
  if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEBUG_PRACTITIONER_WIZARD === "1") {
    // eslint-disable-next-line no-console
    console.log("[PractitionerWizard] readinessQuery.data", readinessQuery.data);
    // eslint-disable-next-line no-console
    console.log("[PractitionerWizard] applicationQuery.data", applicationQuery.data);
    // eslint-disable-next-line no-console
    console.log("[PractitionerWizard] completion.source", completionDebug.source);
    // eslint-disable-next-line no-console
    console.log("[PractitionerWizard] completion.readinessSteps", completionDebug.readinessStepsCount);
    // eslint-disable-next-line no-console
    console.log("[PractitionerWizard] completion.applicationSteps", completionDebug.applicationStepsCount);
    // eslint-disable-next-line no-console
    console.log("[PractitionerWizard] completion.steps", completion?.steps?.length ?? null);
    // eslint-disable-next-line no-console
    console.log(
      "[PractitionerWizard] completion.basicProfile",
      completion?.steps?.find?.((step: any) => step?.key === "basicProfile") ?? null,
    );
  }
  const credentialRows = credentialsQuery.data?.credentials ?? [];
  const credentialTypeSet = useMemo(
    () => new Set(credentialRows.map((item) => item.credentialType)),
    [credentialRows],
  );
  const hasNationalIdFront =
    credentialTypeSet.has("NATIONAL_ID_FRONT") || credentialTypeSet.has("NATIONAL_ID");
  const hasNationalIdBack =
    credentialTypeSet.has("NATIONAL_ID_BACK") || credentialTypeSet.has("NATIONAL_ID");
  const hasPassport = credentialTypeSet.has("PASSPORT");
  const hasIdentityEvidence = hasPassport || (hasNationalIdFront && hasNationalIdBack);
  const status = application?.status ?? profile?.applicationStatusSummary.status ?? null;
  const statusTone = getStatusTone(status);
  const isLocked = Boolean(status && LOCKED_STATUSES.includes(status));
  const isApproved = status === "APPROVED";
  const isReadonly = status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "ARCHIVED";
  const canEdit = !isLocked || status === "REJECTED" || status === "CHANGES_REQUESTED" || status === "DRAFT";

  const initialState = useMemo(() => (profile ? createInitialState(profile) : null), [profile]);
  const effectiveState = draftState ?? initialState;
  const selectedAvatarPreview = avatarDraft.previewUrl ?? effectiveState?.avatarUrl ?? null;
  const payoutCountryOptions = useMemo(() => getLocalizedCountryOptions(locale), [locale]);
  const payoutCountryCode = effectiveState?.payoutCountryCode.trim().toUpperCase() ?? "";
  const hasPayoutCountry = payoutCountryCode.length > 0;
  const payoutBankSelectedValue =
    effectiveState?.payoutBankName &&
    isCatalogValueCompatibleWithCountry(effectiveState.payoutBankName, payoutCountryCode)
      ? effectiveState.payoutBankName
      : "";
  const payoutWalletProviderSelectedValue =
    effectiveState?.payoutWalletProvider &&
    isCatalogValueCompatibleWithCountry(effectiveState.payoutWalletProvider, payoutCountryCode)
      ? effectiveState.payoutWalletProvider
      : "";
  const payoutBankOptions = useMemo(
    () =>
      getBankOptions(locale, hasPayoutCountry ? payoutCountryCode : undefined, payoutBankSelectedValue),
    [hasPayoutCountry, locale, payoutBankSelectedValue, payoutCountryCode],
  );
  const payoutWalletProviderOptions = useMemo(
    () =>
      getWalletProviderOptions(
        locale,
        hasPayoutCountry ? payoutCountryCode : undefined,
        payoutWalletProviderSelectedValue,
      ),
    [hasPayoutCountry, locale, payoutCountryCode, payoutWalletProviderSelectedValue],
  );

  const currentStep = selectedStep ?? getInitialUiStep(completion?.steps ?? null, status);
  const currentStepIndex = UI_STEPS.findIndex((step) => step.key === currentStep);
  const currentUiStatus = getStepStatus(completionReady ? completion?.steps ?? null : null, currentStep);
  const canSubmit = completion?.canSubmit ?? false;
  const statusMessage =
    status === "APPROVED"
      ? t("application.statusMessage.APPROVED")
      : status === "REJECTED"
        ? t("application.statusMessage.REJECTED")
        : status === "CHANGES_REQUESTED"
          ? t("application.statusMessage.CHANGES_REQUESTED")
          : status === "SUBMITTED"
            ? t("application.statusMessage.SUBMITTED")
            : status === "UNDER_REVIEW"
              ? t("application.statusMessage.UNDER_REVIEW")
              : t("application.status.noApplication");
  const readOnlyNote =
    status === "SUBMITTED" || status === "UNDER_REVIEW"
      ? t("application.statusMessage.UNDER_REVIEW")
      : status === "ARCHIVED"
        ? t("application.statusMessage.ARCHIVED")
        : null;

  const uiSteps = useMemo(() => {
    const labels = {
      basic: t("practitionerApplication.steps.basicProfile"),
      professional: t("practitionerApplication.steps.professionalDetails"),
      credentials: t("practitionerApplication.steps.qualifications"),
      paymentSubmit: t("practitionerApplication.steps.pricing"),
    };

  return UI_STEPS.map((step) => {
      const computed = getStepStatus(completionReady ? completion?.steps ?? null : null, step.key);
      const blockerIssues = computed.submissionIssues.filter((issue) => issue.severity === "BLOCKER");
      const blockerTitles = blockerIssues
        .slice(0, 2)
        .map((issue) => {
          const copy = getPractitionerApplicationIssueCopy(issue.code);
          return t(copy.titleKey as Parameters<typeof t>[0]);
        });

      const pendingAdminTitles = computed.approvalBlockers
        .slice(0, 1)
        .map((issue) => {
          const copy = getPractitionerApplicationIssueCopy(issue.code);
          return t(copy.titleKey as Parameters<typeof t>[0]);
        });
      return {
        ...step,
        label: labels[step.key],
        status: computed.status,
        percent: computed.percent,
        requiredCount: computed.requiredCount,
        completedRequiredCount: computed.completedRequiredCount,
        issues: computed.issues,
        blockerTitles: completionReady ? blockerTitles : [],
        pendingAdminTitles: completionReady ? pendingAdminTitles : [],
      };
    });
  }, [completion?.steps, completionReady, t]);

  const currentStepData = uiSteps.find((step) => step.key === currentStep) ?? uiSteps[0]!;
  const stepHelperText =
    currentStep === "basic"
      ? t("application.wizard.threeStep.helpers.basic")
      : currentStep === "professional"
        ? t("application.wizard.threeStep.helpers.professional")
        : currentStep === "credentials"
          ? t("application.wizard.qualificationsModalDescription")
          : t("application.wizard.threeStep.helpers.paymentSubmit");
  const stepIssueCount = currentUiStatus.issues.length;
  const languageOptions = useMemo(
    () => [
      { value: "ar", text: t("profile.locale.ar") },
      { value: "en", text: t("profile.locale.en") },
    ],
    [t],
  );
  const countryOptions = useMemo(() => getLocalizedCountryOptions(locale), [locale]);
  const timezoneOptions = useMemo(
    () => {
      const options = getLocalizedTimezoneOptions(locale, effectiveState?.countryCode);
      const currentValue = effectiveState?.timezone?.trim();
      if (!currentValue || options.some((option) => option.value === currentValue)) {
        return options;
      }
      return [{ value: currentValue, label: currentValue }, ...options];
    },
    [effectiveState?.countryCode, effectiveState?.timezone, locale],
  );
  const professionalTitleOptions = useMemo(
    () => getLocalizedProfessionalTitleOptions(locale),
    [locale],
  );
  const specialtyCategories = useMemo(
    () => specialtyCategoriesQuery.data?.categories ?? [],
    [specialtyCategoriesQuery.data?.categories],
  );
  const specialtiesCatalog = useMemo(
    () => specialtiesCatalogQuery.data?.specialties ?? [],
    [specialtiesCatalogQuery.data?.specialties],
  );
  const profileSpecialtyCategoryId = profile?.primarySpecialtyCategoryId ?? "";
  const profileSpecialtyIds = useMemo(
    () => profile?.specialties.map((item) => item.specialtyId) ?? [],
    [profile?.specialties],
  );
  const activeSpecialtyCategoryId = specialtyDraftTouched
    ? selectedSpecialtyCategoryId
    : profileSpecialtyCategoryId;
  const rawActiveSpecialtyIds = specialtyDraftTouched ? selectedSpecialtyIds : profileSpecialtyIds;
  const filteredSpecialties = useMemo(
    () =>
      specialtiesCatalog.filter((item) =>
        activeSpecialtyCategoryId ? item.category?.id === activeSpecialtyCategoryId : false,
      ),
    [activeSpecialtyCategoryId, specialtiesCatalog],
  );
  const activeSpecialtyIds = useMemo(() => {
    const allowedIds = new Set(filteredSpecialties.map((item) => item.id));
    return rawActiveSpecialtyIds.filter((id) => allowedIds.has(id));
  }, [filteredSpecialties, rawActiveSpecialtyIds]);
  const selectedSpecialtyItems = useMemo(
    () => filteredSpecialties.filter((item) => activeSpecialtyIds.includes(item.id)),
    [activeSpecialtyIds, filteredSpecialties],
  );
  const specialtyDirty = useMemo(() => {
    const stableProfileIds = [...profileSpecialtyIds].sort();
    const draftIds = [...activeSpecialtyIds].sort();
    const sameIds = JSON.stringify(stableProfileIds) === JSON.stringify(draftIds);
    const sameCategory = profileSpecialtyCategoryId === activeSpecialtyCategoryId;
    return !(sameIds && sameCategory);
  }, [activeSpecialtyCategoryId, activeSpecialtyIds, profileSpecialtyCategoryId, profileSpecialtyIds]);

  const patchState = useCallback(
    (patch: Partial<WizardState>) => {
      if (!effectiveState) return;
      setDraftState((current) => ({ ...(current ?? effectiveState), ...patch }));
    },
    [effectiveState],
  );

  useEffect(() => {
    return () => {
      if (avatarDraft.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarDraft.previewUrl);
      }
    };
  }, [avatarDraft.previewUrl]);

  const handlePayoutCountryChange = (nextCountryCode: string) => {
    const nextPatch: Partial<WizardState> = {
      payoutCountryCode: nextCountryCode.trim().toUpperCase(),
    };

    if (effectiveState?.payoutMethodType === "BANK_ACCOUNT") {
      nextPatch.payoutBankName = "";
    }

    if (effectiveState?.payoutMethodType === "WALLET") {
      nextPatch.payoutWalletProvider = "";
    }

    patchState(nextPatch);
  };

  const saveSpecialtiesDraft = async () => {
    if (!canEdit) return;
    if (!specialtyDirty) return;
    if (!activeSpecialtyCategoryId || activeSpecialtyIds.length === 0) {
      return;
    }

    await setSpecialtiesMutation.mutateAsync({
      primarySpecialtyCategoryId: activeSpecialtyCategoryId,
      specialtyIds: activeSpecialtyIds,
    });
  };

  const saveCurrentStep = async () => {
    if (!effectiveState || !canEdit) return;

    const payload = buildUpdatePayload(currentStep, effectiveState);
    try {
      await updateProfileMutation.mutateAsync(payload);
      if (currentStep === "professional") {
        await saveSpecialtiesDraft();
        if (wantsOtherSpecialty) {
          toast.info(
            locale === "ar"
              ? "تم تسجيل اختيار \"أخرى\" للمراجعة. في الإصدار الحالي لا يتم إرسال تخصص مخصص بدون اختيار تخصص نظامي."
              : "Your “Other” choice was noted for review. Custom specialties are not submitted without a valid catalog specialty yet.",
          );
        }
      } else if (currentStep === "basic") {
        if (avatarDraft.mode === "replace" && avatarDraft.file) {
          const avatarResponse = await updateAvatarMutation.mutateAsync({ file: avatarDraft.file });
          patchState({ avatarUrl: avatarResponse.avatar.avatarUrl ?? "" });
          setAvatarDraft({
            mode: "keep",
            file: null,
            previewUrl: null,
          });
        } else if (avatarDraft.mode === "remove") {
          await removeAvatarMutation.mutateAsync();
          patchState({ avatarUrl: "" });
          setAvatarDraft({
            mode: "keep",
            file: null,
            previewUrl: null,
          });
        }
      }
      toast.success(t("application.feedback.saveSuccess"));
      // Ensure step completion/readiness updates immediately after save (avoid stale query state).
      await Promise.allSettled([
        profileQuery.refetch(),
        readinessQuery.refetch(),
        applicationQuery.refetch(),
        credentialsQuery.refetch(),
      ]);
    } catch (error) {
      const appError = toAppError(error, { requestPath: "/practitioners/me/profile" });
      toast.error(appError.message || t("application.feedback.saveError"));
    }
  };

  const submitApplication = async () => {
    if (!effectiveState || !canSubmit || !profile) return;

    try {
      await saveSpecialtiesDraft();
    } catch (error) {
      const appError = toAppError(error, { requestPath: "/practitioners/me/specialties" });
      toast.error(appError.message || t("application.feedback.saveError"));
      return;
    }

    const payload: SubmitPractitionerApplicationRequest = {
      displayName: effectiveState.displayName.trim() || undefined,
      professionalTitle: normalizeProfessionalTitle(effectiveState.professionalTitle) || null,
      bio: effectiveState.bio.trim() || null,
      countryCode: effectiveState.countryCode.trim().length > 0 ? effectiveState.countryCode.trim().toUpperCase() : null,
      yearsOfExperience: effectiveState.yearsOfExperience.trim().length > 0 ? Number(effectiveState.yearsOfExperience) : null,
      practitionerType:
        effectiveState.practitionerType && effectiveState.practitionerType.length > 0
          ? effectiveState.practitionerType
          : undefined,
      practitionerGender:
        effectiveState.practitionerGender === "MALE" || effectiveState.practitionerGender === "FEMALE"
          ? effectiveState.practitionerGender
          : null,
      sessionPrice30Egp: normalizeMoney(effectiveState.sessionPrice30Egp),
      sessionPrice30Usd: normalizeMoney(effectiveState.sessionPrice30Usd),
      sessionPrice60Egp: normalizeMoney(effectiveState.sessionPrice60Egp),
      sessionPrice60Usd: normalizeMoney(effectiveState.sessionPrice60Usd),
      locale: effectiveState.locale === "ar" || effectiveState.locale === "en" ? effectiveState.locale : undefined,
      timezone: effectiveState.timezone.trim() || undefined,
      languageCodes: effectiveState.languageCodes.map((value) => value.trim()).filter(Boolean),
      specialtySelection:
        activeSpecialtyIds.length > 0 && activeSpecialtyCategoryId
          ? {
              primarySpecialtyCategoryId: activeSpecialtyCategoryId,
              specialtyIds: activeSpecialtyIds,
            }
          : undefined,
      payoutDestination:
        effectiveState.payoutMethodType && effectiveState.payoutMethodType.length > 0
          ? {
              methodType: effectiveState.payoutMethodType,
              accountHolderName: effectiveState.payoutAccountHolderName.trim() || undefined,
              bankName:
                isCatalogValueCompatibleWithCountry(
                  normalizeBankValue(effectiveState.payoutBankName),
                  effectiveState.payoutCountryCode,
                )
                  ? normalizeBankValue(effectiveState.payoutBankName)
                  : undefined,
              bankAccountNumber: effectiveState.payoutBankAccountNumber.trim() || undefined,
              iban: effectiveState.payoutIban.trim() || undefined,
              walletProvider:
                isCatalogValueCompatibleWithCountry(
                  normalizeWalletProviderValue(effectiveState.payoutWalletProvider),
                  effectiveState.payoutCountryCode,
                )
                  ? normalizeWalletProviderValue(effectiveState.payoutWalletProvider)
                  : undefined,
              walletIdentifier: effectiveState.payoutWalletIdentifier.trim() || undefined,
              otherDetails: effectiveState.payoutOtherDetails.trim() || undefined,
            }
          : null,
      avatarUrl: effectiveState.avatarUrl.trim() || null,
    };

    try {
      await submitMutation.mutateAsync(payload);
      toast.success(t("application.feedback.submitSuccess"));
    } catch (error) {
      const appError = toAppError(error, { requestPath: "/practitioners/me/application/submit" });
      toast.error(appError.message || t("application.feedback.submitError"));
    }
  };

  const handleAvatarFileSelected = (file: File | null) => {
    if (!effectiveState || !canEdit || !file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_TYPES)[number])) {
      toast.error(
        locale === "ar"
          ? "النوع غير مدعوم. استخدم صورة JPG أو PNG أو WEBP."
          : "This file type is not supported. Use a JPG, PNG, or WEBP image.",
      );
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      toast.error(locale === "ar" ? "حجم الصورة أكبر من المسموح." : "The image is larger than the allowed limit.");
      return;
    }

    const previousPreviewUrl = avatarDraft.previewUrl;
    const previewUrl = URL.createObjectURL(file);
    if (previousPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previousPreviewUrl);
    }

    setAvatarDraft({
      mode: "replace",
      file,
      previewUrl,
    });
  };

  const handleAvatarRemove = async () => {
    if (!effectiveState || !canEdit) return;
    if (avatarDraft.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarDraft.previewUrl);
    }
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = "";
    }
    setAvatarDraft({
      mode: "remove",
      file: null,
      previewUrl: null,
    });
  };

  const handleSaveSpecialtiesOnly = async () => {
    if (!canEdit) return;
    try {
      await saveSpecialtiesDraft();
      toast.success(t("application.feedback.saveSuccess"));
        if (wantsOtherSpecialty) {
          toast.info(
            locale === "ar"
              ? 'تم تسجيل اختيارك "أخرى" للمراجعة. في الوقت الحالي لا يتم إرسال تخصص مخصص بدون اختيار تخصص من القائمة.'
              : "Your “Other” choice was noted for review. Custom specialties are not submitted without a valid catalog specialty yet.",
          );
        }
    } catch (error) {
      const appError = toAppError(error, { requestPath: "/practitioners/me/specialties" });
      toast.error(appError.message || t("application.feedback.saveError"));
    }
  };

  const renderLoading = () => (
    <div className="w-full px-0 py-2">
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="h-8 w-72 rounded-full bg-surface-tertiary" />
          <div className="h-4 w-full rounded-full bg-surface-tertiary" />
          <div className="h-4 w-2/3 rounded-full bg-surface-tertiary" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-28 rounded-[24px] border border-border-light bg-white/80" />
          <div className="h-28 rounded-[24px] border border-border-light bg-white/80" />
          <div className="h-28 rounded-[24px] border border-border-light bg-white/80" />
        </div>
        <div className="h-[520px] rounded-[24px] border border-border-light bg-white/80" />
      </div>
    </div>
  );

  const renderReadonlyCard = () => (
    <div className="w-full space-y-6">
      <div className="border-y border-border-light bg-white/75 px-0 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <StepTone tone={statusTone}>{getLocalizedApplicationStatus(t, status)}</StepTone>
            <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em] text-text-primary">
              {status === "APPROVED" ? t("application.wizard.approvedTitle") : t("application.wizard.lockedTitle")}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">{statusMessage}</p>
            {readOnlyNote ? (
              <div className="mt-4 rounded-2xl border border-border-light bg-surface-tertiary/80 p-4 text-sm leading-6 text-text-secondary">
                {readOnlyNote}
              </div>
            ) : null}
          </div>
          <Lock className="h-6 w-6 text-warning-600" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/practitioner/dashboard"
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover"
        >
          {t("application.wizard.goToDashboard")}
        </Link>
        <Link
          href="/practitioner/profile"
          className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:bg-primary-light"
        >
          {t("application.wizard.reviewProfile")}
        </Link>
      </div>
    </div>
  );

  if (profileQuery.isLoading || applicationQuery.isLoading || readinessQuery.isLoading) {
    return renderLoading();
  }

  if (profileQuery.isError || applicationQuery.isError || readinessQuery.isError || !profile || !effectiveState) {
    return (
      <div className="w-full px-0 py-2">
        <StateCard
          icon={<AlertTriangle className="h-8 w-8 text-error-500" />}
          title={t("application.feedback.loadError")}
          note={t("application.feedback.loadErrorNote")}
          action={{
            label: t("application.feedback.retry"),
            onClick: () => {
              profileQuery.refetch();
              applicationQuery.refetch();
              readinessQuery.refetch();
            },
          }}
        />
      </div>
    );
  }

  if (isApproved || isReadonly) {
    return (
      <div className="w-full space-y-6">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              {t("application.wizard.eyebrow")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-text-primary">
                {t("application.wizard.title")}
              </h1>
              <StepTone tone={statusTone}>{getLocalizedApplicationStatus(t, status)}</StepTone>
            </div>
            <p className="max-w-4xl text-sm leading-6 text-text-secondary">{statusMessage}</p>
          </div>

          {renderReadonlyCard()}
        </div>
      </div>
    );
  }

  const currentStepInfo = uiSteps[currentStepIndex] ?? uiSteps[0]!;
  const currentStepStatusText =
    currentStepInfo.status === "complete"
      ? t("application.completion.stepStatus.complete")
      : currentStepInfo.status === "warning"
        ? t("application.completion.stepStatus.warning")
        : t("application.completion.stepStatus.incomplete");
  const canMovePrevious = currentStep !== "basic";
  const goPrevious = () => {
    if (currentStep === "paymentSubmit") {
      setSelectedStep("credentials");
    } else if (currentStep === "credentials") {
      setSelectedStep("professional");
    } else if (currentStep === "professional") {
      setSelectedStep("basic");
    }
  };
  const goNext = () => {
    if (currentStep === "basic") {
      setSelectedStep("professional");
    } else if (currentStep === "professional") {
      setSelectedStep("credentials");
    } else if (currentStep === "credentials") {
      setSelectedStep("paymentSubmit");
    }
  };

  const currentStepLayout = () => {
    if (currentStep === "basic") {
      return (
        <div data-testid="practitioner-application-step-panel-basic" className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="display-name">{t("profile.fields.displayName.label")}</Label>
              <InputField
                id="display-name"
                value={effectiveState.displayName}
                onChange={(event) => patchState({ displayName: event.target.value })}
                placeholder={t("profile.fields.displayName.placeholder")}
                disabled={!canEdit}
              />
            </div>

            <div>
              <Label htmlFor="country-code">{t("profile.fields.countryCode.label")}</Label>
              <select
                id="country-code"
                value={effectiveState.countryCode}
                onChange={(event) => patchState({ countryCode: event.target.value })}
                disabled={!canEdit}
                className="app-control h-11 w-full appearance-none px-4 py-2.5 text-sm"
              >
                <option value="">{t("profile.fields.countryCode.placeholder")}</option>
                {countryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-text-secondary">
                {locale === "ar"
                  ? "يتم حفظ الدولة برمز البلد (مثل EG / SA) مع عرض الاسم المترجم فقط."
                  : "Country is saved as a system code (for example EG/SA) while showing the localized name to you."}
              </p>
            </div>

            <div>
              <Label htmlFor="locale">{t("profile.fields.locale.label")}</Label>
              <select
                id="locale"
                value={effectiveState.locale}
                onChange={(event) =>
                  patchState({
                    locale: event.target.value as "ar" | "en" | "",
                  })
                }
                disabled={!canEdit}
                className="app-control h-11 w-full appearance-none px-4 py-2.5 text-sm"
              >
                <option value="">{t("profile.fields.locale.placeholder")}</option>
                <option value="ar">{t("profile.locale.ar")}</option>
                <option value="en">{t("profile.locale.en")}</option>
              </select>
            </div>

            <div>
              <Label htmlFor="timezone">{t("profile.fields.timezone.label")}</Label>
              <select
                id="timezone"
                value={effectiveState.timezone}
                onChange={(event) => patchState({ timezone: event.target.value })}
                disabled={!canEdit}
                className="app-control h-11 w-full appearance-none px-4 py-2.5 text-sm"
              >
                <option value="">{t("profile.fields.timezone.placeholder")}</option>
                {timezoneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-text-secondary">
                {locale === "ar"
                  ? "يتم حفظ المنطقة الزمنية بصيغة IANA (مثل Asia/Riyadh) لضبط المواعيد بدقة."
                  : "Timezone is saved as an IANA value (for example Asia/Riyadh) for scheduling accuracy."}
              </p>
            </div>

            <div>
              <Label htmlFor="gender">{t("profile.fields.practitionerGender.label")}</Label>
              <select
                id="gender"
                value={effectiveState.practitionerGender}
                onChange={(event) =>
                  patchState({
                    practitionerGender: event.target.value as PractitionerGender | "",
                  })
                }
                disabled={!canEdit}
                className="app-control h-11 w-full appearance-none px-4 py-2.5 text-sm"
              >
                <option value="">{t("profile.fields.practitionerGender.placeholder")}</option>
                {PRACTITIONER_GENDERS.map((gender) => (
                  <option key={gender} value={gender}>
                    {t(`profile.practitionerGender.${gender}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-border-light bg-surface-tertiary/60 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">{t("application.wizard.basicAvatarTitle")}</p>
                <p className="mt-1 text-sm leading-6 text-text-secondary">{t("application.wizard.basicAvatarHint")}</p>
              </div>
              <span className="rounded-full border border-border-light bg-white px-3 py-1 text-xs font-medium text-text-secondary">
                {t("profile.avatar.reviewOnly")}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-light bg-white shadow-[0_14px_30px_-20px_rgba(17,24,39,0.35)]">
                {selectedAvatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedAvatarPreview} alt={t("profile.avatar.alt")} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary-light/40 text-2xl font-semibold text-text-brand">
                    {getInitials(effectiveState.displayName)}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    void handleAvatarFileSelected(event.target.files?.[0] ?? null);
                    event.currentTarget.value = "";
                  }}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => avatarFileInputRef.current?.click()}
                    startIcon={<Upload className="h-4 w-4" />}
                    disabled={!canEdit}
                  >
                    {avatarDraft.file || effectiveState.avatarUrl
                      ? t("profile.avatar.replacePhoto")
                      : t("profile.avatar.choosePhoto")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAvatarRemove}
                    disabled={!canEdit || (!effectiveState.avatarUrl && !avatarDraft.file)}
                  >
                    {t("profile.avatar.removePhoto")}
                  </Button>
                </div>

                <p className="text-xs text-text-secondary">{t("profile.avatar.note")}</p>

                {avatarDraft.file ? (
                  <p className="text-xs font-medium text-text-primary">
                    {t("profile.avatar.selectedFile", { fileName: avatarDraft.file.name })}
                  </p>
                ) : null}

              </div>
            </div>
          </div>
        </div>
      );
    }

    if (currentStep === "professional") {
      return (
        <div data-testid="practitioner-application-step-panel-professional" className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="practitioner-type">{t("profile.fields.practitionerType.label")}</Label>
              <select
                id="practitioner-type"
                value={effectiveState.practitionerType}
                onChange={(event) =>
                  patchState({
                    practitionerType: event.target.value as PractitionerType | "",
                  })
                }
                disabled={!canEdit}
                className="app-control h-11 w-full appearance-none px-4 py-2.5 text-sm"
              >
                <option value="">{t("profile.fields.practitionerType.placeholder")}</option>
                {PRACTITIONER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`profile.practitionerType.${type}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-text-secondary">
                {locale === "ar"
                  ? "نوع الممارس هو التصنيف المهني العام (مثل: طبيب نفسي، أخصائي نفسي)."
                  : "Practitioner type is the broad professional classification (for example Psychologist/Psychiatrist)."}
              </p>
            </div>

            <div>
              <Label htmlFor="professional-title">{t("profile.fields.professionalTitle.label")}</Label>
              <select
                id="professional-title"
                value={effectiveState.professionalTitle}
                onChange={(event) => patchState({ professionalTitle: event.target.value })}
                disabled={!canEdit}
                className="app-control h-11 w-full appearance-none px-4 py-2.5 text-sm"
              >
                <option value="">{t("profile.fields.professionalTitle.placeholder")}</option>
                {professionalTitleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-text-secondary">
                {locale === "ar"
                  ? "اللقب المهني من قائمة موحدة لتحسين جودة البحث والمراجعة."
                  : "Professional title comes from a controlled catalog for better search and review quality."}
              </p>
            </div>

            <div>
              <Label htmlFor="years-of-experience">{t("profile.fields.yearsOfExperience.label")}</Label>
              <InputField
                id="years-of-experience"
                type="number"
                inputMode="numeric"
                value={effectiveState.yearsOfExperience}
                onChange={(event) => patchState({ yearsOfExperience: event.target.value })}
                placeholder={t("profile.fields.yearsOfExperience.placeholder")}
                disabled={!canEdit}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="bio">{t("profile.fields.bio.label")}</Label>
              <TextArea
                id="bio"
                value={effectiveState.bio}
                onChange={(value) => patchState({ bio: value })}
                placeholder={t("profile.fields.bio.placeholder")}
                rows={4}
                disabled={!canEdit}
              />
            </div>

            <div className="md:col-span-2">
              <MultiSelect
                key={`wizard-languages-inline-${effectiveState.languageCodes.join("|")}`}
                label={t("application.wizard.fields.languages.label")}
                options={languageOptions.map((option) => ({
                  ...option,
                  selected: effectiveState.languageCodes.includes(option.value),
                }))}
                defaultSelected={effectiveState.languageCodes}
                onChange={(values) => patchState({ languageCodes: values })}
                disabled={!canEdit}
                hint={t("application.wizard.fields.languages.hint")}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border-light bg-surface-tertiary/60 p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-text-primary">
                {locale === "ar" ? "التخصص الرئيسي والفرعي" : "Primary category and sub-specialties"}
              </p>
              <p className="text-xs text-text-secondary">
                {locale === "ar"
                  ? "التخصص الرئيسي يحدد المسار العام، ثم تختار تخصصات فرعية مرتبطة به."
                  : "Main specialty category defines the track, then you choose related sub-specialties."}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="specialty-category">
                  {locale === "ar" ? "الفئة الرئيسية" : "Main specialty category"}
                </Label>
                <select
                  id="specialty-category"
                  value={activeSpecialtyCategoryId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSpecialtyDraftTouched(true);
                    setSelectedSpecialtyCategoryId(value);
                    setSelectedSpecialtyIds([]);
                  }}
                  disabled={!canEdit || specialtyCategoriesQuery.isLoading}
                  className="app-control h-11 w-full appearance-none px-4 py-2.5 text-sm"
                >
                  <option value="">{locale === "ar" ? "اختر الفئة الرئيسية" : "Choose a main category"}</option>
                  {specialtyCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="sub-specialties">{locale === "ar" ? "التخصصات الفرعية" : "Sub-specialties"}</Label>
                <MultiSelect
                  key={`wizard-sub-specialties-${activeSpecialtyCategoryId}-${activeSpecialtyIds.join("|")}`}
                  label=""
                  options={filteredSpecialties.map((specialty) => ({
                    value: specialty.id,
                    text: specialty.name ?? specialty.slug,
                    selected: activeSpecialtyIds.includes(specialty.id),
                  }))}
                  defaultSelected={activeSpecialtyIds}
                  onChange={(values) => {
                    setSpecialtyDraftTouched(true);
                    setSelectedSpecialtyIds(values);
                  }}
                  disabled={!canEdit || !activeSpecialtyCategoryId}
                  hint={
                    locale === "ar"
                      ? "يمكنك اختيار أكثر من تخصص فرعي من القائمة."
                      : "You can choose multiple sub-specialties from the dropdown."
                  }
                />
                <p className="mt-1.5 text-xs text-text-secondary">
                  {locale === "ar"
                    ? "يمكنك اختيار أكثر من تخصص فرعي من القائمة."
                    : "You can choose multiple sub-specialties from the dropdown."}
                </p>
                {selectedSpecialtyItems.length > 0 ? (
                  <p className="mt-1 text-xs text-text-secondary">
                    {locale === "ar"
                      ? `سيتم اعتبار أول تخصص مختار كتخصص أساسي: ${selectedSpecialtyItems[0]?.name ?? selectedSpecialtyItems[0]?.slug ?? ""}`
                      : `The first selected item will be treated as primary: ${selectedSpecialtyItems[0]?.name ?? selectedSpecialtyItems[0]?.slug ?? ""}`}
                  </p>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <label className="inline-flex items-start gap-2 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-border-strong"
                    checked={wantsOtherSpecialty}
                    onChange={(event) => setWantsOtherSpecialty(event.target.checked)}
                    disabled={!canEdit}
                  />
                  <span>{locale === "ar" ? "أخرى" : "Other"}</span>
                </label>
                {wantsOtherSpecialty ? (
                  <p className="mt-1.5 text-xs text-text-secondary">
                    {locale === "ar"
                      ? 'إذا لم تجد تخصصك، اختر "أخرى" وسيقوم فريق الإدارة بمراجعته لاحقًا.'
                      : "If you cannot find your specialty, choose “Other” and the admin team can review it later."}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveSpecialtiesOnly}
              disabled={!canEdit || !specialtyDirty || setSpecialtiesMutation.isPending}
            >
              {locale === "ar" ? "حفظ التخصصات" : "Save specialties"}
            </Button>
          </div>

        </div>
      );
    }

    if (currentStep === "credentials") {
      return (
        <div data-testid="practitioner-application-step-panel-credentials" className="space-y-5">
          <div className="rounded-2xl border border-border-light bg-white/80 p-4">
            <p className="text-sm font-semibold text-text-primary">
              {locale === "ar" ? "مستندات الهوية الأساسية" : "Required identity documents"}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {locale === "ar"
                ? "يجب رفع صورة البطاقة من الوجهين أو صورة جواز السفر قبل إرسال الطلب."
                : "Upload both sides of the national ID or a passport before submitting."}
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <div className="rounded-xl border border-border-light bg-surface-tertiary/60 p-3">
                <p className="text-xs text-text-secondary">{locale === "ar" ? "بطاقة الهوية — الوجه الأمامي" : "National ID — front side"}</p>
                <p className={`mt-1 text-sm font-semibold ${hasNationalIdFront ? "text-success-700" : "text-warning-700"}`}>
                  {hasNationalIdFront ? (locale === "ar" ? "مرفوع" : "Uploaded") : (locale === "ar" ? "ناقص" : "Missing")}
                </p>
              </div>
              <div className="rounded-xl border border-border-light bg-surface-tertiary/60 p-3">
                <p className="text-xs text-text-secondary">{locale === "ar" ? "بطاقة الهوية — الوجه الخلفي" : "National ID — back side"}</p>
                <p className={`mt-1 text-sm font-semibold ${hasNationalIdBack ? "text-success-700" : "text-warning-700"}`}>
                  {hasNationalIdBack ? (locale === "ar" ? "مرفوع" : "Uploaded") : (locale === "ar" ? "ناقص" : "Missing")}
                </p>
              </div>
              <div className="rounded-xl border border-border-light bg-surface-tertiary/60 p-3">
                <p className="text-xs text-text-secondary">{locale === "ar" ? "جواز السفر" : "Passport"}</p>
                <p className={`mt-1 text-sm font-semibold ${hasPassport ? "text-success-700" : "text-warning-700"}`}>
                  {hasPassport ? (locale === "ar" ? "مرفوع" : "Uploaded") : (locale === "ar" ? "ناقص" : "Missing")}
                </p>
              </div>
            </div>
            {!hasIdentityEvidence ? (
              <p className="mt-3 rounded-xl border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-900">
                {locale === "ar"
                  ? "ناقص: جواز السفر أو صورة البطاقة من الوجهين."
                  : "Missing: passport or both sides of national ID."}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border-light bg-surface-tertiary/60 p-4">
            <p className="mb-3 text-sm font-semibold text-text-primary">
              {locale === "ar" ? "إدارة المؤهلات والمستندات" : "Qualifications and documents"}
            </p>
            <PractitionerCredentialsList isEditable={canEdit} compact />
          </div>
        </div>
      );
    }

    return (
      <div data-testid="practitioner-application-step-panel-paymentSubmit" className="space-y-5">
        <section className="rounded-2xl border border-border-light bg-surface-tertiary/50 p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                {locale === "ar" ? "أسعار الجلسات" : "Session pricing"}
              </p>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                {locale === "ar"
                  ? "اضبط أسعار الجلسات التي تريد مراجعتها قبل الإرسال."
                  : "Set the session prices you want reviewed before submission."}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="price30egp">{t("profile.fields.sessionPrice30Egp.label")}</Label>
              <InputField
                id="price30egp"
                inputMode="decimal"
                value={effectiveState.sessionPrice30Egp}
                onChange={(event) => patchState({ sessionPrice30Egp: event.target.value })}
                placeholder={t("profile.fields.sessionPrice30Egp.placeholder")}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="price30usd">{t("profile.fields.sessionPrice30Usd.label")}</Label>
              <InputField
                id="price30usd"
                inputMode="decimal"
                value={effectiveState.sessionPrice30Usd}
                onChange={(event) => patchState({ sessionPrice30Usd: event.target.value })}
                placeholder={t("profile.fields.sessionPrice30Usd.placeholder")}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="price60egp">{t("profile.fields.sessionPrice60Egp.label")}</Label>
              <InputField
                id="price60egp"
                inputMode="decimal"
                value={effectiveState.sessionPrice60Egp}
                onChange={(event) => patchState({ sessionPrice60Egp: event.target.value })}
                placeholder={t("profile.fields.sessionPrice60Egp.placeholder")}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="price60usd">{t("profile.fields.sessionPrice60Usd.label")}</Label>
              <InputField
                id="price60usd"
                inputMode="decimal"
                value={effectiveState.sessionPrice60Usd}
                onChange={(event) => patchState({ sessionPrice60Usd: event.target.value })}
                placeholder={t("profile.fields.sessionPrice60Usd.placeholder")}
                disabled={!canEdit}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border-light bg-white/70 p-5">
          <div className="flex items-start gap-3">
            <UserRound className="mt-0.5 h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                {locale === "ar" ? "بيانات استلام المستحقات" : "Payout details"}
              </p>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                {locale === "ar"
                  ? "أدخل طريقة الاستلام والبيانات المرتبطة بها إذا كانت مطلوبة."
                  : "Enter the payout method and any required account details."}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="payout-country">{t("profile.fields.payoutCountryCode.label")}</Label>
              <select
                id="payout-country"
                value={payoutCountryCode}
                onChange={(event) => handlePayoutCountryChange(event.target.value)}
                disabled={!canEdit}
                className="app-control h-11 w-full appearance-none px-4 py-2.5 text-sm"
              >
                <option value="">{t("profile.fields.payoutCountryCode.placeholder")}</option>
                {payoutCountryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-5 text-text-secondary">
                {t("profile.fields.payoutCountryCode.hint")}
              </p>
            </div>

            <div>
              <Label htmlFor="payout-method">{t("profile.fields.payoutMethodType.label")}</Label>
              <select
                id="payout-method"
                value={effectiveState.payoutMethodType}
                onChange={(event) => patchState({ payoutMethodType: event.target.value as PractitionerPayoutMethodType | "" })}
                disabled={!canEdit}
                className="app-control h-11 w-full appearance-none px-4 py-2.5 text-sm"
              >
                <option value="">{t("profile.fields.payoutMethodType.placeholder")}</option>
                {PAYOUT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {t(`profile.payoutMethodType.${method}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="payout-account-holder">{t("profile.fields.payoutAccountHolderName.label")}</Label>
              <InputField
                id="payout-account-holder"
                value={effectiveState.payoutAccountHolderName}
                onChange={(event) => patchState({ payoutAccountHolderName: event.target.value })}
                placeholder={t("profile.fields.payoutAccountHolderName.placeholder")}
                disabled={!canEdit}
              />
            </div>

            {effectiveState.payoutMethodType === "BANK_ACCOUNT" ? (
              hasPayoutCountry ? (
                payoutBankOptions.length > 0 ? (
                  <>
                    <div>
                      <Label htmlFor="payout-bank-name">{t("profile.fields.payoutBankName.label")}</Label>
                      <select
                        id="payout-bank-name"
                        value={payoutBankSelectedValue}
                        onChange={(event) => patchState({ payoutBankName: event.target.value })}
                        disabled={!canEdit}
                        className="app-control h-11 w-full appearance-none px-4 py-2.5 text-sm"
                      >
                        <option value="">{t("profile.fields.payoutBankName.placeholder")}</option>
                        {payoutBankOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="payout-bank-account">{t("profile.fields.payoutBankAccountNumber.label")}</Label>
                      <InputField
                        id="payout-bank-account"
                        value={effectiveState.payoutBankAccountNumber}
                        onChange={(event) => patchState({ payoutBankAccountNumber: event.target.value })}
                        placeholder={t("profile.fields.payoutBankAccountNumber.placeholder")}
                        disabled={!canEdit}
                      />
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-2 rounded-2xl border border-dashed border-border-light bg-surface-tertiary/50 px-4 py-4 text-sm leading-6 text-text-secondary">
                    {t("profile.fields.payoutBankName.emptyState")}
                  </div>
                )
              ) : (
                <div className="md:col-span-2 rounded-2xl border border-dashed border-border-light bg-surface-tertiary/50 px-4 py-4 text-sm leading-6 text-text-secondary">
                  {t("profile.fields.payoutBankName.countryPrompt")}
                </div>
              )
            ) : null}

            {effectiveState.payoutMethodType === "IBAN" ? (
              <div className="md:col-span-2">
                <Label htmlFor="payout-iban">{t("profile.fields.payoutIban.label")}</Label>
                <InputField
                  id="payout-iban"
                  value={effectiveState.payoutIban}
                  onChange={(event) => patchState({ payoutIban: event.target.value })}
                  placeholder={t("profile.fields.payoutIban.placeholder")}
                  disabled={!canEdit}
                />
              </div>
            ) : null}

            {effectiveState.payoutMethodType === "WALLET" ? (
              hasPayoutCountry ? (
                payoutWalletProviderOptions.length > 0 ? (
                  <>
                    <div>
                      <Label htmlFor="payout-wallet-provider">{t("profile.fields.payoutWalletProvider.label")}</Label>
                      <select
                        id="payout-wallet-provider"
                        value={payoutWalletProviderSelectedValue}
                        onChange={(event) => patchState({ payoutWalletProvider: event.target.value })}
                        disabled={!canEdit}
                        className="app-control h-11 w-full appearance-none px-4 py-2.5 text-sm"
                      >
                        <option value="">{t("profile.fields.payoutWalletProvider.placeholder")}</option>
                        {payoutWalletProviderOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="payout-wallet-identifier">{t("profile.fields.payoutWalletIdentifier.label")}</Label>
                      <InputField
                        id="payout-wallet-identifier"
                        value={effectiveState.payoutWalletIdentifier}
                        onChange={(event) => patchState({ payoutWalletIdentifier: event.target.value })}
                        placeholder={t("profile.fields.payoutWalletIdentifier.placeholder")}
                        disabled={!canEdit}
                      />
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-2 rounded-2xl border border-dashed border-border-light bg-surface-tertiary/50 px-4 py-4 text-sm leading-6 text-text-secondary">
                    {t("profile.fields.payoutWalletProvider.emptyState")}
                  </div>
                )
              ) : (
                <div className="md:col-span-2 rounded-2xl border border-dashed border-border-light bg-surface-tertiary/50 px-4 py-4 text-sm leading-6 text-text-secondary">
                  {t("profile.fields.payoutWalletProvider.countryPrompt")}
                </div>
              )
            ) : null}

            {effectiveState.payoutMethodType === "OTHER" ? (
              <div className="md:col-span-2">
                <Label htmlFor="payout-other-details">{t("profile.fields.payoutOtherDetails.label")}</Label>
                <TextArea
                  id="payout-other-details"
                  value={effectiveState.payoutOtherDetails}
                  onChange={(value) => patchState({ payoutOtherDetails: value })}
                  placeholder={t("profile.fields.payoutOtherDetails.placeholder")}
                  rows={3}
                  disabled={!canEdit}
                />
              </div>
            ) : null}
          </div>
        </section>
      </div>
    );
  };

  const currentStatusTone =
    currentUiStatus.status === "complete"
      ? "success"
      : currentUiStatus.status === "warning"
        ? "warning"
        : "neutral";

  return (
    <div className="min-h-[calc(100dvh-4rem)] w-full bg-[radial-gradient(circle_at_top,_rgba(68,161,148,0.08),_rgba(237,241,245,0.92)_46%,_rgba(230,236,241,1)_100%)]">
      <div className="w-full px-4 py-6 pb-10 sm:px-6 lg:px-8 lg:pb-12">
        <div className="space-y-8">
          <header className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  {t("application.wizard.eyebrow")}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-text-primary">
                    {t("application.wizard.title")}
                  </h1>
                  <StepTone tone={statusTone}>{getLocalizedApplicationStatus(t, status)}</StepTone>
                  <StepTone tone={canSubmit ? "success" : "warning"}>
                    {canSubmit ? t("application.wizard.canSubmitBadge") : t("application.wizard.cannotSubmitBadge")}
                  </StepTone>
                </div>
                <p className="max-w-4xl text-sm leading-6 text-text-secondary">{t("application.wizard.subtitle")}</p>
                <p className="text-xs font-medium text-text-secondary">
                  {t("application.wizard.stepCount", {
                    current: currentStepIndex + 1,
                    total: uiSteps.length,
                  })}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StepTone tone={currentStatusTone}>{currentStepStatusText}</StepTone>
                {status === "CHANGES_REQUESTED" || status === "REJECTED" ? (
                  <StepTone tone="warning">{t("application.wizard.requestChangesTitle")}</StepTone>
                ) : null}
              </div>
            </div>

            {status === "CHANGES_REQUESTED" || status === "REJECTED" ? (
              application?.reviewDecisionReason || application?.reviewNotes ? (
                <div className="rounded-2xl border border-primary/15 bg-primary-light/45 p-4">
                  <div className="flex items-start gap-3">
                    <PencilLine className="mt-0.5 h-5 w-5 text-text-brand" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-brand">
                        {status === "CHANGES_REQUESTED"
                          ? t("application.wizard.requestChangesTitle")
                          : t("application.wizard.rejectedTitle")}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-text-secondary">
                        {application.reviewDecisionReason ?? application.reviewNotes}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null
            ) : null}
          </header>

          <nav className="grid gap-4 lg:grid-cols-4" aria-label={t("application.wizard.eyebrow")}>
            {uiSteps.map((step, index) => {
              const active = step.key === currentStep;
              const completed = step.status === "complete";
              const stepStatusLabel = !completionReady
                ? locale === "ar"
                  ? "جاري التحقق..."
                  : "Checking..."
                : step.status === "complete"
                  ? t("application.completion.stepStatus.complete")
                  : step.status === "warning"
                    ? t("application.completion.stepStatus.warning")
                    : t("application.completion.stepStatus.incomplete");

              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setSelectedStep(step.key)}
                  data-testid={`practitioner-application-step-${step.key}`}
                  aria-current={active ? "step" : undefined}
                  className={`flex min-w-0 items-center gap-4 rounded-3xl border px-5 py-4 text-start transition ${
                    active
                      ? "border-primary/35 bg-white shadow-[0_12px_30px_-24px_rgba(68,161,148,0.34)]"
                      : "border-border-light bg-white/70 hover:bg-white"
                  }`}
                >
                  <UiStepCircle stepNumber={index + 1} active={active} completed={completed} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-semibold text-text-primary">{step.label}</span>
                      <span className="shrink-0 text-xs font-semibold text-text-secondary">{stepStatusLabel}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-surface-tertiary">
                      <div
                        className="h-1.5 rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${Math.max(4, Math.min(100, step.percent || 4))}%` }}
                      />
                    </div>
                    {step.blockerTitles.length > 0 ? (
                      <p className="mt-2 line-clamp-2 text-xs text-warning-800">
                        {t("application.wizard.missingPrefix")} {step.blockerTitles.join("، ")}
                      </p>
                    ) : step.pendingAdminTitles.length > 0 ? (
                      <p className="mt-2 line-clamp-2 text-xs text-text-muted">
                        {locale === "ar"
                          ? "مرفوعة — بانتظار مراجعة الإدارة"
                          : "Uploaded — pending admin review"}
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </nav>

          <section className="w-full border-y border-border-light bg-white/55 px-4 py-6 sm:px-6 lg:px-8">
            <div className="min-w-0 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold tracking-[-0.02em] text-text-primary">
                    {currentStepData.label}
                  </h2>
                  <p className="mt-1 max-w-4xl text-sm leading-6 text-text-secondary">{stepHelperText}</p>
                </div>
                <StepTone tone={currentStatusTone}>{currentStepStatusText}</StepTone>
              </div>

              <StepIssueStrip issues={currentUiStatus.issues} t={t} />

              {currentStepLayout()}

              {currentStep === "paymentSubmit" ? (
                <div className="space-y-5">
                  <section className="rounded-2xl border border-border-light bg-surface-tertiary/50 p-5">
                    <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text-primary">
                              {locale === "ar" ? "ما الذي ستراجعه الإدارة" : "What the admin team will review"}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-text-secondary">
                              {locale === "ar"
                                ? "البيانات الأساسية، الملف المهني، المؤهلات والمستندات، والدفع والإرسال."
                                : "Basic info, professional profile, qualifications/documents, and payment/submit details."}
                            </p>
                          </div>
                      <StepTone tone={currentStatusTone}>{currentStepStatusText}</StepTone>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {uiSteps.map((step) => (
                        <WizardPill
                          key={`${step.key}-admin-review`}
                          label={step.label}
                          value={t(`application.completion.stepStatus.${step.status}` as Parameters<typeof t>[0])}
                        />
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-border-light bg-white/70 p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 flex h-9 w-9 items-center justify-center rounded-full border ${
                          canSubmit ? "border-success-200 bg-success-50 text-success-700" : "border-warning-200 bg-warning-50 text-warning-700"
                        }`}
                      >
                        {canSubmit ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary">
                          {locale === "ar" ? "جاهزية الإرسال" : "Submission readiness"}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-text-secondary">
                          {canSubmit
                            ? locale === "ar"
                              ? "الطلب جاهز للإرسال. يمكنك المراجعة مرة أخيرة ثم إرسال الطلب."
                              : "Your application is ready to submit. Review one last time, then send it."
                            : locale === "ar"
                              ? "لا يمكن الإرسال الآن. أكمل البيانات المطلوبة أولًا."
                              : "You cannot submit yet. Complete the required items first."}
                        </p>
                      </div>
                    </div>

                    {!canSubmit ? (
                      <div className="mt-4 rounded-2xl border border-warning-200 bg-warning-50/75 p-4 text-sm leading-6 text-warning-900">
                        <p className="font-semibold">{t("application.wizard.blockedTitle")}</p>
                        <p className="mt-1">{t("application.wizard.submitBlocked")}</p>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-success-200 bg-success-50/75 p-4 text-sm leading-6 text-success-800">
                        <p className="font-semibold">{t("application.wizard.readyTitle")}</p>
                        <p className="mt-1">{t("application.wizard.readyBody")}</p>
                      </div>
                    )}
                  </section>
                </div>
              ) : null}
            </div>
          </section>

          <footer className="border-t border-border-light bg-white/75 px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-text-primary">{t("application.wizard.footerTitle")}</p>
                <p className="text-sm text-text-secondary">
                  {currentStep === "paymentSubmit"
                    ? t("application.wizard.footerReviewHint")
                    : t("application.wizard.footerStepHint")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canMovePrevious}
                  onClick={goPrevious}
                  startIcon={<PreviousIcon className="h-4 w-4" />}
                >
                  {t("application.wizard.actions.previous")}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!canEdit || updateProfileMutation.isPending}
                  onClick={saveCurrentStep}
                  startIcon={<Upload className="h-4 w-4" />}
                >
                  {updateProfileMutation.isPending
                    ? t("application.wizard.actions.saving")
                    : t("application.wizard.actions.saveDraft")}
                </Button>

                {currentStep === "paymentSubmit" ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={submitApplication}
                    disabled={!canSubmit || submitMutation.isPending}
                    startIcon={<CheckCircle2 className="h-4 w-4" />}
                  >
                    {submitMutation.isPending
                      ? t("application.wizard.actions.submitting")
                      : status === "CHANGES_REQUESTED" || status === "REJECTED"
                        ? t("application.wizard.actions.resubmit")
                        : t("application.wizard.actions.submit")}
                  </Button>
                ) : (
                  <Button type="button" variant="primary" size="sm" onClick={goNext} endIcon={<NextIcon className="h-4 w-4" />}>
                    {t("application.wizard.actions.next")}
                  </Button>
                )}
              </div>
            </div>
          </footer>
        </div>
      </div>

    </div>
  );
}


