"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import MultiSelect from "@/components/form/MultiSelect";
import {
  ChevronLeftIcon,
  EyeCloseIcon,
  EyeIcon,
  GroupIcon,
  UserCircleIcon,
} from "@/icons";
import PatientGoogleAuthButton from "@/components/auth/PatientGoogleAuthButton";
import {
  useSpecialties,
  useSpecialtyCategories,
} from "@/features/specialties/hooks/use-specialties";
import {
  usePatientRegister,
  usePractitionerRegister,
} from "@/features/auth/hooks/use-auth";
import { normalizeCallbackPath } from "@/lib/auth/callback-url";
import {
  getLocalizedSpecialtyCategoryName,
  getLocalizedSpecialtyName,
} from "@/features/specialties/utils/localized-specialty";

export const SIGN_UP_MODES = ["patient", "practitioner"] as const;
export type SignUpMode = (typeof SIGN_UP_MODES)[number];

const signUpSchema = z.object({
  displayName: z.string().min(2, "Display name is required"),
  email: z.string().email("Invalid email address"),
  otpEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  primarySpecialtyCategoryId: z.string().optional(),
  specialtyIds: z.array(z.string()).optional(),
});

type SignUpFormData = z.infer<typeof signUpSchema>;

type ModeConfig = {
  icon: typeof UserCircleIcon;
};

const MODE_CONFIG: Record<SignUpMode, ModeConfig> = {
  patient: { icon: UserCircleIcon },
  practitioner: { icon: GroupIcon },
};

function buildAuthHref(basePath: string, params: Record<string, string | null>) {
  const [pathname, existingQuery = ""] = basePath.split("?");
  const search = new URLSearchParams(existingQuery);
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

type SignUpFormProps = {
  mode: SignUpMode;
};

export default function SignUpForm({ mode }: SignUpFormProps) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const isRtl = locale.startsWith("ar");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const normalizedCallbackUrl = normalizeCallbackPath(callbackUrl);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patientRegister = usePatientRegister();
  const practitionerRegister = usePractitionerRegister();
  const specialtyCategoriesQuery = useSpecialtyCategories(mode === "practitioner");
  const specialtiesQuery = useSpecialties(undefined, mode === "practitioner");
  const isSubmitting = patientRegister.isPending || practitionerRegister.isPending;

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      displayName: "",
      email: "",
      otpEmail: "",
      password: "",
      primarySpecialtyCategoryId: "",
      specialtyIds: [],
    },
  });
  const modeConfig = MODE_CONFIG[mode];
  const ModeIcon = modeConfig.icon;

  const selectedCategoryId = useWatch({
    control: form.control,
    name: "primarySpecialtyCategoryId",
  });
  const selectedSpecialtyIds =
    useWatch({
      control: form.control,
      name: "specialtyIds",
    }) ?? [];
  const categoryOptions = (specialtyCategoriesQuery.data?.categories ?? []).map((category) => ({
    value: category.id,
    label: getLocalizedSpecialtyCategoryName(category, locale),
  }));

  const specialtiesForSelectedCategory = (specialtiesQuery.data?.specialties ?? []).filter(
    (specialty) => (selectedCategoryId ? specialty.category?.id === selectedCategoryId : false)
  );

  const specialtyOptions = specialtiesForSelectedCategory.map((specialty) => ({
    value: specialty.id,
    text: getLocalizedSpecialtyName(specialty, locale),
    selected: selectedSpecialtyIds.includes(specialty.id),
  }));

  const onSubmit = async (data: SignUpFormData) => {
    setError(null);

    try {
      if (mode === "patient") {
        await patientRegister.mutateAsync(data);
        window.location.replace(
          `/${locale}${normalizedCallbackUrl ?? "/practitioners"}`
        );
        return;
      }

      const selectedCategory = data.primarySpecialtyCategoryId?.trim() ?? "";
      const selectedSpecialties = (data.specialtyIds ?? []).filter(Boolean);
      if (!selectedCategory) {
        setError(t("practitionerSpecialties.validation.categoryRequired"));
        return;
      }
      if (selectedSpecialties.length === 0) {
        setError(t("practitionerSpecialties.validation.subSpecialtyRequired"));
        return;
      }

      await practitionerRegister.mutateAsync({
        displayName: data.displayName,
        email: data.email,
        otpEmail: data.otpEmail?.trim() ? data.otpEmail.trim() : undefined,
        password: data.password,
        primarySpecialtyCategoryId: selectedCategory,
        specialtyIds: selectedSpecialties,
      });
      form.reset();
      window.location.replace(
        `/${locale}${buildAuthHref("/signin", {
          callbackUrl: normalizedCallbackUrl,
          mode: "practitioner",
        })}`
      );
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : t("registrationError")
      );
    }
  };

  const descriptionKey =
    mode === "practitioner" ? "signUpDescriptionPractitioner" : "signUpDescriptionPatient";
  const signInHref = buildAuthHref("/signin", {
    callbackUrl: normalizedCallbackUrl,
    mode,
  });

  const premiumGuidancePanel = (
    <div className="relative hidden lg:flex lg:col-span-5 flex-col justify-between p-10 bg-gradient-to-b from-primary/90 via-primary/80 to-primary-hover/90 text-white overflow-hidden border-r border-white/10 dark:border-white/5 rtl:border-r-0 rtl:border-l rtl:border-white/10 rtl:dark:border-white/5">
      {/* Premium Visual Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_50%)]" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-light/90">
          {t("signUpGuidance.eyebrow")}
        </p>
        <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
          {mode === "practitioner"
            ? t("signUpGuidance.practitionerTitle")
            : t("signUpGuidance.patientTitle")}
        </h2>
        <p className="text-sm leading-6 text-white/80">
          {mode === "practitioner"
            ? t("signUpGuidance.practitionerSubtitle")
            : t("signUpGuidance.patientSubtitle")}
        </p>
      </div>

      {/* Steps List */}
      <div className="relative z-10 my-8 space-y-4">
        {(mode === "practitioner"
          ? (["p1", "p2", "p3"] as const)
          : (["c1", "c2", "c3"] as const)
        ).map((key, idx) => (
          <div
            key={key}
            className="flex items-start gap-4 rounded-2xl bg-white/8 border border-white/5 p-4 backdrop-blur-sm transition-all hover:bg-white/12"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-primary dark:bg-white dark:text-primary">
              {idx + 1}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">
                {t(`signUpGuidance.steps.${key}.title`)}
              </p>
              <p className="mt-1 text-xs leading-5 text-white/75">
                {t(`signUpGuidance.steps.${key}.desc`)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Note */}
      <div className="relative z-10 rounded-2xl bg-white/5 border border-white/10 p-4.5 text-xs leading-5 text-white/80">
        {mode === "practitioner"
          ? t("signUpGuidance.practitionerNext")
          : t("signUpGuidance.patientNext")}
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center py-6 px-4 animate-in fade-in slide-in-from-bottom-6 duration-500">
      
      {/* Premium Unified Split Card */}
      <div className="w-full overflow-hidden rounded-[32px] border border-border-light bg-white/80 shadow-[0_24px_70px_rgba(36,86,79,0.05)] backdrop-blur-md dark:border-white/5 dark:bg-surface-secondary/75 grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        
        {/* Left Side: Guidance Panel */}
        {premiumGuidancePanel}

        {/* Right Side: Form Panel */}
        <div className="col-span-12 lg:col-span-7 flex flex-col justify-between p-8 sm:p-10">
          
          <div>
            {/* Back Home Link */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary dark:text-text-secondary dark:hover:text-text-primary"
              >
                <ChevronLeftIcon className={isRtl ? "rotate-180" : ""} />
                {t("backToHome")}
              </Link>
            </div>

            {/* Header */}
            <div className="rounded-[24px] bg-primary-light/40 border border-primary/10 p-5 dark:bg-primary/10 sm:p-6 mb-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                    {t(`entryCards.${mode}.eyebrow`)}
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-white">
                    {t("createAccountTitle")}
                  </h1>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-primary dark:bg-surface/75 dark:text-primary-light shadow-sm">
                  <ModeIcon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-sm leading-6 text-text-secondary dark:text-text-secondary">
                {t(descriptionKey)}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <Label>
                      {t("displayName")} <span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      placeholder={t("displayNamePlaceholder")}
                      error={!!form.formState.errors.displayName}
                      {...form.register("displayName")}
                      dir={isRtl ? "rtl" : "ltr"}
                    />
                    {form.formState.errors.displayName && (
                      <p className="mt-1.5 text-xs text-error-500">
                        {form.formState.errors.displayName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>
                      {t("email")} <span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      placeholder={t("emailPlaceholder")}
                      error={!!form.formState.errors.email}
                      {...form.register("email")}
                      dir="ltr"
                    />
                    {form.formState.errors.email && (
                      <p className="mt-1.5 text-xs text-error-500">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>
                      {t("password")} <span className="text-error-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder={t("passwordPlaceholder")}
                        error={!!form.formState.errors.password}
                        {...form.register("password")}
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className={`absolute top-1/2 z-10 -translate-y-1/2 text-text-secondary transition hover:text-text-primary ${isRtl ? "left-4" : "right-4"}`}
                      >
                        {showPassword ? (
                          <EyeIcon className="fill-current" />
                        ) : (
                          <EyeCloseIcon className="fill-current" />
                        )}
                      </button>
                    </div>
                    {form.formState.errors.password && (
                      <p className="mt-1.5 text-xs text-error-500">
                        {form.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  {mode === "practitioner" && (
                    <div>
                      <Label>{t("otpEmail")}</Label>
                      <Input
                        type="email"
                        placeholder={t("emailPlaceholder")}
                        error={!!form.formState.errors.otpEmail}
                        {...form.register("otpEmail")}
                        dir="ltr"
                      />
                      {form.formState.errors.otpEmail && (
                        <p className="mt-1.5 text-xs text-error-500">
                          {form.formState.errors.otpEmail.message}
                        </p>
                      )}
                      <p className="mt-1.5 text-xs leading-5 text-text-muted">
                        {t("otpEmailHint")}
                      </p>
                    </div>
                  )}
                </div>

                {mode === "practitioner" && (
                  <div className="rounded-[24px] border border-border-light bg-surface/40 p-5 dark:border-white/5 dark:bg-surface-tertiary/20">
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-text-primary dark:text-text-primary">
                        {t("signUpInitialSpecialty.title")}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-text-secondary dark:text-text-secondary">
                        {t("signUpInitialSpecialty.helper")}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <Label>
                          {t("practitionerSpecialties.categoryLabel")} <span className="text-error-500">*</span>
                        </Label>
                        <Select
                          key={`signup-category-${categoryOptions.length}`}
                          options={categoryOptions}
                          placeholder={t("practitionerSpecialties.categoryPlaceholder")}
                          defaultValue={selectedCategoryId || ""}
                          onChange={(value) => {
                            form.setValue("primarySpecialtyCategoryId", value);
                            form.setValue("specialtyIds", []);
                            setError(null);
                          }}
                        />
                      </div>

                      <div>
                        <Label>
                          {t("practitionerSpecialties.subSpecialtyLabel")} <span className="text-error-500">*</span>
                        </Label>
                        <MultiSelect
                          key={`signup-specialties-${selectedCategoryId || "none"}`}
                          label=""
                          placeholder={t("practitionerSpecialties.subSpecialtyPlaceholder")}
                          options={specialtyOptions}
                          defaultSelected={selectedSpecialtyIds}
                          disabled={!selectedCategoryId || specialtyOptions.length === 0}
                          hint={
                            selectedCategoryId && specialtyOptions.length === 0
                              ? t("practitionerSpecialties.emptyForCategory")
                              : undefined
                          }
                          onChange={(selected) => {
                            form.setValue("specialtyIds", selected);
                            setError(null);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-2xl bg-error-50 p-3.5 text-xs text-error-500 dark:bg-error-500/10">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-theme-xs transition-all hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? t("creatingAccount") : t("createAccountButton")}
                </button>

                {mode === "patient" && (
                  <div className="space-y-4">
                    <div className="relative flex items-center justify-center my-4">
                      <div className="absolute w-full border-t border-border-light dark:border-white/5" />
                      <span className="relative bg-white px-3 text-xs text-text-muted dark:bg-surface-secondary dark:text-text-muted uppercase tracking-wider">
                        {t("orContinueWith")}
                      </span>
                    </div>
                    <PatientGoogleAuthButton callbackUrl={callbackUrl} defaultRedirect="/practitioners" />
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Footer Link */}
          <div className="mt-8 border-t border-border-light pt-6 dark:border-white/5">
            <p className="text-sm text-text-secondary dark:text-text-secondary">
              {mode === "practitioner"
                ? t("alreadyStartedPractitionerJourney")
                : t("alreadyHaveAccount")}{" "}
              <Link
                href={signInHref}
                className="font-semibold text-primary hover:text-primary-hover transition-colors"
              >
                {t("signIn")}
              </Link>
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
