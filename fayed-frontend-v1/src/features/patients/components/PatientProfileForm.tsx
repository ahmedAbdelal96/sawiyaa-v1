"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Loader2, PencilLine, Trash2, Upload, Wallet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  usePatientProfile,
  useRemovePatientAvatar,
  useUpdatePatientProfile,
  useUploadPatientAvatar,
} from "../hooks/use-patients";
import { usePatientWalletSummary } from "@/features/payments/hooks/use-payments";
import type { UpdatePatientProfileRequest } from "../types/patients.types";
import Button from "@/components/ui/button/Button";
import { FormModal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import DateField from "@/components/form/input/DateField";
import FileInput from "@/components/form/input/FileInput";
import Label from "@/components/form/Label";
import { FormSkeleton } from "@/components/shared/LoadingStates";
import { resolvePatientCurrencyCode } from "@/features/payments/lib/patient-currency";

type ProfileFormData = {
  displayName?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "";
  locale?: "ar" | "en" | "";
  timezone?: string;
};

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const selectClasses =
  "app-control h-11 w-full appearance-none px-4 py-2.5 text-sm text-text-primary";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return fallback;
}

function getInitials(name: string | null | undefined): string {
  if (!name) {
    return "P";
  }

  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "P";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDateValue(value: string | null | undefined, locale: string): string {
  if (!value) {
    return "-";
  }

  try {
    return new Date(value).toLocaleDateString(locale.startsWith("ar") ? "ar-EG" : "en-GB");
  } catch {
    return value;
  }
}

function formatMoney(value: string, currencyCode: string, locale: string): string {
  const numberLocale = locale.startsWith("ar") ? "ar-EG" : "en-US";
  return new Intl.NumberFormat(numberLocale, {
    style: "currency",
    currency: currencyCode.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(Number(value));
}

export default function PatientProfileForm() {
  const t = useTranslations("patient-profile");
  const locale = useLocale();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarFeedback, setAvatarFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const { data, isLoading, isError, refetch } = usePatientProfile();
  const { mutate, isPending, isError: isMutateError } = useUpdatePatientProfile();
  const uploadAvatar = useUploadPatientAvatar();
  const removeAvatar = useRemovePatientAvatar();
  const profile = data?.profile;
  const preferredWalletCurrencyCode = resolvePatientCurrencyCode({
    countryCode: profile?.countryCode ?? null,
  });
  const { data: walletSummaryData, isLoading: walletSummaryLoading } = usePatientWalletSummary(
    preferredWalletCurrencyCode ?? undefined,
  );
  const walletSummary = walletSummaryData?.item ?? null;
  const walletCurrencyCode =
    resolvePatientCurrencyCode({
      currencyCode: walletSummary?.currencyCode ?? null,
      countryCode: profile?.countryCode ?? null,
    }) ?? walletSummary?.currencyCode ?? null;

  const avatarPreviewUrl = useMemo(
    () => (selectedAvatarFile ? URL.createObjectURL(selectedAvatarFile) : null),
    [selectedAvatarFile]
  );

  useEffect(() => {
    if (!avatarPreviewUrl) {
      return;
    }
    return () => URL.revokeObjectURL(avatarPreviewUrl);
  }, [avatarPreviewUrl]);

  const profileSchema = useMemo(
    () =>
      z.object({
        displayName: z.string().max(80, { message: t("validation.displayNameMax") }).optional(),
        dateOfBirth: z.string().optional(),
        gender: z.enum(["male", "female", ""]).optional(),
        locale: z.enum(["ar", "en", ""]).optional(),
        timezone: z.string().max(60, { message: t("validation.timezoneMax") }).optional(),
      }),
    [t]
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      dateOfBirth: "",
      gender: "",
      locale: "",
      timezone: "",
    },
  });

  useEffect(() => {
    if (!profile) {
      return;
    }

    reset({
      displayName: profile.displayName ?? "",
      dateOfBirth: profile.dateOfBirth ?? "",
      gender: (profile.gender as "male" | "female" | "") ?? "",
      locale: (profile.locale as "ar" | "en" | "") ?? "",
      timezone: profile.timezone ?? "",
    });
  }, [profile, reset]);

  const openEditModal = () => {
    if (!profile) {
      return;
    }

    setSaveSuccess(false);
    reset({
      displayName: profile.displayName ?? "",
      dateOfBirth: profile.dateOfBirth ?? "",
      gender: (profile.gender as "male" | "female" | "") ?? "",
      locale: (profile.locale as "ar" | "en" | "") ?? "",
      timezone: profile.timezone ?? "",
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
  };

  const submitProfileUpdate = (formData: ProfileFormData) => {
    setSaveSuccess(false);

    const payload: UpdatePatientProfileRequest = {};

    if (formData.displayName !== undefined) {
      payload.displayName = formData.displayName || undefined;
    }
    if (formData.dateOfBirth !== undefined) {
      payload.dateOfBirth = formData.dateOfBirth || null;
    }
    if (formData.gender !== undefined) {
      payload.gender = formData.gender || null;
    }
    if (formData.locale === "ar" || formData.locale === "en") {
      payload.locale = formData.locale;
    }
    if (formData.timezone !== undefined) {
      payload.timezone = formData.timezone || undefined;
    }

    mutate(payload, {
      onSuccess: () => {
        setSaveSuccess(true);
        setIsEditModalOpen(false);
      },
    });
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setAvatarFeedback(null);

    if (!file) {
      setSelectedAvatarFile(null);
      return;
    }

    if (!ALLOWED_AVATAR_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_TYPES)[number])) {
      setSelectedAvatarFile(null);
      setAvatarFeedback({ type: "error", message: t("avatar.validation.invalidType") });
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setSelectedAvatarFile(null);
      setAvatarFeedback({ type: "error", message: t("avatar.validation.fileTooLarge") });
      return;
    }

    setSelectedAvatarFile(file);
  };

  const handleAvatarUpload = async () => {
    if (!selectedAvatarFile) {
      setAvatarFeedback({ type: "error", message: t("avatar.validation.fileRequired") });
      return;
    }

    setAvatarFeedback(null);
    try {
      await uploadAvatar.mutateAsync(selectedAvatarFile);
      setAvatarFeedback({ type: "success", message: t("avatar.feedback.uploadSuccess") });
      setSelectedAvatarFile(null);
    } catch (error) {
      setAvatarFeedback({
        type: "error",
        message: getErrorMessage(error, t("avatar.feedback.uploadError")),
      });
    }
  };

  const handleAvatarRemove = async () => {
    if (selectedAvatarFile) {
      setSelectedAvatarFile(null);
      setAvatarFeedback(null);
      return;
    }

    if (!profile?.avatarUrl) {
      return;
    }

    setAvatarFeedback(null);
    try {
      await removeAvatar.mutateAsync();
      setAvatarFeedback({ type: "success", message: t("avatar.feedback.removeSuccess") });
    } catch (error) {
      setAvatarFeedback({
        type: "error",
        message: getErrorMessage(error, t("avatar.feedback.removeError")),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border-light bg-white p-6">
        <FormSkeleton />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="rounded-2xl border border-border-light bg-white p-6">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="mb-4 text-sm font-medium text-text-primary">{t("feedback.loadError")}</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            {t("actions.retry")}
          </Button>
        </div>
      </div>
    );
  }

  const effectiveAvatarUrl = avatarPreviewUrl ?? profile.avatarDataUrl ?? null;
  const isAvatarBusy = uploadAvatar.isPending || removeAvatar.isPending;

  return (
    <>
      <section className="app-panel rounded-[28px] p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border-light bg-surface-secondary">
              {effectiveAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={effectiveAvatarUrl}
                  alt={t("avatar.alt")}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg font-semibold text-text-muted">
                  {getInitials(profile.displayName)}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">{t("avatar.title")}</h2>
              <p className="text-sm text-text-secondary">{t("avatar.subtitle")}</p>
            </div>
          </div>

          <div className="w-full max-w-md space-y-3">
            <FileInput
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFileChange}
              className="file:bg-primary-light file:text-text-brand"
            />

            {selectedAvatarFile ? (
              <p className="text-xs text-text-secondary">
                {t("avatar.selectedFile", { fileName: selectedAvatarFile.name })}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                type="button"
                onClick={handleAvatarUpload}
                disabled={!selectedAvatarFile || isAvatarBusy}
                startIcon={
                  uploadAvatar.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )
                }
              >
                {uploadAvatar.isPending ? t("avatar.actions.uploading") : t("avatar.actions.upload")}
              </Button>

              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={handleAvatarRemove}
                disabled={isAvatarBusy || (!selectedAvatarFile && !profile.avatarUrl)}
                startIcon={
                  removeAvatar.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )
                }
              >
                {selectedAvatarFile
                  ? t("avatar.actions.clearSelection")
                  : removeAvatar.isPending
                    ? t("avatar.actions.removing")
                    : t("avatar.actions.remove")}
              </Button>
            </div>

              <p className="text-xs text-text-muted">{t("avatar.hint")}</p>

            {avatarFeedback ? (
              <p
                className={`text-sm font-medium ${
                  avatarFeedback.type === "success" ? "text-success-600" : "text-error-500"
                }`}
              >
                {avatarFeedback.message}
              </p>
            ) : null}
          </div>
        </div>
      </section>
      <section className="app-panel rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary">{t("summary.title")}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t("summary.subtitle")}</p>
          </div>
          <Button size="sm" onClick={openEditModal} startIcon={<PencilLine className="h-4 w-4" />}>
            {t("actions.edit")}
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="app-panel-soft rounded-2xl p-3">
            <p className="text-xs text-text-muted">{t("fields.displayName.label")}</p>
            <p className="mt-1 text-sm font-medium text-text-primary">{profile.displayName || "-"}</p>
          </div>
          <div className="app-panel-soft rounded-2xl p-3">
            <p className="text-xs text-text-muted">{t("fields.dateOfBirth.label")}</p>
            <p className="mt-1 text-sm font-medium text-text-primary">
              {formatDateValue(profile.dateOfBirth, locale)}
            </p>
          </div>
          <div className="app-panel-soft rounded-2xl p-3">
            <p className="text-xs text-text-muted">{t("fields.gender.label")}</p>
            <p className="mt-1 text-sm font-medium text-text-primary">
              {profile.gender === "male"
                ? t("fields.gender.options.male")
                : profile.gender === "female"
                  ? t("fields.gender.options.female")
                  : "-"}
            </p>
          </div>
          <div className="app-panel-soft rounded-2xl p-3">
            <p className="text-xs text-text-muted">{t("fields.locale.label")}</p>
            <p className="mt-1 text-sm font-medium text-text-primary">
              {profile.locale === "ar"
                ? t("fields.locale.options.ar")
                : profile.locale === "en"
                  ? t("fields.locale.options.en")
                  : "-"}
            </p>
          </div>
          <div className="app-panel-soft rounded-2xl p-3">
            <p className="text-xs text-text-muted">{t("fields.countryCode.label")}</p>
            <p className="mt-1 text-sm font-medium text-text-primary">{profile.countryCode || "-"}</p>
          </div>
          <div className="app-panel-soft rounded-2xl p-3">
            <p className="text-xs text-text-muted">{t("fields.timezone.label")}</p>
            <p className="mt-1 text-sm font-medium text-text-primary">{profile.timezone || "-"}</p>
          </div>
        </div>

        {saveSuccess ? (
          <p className="mt-4 text-sm font-medium text-success-600">{t("feedback.success")}</p>
        ) : null}
      </section>

      <section className="app-panel rounded-[28px] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-text-primary">{t("wallet.title")}</h2>
          </div>
          <p className="text-xs text-text-muted">{t("wallet.hint")}</p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="app-panel-soft rounded-2xl p-3">
            <p className="text-xs text-text-muted">{t("wallet.availableLabel")}</p>
            <p className="mt-1 text-base font-semibold text-text-primary">
              {walletSummaryLoading
                ? t("wallet.loading")
                : walletCurrencyCode
                  ? formatMoney(walletSummary?.availableBalance ?? "0", walletCurrencyCode, locale)
                  : walletSummary?.availableBalance ?? "0"}
            </p>
          </div>
          <div className="app-panel-soft rounded-2xl p-3">
            <p className="text-xs text-text-muted">{t("wallet.reservedLabel")}</p>
            <p className="mt-1 text-base font-semibold text-text-primary">
              {walletSummaryLoading
                ? t("wallet.loading")
                : walletCurrencyCode
                  ? formatMoney(walletSummary?.reservedBalance ?? "0", walletCurrencyCode, locale)
                  : walletSummary?.reservedBalance ?? "0"}
            </p>
          </div>
        </div>
      </section>

      <FormModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        title={t("editModal.title")}
        description={t("editModal.description")}
        submitLabel={isPending ? t("actions.saving") : t("actions.save")}
        cancelLabel={t("actions.cancel")}
        onSubmit={handleSubmit(submitProfileUpdate)}
        onCancel={closeEditModal}
        loading={isPending}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="displayName">{t("fields.displayName.label")}</Label>
            <Input
              id="displayName"
              type="text"
              placeholder={t("fields.displayName.placeholder")}
              error={!!errors.displayName}
              {...register("displayName")}
            />
            {errors.displayName ? (
              <p className="mt-1.5 text-xs text-error-500">{errors.displayName.message}</p>
            ) : null}
          </div>

          <div>
            <Controller
              control={control}
              name="dateOfBirth"
              render={({ field }) => (
                <DateField
                  label={t("fields.dateOfBirth.label")}
                  placeholder={t("fields.dateOfBirth.placeholder")}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  error={errors.dateOfBirth?.message}
                />
              )}
            />
          </div>

          <div>
            <Label htmlFor="gender">{t("fields.gender.label")}</Label>
            <select id="gender" className={selectClasses} {...register("gender")}>
              <option value="">{t("fields.gender.placeholder")}</option>
              <option value="male">{t("fields.gender.options.male")}</option>
              <option value="female">{t("fields.gender.options.female")}</option>
            </select>
          </div>

          <div>
            <Label htmlFor="locale">{t("fields.locale.label")}</Label>
            <select id="locale" className={selectClasses} {...register("locale")}>
              <option value="">{t("fields.locale.placeholder")}</option>
              <option value="ar">{t("fields.locale.options.ar")}</option>
              <option value="en">{t("fields.locale.options.en")}</option>
            </select>
          </div>

          
          <div className="sm:col-span-2">
            <Label htmlFor="timezone">{t("fields.timezone.label")}</Label>
            <Input
              id="timezone"
              type="text"
              placeholder={t("fields.timezone.placeholder")}
              error={!!errors.timezone}
              {...register("timezone")}
            />
            {errors.timezone ? (
              <p className="mt-1.5 text-xs text-error-500">{errors.timezone.message}</p>
            ) : null}
          </div>
        </div>

        {isMutateError ? <p className="mt-4 text-sm font-medium text-error-500">{t("feedback.error")}</p> : null}
      </FormModal>
    </>
  );
}
