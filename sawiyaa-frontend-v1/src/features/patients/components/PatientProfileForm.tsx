"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Loader2, PencilLine, Trash2, Upload, Wallet, Info, User, HelpCircle } from "lucide-react";
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
import {
  ProfileWorkspaceShell,
  ProfileWorkspaceCard,
  ProfileTabs,
  ProfileSummaryCard,
  ProfileInfoSection,
  ProfileInfoRow,
  ProfileInfoGrid,
} from "@/components/shared/profile/ProfileWorkspaceKit";
import Avatar from "@/components/ui/avatar/Avatar";
import CollapsibleHelpCenter from "@/components/shared/CollapsibleHelpCenter";
import { useAuthState } from "@/stores/auth-store";

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
  const { user } = useAuthState();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarFeedback, setAvatarFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const [showPhotoPanel, setShowPhotoPanel] = useState(false);

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
    <ProfileWorkspaceShell>
      {saveSuccess ? (
        <div className="rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
          {t("feedback.success")}
        </div>
      ) : null}

      <ProfileWorkspaceCard>
        {/* Content Area: Grid */}
        <div className="p-5 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
          {/* Summary Card */}
          <aside className="space-y-4">
            <ProfileSummaryCard>
              <Avatar
                src={effectiveAvatarUrl}
                name={profile.displayName ?? ""}
                size="custom"
                className="h-24 w-24 border-2 border-primary/20 bg-surface-secondary"
              />
              <h2 className="mt-3 text-lg font-bold text-text-primary dark:text-white/95 leading-tight">
                {profile.displayName || t("page.title")}
              </h2>
              <p className="mt-1 text-xs text-text-secondary dark:text-white/60 truncate max-w-[240px]">
                {user?.email || ""}
              </p>
              
              <div className="mt-3.5 w-full border-t border-slate-100 dark:border-white/5 pt-3.5 space-y-1.5 text-xs text-text-muted">
                <div className="flex items-center justify-between">
                  <span>{t("fields.countryCode.label")}</span>
                  <span className="font-semibold text-text-primary">{profile.countryCode || "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t("fields.locale.label")}</span>
                  <span className="font-semibold text-text-primary">
                    {profile.locale === "ar"
                      ? t("fields.locale.options.ar")
                      : profile.locale === "en"
                        ? t("fields.locale.options.en")
                        : "-"}
                  </span>
                </div>
              </div>

              <div className="mt-4 w-full border-t border-slate-100 dark:border-white/5 pt-3 space-y-2">
                <Button
                  size="sm"
                  onClick={openEditModal}
                  startIcon={<PencilLine className="h-4 w-4" />}
                  className="w-full"
                >
                  {t("actions.edit")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPhotoPanel(!showPhotoPanel)}
                  startIcon={<Camera className="h-4 w-4" />}
                  className="w-full"
                >
                  {t("avatar.actions.changePhoto")}
                </Button>
              </div>

              {showPhotoPanel && (
                <div className="mt-3.5 w-full border-t border-slate-100 dark:border-white/5 pt-3.5 space-y-2.5">
                  <div className="text-xs font-semibold text-text-primary">
                    {t("avatar.title")}
                  </div>
                  <FileInput
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarFileChange}
                    className="file:bg-primary-light file:text-text-brand text-xs"
                  />
                  {selectedAvatarFile && (
                    <p className="text-xs text-text-secondary truncate max-w-[200px]">
                      {t("avatar.selectedFile", { fileName: selectedAvatarFile.name })}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAvatarUpload}
                      disabled={!selectedAvatarFile || isAvatarBusy}
                      className="flex-1 font-medium"
                      startIcon={
                        uploadAvatar.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )
                      }
                    >
                      {uploadAvatar.isPending ? t("avatar.actions.uploading") : t("avatar.actions.upload")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAvatarRemove}
                      disabled={isAvatarBusy || (!selectedAvatarFile && !profile.avatarUrl)}
                      className="flex-1 font-medium"
                      startIcon={
                        removeAvatar.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
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
                  <p className="text-[10px] text-text-muted leading-tight">{t("avatar.hint")}</p>
                  {avatarFeedback && (
                    <p
                      className={`text-xs font-medium ${
                        avatarFeedback.type === "success" ? "text-success-600" : "text-error-500"
                      }`}
                    >
                      {avatarFeedback.message}
                    </p>
                  )}
                </div>
              )}
            </ProfileSummaryCard>
          </aside>

          {/* Main Content Areas */}
          <main className="space-y-5">
            {/* 1. Personal Details */}
            <ProfileInfoSection
              title={t("summary.title")}
              subtitle={t("summary.subtitle")}
              action={
                <Button size="sm" onClick={openEditModal} startIcon={<PencilLine className="h-4 w-4" />}>
                  {t("actions.edit")}
                </Button>
              }
            >
              <ProfileInfoGrid columns={2}>
                <ProfileInfoRow
                  label={t("fields.displayName.label")}
                  value={profile.displayName}
                  icon={<User className="h-4 w-4" />}
                />
                <ProfileInfoRow
                  label={t("fields.email.label")}
                  value={user?.email}
                  icon={<Info className="h-4 w-4" />}
                />
                <ProfileInfoRow
                  label={t("fields.dateOfBirth.label")}
                  value={formatDateValue(profile.dateOfBirth, locale)}
                  icon={<Info className="h-4 w-4" />}
                />
                <ProfileInfoRow
                  label={t("fields.gender.label")}
                  value={
                    profile.gender === "male"
                      ? t("fields.gender.options.male")
                      : profile.gender === "female"
                        ? t("fields.gender.options.female")
                        : "-"
                  }
                  icon={<User className="h-4 w-4" />}
                />
                <ProfileInfoRow
                  label={t("fields.locale.label")}
                  value={
                    profile.locale === "ar"
                      ? t("fields.locale.options.ar")
                      : profile.locale === "en"
                        ? t("fields.locale.options.en")
                        : "-"
                  }
                  icon={<Info className="h-4 w-4" />}
                />
                <ProfileInfoRow
                  label={t("fields.countryCode.label")}
                  value={profile.countryCode}
                  icon={<Info className="h-4 w-4" />}
                />
                <ProfileInfoRow
                  label={t("fields.timezone.label")}
                  value={profile.timezone}
                  icon={<Info className="h-4 w-4" />}
                />
              </ProfileInfoGrid>
            </ProfileInfoSection>

            {/* 2. Wallet / Payments Section */}
            <ProfileInfoSection title={t("wallet.title")} subtitle={t("wallet.hint")} icon={<Wallet className="h-5 w-5" />}>
              <ProfileInfoGrid columns={2}>
                <ProfileInfoRow
                  label={t("wallet.availableLabel")}
                  value={
                    walletSummaryLoading
                      ? t("wallet.loading")
                      : walletCurrencyCode
                        ? formatMoney(walletSummary?.availableBalance ?? "0", walletCurrencyCode, locale)
                        : walletSummary?.availableBalance ?? "0"
                  }
                />
                <ProfileInfoRow
                  label={t("wallet.reservedLabel")}
                  value={
                    walletSummaryLoading
                      ? t("wallet.loading")
                      : walletCurrencyCode
                        ? formatMoney(walletSummary?.reservedBalance ?? "0", walletCurrencyCode, locale)
                        : walletSummary?.reservedBalance ?? "0"
                  }
                />
              </ProfileInfoGrid>
            </ProfileInfoSection>
          </main>
        </div>
      </ProfileWorkspaceCard>

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
    </ProfileWorkspaceShell>
  );
}
