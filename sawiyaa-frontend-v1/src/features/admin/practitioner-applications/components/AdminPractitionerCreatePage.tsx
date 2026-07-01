"use client";

import { useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import Label from "@/components/form/Label";
import MultiSelect from "@/components/form/MultiSelect";
import {
  useCreateAdminPractitionerDirect,
  useUploadAdminDirectPractitionerCredentialFile,
} from "../hooks/use-practitioner-applications";
import AdminUserStepUpDialog from "@/features/admin/users/components/AdminUserStepUpDialog";
import { useAdminStepUp } from "@/features/admin/users/hooks/use-admin-step-up";
import type {
  CreateAdminPractitionerRequest,
} from "../types/practitioner-applications.types";
import type {
  CredentialType,
  PractitionerGender,
  PractitionerPayoutMethodType,
  PractitionerType,
} from "@/features/practitioners/types/practitioners.types";
import { useSpecialties, useSpecialtyCategories } from "@/features/specialties/hooks/use-specialties";
import { SUPPORTED_COUNTRY_CODE_OPTIONS } from "@/constants/reference-data";
import {
  getLocalizedBankOptions,
  getLocalizedWalletProviderOptions,
  normalizeBankValue,
  normalizeWalletProviderValue,
} from "@/lib/catalogs/payout";
import { isStepUpRequiredError, toAppError } from "@/lib/api/errors";

const PRACTITIONER_TYPES: PractitionerType[] = [
  "PSYCHOLOGIST",
  "PSYCHIATRIST",
  "NUTRITIONIST",
  "WEIGHT_LOSS_SPECIALIST",
  "COUNSELOR",
  "OTHER",
];

const CREDENTIAL_TYPES: CredentialType[] = [
  "LICENSE",
  "DEGREE",
  "CERTIFICATION",
  "NATIONAL_ID_FRONT",
  "NATIONAL_ID_BACK",
  "PASSPORT",
  "MEMBERSHIP",
  "OTHER",
];

const PAYOUT_METHODS: PractitionerPayoutMethodType[] = [
  "BANK_ACCOUNT",
  "IBAN",
  "WALLET",
  "OTHER",
];

type StepId = "account" | "professional" | "payout" | "credentials" | "review";

type UploadedCredential = {
  id: string;
  credentialType: CredentialType;
  fileUrl: string;
  expiresAt?: string;
  fileName: string;
  sizeBytes: number;
};

type FormState = {
  email: string;
  password: string;
  displayName: string;
  practitionerType: PractitionerType;
  practitionerGender: PractitionerGender | "";
  professionalTitle: string;
  bio: string;
  yearsOfExperience: string;
  sessionPrice30Egp: string;
  sessionPrice30Usd: string;
  sessionPrice60Egp: string;
  sessionPrice60Usd: string;
  instantBookingPrice30Egp: string;
  instantBookingPrice30Usd: string;
  instantBookingPrice60Egp: string;
  instantBookingPrice60Usd: string;
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
  note: string;
};

type UploadDraft = {
  credentialType: CredentialType;
  expiresAt: string;
  file: File | null;
};

type FieldErrors = Record<string, string>;

const INITIAL_FORM: FormState = {
  email: "",
  password: "",
  displayName: "",
  practitionerType: "PSYCHOLOGIST",
  practitionerGender: "",
  professionalTitle: "",
  bio: "",
  yearsOfExperience: "",
  sessionPrice30Egp: "",
  sessionPrice30Usd: "",
  sessionPrice60Egp: "",
  sessionPrice60Usd: "",
  instantBookingPrice30Egp: "",
  instantBookingPrice30Usd: "",
  instantBookingPrice60Egp: "",
  instantBookingPrice60Usd: "",
  countryCode: "EG",
  languageCodes: ["ar"],
  primarySpecialtyCategoryId: "",
  specialtyIds: [],
  payoutMethodType: "BANK_ACCOUNT",
  accountHolderName: "",
  bankName: "",
  bankAccountNumber: "",
  iban: "",
  walletProvider: "",
  walletIdentifier: "",
  otherDetails: "",
  note: "",
};

const INITIAL_UPLOAD: UploadDraft = {
  credentialType: "DEGREE",
  expiresAt: "",
  file: null,
};

const STEP_ORDER: StepId[] = [
  "account",
  "professional",
  "payout",
  "credentials",
  "review",
];

function parseOptionalPrice(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
}

function formatBytes(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

function compactOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildCompactPayoutDestination(form: FormState) {
  if (!form.payoutMethodType) {
    return null;
  }

  const payload: NonNullable<CreateAdminPractitionerRequest["payoutDestination"]> = {
    methodType: form.payoutMethodType,
  };

  const accountHolderName = compactOptionalText(form.accountHolderName);
  if (accountHolderName) {
    payload.accountHolderName = accountHolderName;
  }

  switch (form.payoutMethodType) {
    case "BANK_ACCOUNT": {
      const bankName = normalizeBankValue(form.bankName);
      if (bankName) {
        payload.bankName = bankName;
      }

      const bankAccountNumber = compactOptionalText(form.bankAccountNumber);
      if (bankAccountNumber) {
        payload.bankAccountNumber = bankAccountNumber;
      }
      break;
    }
    case "IBAN": {
      const iban = compactOptionalText(form.iban)?.toUpperCase();
      if (iban) {
        payload.iban = iban;
      }
      break;
    }
    case "WALLET": {
      const walletProvider = normalizeWalletProviderValue(form.walletProvider);
      if (walletProvider) {
        payload.walletProvider = walletProvider;
      }

      const walletIdentifier = compactOptionalText(form.walletIdentifier);
      if (walletIdentifier) {
        payload.walletIdentifier = walletIdentifier;
      }
      break;
    }
    case "OTHER": {
      const otherDetails = compactOptionalText(form.otherDetails);
      if (otherDetails) {
        payload.otherDetails = otherDetails;
      }
      break;
    }
    default:
      break;
  }

  return payload;
}

function isWalletValidationIssue(text: string) {
  const normalized = text.toLowerCase();
  return normalized.includes("walletprovider") || normalized.includes("wallet provider");
}

function isBankValidationIssue(text: string) {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("bankname") ||
    normalized.includes("bank name") ||
    normalized.includes("bankaccountnumber") ||
    normalized.includes("bank account number") ||
    normalized.includes("iban") ||
    normalized.includes("account holder")
  );
}

export default function AdminPractitionerCreatePage() {
  const t = useTranslations("admin-area");
  const locale = useLocale();
  const router = useRouter();
  const isRtl = locale.startsWith("ar");
  const createMutation = useCreateAdminPractitionerDirect();
  const uploadMutation = useUploadAdminDirectPractitionerCredentialFile();
  const stepUp = useAdminStepUp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<StepId>("account");
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [uploadDraft, setUploadDraft] = useState<UploadDraft>(INITIAL_UPLOAD);
  const [credentials, setCredentials] = useState<UploadedCredential[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [serverDetails, setServerDetails] = useState<string[]>([]);
  const [successState, setSuccessState] = useState<{
    practitionerName: string;
    email: string;
    password: string;
    practitionerProfileId: string;
  } | null>(null);

  const specialtyCategoriesQuery = useSpecialtyCategories(true);
  const specialtiesQuery = useSpecialties(undefined, true);

  const categoryOptions = useMemo(
    () =>
      (specialtyCategoriesQuery.data?.categories ?? []).map((item) => ({
        value: item.id,
        label: item.name,
      })),
    [specialtyCategoriesQuery.data?.categories]
  );

  const specialtiesForCategory = useMemo(
    () =>
      (specialtiesQuery.data?.specialties ?? []).filter((item) =>
        form.primarySpecialtyCategoryId
          ? item.category?.id === form.primarySpecialtyCategoryId
          : false
      ),
    [form.primarySpecialtyCategoryId, specialtiesQuery.data?.specialties]
  );

  const specialtyOptions = useMemo(
    () =>
      specialtiesForCategory.map((item) => ({
        value: item.id,
        text: item.name ?? item.slug,
        selected: form.specialtyIds.includes(item.id),
      })),
    [form.specialtyIds, specialtiesForCategory]
  );

  const languageOptions = useMemo(
    () => [
      {
        value: "ar",
        text: t("applications.directCreate.languageOptions.ar"),
        selected: form.languageCodes.includes("ar"),
      },
      {
        value: "en",
        text: t("applications.directCreate.languageOptions.en"),
        selected: form.languageCodes.includes("en"),
      },
    ],
    [form.languageCodes, t]
  );

  const payoutBankOptions = useMemo(
    () => getLocalizedBankOptions(locale, form.countryCode, form.bankName),
    [form.bankName, form.countryCode, locale]
  );

  const payoutWalletProviderOptions = useMemo(
    () =>
      getLocalizedWalletProviderOptions(
        locale,
        form.countryCode,
        form.walletProvider
      ),
    [form.countryCode, form.walletProvider, locale]
  );

  const hasDegree = credentials.some((item) => item.credentialType === "DEGREE");
  const hasPassport = credentials.some(
    (item) => item.credentialType === "PASSPORT"
  );
  const hasNationalIdFront = credentials.some(
    (item) => item.credentialType === "NATIONAL_ID_FRONT"
  );
  const hasNationalIdBack = credentials.some(
    (item) => item.credentialType === "NATIONAL_ID_BACK"
  );
  const hasIdentityEvidence = hasPassport || (hasNationalIdFront && hasNationalIdBack);

  const normalizedPayload = useMemo<CreateAdminPractitionerRequest | null>(() => {
    const yearsOfExperience = Number(form.yearsOfExperience);
    const sessionPrice30Egp = parseOptionalPrice(form.sessionPrice30Egp);
    const sessionPrice30Usd = parseOptionalPrice(form.sessionPrice30Usd);
    const sessionPrice60Egp = parseOptionalPrice(form.sessionPrice60Egp);
    const sessionPrice60Usd = parseOptionalPrice(form.sessionPrice60Usd);
    const instantBookingPrice30Egp = parseOptionalPrice(form.instantBookingPrice30Egp);
    const instantBookingPrice30Usd = parseOptionalPrice(form.instantBookingPrice30Usd);
    const instantBookingPrice60Egp = parseOptionalPrice(form.instantBookingPrice60Egp);
    const instantBookingPrice60Usd = parseOptionalPrice(form.instantBookingPrice60Usd);

    if (
      [
        sessionPrice30Egp,
        sessionPrice30Usd,
        sessionPrice60Egp,
        sessionPrice60Usd,
        instantBookingPrice30Egp,
        instantBookingPrice30Usd,
        instantBookingPrice60Egp,
        instantBookingPrice60Usd,
      ].some(
        (value) => Number.isNaN(value)
      )
    ) {
      return null;
    }

    const payoutDestination = buildCompactPayoutDestination(form);

    return {
      email: form.email.trim().toLowerCase(),
      password: form.password.trim(),
      displayName: form.displayName.trim(),
      practitionerType: form.practitionerType,
      practitionerGender: form.practitionerGender || null,
      professionalTitle: form.professionalTitle.trim(),
      bio: form.bio.trim(),
      yearsOfExperience,
      sessionPrice30Egp,
      sessionPrice30Usd,
      sessionPrice60Egp,
      sessionPrice60Usd,
      instantBookingPrice30Egp,
      instantBookingPrice30Usd,
      instantBookingPrice60Egp,
      instantBookingPrice60Usd,
      countryCode: form.countryCode.trim().toUpperCase(),
      languageCodes: form.languageCodes.filter(Boolean),
      specialtySelection: {
        primarySpecialtyCategoryId: form.primarySpecialtyCategoryId,
        specialtyIds: form.specialtyIds.filter(Boolean),
      },
      payoutDestination,
      credentials: credentials.map((item) => ({
        credentialType: item.credentialType,
        fileUrl: item.fileUrl,
        expiresAt: item.expiresAt
          ? `${item.expiresAt}T00:00:00.000Z`
          : undefined,
      })),
      note: form.note.trim() || undefined,
    };
  }, [credentials, form]);

  const reviewHighlights = useMemo(
    () => [
      t("applications.directCreate.reviewHighlights.accountReady", {
        email: form.email.trim().toLowerCase() || "—",
      }),
      t("applications.directCreate.reviewHighlights.specialtyReady", {
        count: form.specialtyIds.length,
      }),
      t("applications.directCreate.reviewHighlights.credentialsReady", {
        count: credentials.length,
      }),
    ],
    [credentials.length, form.email, form.specialtyIds.length, t]
  );

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  };

  const fieldError = (key: keyof FormState | "credentials" | "uploadFile") =>
    errors[key] ?? "";

  const validateAccountStep = () => {
    const nextErrors: FieldErrors = {};

    if (!form.email.trim()) {
      nextErrors.email = t("applications.directCreate.validation.emailRequired");
    } else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      nextErrors.email = t("applications.directCreate.validation.emailInvalid");
    }

    if (!form.password.trim()) {
      nextErrors.password = t("applications.directCreate.validation.passwordRequired");
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/.test(form.password.trim())) {
      nextErrors.password = t("applications.directCreate.validation.passwordStrength");
    }

    if (!form.displayName.trim()) {
      nextErrors.displayName = t("applications.directCreate.validation.displayNameRequired");
    }
    if (!form.countryCode.trim()) {
      nextErrors.countryCode = t("applications.directCreate.validation.countryRequired");
    }
    if (!form.practitionerType) {
      nextErrors.practitionerType = t("applications.directCreate.validation.typeRequired");
    }

    return nextErrors;
  };

  const validateProfessionalStep = () => {
    const nextErrors: FieldErrors = {};

    if (!form.professionalTitle.trim()) {
      nextErrors.professionalTitle = t("applications.directCreate.validation.titleRequired");
    }
    if (!form.bio.trim()) {
      nextErrors.bio = t("applications.directCreate.validation.bioRequired");
    } else if (form.bio.trim().length < 10) {
      nextErrors.bio = t("applications.directCreate.validation.bioShort");
    }

    const years = Number(form.yearsOfExperience);
    if (!form.yearsOfExperience.trim()) {
      nextErrors.yearsOfExperience = t("applications.directCreate.validation.yearsRequired");
    } else if (!Number.isFinite(years) || years < 1) {
      nextErrors.yearsOfExperience = t("applications.directCreate.validation.yearsPositive");
    }

    if (form.languageCodes.length === 0) {
      nextErrors.languageCodes = t("applications.directCreate.validation.languagesRequired");
    }
    if (!form.primarySpecialtyCategoryId) {
      nextErrors.primarySpecialtyCategoryId = t("applications.directCreate.validationCategoryRequired");
    }
    if (form.specialtyIds.length === 0) {
      nextErrors.specialtyIds = t("applications.directCreate.validationSpecialtiesRequired");
    }

    return nextErrors;
  };

  const validatePayoutStep = () => {
    const nextErrors: FieldErrors = {};

    if (!form.payoutMethodType) {
      nextErrors.payoutMethodType = t("applications.directCreate.validation.payoutMethodRequired");
    }
    if (!form.accountHolderName.trim()) {
      nextErrors.accountHolderName = t("applications.directCreate.validation.accountHolderRequired");
    }

    if (form.payoutMethodType === "BANK_ACCOUNT") {
      if (!form.bankName.trim()) {
        nextErrors.bankName = t("applications.directCreate.validation.bankNameRequired");
      }
      if (!form.bankAccountNumber.trim()) {
        nextErrors.bankAccountNumber = t(
          "applications.directCreate.validation.bankAccountRequired"
        );
      }
    }

    if (form.payoutMethodType === "IBAN" && !form.iban.trim()) {
      nextErrors.iban = t("applications.directCreate.validation.ibanRequired");
    }

    if (form.payoutMethodType === "WALLET") {
      if (!form.walletProvider.trim()) {
        nextErrors.walletProvider = t(
          "applications.directCreate.validation.walletProviderRequired"
        );
      }
      if (!form.walletIdentifier.trim()) {
        nextErrors.walletIdentifier = t(
          "applications.directCreate.validation.walletIdentifierRequired"
        );
      }
    }

    if (form.payoutMethodType === "OTHER" && !form.otherDetails.trim()) {
      nextErrors.otherDetails = t("applications.directCreate.validation.otherPayoutRequired");
    }

    for (const [key, value] of [
      ["sessionPrice30Egp", parseOptionalPrice(form.sessionPrice30Egp)],
      ["sessionPrice30Usd", parseOptionalPrice(form.sessionPrice30Usd)],
      ["sessionPrice60Egp", parseOptionalPrice(form.sessionPrice60Egp)],
      ["sessionPrice60Usd", parseOptionalPrice(form.sessionPrice60Usd)],
      ["instantBookingPrice30Egp", parseOptionalPrice(form.instantBookingPrice30Egp)],
      ["instantBookingPrice30Usd", parseOptionalPrice(form.instantBookingPrice30Usd)],
      ["instantBookingPrice60Egp", parseOptionalPrice(form.instantBookingPrice60Egp)],
      ["instantBookingPrice60Usd", parseOptionalPrice(form.instantBookingPrice60Usd)],
    ] as const) {
      if (Number.isNaN(value)) {
        nextErrors[key] = t("applications.directCreate.validation.pricePositive");
      }
    }

    return nextErrors;
  };

  const validateCredentialsStep = () => {
    const nextErrors: FieldErrors = {};

    if (!hasDegree) {
      nextErrors.credentials = t("applications.directCreate.validation.degreeRequired");
    } else if (!hasIdentityEvidence) {
      nextErrors.credentials = t("applications.directCreate.validation.identityRequired");
    }

    return nextErrors;
  };

  const validateStep = (target: StepId) => {
    switch (target) {
      case "account":
        return validateAccountStep();
      case "professional":
        return validateProfessionalStep();
      case "payout":
        return validatePayoutStep();
      case "credentials":
        return validateCredentialsStep();
      case "review":
        return {
          ...validateAccountStep(),
          ...validateProfessionalStep(),
          ...validatePayoutStep(),
          ...validateCredentialsStep(),
        };
      default:
        return {};
    }
  };

  const reviewErrors = validateStep("review");
  const canSubmit = Object.keys(reviewErrors).length === 0 && Boolean(normalizedPayload);

  const goNext = () => {
    const nextErrors = validateStep(step);
    if (Object.keys(nextErrors).length > 0) {
      setErrors((current) => ({ ...current, ...nextErrors }));
      setGlobalError(t("applications.directCreate.validation.fixStepErrors"));
      return;
    }

    setGlobalError(null);
    const currentIndex = STEP_ORDER.indexOf(step);
    setStep(STEP_ORDER[Math.min(currentIndex + 1, STEP_ORDER.length - 1)]);
  };

  const goPrevious = () => {
    setGlobalError(null);
    const currentIndex = STEP_ORDER.indexOf(step);
    setStep(STEP_ORDER[Math.max(currentIndex - 1, 0)]);
  };

  const handleUploadCredential = () => {
    const nextErrors: FieldErrors = {};

    if (!uploadDraft.file) {
      nextErrors.uploadFile = t("applications.directCreate.validation.uploadFileRequired");
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors((current) => ({ ...current, ...nextErrors }));
      return;
    }

    const payload = {
      credentialType: uploadDraft.credentialType,
      expiresAt: uploadDraft.expiresAt
        ? `${uploadDraft.expiresAt}T00:00:00.000Z`
        : undefined,
      file: uploadDraft.file as File,
    };

    const runUpload = async () => {
      try {
        const response = await uploadMutation.mutateAsync(payload);
        const file = uploadDraft.file as File;
        setCredentials((current) => [
          ...current,
          {
            id: `${response.credential.credentialType}-${response.credential.fileUrl}`,
            credentialType: response.credential.credentialType,
            fileUrl: response.credential.fileUrl,
            expiresAt: uploadDraft.expiresAt || undefined,
            fileName: file.name,
            sizeBytes: response.credential.sizeBytes,
          },
        ]);
        setUploadDraft(INITIAL_UPLOAD);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setGlobalError(null);
        setErrors((current) => {
          const next = { ...current };
          delete next.credentials;
          delete next.uploadFile;
          return next;
        });
      } catch (cause) {
        const appError = toAppError(cause);

        const message =
          appError.statusCode === 403
            ? t("applications.directCreate.upload.forbidden")
            : t("applications.directCreate.upload.submitError");

        setErrors((current) => ({
          ...current,
          uploadFile: message,
        }));
        setGlobalError(message);
      }
    };

    setGlobalError(null);
    void runUpload();
  };

  const handleSubmit = () => {
    const nextErrors = validateStep("review");
    if (Object.keys(nextErrors).length > 0 || !normalizedPayload) {
      setErrors((current) => ({ ...current, ...nextErrors }));
      setGlobalError(t("applications.directCreate.validation.fixStepErrors"));
      setStep("review");
      return;
    }

    setGlobalError(null);
    setServerDetails([]);

    const runCreate = async () => {
      try {
        const response = await createMutation.mutateAsync(normalizedPayload);
        setSuccessState({
          practitionerName:
            response.practitioner.displayName || normalizedPayload.displayName,
          email: response.practitioner.email,
          password: normalizedPayload.password,
          practitionerProfileId: response.practitioner.practitionerProfileId,
        });
      } catch (cause) {
        const appError = toAppError(cause);

        if (isStepUpRequiredError(appError)) {
          throw appError;
        }

        const response = (cause as {
          response?: {
            data?: {
              message?: string;
              details?: Array<{ messageKey?: string; field?: string; code?: string }>;
            };
          };
        })?.response?.data;

        const flattenedDetails = [
          response?.message ?? "",
          ...(response?.details ?? []).flatMap((item) => [
            item.messageKey ?? "",
            item.code ?? "",
            item.field ?? "",
          ]),
        ]
          .filter(Boolean)
          .join(" ");

        const nextErrors: FieldErrors = {};
        const friendlyDetails: string[] = [];

        if (isWalletValidationIssue(flattenedDetails)) {
          nextErrors.walletProvider = t(
            "applications.directCreate.validation.walletProviderRequired"
          );
          nextErrors.walletIdentifier = t(
            "applications.directCreate.validation.walletIdentifierRequired"
          );
          friendlyDetails.push(
            t("applications.directCreate.validation.walletProviderRequired"),
            t("applications.directCreate.validation.walletIdentifierRequired")
          );
        }

        if (isBankValidationIssue(flattenedDetails)) {
          if (!nextErrors.accountHolderName) {
            nextErrors.accountHolderName = t(
              "applications.directCreate.validation.accountHolderRequired"
            );
            friendlyDetails.push(
              t("applications.directCreate.validation.accountHolderRequired")
            );
          }
          if (flattenedDetails.toLowerCase().includes("bankname")) {
            nextErrors.bankName = t("applications.directCreate.validation.bankNameRequired");
            friendlyDetails.push(t("applications.directCreate.validation.bankNameRequired"));
          }
          if (
            flattenedDetails.toLowerCase().includes("bankaccountnumber") ||
            flattenedDetails.toLowerCase().includes("bank account number")
          ) {
            nextErrors.bankAccountNumber = t(
              "applications.directCreate.validation.bankAccountRequired"
            );
            friendlyDetails.push(
              t("applications.directCreate.validation.bankAccountRequired")
            );
          }
          if (flattenedDetails.toLowerCase().includes("iban")) {
            nextErrors.iban = t("applications.directCreate.validation.ibanRequired");
            friendlyDetails.push(t("applications.directCreate.validation.ibanRequired"));
          }
        }

        if (flattenedDetails.toLowerCase().includes("other details")) {
          nextErrors.otherDetails = t(
            "applications.directCreate.validation.otherPayoutRequired"
          );
          friendlyDetails.push(
            t("applications.directCreate.validation.otherPayoutRequired")
          );
        }

        if (Object.keys(nextErrors).length > 0) {
          setErrors((current) => ({ ...current, ...nextErrors }));
          setStep("payout");
        }

        setGlobalError(
          appError.statusCode === 403
            ? t("applications.directCreate.submitForbidden")
            : t("applications.directCreate.submitError")
        );
        setServerDetails(Array.from(new Set(friendlyDetails)));
      }
    };

    void runCreate().catch((cause) => {
      const appError = toAppError(cause);

      if (isStepUpRequiredError(appError)) {
        stepUp.requestStepUp(async () => {
          await runCreate();
        });
        return;
      }

      setGlobalError(
        appError.statusCode === 403
          ? t("applications.directCreate.submitForbidden")
          : t("applications.directCreate.submitError")
      );
    });
  };

  if (successState) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-status-success-border bg-status-success-soft p-6">
          <p className="text-sm font-semibold text-status-success">
            {t("applications.directCreate.success.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-text-primary">
            {t("applications.directCreate.success.title")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">
            {t("applications.directCreate.success.note")}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-border-light bg-surface-secondary p-6">
            <h3 className="text-base font-semibold text-text-primary">
              {t("applications.directCreate.success.practitionerHeading")}
            </h3>
            <div className="mt-4 grid gap-3 text-sm text-text-secondary sm:grid-cols-2">
              <div>
                <p className="font-medium text-text-primary">
                  {t("applications.directCreate.fields.displayName")}
                </p>
                <p className="mt-1">{successState.practitionerName}</p>
              </div>
              <div>
                <p className="font-medium text-text-primary">
                  {t("applications.directCreate.fields.email")}
                </p>
                <p className="mt-1">{successState.email}</p>
              </div>
              <div>
                <p className="font-medium text-text-primary">
                  {t("applications.directCreate.success.profileId")}
                </p>
                <p className="mt-1 break-all">{successState.practitionerProfileId}</p>
              </div>
              <div>
                <p className="font-medium text-text-primary">
                  {t("applications.directCreate.success.passwordHeading")}
                </p>
                <p className="mt-1 break-all">{successState.password}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border-light bg-surface-secondary p-6">
            <h3 className="text-base font-semibold text-text-primary">
              {t("applications.directCreate.success.nextHeading")}
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li>{t("applications.directCreate.success.nextSteps.credentialShare")}</li>
              <li>{t("applications.directCreate.success.nextSteps.passwordRotation")}</li>
              <li>{t("applications.directCreate.success.nextSteps.profileReady")}</li>
            </ul>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => navigator.clipboard?.writeText(successState.password)}>
                {t("applications.directCreate.success.copyPassword")}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigator.clipboard?.writeText(successState.email)}
              >
                {t("applications.directCreate.success.copyEmail")}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => router.push("/admin/practitioners" as never)}>
            {t("applications.directCreate.success.openPractitioners")}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/admin/practitioner-applications" as never)}
          >
            {t("applications.directCreate.success.backToApplications")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSuccessState(null);
              setForm(INITIAL_FORM);
              setCredentials([]);
              setStep("account");
            }}
          >
            {t("applications.directCreate.success.createAnother")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-border-light bg-surface-secondary p-6">
          <p className="text-sm font-semibold text-text-brand">
            {t("applications.directCreate.heading")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-text-primary">
            {t("applications.directCreate.modalTitle")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
            {t("applications.directCreate.modalDescription")}
          </p>
        </div>

        <div className="rounded-3xl border border-border-light bg-surface-secondary p-6">
          <h3 className="text-sm font-semibold text-text-primary">
            {t("applications.directCreate.summaryHeading")}
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-text-secondary">
            {reviewHighlights.map((item) => (
              <li key={item} className="rounded-2xl bg-surface-tertiary px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-3xl border border-border-light bg-surface-secondary p-4 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {STEP_ORDER.map((item, index) => {
            const isActive = step === item;
            const isDone = STEP_ORDER.indexOf(step) > index;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setStep(item)}
                className={`rounded-2xl px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-primary text-white"
                    : isDone
                      ? "bg-primary-light text-text-brand"
                      : "bg-surface-tertiary text-text-secondary"
                }`}
              >
                {t(`applications.directCreate.steps.${item}.title`)}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-sm text-text-secondary">
          {t(`applications.directCreate.steps.${step}.description`)}
        </p>

        {globalError ? (
          <div className="mt-5 rounded-2xl border border-status-danger-border bg-status-danger-soft px-4 py-3 text-sm text-status-danger">
            <p>{globalError}</p>
            {serverDetails.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs">
                {serverDetails.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6">
          {step === "account" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>{t("applications.directCreate.fields.email")}</Label>
                <InputField
                  type="email"
                  placeholder={t("applications.directCreate.placeholders.email")}
                  value={form.email}
                  error={Boolean(fieldError("email"))}
                  hint={fieldError("email")}
                  onChange={(event) => setField("email", event.target.value)}
                />
              </div>
              <div>
                <Label>{t("applications.directCreate.fields.password")}</Label>
                <InputField
                  type="text"
                  placeholder={t("applications.directCreate.placeholders.password")}
                  value={form.password}
                  error={Boolean(fieldError("password"))}
                  hint={fieldError("password") || t("applications.directCreate.passwordHint")}
                  onChange={(event) => setField("password", event.target.value)}
                />
              </div>
              <div>
                <Label>{t("applications.directCreate.fields.displayName")}</Label>
                <InputField
                  type="text"
                  placeholder={t("applications.directCreate.placeholders.displayName")}
                  value={form.displayName}
                  error={Boolean(fieldError("displayName"))}
                  hint={fieldError("displayName")}
                  onChange={(event) => setField("displayName", event.target.value)}
                />
              </div>
              <div>
                <Label>{t("applications.directCreate.fields.countryCode")}</Label>
                <Select
                  key={`country-${form.countryCode}`}
                  options={SUPPORTED_COUNTRY_CODE_OPTIONS}
                  placeholder={t("applications.directCreate.placeholders.countryCode")}
                  defaultValue={form.countryCode}
                  error={Boolean(fieldError("countryCode"))}
                  hint={fieldError("countryCode")}
                  onChange={(value) => setField("countryCode", value)}
                />
              </div>
              <div>
                <Label>{t("applications.directCreate.fields.practitionerType")}</Label>
                <Select
                  key={`type-${form.practitionerType}`}
                  options={PRACTITIONER_TYPES.map((type) => ({
                    value: type,
                    label: t(`practitionerType.${type}`),
                  }))}
                  placeholder={t("applications.directCreate.placeholders.practitionerType")}
                  defaultValue={form.practitionerType}
                  error={Boolean(fieldError("practitionerType"))}
                  hint={fieldError("practitionerType")}
                  onChange={(value) => setField("practitionerType", value as PractitionerType)}
                />
              </div>
              <div>
                <Label>{t("applications.directCreate.fields.practitionerGender")}</Label>
                <Select
                  key={`gender-${form.practitionerGender || "empty"}`}
                  options={[
                    {
                      value: "MALE",
                      label: t("applications.directCreate.genderOptions.MALE"),
                    },
                    {
                      value: "FEMALE",
                      label: t("applications.directCreate.genderOptions.FEMALE"),
                    },
                  ]}
                  placeholder={t("applications.directCreate.placeholders.gender")}
                  defaultValue={form.practitionerGender}
                  onChange={(value) =>
                    setField("practitionerGender", value as PractitionerGender)
                  }
                />
              </div>
            </div>
          ) : null}

          {step === "professional" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>{t("applications.directCreate.fields.professionalTitle")}</Label>
                <InputField
                  type="text"
                  placeholder={t("applications.directCreate.placeholders.professionalTitle")}
                  value={form.professionalTitle}
                  error={Boolean(fieldError("professionalTitle"))}
                  hint={fieldError("professionalTitle")}
                  onChange={(event) =>
                    setField("professionalTitle", event.target.value)
                  }
                />
              </div>
              <div>
                <Label>{t("applications.directCreate.fields.yearsOfExperience")}</Label>
                <InputField
                  type="number"
                  min={1}
                  placeholder={t("applications.directCreate.placeholders.yearsOfExperience")}
                  value={form.yearsOfExperience}
                  error={Boolean(fieldError("yearsOfExperience"))}
                  hint={fieldError("yearsOfExperience")}
                  onChange={(event) =>
                    setField("yearsOfExperience", event.target.value)
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Label>{t("applications.directCreate.fields.bio")}</Label>
                <TextArea
                  rows={5}
                  placeholder={t("applications.directCreate.placeholders.bio")}
                  value={form.bio}
                  error={Boolean(fieldError("bio"))}
                  hint={fieldError("bio")}
                  onChange={(value) => setField("bio", value)}
                />
              </div>
              <div>
                <Label>{t("applications.directCreate.fields.languageCodes")}</Label>
                <MultiSelect
                  label=""
                  placeholder={t("applications.directCreate.placeholders.languageCodes")}
                  options={languageOptions}
                  defaultSelected={form.languageCodes}
                  error={Boolean(fieldError("languageCodes"))}
                  hint={fieldError("languageCodes")}
                  onChange={(selected) => setField("languageCodes", selected)}
                />
              </div>
              <div>
                <Label>{t("applications.directCreate.fields.primarySpecialtyCategory")}</Label>
                <Select
                  key={`category-${form.primarySpecialtyCategoryId || "empty"}`}
                  options={categoryOptions}
                  placeholder={t("applications.directCreate.placeholders.primarySpecialtyCategory")}
                  defaultValue={form.primarySpecialtyCategoryId}
                  error={Boolean(fieldError("primarySpecialtyCategoryId"))}
                  hint={fieldError("primarySpecialtyCategoryId")}
                  onChange={(value) => {
                    setField("primarySpecialtyCategoryId", value);
                    setField("specialtyIds", []);
                  }}
                />
              </div>
              <div className="md:col-span-2">
                <Label>{t("applications.directCreate.fields.specialties")}</Label>
                <MultiSelect
                  key={`specialties-${form.primarySpecialtyCategoryId || "empty"}-${form.specialtyIds.join("-")}`}
                  label=""
                  placeholder={t("applications.directCreate.placeholders.specialties")}
                  options={specialtyOptions}
                  defaultSelected={form.specialtyIds}
                  disabled={!form.primarySpecialtyCategoryId}
                  error={Boolean(fieldError("specialtyIds"))}
                  hint={
                    fieldError("specialtyIds") ||
                    (!form.primarySpecialtyCategoryId
                      ? t("applications.directCreate.specialtiesEmptyForCategory")
                      : "")
                  }
                  onChange={(selected) => setField("specialtyIds", selected)}
                />
              </div>
            </div>
          ) : null}

          {step === "payout" ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>{t("applications.directCreate.fields.payoutMethodType")}</Label>
                  <Select
                    key={`payout-${form.payoutMethodType || "empty"}`}
                    options={PAYOUT_METHODS.map((method) => ({
                      value: method,
                      label: t(`applications.directCreate.payout.methodOptions.${method}`),
                    }))}
                    defaultValue={form.payoutMethodType}
                    error={Boolean(fieldError("payoutMethodType"))}
                    hint={fieldError("payoutMethodType")}
                    onChange={(value) =>
                      setField("payoutMethodType", value as PractitionerPayoutMethodType)
                    }
                  />
                </div>
                <div>
                  <Label>{t("applications.directCreate.fields.accountHolderName")}</Label>
                  <InputField
                    type="text"
                    placeholder={t("applications.directCreate.placeholders.accountHolderName")}
                    value={form.accountHolderName}
                    error={Boolean(fieldError("accountHolderName"))}
                    hint={fieldError("accountHolderName")}
                    onChange={(event) =>
                      setField("accountHolderName", event.target.value)
                    }
                  />
                </div>
              </div>

              {form.payoutMethodType === "BANK_ACCOUNT" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>{t("applications.directCreate.fields.bankName")}</Label>
                    <Select
                      key={`bank-${form.countryCode}-${form.bankName || "empty"}`}
                      options={payoutBankOptions}
                      placeholder={t("applications.directCreate.placeholders.bankName")}
                      defaultValue={form.bankName}
                      error={Boolean(fieldError("bankName"))}
                      hint={fieldError("bankName")}
                      onChange={(value) => setField("bankName", value)}
                    />
                  </div>
                  <div>
                    <Label>{t("applications.directCreate.fields.bankAccountNumber")}</Label>
                    <InputField
                      type="text"
                      placeholder={t("applications.directCreate.placeholders.bankAccountNumber")}
                      value={form.bankAccountNumber}
                      error={Boolean(fieldError("bankAccountNumber"))}
                      hint={fieldError("bankAccountNumber")}
                      onChange={(event) =>
                        setField("bankAccountNumber", event.target.value)
                      }
                    />
                  </div>
                </div>
              ) : null}

              {form.payoutMethodType === "IBAN" ? (
                <div>
                  <Label>{t("applications.directCreate.fields.iban")}</Label>
                  <InputField
                    type="text"
                    placeholder={t("applications.directCreate.placeholders.iban")}
                    value={form.iban}
                    error={Boolean(fieldError("iban"))}
                    hint={fieldError("iban")}
                    onChange={(event) => setField("iban", event.target.value)}
                  />
                </div>
              ) : null}

              {form.payoutMethodType === "WALLET" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>{t("applications.directCreate.fields.walletProvider")}</Label>
                    <Select
                      key={`wallet-provider-${form.countryCode}-${form.walletProvider || "empty"}`}
                      options={payoutWalletProviderOptions}
                      placeholder={t("applications.directCreate.placeholders.walletProvider")}
                      defaultValue={form.walletProvider}
                      error={Boolean(fieldError("walletProvider"))}
                      hint={fieldError("walletProvider")}
                      onChange={(value) => setField("walletProvider", value)}
                    />
                  </div>
                  <div>
                    <Label>{t("applications.directCreate.fields.walletIdentifier")}</Label>
                    <InputField
                      type="text"
                      placeholder={t("applications.directCreate.placeholders.walletIdentifier")}
                      value={form.walletIdentifier}
                      error={Boolean(fieldError("walletIdentifier"))}
                      hint={fieldError("walletIdentifier")}
                      onChange={(event) =>
                        setField("walletIdentifier", event.target.value)
                      }
                    />
                  </div>
                </div>
              ) : null}

              {form.payoutMethodType === "OTHER" ? (
                <div>
                  <Label>{t("applications.directCreate.fields.otherDetails")}</Label>
                  <TextArea
                    rows={4}
                    placeholder={t("applications.directCreate.placeholders.otherDetails")}
                    value={form.otherDetails}
                    error={Boolean(fieldError("otherDetails"))}
                    hint={fieldError("otherDetails")}
                    onChange={(value) => setField("otherDetails", value)}
                  />
                </div>
              ) : null}

              <div className="rounded-2xl border border-border-light bg-surface-tertiary p-4">
                <h3 className="text-sm font-semibold text-text-primary">
                  {t("applications.directCreate.pricingHeading")}
                </h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>{t("applications.directCreate.fields.sessionPrice30Egp")}</Label>
                    <InputField
                      type="number"
                      min={0}
                      placeholder={t("applications.directCreate.placeholders.sessionPrice30Egp")}
                      value={form.sessionPrice30Egp}
                      error={Boolean(fieldError("sessionPrice30Egp"))}
                      hint={fieldError("sessionPrice30Egp")}
                      onChange={(event) =>
                        setField("sessionPrice30Egp", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>{t("applications.directCreate.fields.sessionPrice30Usd")}</Label>
                    <InputField
                      type="number"
                      min={0}
                      placeholder={t("applications.directCreate.placeholders.sessionPrice30Usd")}
                      value={form.sessionPrice30Usd}
                      error={Boolean(fieldError("sessionPrice30Usd"))}
                      hint={fieldError("sessionPrice30Usd")}
                      onChange={(event) =>
                        setField("sessionPrice30Usd", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>{t("applications.directCreate.fields.sessionPrice60Egp")}</Label>
                    <InputField
                      type="number"
                      min={0}
                      placeholder={t("applications.directCreate.placeholders.sessionPrice60Egp")}
                      value={form.sessionPrice60Egp}
                      error={Boolean(fieldError("sessionPrice60Egp"))}
                      hint={fieldError("sessionPrice60Egp")}
                      onChange={(event) =>
                        setField("sessionPrice60Egp", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>{t("applications.directCreate.fields.sessionPrice60Usd")}</Label>
                    <InputField
                      type="number"
                      min={0}
                      placeholder={t("applications.directCreate.placeholders.sessionPrice60Usd")}
                      value={form.sessionPrice60Usd}
                      error={Boolean(fieldError("sessionPrice60Usd"))}
                      hint={fieldError("sessionPrice60Usd")}
                      onChange={(event) =>
                        setField("sessionPrice60Usd", event.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-border-light bg-surface-tertiary p-4">
                <h3 className="text-sm font-semibold text-text-primary">
                  {t("applications.directCreate.instantPricingHeading")}
                </h3>
                <p className="mt-1 text-xs text-text-secondary">
                  {t("applications.directCreate.instantPricingNote")}
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>{t("applications.directCreate.fields.instantBookingPrice30Egp")}</Label>
                    <InputField
                      type="number"
                      min={0}
                      placeholder={t("applications.directCreate.placeholders.instantBookingPrice30Egp")}
                      value={form.instantBookingPrice30Egp}
                      error={Boolean(fieldError("instantBookingPrice30Egp"))}
                      hint={fieldError("instantBookingPrice30Egp")}
                      onChange={(event) =>
                        setField("instantBookingPrice30Egp", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>{t("applications.directCreate.fields.instantBookingPrice30Usd")}</Label>
                    <InputField
                      type="number"
                      min={0}
                      placeholder={t("applications.directCreate.placeholders.instantBookingPrice30Usd")}
                      value={form.instantBookingPrice30Usd}
                      error={Boolean(fieldError("instantBookingPrice30Usd"))}
                      hint={fieldError("instantBookingPrice30Usd")}
                      onChange={(event) =>
                        setField("instantBookingPrice30Usd", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>{t("applications.directCreate.fields.instantBookingPrice60Egp")}</Label>
                    <InputField
                      type="number"
                      min={0}
                      placeholder={t("applications.directCreate.placeholders.instantBookingPrice60Egp")}
                      value={form.instantBookingPrice60Egp}
                      error={Boolean(fieldError("instantBookingPrice60Egp"))}
                      hint={fieldError("instantBookingPrice60Egp")}
                      onChange={(event) =>
                        setField("instantBookingPrice60Egp", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>{t("applications.directCreate.fields.instantBookingPrice60Usd")}</Label>
                    <InputField
                      type="number"
                      min={0}
                      placeholder={t("applications.directCreate.placeholders.instantBookingPrice60Usd")}
                      value={form.instantBookingPrice60Usd}
                      error={Boolean(fieldError("instantBookingPrice60Usd"))}
                      hint={fieldError("instantBookingPrice60Usd")}
                      onChange={(event) =>
                        setField("instantBookingPrice60Usd", event.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {step === "credentials" ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border-light bg-surface-tertiary p-4">
                <h3 className="text-sm font-semibold text-text-primary">
                  {t("applications.directCreate.credentialsChecklistHeading")}
                </h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-surface-secondary px-4 py-3 text-sm text-text-secondary">
                    {hasDegree
                      ? t("applications.directCreate.requirements.degreeReady")
                      : t("applications.directCreate.requirements.degreeMissing")}
                  </div>
                  <div className="rounded-2xl bg-surface-secondary px-4 py-3 text-sm text-text-secondary">
                    {hasIdentityEvidence
                      ? t("applications.directCreate.requirements.identityReady")
                      : t("applications.directCreate.requirements.identityMissing")}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>{t("applications.directCreate.fields.credentialType")}</Label>
                <Select
                  key={`credential-type-${uploadDraft.credentialType}`}
                  options={CREDENTIAL_TYPES.map((type) => ({
                    value: type,
                    label: t(`applications.directCreate.credentialType.${type}`),
                  }))}
                  placeholder={t("applications.directCreate.placeholders.credentialType")}
                  defaultValue={uploadDraft.credentialType}
                  onChange={(value) =>
                    setUploadDraft((current) => ({
                      ...current,
                        credentialType: value as CredentialType,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>{t("applications.directCreate.fields.credentialExpiresAt")}</Label>
                  <InputField
                    type="date"
                    value={uploadDraft.expiresAt}
                    onChange={(event) =>
                      setUploadDraft((current) => ({
                        ...current,
                        expiresAt: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>{t("applications.directCreate.fields.credentialFile")}</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className={`app-control h-11 w-full rounded-xl border bg-surface-tertiary px-4 py-2 text-sm ${
                      fieldError("uploadFile")
                        ? "border-status-danger text-status-danger"
                        : "border-border-light text-text-primary"
                    }`}
                    onChange={(event) =>
                      setUploadDraft((current) => ({
                        ...current,
                        file: event.target.files?.[0] ?? null,
                      }))
                    }
                  />
                  <p className={`mt-1.5 text-xs ${fieldError("uploadFile") ? "text-status-danger" : "text-text-secondary"}`}>
                    {fieldError("uploadFile") || t("applications.directCreate.upload.hint")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={uploadMutation.isPending}
                  onClick={handleUploadCredential}
                >
                  {uploadMutation.isPending
                    ? t("applications.directCreate.upload.submitting")
                    : t("applications.directCreate.upload.submit")}
                </Button>
              </div>

              <div className="space-y-3">
                {credentials.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border-light bg-surface-tertiary px-4 py-6 text-sm text-text-secondary">
                    {t("applications.directCreate.credentialsEmpty")}
                  </div>
                ) : (
                  credentials.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-2xl border border-border-light bg-surface-tertiary px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-text-primary">
                          {t(`applications.directCreate.credentialType.${item.credentialType}`)}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {item.fileName} · {formatBytes(item.sizeBytes)}
                        </p>
                        {item.expiresAt ? (
                          <p className="mt-1 text-xs text-text-secondary">
                            {t("applications.directCreate.credentialExpirySummary", {
                              date: item.expiresAt,
                            })}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setCredentials((current) =>
                            current.filter((credential) => credential.id !== item.id)
                          )
                        }
                      >
                        {t("applications.directCreate.removeCredential")}
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {fieldError("credentials") ? (
                <p className="text-sm text-status-danger">{fieldError("credentials")}</p>
              ) : null}
            </div>
          ) : null}

          {step === "review" ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border-light bg-surface-tertiary p-4">
                <h3 className="text-sm font-semibold text-text-primary">
                  {t("applications.directCreate.reviewHeading")}
                </h3>
                <p className="mt-2 text-sm text-text-secondary">
                  {t("applications.directCreate.reviewNote")}
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-border-light bg-surface-tertiary p-4">
                  <h4 className="text-sm font-semibold text-text-primary">
                    {t("applications.directCreate.reviewSections.account")}
                  </h4>
                  <dl className="mt-3 space-y-2 text-sm text-text-secondary">
                    <div className="flex justify-between gap-3">
                      <dt>{t("applications.directCreate.fields.displayName")}</dt>
                      <dd>{form.displayName || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{t("applications.directCreate.fields.email")}</dt>
                      <dd>{form.email || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{t("applications.directCreate.fields.practitionerType")}</dt>
                      <dd>{t(`practitionerType.${form.practitionerType}`)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-border-light bg-surface-tertiary p-4">
                  <h4 className="text-sm font-semibold text-text-primary">
                    {t("applications.directCreate.reviewSections.professional")}
                  </h4>
                  <dl className="mt-3 space-y-2 text-sm text-text-secondary">
                    <div className="flex justify-between gap-3">
                      <dt>{t("applications.directCreate.fields.professionalTitle")}</dt>
                      <dd>{form.professionalTitle || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{t("applications.directCreate.fields.yearsOfExperience")}</dt>
                      <dd>{form.yearsOfExperience || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{t("applications.directCreate.fields.languageCodes")}</dt>
                      <dd>{form.languageCodes.join("، ") || "—"}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-border-light bg-surface-tertiary p-4">
                  <h4 className="text-sm font-semibold text-text-primary">
                    {t("applications.directCreate.reviewSections.payout")}
                  </h4>
                  <dl className="mt-3 space-y-2 text-sm text-text-secondary">
                    <div className="flex justify-between gap-3">
                      <dt>{t("applications.directCreate.fields.payoutMethodType")}</dt>
                      <dd>
                        {form.payoutMethodType
                          ? t(`applications.directCreate.payout.methodOptions.${form.payoutMethodType}`)
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{t("applications.directCreate.fields.accountHolderName")}</dt>
                      <dd>{form.accountHolderName || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{t("applications.directCreate.pricingHeading")}</dt>
                      <dd>{t("applications.directCreate.reviewPricingSummary")}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-border-light bg-surface-tertiary p-4">
                  <h4 className="text-sm font-semibold text-text-primary">
                    {t("applications.directCreate.reviewSections.credentials")}
                  </h4>
                  <p className="mt-3 text-sm text-text-secondary">
                    {t("applications.directCreate.reviewCredentialSummary", {
                      count: credentials.length,
                    })}
                  </p>
                </div>
              </div>

              <div>
                <Label>{t("applications.directCreate.fields.note")}</Label>
                <TextArea
                  rows={4}
                  placeholder={t("applications.directCreate.placeholders.note")}
                  value={form.note}
                  onChange={(value) => setField("note", value)}
                />
              </div>

              {Object.keys(reviewErrors).length > 0 ? (
                <div className="rounded-2xl border border-status-danger-border bg-status-danger-soft px-4 py-4 text-sm text-status-danger">
                  <p className="font-medium">
                    {t("applications.directCreate.reviewMissingHeading")}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {Object.values(reviewErrors).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-2xl border border-status-success-border bg-status-success-soft px-4 py-4 text-sm text-status-success">
                  {t("applications.directCreate.reviewReady")}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className={`mt-8 flex flex-wrap items-center gap-3 ${isRtl ? "justify-start" : "justify-end"}`}>
          <Button
            variant="outline"
            onClick={() => router.push("/admin/practitioner-applications" as never)}
          >
            {t("applications.directCreate.cancel")}
          </Button>
          {step !== "account" ? (
            <Button variant="ghost" onClick={goPrevious}>
              {t("applications.directCreate.previous")}
            </Button>
          ) : null}
          {step !== "review" ? (
            <Button onClick={goNext}>{t("applications.directCreate.next")}</Button>
          ) : (
            <Button disabled={!canSubmit || createMutation.isPending} onClick={handleSubmit}>
              {createMutation.isPending
                ? t("applications.directCreate.submitting")
                : t("applications.directCreate.submit")}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-border-light bg-surface-secondary p-6">
        <h3 className="text-sm font-semibold text-text-primary">
          {t("applications.directCreate.footerHeading")}
        </h3>
        <p className="mt-2 text-sm text-text-secondary">
          {t("applications.directCreate.footerNote")}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href="/admin/practitioners"
            className="text-text-brand underline-offset-4 hover:underline"
          >
            {t("applications.directCreate.openPractitioners")}
          </Link>
          <Link
            href="/admin/practitioner-applications"
            className="text-text-brand underline-offset-4 hover:underline"
          >
            {t("applications.directCreate.backToApplications")}
          </Link>
        </div>
      </div>

      <AdminUserStepUpDialog controller={stepUp} />
    </div>
  );
}
