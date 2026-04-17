"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import MultiSelect from "@/components/form/MultiSelect";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import PatientGoogleAuthButton from "@/components/auth/PatientGoogleAuthButton";
import {
  useSpecialties,
  useSpecialtyCategories,
} from "@/features/specialties/hooks/use-specialties";
import {
  usePatientRegister,
  usePractitionerRegister,
} from "@/features/auth/hooks/use-auth";

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

function isSafeCallbackUrl(value: string | null): value is string {
  return Boolean(value && value.startsWith("/"));
}

function buildAuthHref(basePath: string, params: Record<string, string | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

type SignUpFormProps = {
  mode: SignUpMode;
};

export default function SignUpForm({ mode }: SignUpFormProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    setSuccessMessage(null);

    try {
      if (mode === "patient") {
        await patientRegister.mutateAsync(data);
        router.replace(isSafeCallbackUrl(callbackUrl) ? callbackUrl : "/practitioners");
        router.refresh();
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

      const result = await practitionerRegister.mutateAsync({
        displayName: data.displayName,
        email: data.email,
        otpEmail: data.otpEmail?.trim() ? data.otpEmail.trim() : undefined,
        password: data.password,
        primarySpecialtyCategoryId: selectedCategory,
        specialtyIds: selectedSpecialties,
      });
      setSuccessMessage(result.message || t("practitionerRegistrationSuccess"));
      form.reset();
      router.replace("/signin/practitioner");
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : t("registrationError")
      );
    }
  };

  const descriptionKey =
    mode === "practitioner" ? "signUpDescriptionPractitioner" : "signUpDescriptionPatient";
  const signInHref = buildAuthHref(`/signin/${mode}`, { callbackUrl });

  return (
    <div className="flex w-full flex-1 flex-col justify-center lg:w-1/2">
      <div className="mx-auto mb-3 w-full max-w-xl sm:mb-4">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          {t("backToHome")}
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center">
        <div>
          <div className="mb-4 sm:mb-5">
            <h1 className="mb-2 text-title-sm font-semibold text-gray-800 dark:text-white/90 sm:text-title-md">
              {t("createAccountTitle")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t(descriptionKey)}</p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                <Label>{t("displayName")} <span className="text-error-500">*</span></Label>
                <Input type="text" {...form.register("displayName")} error={!!form.formState.errors.displayName} />
              </div>
                <div>
                <Label>{t("email")} <span className="text-error-500">*</span></Label>
                <Input type="email" {...form.register("email")} error={!!form.formState.errors.email} dir="ltr" />
              </div>
                <div>
                  <Label>{t("password")} <span className="text-error-500">*</span></Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      {...form.register("password")}
                      error={!!form.formState.errors.password}
                      dir="ltr"
                    />
                    <span
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer"
                    >
                      {showPassword ? <EyeIcon className="fill-gray-500 dark:fill-gray-400" /> : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />}
                    </span>
                  </div>
                </div>
                {mode === "practitioner" ? (
                  <div>
                  <Label>{t("otpEmail")}</Label>
                  <Input
                    type="email"
                    {...form.register("otpEmail")}
                    error={!!form.formState.errors.otpEmail}
                    dir="ltr"
                  />
                  <p className="mt-1 text-xs text-text-muted">{t("otpEmailHint")}</p>
                </div>
                ) : null}
              </div>

              {mode === "practitioner" ? (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                    <Label>{t("practitionerSpecialties.categoryLabel")} <span className="text-error-500">*</span></Label>
                    <Select
                      key={`signup-category-${categoryOptions.length}`}
                      options={categoryOptions}
                      placeholder={t("practitionerSpecialties.categoryPlaceholder")}
                      defaultValue={selectedCategoryId || ""}
                      onChange={(value) => {
                        form.setValue("primarySpecialtyCategoryId", value);
                        form.setValue("specialtyIds", []);
                      }}
                    />
                  </div>
                    <div>
                    <Label>{t("practitionerSpecialties.subSpecialtyLabel")} <span className="text-error-500">*</span></Label>
                    <MultiSelect
                      key={`signup-specialties-${selectedCategoryId || "none"}`}
                      label=""
                      options={specialtyOptions}
                      defaultSelected={selectedSpecialtyIds}
                      disabled={!selectedCategoryId || specialtyOptions.length === 0}
                      onChange={(selected) => form.setValue("specialtyIds", selected)}
                    />
                  </div>
                  </div>
                </>
              ) : null}

              {mode === "practitioner" ? (
                <p className="text-xs text-text-muted">{t("practitionerRegistrationHint")}</p>
              ) : null}

              {error ? (
                <div className="rounded-lg bg-error-50 p-3 text-sm text-error-500 dark:bg-error-500/10">{error}</div>
              ) : null}
              {successMessage ? (
                <div className="rounded-lg bg-success-50 p-3 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-300">
                  {successMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? t("creatingAccount") : t("createAccountButton")}
              </button>

              {mode === "patient" ? (
                <PatientGoogleAuthButton callbackUrl={callbackUrl} defaultRedirect="/practitioners" />
              ) : null}
            </div>
          </form>

          <div className="mt-4">
            <p className="text-center text-sm font-normal text-gray-700 dark:text-gray-400 sm:text-start">
              {mode === "practitioner" ? t("alreadyStartedPractitionerJourney") : t("alreadyHaveAccount")}{" "}
              <Link href={signInHref} className="text-text-brand hover:text-primary-hover">
                {t("signIn")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
