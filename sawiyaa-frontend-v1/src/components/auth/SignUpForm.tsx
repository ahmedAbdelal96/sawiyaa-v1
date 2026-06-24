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
    label: category.name,
  }));

  const specialtiesForSelectedCategory = (specialtiesQuery.data?.specialties ?? []).filter(
    (specialty) => (selectedCategoryId ? specialty.category?.id === selectedCategoryId : false)
  );

  const specialtyOptions = specialtiesForSelectedCategory.map((specialty) => ({
    value: specialty.id,
    text: specialty.name ?? specialty.slug,
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
  const chooserHref = buildAuthHref("/signin", { callbackUrl: normalizedCallbackUrl });

  const guidancePanel = (
    <section className="rounded-[28px] border border-border-light bg-white/75 p-6 shadow-[0_18px_60px_rgba(16,24,40,0.06)] backdrop-blur dark:border-border-light dark:bg-surface-secondary/70 sm:p-7">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
        {t("signUpGuidance.eyebrow")}
      </p>
      <h2 className="text-2xl font-semibold leading-tight text-text-primary dark:text-text-primary">
        {mode === "practitioner"
          ? t("signUpGuidance.practitionerTitle")
          : t("signUpGuidance.patientTitle")}
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-7 text-text-secondary dark:text-text-secondary">
        {mode === "practitioner"
          ? t("signUpGuidance.practitionerSubtitle")
          : t("signUpGuidance.patientSubtitle")}
      </p>

      <div className="mt-6 grid gap-3">
        {(mode === "practitioner"
          ? (["p1", "p2", "p3"] as const)
          : (["c1", "c2", "c3"] as const)
        ).map((key, idx) => (
          <div
            key={key}
            className="flex items-start gap-3 rounded-2xl border border-border-light bg-white/75 p-4 dark:border-border-light dark:bg-surface/65"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary dark:bg-primary/12 dark:text-primary-light">
              {idx + 1}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary dark:text-text-primary">
                {t(`signUpGuidance.steps.${key}.title`)}
              </p>
              <p className="mt-0.5 text-xs leading-6 text-text-secondary dark:text-text-secondary">
                {t(`signUpGuidance.steps.${key}.desc`)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-primary/15 bg-primary-light/55 p-4 text-sm leading-7 text-text-secondary dark:bg-primary/10 dark:text-text-secondary">
        {mode === "practitioner"
          ? t("signUpGuidance.practitionerNext")
          : t("signUpGuidance.patientNext")}
      </div>
    </section>
  );

  const formPanel = (
    <section className="rounded-[28px] border border-border-light bg-white/92 p-6 shadow-[0_24px_80px_rgba(16,24,40,0.08)] backdrop-blur dark:border-border-light dark:bg-surface-secondary/90 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary dark:text-text-secondary dark:hover:text-text-primary"
        >
          <ChevronLeftIcon className={isRtl ? "rotate-180" : ""} />
          {t("backToHome")}
        </Link>

        <Link
          href={chooserHref}
          className="hidden rounded-full border border-border-light bg-surface/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary transition hover:border-primary hover:text-primary dark:border-border-light dark:bg-surface-tertiary/80 dark:text-text-secondary sm:inline-flex"
        >
          {t("chooseAccessPath")}
        </Link>
      </div>

      <div className="mt-6 rounded-[24px] bg-primary-light/55 p-5 dark:bg-primary/10 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              {t(`entryCards.${mode}.eyebrow`)}
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-text-primary dark:text-text-primary">
              {t("createAccountTitle")}
            </h1>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/85 text-primary dark:bg-surface/75 dark:text-primary-light">
            <ModeIcon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-2 text-sm leading-7 text-text-secondary dark:text-text-secondary">
          {t(descriptionKey)}
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8">
        <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <Label>
                      {t("displayName")} <span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      placeholder={t("displayNamePlaceholder")}
                      {...form.register("displayName")}
                      error={!!form.formState.errors.displayName}
                    />
                    {form.formState.errors.displayName && (
                      <p className="mt-1.5 text-sm text-error-500">
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
                      {...form.register("email")}
                      error={!!form.formState.errors.email}
                      dir="ltr"
                    />
                    {form.formState.errors.email && (
                      <p className="mt-1.5 text-sm text-error-500">
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
                        {...form.register("password")}
                        error={!!form.formState.errors.password}
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-text-secondary transition hover:text-text-primary"
                      >
                        {showPassword ? (
                          <EyeIcon className="fill-current" />
                        ) : (
                          <EyeCloseIcon className="fill-current" />
                        )}
                      </button>
                    </div>
                    {form.formState.errors.password && (
                      <p className="mt-1.5 text-sm text-error-500">
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
                        {...form.register("otpEmail")}
                        error={!!form.formState.errors.otpEmail}
                        dir="ltr"
                      />
                      {form.formState.errors.otpEmail && (
                        <p className="mt-1.5 text-sm text-error-500">
                          {form.formState.errors.otpEmail.message}
                        </p>
                      )}
                      <p className="mt-1.5 text-xs leading-6 text-text-muted">
                        {t("otpEmailHint")}
                      </p>
                    </div>
                  )}
                </div>

                {mode === "practitioner" && (
                  <div className="rounded-[24px] border border-border-light bg-surface/75 p-5 dark:border-border-light dark:bg-surface-tertiary/70">
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-text-primary dark:text-text-primary">
                        {t("signUpInitialSpecialty.title")}
                      </p>
                      <p className="mt-1 text-xs leading-6 text-text-secondary dark:text-text-secondary">
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

                {error ? (
                  <div className="rounded-2xl bg-error-50 p-3 text-sm text-error-500 dark:bg-error-500/10">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? t("creatingAccount") : t("createAccountButton")}
                </button>

                {mode === "patient" ? (
                  <PatientGoogleAuthButton callbackUrl={callbackUrl} defaultRedirect="/practitioners" />
                ) : null}
              </div>
            </form>

      <div className="mt-6 border-t border-border-light pt-6 dark:border-border-light">
        <p className="text-sm text-text-secondary dark:text-text-secondary">
          {mode === "practitioner"
            ? t("alreadyStartedPractitionerJourney")
            : t("alreadyHaveAccount")}{" "}
          <Link
            href={signInHref}
            className="font-medium text-text-brand hover:text-primary-hover"
          >
            {t("signIn")}
          </Link>
        </p>
      </div>
    </section>
  );

  return (
    <div className="w-full pb-10">
      <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
        {isRtl ? (
          <>
            {formPanel}
            {guidancePanel}
          </>
        ) : (
          <>
            {guidancePanel}
            {formPanel}
          </>
        )}
      </div>
    </div>
  );
}
