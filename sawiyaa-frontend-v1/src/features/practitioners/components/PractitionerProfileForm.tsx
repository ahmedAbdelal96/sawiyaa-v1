"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import {
  usePractitionerProfile,
  usePractitionerCountries,
  useRemovePractitionerAvatar,
  useUpdatePractitionerAvatar,
  useUpdatePractitionerProfile,
} from "../hooks/use-practitioners";
import type {
  UpdatePractitionerProfileRequest,
  PractitionerType,
  PractitionerGender,
  PractitionerPayoutMethodType,
} from "../types/practitioners.types";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { SearchableCombobox } from "@/components/form/SearchableCombobox";
import { FormSkeleton } from "@/components/shared/LoadingStates";
import {
  getLocalizedBankOptions,
  getLocalizedWalletProviderOptions,
  normalizeBankValue,
  normalizeWalletProviderValue,
  formatIbanForDisplay,
  normalizeAccountHolderName,
  normalizeIban,
  normalizeWalletIdentifier,
  validateAccountHolderName,
  validateIban,
} from "@/lib/catalogs/payout";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProfileFormData = {
  displayName?: string;
  professionalTitle?: string;
  bio?: string;
  yearsOfExperience?: string;
  sessionPrice30Egp?: string;
  sessionPrice30Usd?: string;
  sessionPrice60Egp?: string;
  sessionPrice60Usd?: string;
  practitionerType?: PractitionerType | "";
  practitionerGender?: PractitionerGender | "";
  countryCode?: string;
  payoutCountryCode?: string;
  timezone?: string;
  payoutMethodType?: PractitionerPayoutMethodType | "";
  payoutAccountHolderName?: string;
  payoutBankName?: string;
  payoutBankAccountNumber?: string;
  payoutIban?: string;
  payoutWalletProvider?: string;
  payoutWalletIdentifier?: string;
  payoutOtherDetails?: string;
};

// ---------------------------------------------------------------------------
// Select classes — see DEBT note in PatientProfileForm for explanation
// ---------------------------------------------------------------------------

const selectClasses =
  "h-11 w-full appearance-none rounded-xl border border-border-light bg-surface-secondary px-4 py-2.5 text-sm text-text-primary shadow-theme-xs focus:border-border-focus focus:outline-hidden focus:ring-3 focus:ring-primary/10 dark:border-border-light dark:bg-surface-secondary dark:text-text-primary";

const textareaClasses =
  "w-full min-h-[120px] rounded-xl border border-border-light bg-surface-secondary px-4 py-3 text-sm text-text-primary shadow-theme-xs focus:border-border-focus focus:outline-hidden focus:ring-3 focus:ring-primary/10 dark:border-border-light dark:bg-surface-secondary dark:text-text-primary resize-y";

const PRACTITIONER_TYPES: PractitionerType[] = [
  "PSYCHOLOGIST",
  "PSYCHIATRIST",
  "NUTRITIONIST",
  "WEIGHT_LOSS_SPECIALIST",
  "COUNSELOR",
  "OTHER",
];
const PRACTITIONER_GENDERS: PractitionerGender[] = ["MALE", "FEMALE"];
const PAYOUT_METHOD_TYPES: PractitionerPayoutMethodType[] = [
  "BANK_ACCOUNT",
  "IBAN",
  "WALLET",
  "OTHER",
];

function parseOptionalMoneyInput(value: string | undefined): number | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type PractitionerProfileFormProps = {
  isEditable?: boolean;
};

export default function PractitionerProfileForm({
  isEditable = true,
}: PractitionerProfileFormProps) {
  const t = useTranslations("practitioner-area");
  const locale = useLocale();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = usePractitionerProfile();
  const { mutate, isPending, isError: isMutateError } = useUpdatePractitionerProfile();
  const updateAvatar = useUpdatePractitionerAvatar();
  const removeAvatar = useRemovePractitionerAvatar();

  const profile = data?.profile;

  const profileSchema = useMemo(
    () =>
      z.object({
        displayName: z.string().max(80, { message: t("profile.validation.displayNameMax") }).optional(),
        professionalTitle: z.string().optional(),
        bio: z.string().optional(),
        yearsOfExperience: z
          .string()
          .optional()
          .refine(
            (v) => !v || (!isNaN(Number(v)) && Number(v) >= 0),
            { message: t("profile.validation.yearsMin") }
          )
          .refine(
            (v) => !v || Number(v) <= 60,
            { message: t("profile.validation.yearsMax") }
          ),
        sessionPrice30Egp: z.string().optional().refine(
          (value) => {
            if (!value) return true;
            const trimmed = value.trim();
            if (!trimmed) return true;
            return /^(\d+)(\.\d{1,2})?$/.test(trimmed) && Number(trimmed) > 0;
          },
          { message: t("profile.validation.sessionPriceInvalid") }
        ),
        sessionPrice30Usd: z.string().optional().refine(
          (value) => {
            if (!value) return true;
            const trimmed = value.trim();
            if (!trimmed) return true;
            return /^(\d+)(\.\d{1,2})?$/.test(trimmed) && Number(trimmed) > 0;
          },
          { message: t("profile.validation.sessionPriceInvalid") }
        ),
        sessionPrice60Egp: z.string().optional().refine(
          (value) => {
            if (!value) return true;
            const trimmed = value.trim();
            if (!trimmed) return true;
            return /^(\d+)(\.\d{1,2})?$/.test(trimmed) && Number(trimmed) > 0;
          },
          { message: t("profile.validation.sessionPriceInvalid") }
        ),
        sessionPrice60Usd: z.string().optional().refine(
          (value) => {
            if (!value) return true;
            const trimmed = value.trim();
            if (!trimmed) return true;
            return /^(\d+)(\.\d{1,2})?$/.test(trimmed) && Number(trimmed) > 0;
          },
          { message: t("profile.validation.sessionPriceInvalid") }
        ),
        practitionerType: z.string().optional(),
        practitionerGender: z.string().optional(),
        countryCode: z.string().optional(),
        payoutCountryCode: z.string().optional(),
        timezone: z.string().optional(),
        payoutMethodType: z.string().optional(),
        payoutAccountHolderName: z.string().optional(),
        payoutBankName: z.string().optional(),
        payoutBankAccountNumber: z.string().optional(),
        payoutIban: z.string().optional(),
        payoutWalletProvider: z.string().optional(),
        payoutWalletIdentifier: z.string().optional(),
        payoutOtherDetails: z.string().optional(),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      professionalTitle: "",
      bio: "",
      yearsOfExperience: "",
      sessionPrice30Egp: "",
      sessionPrice30Usd: "",
      sessionPrice60Egp: "",
      sessionPrice60Usd: "",
      practitionerType: "",
      practitionerGender: "",
      countryCode: "",
      payoutCountryCode: "",
      timezone: "",
      payoutMethodType: "",
      payoutAccountHolderName: "",
      payoutBankName: "",
      payoutBankAccountNumber: "",
      payoutIban: "",
      payoutWalletProvider: "",
      payoutWalletIdentifier: "",
      payoutOtherDetails: "",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        displayName: profile.displayName ?? "",
        professionalTitle: profile.professionalTitle ?? "",
        bio: profile.bio ?? "",
        yearsOfExperience: profile.yearsOfExperience != null ? String(profile.yearsOfExperience) : "",
        sessionPrice30Egp: profile.pricing.session30.egp != null ? String(profile.pricing.session30.egp) : "",
        sessionPrice30Usd: profile.pricing.session30.usd != null ? String(profile.pricing.session30.usd) : "",
        sessionPrice60Egp: profile.pricing.session60.egp != null ? String(profile.pricing.session60.egp) : "",
        sessionPrice60Usd: profile.pricing.session60.usd != null ? String(profile.pricing.session60.usd) : "",
        practitionerType: profile.practitionerType ?? "",
        practitionerGender: profile.practitionerGender ?? "",
        countryCode: profile.countryCode ?? "",
        payoutCountryCode: profile.payoutDestination?.countryCode ?? profile.countryCode ?? "",
        timezone: profile.timezone ?? "",
        payoutMethodType: profile.payoutDestination?.methodType ?? "",
        payoutAccountHolderName: profile.payoutDestination?.accountHolderName ?? "",
        payoutBankName: normalizeBankValue(profile.payoutDestination?.bankName ?? ""),
        payoutBankAccountNumber: profile.payoutDestination?.bankAccountNumber ?? "",
        payoutIban: profile.payoutDestination?.iban ?? "",
        payoutWalletProvider: normalizeWalletProviderValue(profile.payoutDestination?.walletProvider ?? ""),
        payoutWalletIdentifier: profile.payoutDestination?.walletIdentifier ?? "",
        payoutOtherDetails: profile.payoutDestination?.otherDetails ?? "",
      });
    }
  }, [profile, reset]);

  const watchedCountryCode = useWatch({ control, name: "countryCode" });
  const watchedPayoutCountryCode = useWatch({ control, name: "payoutCountryCode" });
  const watchedPayoutMethodType = useWatch({ control, name: "payoutMethodType" });
  const watchedPayoutBankName = useWatch({ control, name: "payoutBankName" });
  const watchedPayoutWalletProvider = useWatch({ control, name: "payoutWalletProvider" });
  const countriesQuery = usePractitionerCountries();
  const payoutCountryOptions = useMemo(
    () => (countriesQuery.data ?? []).map((country) => ({
      value: country.isoCode,
      label: `${locale === "ar" ? country.nativeName || country.name : country.name} (${country.isoCode})`,
      description: country.nativeName,
      searchText: `${country.name} ${country.nativeName ?? ""} ${country.isoCode}`,
    })),
    [countriesQuery.data, locale],
  );

  const payoutBankOptions = useMemo(
    () => getLocalizedBankOptions(locale, watchedPayoutCountryCode, watchedPayoutBankName),
    [locale, watchedPayoutCountryCode, watchedPayoutBankName],
  );
  const payoutWalletProviderOptions = useMemo(
    () => getLocalizedWalletProviderOptions(locale, watchedPayoutCountryCode, watchedPayoutWalletProvider),
    [locale, watchedPayoutCountryCode, watchedPayoutWalletProvider],
  );

  const onSubmit = (formData: ProfileFormData) => {
    setSaveSuccess(false);

    const payload: UpdatePractitionerProfileRequest = {};

    if (formData.displayName !== undefined) {
      payload.displayName = formData.displayName || undefined;
    }
    if (formData.professionalTitle !== undefined) {
      payload.professionalTitle = formData.professionalTitle || null;
    }
    if (formData.bio !== undefined) {
      payload.bio = formData.bio || null;
    }
    if (formData.yearsOfExperience !== undefined && formData.yearsOfExperience !== "") {
      payload.yearsOfExperience = Number(formData.yearsOfExperience);
    } else if (formData.yearsOfExperience === "") {
      payload.yearsOfExperience = null;
    }
    if (formData.practitionerType) {
      payload.practitionerType = formData.practitionerType as PractitionerType;
    }
    if (formData.practitionerGender) {
      payload.practitionerGender = formData.practitionerGender as PractitionerGender;
    }
    if (formData.countryCode !== undefined) {
      payload.countryCode = formData.countryCode || null;
    }
    if (formData.timezone !== undefined) {
      payload.timezone = formData.timezone || undefined;
    }
    if (formData.sessionPrice30Egp !== undefined) {
      payload.sessionPrice30Egp = parseOptionalMoneyInput(formData.sessionPrice30Egp);
    }
    if (formData.sessionPrice30Usd !== undefined) {
      payload.sessionPrice30Usd = parseOptionalMoneyInput(formData.sessionPrice30Usd);
    }
    if (formData.sessionPrice60Egp !== undefined) {
      payload.sessionPrice60Egp = parseOptionalMoneyInput(formData.sessionPrice60Egp);
    }
    if (formData.sessionPrice60Usd !== undefined) {
      payload.sessionPrice60Usd = parseOptionalMoneyInput(formData.sessionPrice60Usd);
    }
    if (formData.payoutMethodType) {
      const ownerError = validateAccountHolderName(formData.payoutAccountHolderName);
      if (ownerError) {
        setError("payoutAccountHolderName", { message: t(`profile.validation.${ownerError}`) });
        return;
      }
      if (!formData.payoutCountryCode?.trim() && formData.payoutMethodType !== "OTHER") {
        setError("payoutCountryCode", { message: t("profile.validation.payoutCountryRequired") });
        return;
      }

      const destination: NonNullable<UpdatePractitionerProfileRequest["payoutDestination"]> = {
        methodType: formData.payoutMethodType as PractitionerPayoutMethodType,
        countryCode: formData.payoutCountryCode?.trim().toUpperCase() || undefined,
        accountHolderName: normalizeAccountHolderName(formData.payoutAccountHolderName),
      };
      if (formData.payoutMethodType === "BANK_ACCOUNT") {
        destination.bankName = normalizeBankValue(formData.payoutBankName ?? "");
        destination.bankAccountNumber = formData.payoutBankAccountNumber?.trim() || undefined;
      } else if (formData.payoutMethodType === "IBAN") {
        const ibanResult = validateIban(formData.payoutIban, formData.payoutCountryCode);
        if (!ibanResult.valid) {
          setError("payoutIban", { message: t(`profile.validation.${ibanResult.code}`) });
          return;
        }
        destination.iban = ibanResult.canonical;
      } else if (formData.payoutMethodType === "WALLET") {
        destination.walletProvider = normalizeWalletProviderValue(formData.payoutWalletProvider ?? "");
        destination.walletIdentifier = normalizeWalletIdentifier(formData.payoutWalletIdentifier, formData.payoutCountryCode ?? "");
        if (!destination.walletIdentifier) {
          setError("payoutWalletIdentifier", { message: t("profile.validation.payoutWalletInvalid") });
          return;
        }
      } else {
        destination.otherDetails = formData.payoutOtherDetails?.trim() || undefined;
      }
      payload.payoutDestination = destination;
    }

    mutate(payload, {
      onSuccess: () => {
        setSaveSuccess(true);
        reset(formData);
      },
    });
  };

  const handleAvatarUpdate = async () => {
    const trimmed = (avatarUrlInput ?? profile?.avatarUrl ?? "").trim();
    setAvatarError(null);
    setAvatarSuccess(null);

    if (!trimmed) {
      setAvatarError(t("profile.avatar.validation.required"));
      return;
    }

    try {
      // URL constructor is enough for client-side guard before API call.
      new URL(trimmed);
    } catch {
      setAvatarError(t("profile.avatar.validation.invalidUrl"));
      return;
    }

    try {
      await updateAvatar.mutateAsync({ avatarUrl: trimmed });
      setAvatarSuccess(t("profile.avatar.feedback.updateSuccess"));
    } catch {
      setAvatarError(t("profile.avatar.feedback.updateError"));
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarError(null);
    setAvatarSuccess(null);
    try {
      await removeAvatar.mutateAsync();
      setAvatarUrlInput("");
      setAvatarSuccess(t("profile.avatar.feedback.removeSuccess"));
    } catch {
      setAvatarError(t("profile.avatar.feedback.removeError"));
    }
  };

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <FormSkeleton />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Fetch error
  // -------------------------------------------------------------------------

  if (isError || !profile) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
            <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
            </svg>
          </div>
          <p className="mb-4 text-sm font-medium text-gray-800 dark:text-white">
            {t("profile.feedback.loadError")}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t("profile.feedback.retry")}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Form
  // -------------------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <fieldset disabled={!isEditable} className="space-y-6">
        {!isEditable ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/30 dark:bg-amber-900/10 dark:text-amber-300">
            {t("application.statusMessage.UNDER_REVIEW")}
          </div>
        ) : null}

        {/* Professional Information */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-5 text-base font-semibold text-gray-800 dark:text-white">
            {t("profile.sections.professional")}
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Display Name */}
            <div className="sm:col-span-2">
              <Label htmlFor="displayName">{t("profile.fields.displayName.label")}</Label>
              <Input
                id="displayName"
                type="text"
                placeholder={t("profile.fields.displayName.placeholder")}
                error={!!errors.displayName}
                {...register("displayName")}
              />
              {errors.displayName && (
                <p className="mt-1.5 text-xs text-error-500">{errors.displayName.message}</p>
              )}
            </div>

            {/* Professional Title */}
            <div>
              <Label htmlFor="professionalTitle">{t("profile.fields.professionalTitle.label")}</Label>
              <Input
                id="professionalTitle"
                type="text"
                placeholder={t("profile.fields.professionalTitle.placeholder")}
                error={!!errors.professionalTitle}
                {...register("professionalTitle")}
              />
            </div>

            {/* Practitioner Type */}
            <div>
              <Label htmlFor="practitionerType">{t("profile.fields.practitionerType.label")}</Label>
              <select id="practitionerType" className={selectClasses} {...register("practitionerType")}>
                <option value="">{t("profile.fields.practitionerType.placeholder")}</option>
                {PRACTITIONER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`profile.practitionerType.${type}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="practitionerGender">Gender</Label>
              <select id="practitionerGender" className={selectClasses} {...register("practitionerGender")}>
                <option value="">Select gender</option>
                {PRACTITIONER_GENDERS.map((gender) => (
                  <option key={gender} value={gender}>
                    {gender}
                  </option>
                ))}
              </select>
            </div>

            {/* Bio */}
            <div className="sm:col-span-2">
              <Label htmlFor="bio">{t("profile.fields.bio.label")}</Label>
              <textarea
                id="bio"
                placeholder={t("profile.fields.bio.placeholder")}
                className={textareaClasses}
                {...register("bio")}
              />
            </div>

            {/* Years of Experience */}
            <div>
              <Label htmlFor="yearsOfExperience">{t("profile.fields.yearsOfExperience.label")}</Label>
              <Input
                id="yearsOfExperience"
                type="number"
                placeholder={t("profile.fields.yearsOfExperience.placeholder")}
                error={!!errors.yearsOfExperience}
                {...register("yearsOfExperience")}
              />
              {errors.yearsOfExperience && (
                <p className="mt-1.5 text-xs text-error-500">{errors.yearsOfExperience.message}</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-5 text-base font-semibold text-gray-800 dark:text-white">
            {t("profile.sections.sessionPricing")}
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="sessionPrice30Egp">{t("profile.fields.sessionPrice30Egp.label")}</Label>
              <Input
                id="sessionPrice30Egp"
                type="number"
                step="0.01"
                min="0"
                placeholder={t("profile.fields.sessionPrice30Egp.placeholder")}
                error={!!errors.sessionPrice30Egp}
                {...register("sessionPrice30Egp")}
              />
              {errors.sessionPrice30Egp ? (
                <p className="mt-1.5 text-xs text-error-500">{errors.sessionPrice30Egp.message}</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="sessionPrice30Usd">{t("profile.fields.sessionPrice30Usd.label")}</Label>
              <Input
                id="sessionPrice30Usd"
                type="number"
                step="0.01"
                min="0"
                placeholder={t("profile.fields.sessionPrice30Usd.placeholder")}
                error={!!errors.sessionPrice30Usd}
                {...register("sessionPrice30Usd")}
              />
              {errors.sessionPrice30Usd ? (
                <p className="mt-1.5 text-xs text-error-500">{errors.sessionPrice30Usd.message}</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="sessionPrice60Egp">{t("profile.fields.sessionPrice60Egp.label")}</Label>
              <Input
                id="sessionPrice60Egp"
                type="number"
                step="0.01"
                min="0"
                placeholder={t("profile.fields.sessionPrice60Egp.placeholder")}
                error={!!errors.sessionPrice60Egp}
                {...register("sessionPrice60Egp")}
              />
              {errors.sessionPrice60Egp ? (
                <p className="mt-1.5 text-xs text-error-500">{errors.sessionPrice60Egp.message}</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="sessionPrice60Usd">{t("profile.fields.sessionPrice60Usd.label")}</Label>
              <Input
                id="sessionPrice60Usd"
                type="number"
                step="0.01"
                min="0"
                placeholder={t("profile.fields.sessionPrice60Usd.placeholder")}
                error={!!errors.sessionPrice60Usd}
                {...register("sessionPrice60Usd")}
              />
              {errors.sessionPrice60Usd ? (
                <p className="mt-1.5 text-xs text-error-500">{errors.sessionPrice60Usd.message}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-5 text-base font-semibold text-gray-800 dark:text-white">
            {t("profile.avatar.heading")}
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[auto,1fr] sm:items-start">
            <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border border-border-light bg-surface-secondary sm:mx-0">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={t("profile.avatar.alt")}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">
                  {t("profile.avatar.empty")}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="avatarUrl">{t("profile.avatar.fieldLabel")}</Label>
              <Input
                id="avatarUrl"
                type="url"
                placeholder={t("profile.avatar.placeholder")}
                value={avatarUrlInput ?? profile.avatarUrl ?? ""}
                onChange={(event) => setAvatarUrlInput(event.target.value)}
                error={!!avatarError}
              />
                <p className="mt-1.5 text-xs text-text-muted">{t("profile.avatar.hint")}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleAvatarUpdate}
                  disabled={updateAvatar.isPending}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updateAvatar.isPending
                    ? t("profile.avatar.actions.saving")
                    : t("profile.avatar.actions.save")}
                </button>
                <button
                  type="button"
                  onClick={handleAvatarRemove}
                  disabled={removeAvatar.isPending || !profile.avatarUrl}
                  className="inline-flex items-center justify-center rounded-xl border border-border-light bg-white px-4 py-2 text-sm font-medium text-text-secondary transition hover:border-error-400 hover:text-error-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800"
                >
                  {removeAvatar.isPending
                    ? t("profile.avatar.actions.removing")
                    : t("profile.avatar.actions.remove")}
                </button>
              </div>

              {avatarSuccess ? (
                <p className="text-sm font-medium text-success-600 dark:text-success-400">
                  {avatarSuccess}
                </p>
              ) : null}
              {avatarError ? <p className="text-sm font-medium text-error-500">{avatarError}</p> : null}
            </div>
          </div>
        </div>

        {/* Personal Details */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-5 text-base font-semibold text-gray-800 dark:text-white">
            {t("profile.sections.personal")}
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Country Code */}
            <div>
              <Label htmlFor="countryCode">{t("profile.fields.countryCode.label")}</Label>
              <Input
                id="countryCode"
                type="text"
                placeholder={t("profile.fields.countryCode.placeholder")}
                error={!!errors.countryCode}
                {...register("countryCode")}
              />
            </div>

            {/* Timezone */}
            <div>
              <Label htmlFor="timezone">{t("profile.fields.timezone.label")}</Label>
              <Input
                id="timezone"
                type="text"
                placeholder={t("profile.fields.timezone.placeholder")}
                error={!!errors.timezone}
                {...register("timezone")}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-5 text-base font-semibold text-gray-800 dark:text-white">
            Payout destination
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="payoutMethodType">Payout method</Label>
              <select
                id="payoutMethodType"
                className={selectClasses}
                {...register("payoutMethodType", {
                  onChange: (event) => {
                    for (const field of ["payoutBankName", "payoutBankAccountNumber", "payoutIban", "payoutWalletProvider", "payoutWalletIdentifier", "payoutOtherDetails"] as const) {
                      setValue(field, "", { shouldDirty: true });
                    }
                    setValue("payoutMethodType", event.target.value as PractitionerPayoutMethodType | "", { shouldDirty: true });
                  },
                })}
              >
                <option value="">Select method</option>
                {PAYOUT_METHOD_TYPES.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            {watchedPayoutMethodType && watchedPayoutMethodType !== "OTHER" ? (
              <div className="sm:col-span-2">
                <Label>Payout country</Label>
                <SearchableCombobox
                  options={payoutCountryOptions}
                  value={watchedPayoutCountryCode || null}
                  onChange={(value) => setValue("payoutCountryCode", value, { shouldDirty: true })}
                  placeholder={t("profile.fields.payoutCountryCode.placeholder")}
                  searchPlaceholder={t("profile.fields.payoutCountryCode.placeholder")}
                  error={Boolean(errors.payoutCountryCode)}
                  hint={errors.payoutCountryCode?.message}
                />
              </div>
            ) : null}

            <div>
              <Label htmlFor="payoutAccountHolderName">Account holder name</Label>
              <Input id="payoutAccountHolderName" type="text" {...register("payoutAccountHolderName")} />
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {t("profile.fields.payoutAccountHolderName.warning")}
              </p>
            </div>
            {watchedPayoutMethodType === "BANK_ACCOUNT" ? (
              <>
                <div>
                  <Label htmlFor="payoutBankName">{t("profile.fields.payoutBankName.label")}</Label>
                  <select id="payoutBankName" className={selectClasses} {...register("payoutBankName")}>
                    <option value="">{t("profile.fields.payoutBankName.placeholder")}</option>
                    {payoutBankOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="payoutBankAccountNumber">Bank account number</Label>
                  <Input id="payoutBankAccountNumber" type="text" {...register("payoutBankAccountNumber")} />
                </div>
              </>
            ) : null}
            {watchedPayoutMethodType === "IBAN" ? (
              <div>
                <Label htmlFor="payoutIban">IBAN</Label>
                <Input id="payoutIban" dir="ltr" autoComplete="iban" type="text" {...register("payoutIban", {
                  onChange: (event) => setValue("payoutIban", formatIbanForDisplay(event.target.value), { shouldDirty: true }),
                })} />
                <p className="mt-2 text-sm text-text-secondary">{t("profile.fields.payoutIban.helper")}</p>
                {errors.payoutIban?.message ? <p className="mt-1 text-sm text-error-600">{errors.payoutIban.message}</p> : null}
              </div>
            ) : null}
            {watchedPayoutMethodType === "WALLET" ? (
              <>
                <div>
                  <Label htmlFor="payoutWalletProvider">{t("profile.fields.payoutWalletProvider.label")}</Label>
                  <select id="payoutWalletProvider" className={selectClasses} {...register("payoutWalletProvider")}>
                    <option value="">{t("profile.fields.payoutWalletProvider.placeholder")}</option>
                    {payoutWalletProviderOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="payoutWalletIdentifier">{t("profile.fields.payoutWalletIdentifier.label")}</Label>
                  <Input id="payoutWalletIdentifier" type="text" {...register("payoutWalletIdentifier")} />
                </div>
              </>
            ) : null}
            <div className="sm:col-span-2">
              <Label htmlFor="payoutOtherDetails">Other payout details</Label>
              <textarea id="payoutOtherDetails" className={textareaClasses} {...register("payoutOtherDetails")} />
            </div>
          </div>
        </div>

        {/* Feedback + Submit */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-[24px]">
            {saveSuccess && (
              <p className="text-sm font-medium text-success-600 dark:text-success-400">
                {t("profile.feedback.success")}
              </p>
            )}
            {isMutateError && (
              <p className="text-sm font-medium text-error-500">
                {t("profile.feedback.error")}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending || !isDirty}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-theme-xs transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {isPending ? t("profile.actions.saving") : t("profile.actions.save")}
          </button>
        </div>

      </fieldset>
    </form>
  );
}
