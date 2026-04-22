"use client";

import { useState } from "react";
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

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{heading}</h2>
      {children}
    </div>
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

function PayoutValue({ value }: { value: string | null }) {
  return value || "-";
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

  if (isLoading) {
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

  const { applicant, profile, credentials, payoutDestination, application, readinessSnapshot } = data.details;
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

  const updateForm = (patch: Partial<EditableDraftForm>) => {
    setDraftSavedResult(null);
    setForm((prev) => ({
      ...(prev ?? effectiveForm),
      ...patch,
    }));
  };

  const selectedPayoutMethod = effectiveForm.payoutMethodType;

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
    const yearsValue = effectiveForm.yearsOfExperience.trim();
    const yearsOfExperience =
      yearsValue.length > 0 ? Number(yearsValue) : null;

    if (!trimmedDisplayName) {
      setDraftSavedResult("error");
      return;
    }
    if (!trimmedCategoryId || specialtyIds.length === 0) {
      setDraftSavedResult("error");
      return;
    }
    if (languageCodes.length === 0) {
      setDraftSavedResult("error");
      return;
    }
    if (
      yearsOfExperience !== null &&
      (!Number.isFinite(yearsOfExperience) || yearsOfExperience < 0)
    ) {
      setDraftSavedResult("error");
      return;
    }

    const payoutDestination =
      selectedPayoutMethod === ""
        ? null
        : {
            methodType: selectedPayoutMethod,
            accountHolderName: effectiveForm.accountHolderName.trim() || undefined,
            bankName: effectiveForm.bankName.trim() || undefined,
            bankAccountNumber: effectiveForm.bankAccountNumber.trim() || undefined,
            iban: effectiveForm.iban.trim() || undefined,
            walletProvider: effectiveForm.walletProvider.trim() || undefined,
            walletIdentifier: effectiveForm.walletIdentifier.trim() || undefined,
            otherDetails: effectiveForm.otherDetails.trim() || undefined,
          };

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
          specialtySelection: {
            primarySpecialtyCategoryId: trimmedCategoryId,
            specialtyIds,
          },
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
    approve(
      { id: applicationId, data: { note: approveNote || undefined } },
      {
        onSuccess: () => setApproveResult("success"),
        onError: () => setApproveResult("error"),
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

  return (
    <div className="space-y-4">
      <Section heading={t("applicationDetails.sections.profileEdit")}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div>
              <Label>{t("applicationDetails.applicant.displayName")}</Label>
              <InputField
                type="text"
                value={effectiveForm.displayName}
                onChange={(e) => updateForm({ displayName: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("applicationDetails.profile.type")}</Label>
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
              />
            </div>
            <div>
              <Label>{t("applicationDetails.profile.gender")}</Label>
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
            </div>
            <div>
              <Label>{t("applicationDetails.profile.title")}</Label>
              <InputField
                type="text"
                value={effectiveForm.professionalTitle}
                onChange={(e) => updateForm({ professionalTitle: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("applicationDetails.profile.years")}</Label>
              <InputField
                type="number"
                min={0}
                value={effectiveForm.yearsOfExperience}
                onChange={(e) => updateForm({ yearsOfExperience: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("applicationDetails.applicant.country")}</Label>
              <Select
                key={`edit-country-${SUPPORTED_COUNTRY_CODE_OPTIONS.length}-${effectiveForm.countryCode}`}
                options={SUPPORTED_COUNTRY_CODE_OPTIONS}
                defaultValue={effectiveForm.countryCode}
                onChange={(value) => updateForm({ countryCode: value })}
              />
            </div>
            <div>
              <Label>{t("applicationDetails.profile.languages")}</Label>
              <MultiSelect
                key={`edit-languages-${effectiveForm.languageCodes.join("-")}`}
                label=""
                options={languageOptions}
                defaultSelected={effectiveForm.languageCodes}
                onChange={(selected) => updateForm({ languageCodes: selected })}
              />
            </div>
            <div>
              <Label>{t("applicationDetails.profile.bio")}</Label>
              <TextArea
                rows={4}
                value={effectiveForm.bio}
                onChange={(value) => updateForm({ bio: value })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>
                {t("applicationDetails.profile.primarySpecialtyCategory")}
              </Label>
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
              />
            </div>
            <div>
              <Label>{t("applicationDetails.profile.subSpecialties")}</Label>
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
              />
            </div>
            <div>
              <Label>{t("applicationDetails.payout.method")}</Label>
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
              />
            </div>
            {selectedPayoutMethod ? (
              <div className="grid gap-3 rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                <div>
                  <Label>{t("applicationDetails.payout.accountHolderName")}</Label>
                  <InputField
                    type="text"
                    value={effectiveForm.accountHolderName}
                    onChange={(e) =>
                      updateForm({ accountHolderName: e.target.value })
                    }
                  />
                </div>
                {selectedPayoutMethod === "BANK_ACCOUNT" ? (
                  <>
                    <div>
                      <Label>{t("applicationDetails.payout.bankName")}</Label>
                      <InputField
                        type="text"
                        value={effectiveForm.bankName}
                        onChange={(e) => updateForm({ bankName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>
                        {t("applicationDetails.payout.bankAccountNumber")}
                      </Label>
                      <InputField
                        type="text"
                        value={effectiveForm.bankAccountNumber}
                        onChange={(e) =>
                          updateForm({ bankAccountNumber: e.target.value })
                        }
                      />
                    </div>
                  </>
                ) : null}
                {selectedPayoutMethod === "IBAN" ? (
                  <div>
                    <Label>IBAN</Label>
                    <InputField
                      type="text"
                      value={effectiveForm.iban}
                      onChange={(e) => updateForm({ iban: e.target.value })}
                    />
                  </div>
                ) : null}
                {selectedPayoutMethod === "WALLET" ? (
                  <>
                    <div>
                      <Label>{t("applicationDetails.payout.walletProvider")}</Label>
                      <InputField
                        type="text"
                        value={effectiveForm.walletProvider}
                        onChange={(e) =>
                          updateForm({ walletProvider: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>
                        {t("applicationDetails.payout.walletIdentifier")}
                      </Label>
                      <InputField
                        type="text"
                        value={effectiveForm.walletIdentifier}
                        onChange={(e) =>
                          updateForm({ walletIdentifier: e.target.value })
                        }
                      />
                    </div>
                  </>
                ) : null}
                {selectedPayoutMethod === "OTHER" ? (
                  <div>
                    <Label>{t("applicationDetails.payout.otherDetails")}</Label>
                    <TextArea
                      rows={3}
                      value={effectiveForm.otherDetails}
                      onChange={(value) => updateForm({ otherDetails: value })}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
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

      <Section heading={t("applicationDetails.sections.applicant")}>
        <dl className="space-y-3">
          <Field label={t("applicationDetails.applicant.displayName")} value={applicant.displayName ?? "-"} />
          <Field label={t("applicationDetails.applicant.email")} value={applicant.email.address ?? "-"} />
          <Field label={t("applicationDetails.applicant.phone")} value={applicant.phone.number ?? "-"} />
          <Field label={t("applicationDetails.applicant.country")} value={applicant.countryCode ?? "-"} />
          <Field label={t("applicationDetails.applicant.accountStatus")} value={applicant.accountStatus} />
        </dl>
      </Section>

      <Section heading={t("applicationDetails.sections.profile")}>
        <dl className="space-y-3">
          <Field label={t("applicationDetails.profile.type")} value={t(`practitionerType.${profile.practitionerType as PractitionerType}`)} />
          <Field label={t("applicationDetails.profile.profileStatus")} value={profile.profileStatus} />
          <Field label={t("applicationDetails.profile.title")} value={profile.professionalTitle ?? "-"} />
          <Field label={t("applicationDetails.profile.bio")} value={profile.bio ?? "-"} />
          <Field label={t("applicationDetails.profile.years")} value={profile.yearsOfExperience != null ? String(profile.yearsOfExperience) : "-"} />
          <Field label={t("applicationDetails.profile.languages")} value={profile.languages.length > 0 ? profile.languages.join(", ") : "-"} />
          <Field
            label={t("applicationDetails.profile.specialties")}
            value={
              profile.specialties.length === 0 ? (
                t("applicationDetails.profile.noSpecialties")
              ) : (
                <ul className="space-y-1">
                  {profile.specialties.map((s) => (
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

      <Section heading={t("applicationDetails.sections.payout")}>
        <dl className="space-y-3">
          <Field
            label={t("applicationDetails.payout.method")}
            value={
              payoutDestination?.methodType
                ? t(
                    `applicationDetails.payout.methodOptions.${payoutDestination.methodType as PractitionerPayoutMethodType}`
                  )
                : "-"
            }
          />
          <Field
            label={t("applicationDetails.payout.accountHolderName")}
            value={<PayoutValue value={payoutDestination?.accountHolderName ?? null} />}
          />
          <Field
            label={t("applicationDetails.payout.bankName")}
            value={<PayoutValue value={payoutDestination?.bankName ?? null} />}
          />
          <Field
            label={t("applicationDetails.payout.bankAccountNumber")}
            value={<PayoutValue value={payoutDestination?.bankAccountNumber ?? null} />}
          />
          <Field
            label="IBAN"
            value={<PayoutValue value={payoutDestination?.iban ?? null} />}
          />
          <Field
            label={t("applicationDetails.payout.walletProvider")}
            value={<PayoutValue value={payoutDestination?.walletProvider ?? null} />}
          />
          <Field
            label={t("applicationDetails.payout.walletIdentifier")}
            value={<PayoutValue value={payoutDestination?.walletIdentifier ?? null} />}
          />
          <Field
            label={t("applicationDetails.payout.otherDetails")}
            value={<PayoutValue value={payoutDestination?.otherDetails ?? null} />}
          />
        </dl>
      </Section>

      <Section heading={t("applicationDetails.sections.application")}>
        <dl className="space-y-3">
          <Field
            label={t("applicationDetails.application.status")}
            value={
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColour[application.status]}`}>
                {t(`status.${application.status}`)}
              </span>
            }
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
    </div>
  );
}
