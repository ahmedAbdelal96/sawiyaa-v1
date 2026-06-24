"use client";

import { useMemo, useEffect, useRef } from "react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import PhoneInput from "@/components/form/group-input/PhoneInput";
import PatientGoogleAuthButton from "@/components/auth/PatientGoogleAuthButton";
import { usePatientRegister } from "@/features/auth/hooks/use-auth";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import { normalizeCallbackPath } from "@/lib/auth/callback-url";

// Launch country dial code → expected local digit count
const DIAL_CODE_LOCAL_DIGITS: Record<string, { min: number; max: number }> = {
  "+20": { min: 10, max: 10 }, // Egypt: 10-digit local
  "+966": { min: 9, max: 9 },  // Saudi Arabia: 9-digit local
  "+971": { min: 9, max: 9 }, // UAE: 9-digit local
  "+965": { min: 8, max: 8 },  // Kuwait: 8-digit local
  "+974": { min: 8, max: 8 },  // Qatar: 8-digit local
};

const DIAL_CODES = [
  { code: "+20", label: "Egypt" },
  { code: "+966", label: "Saudi Arabia" },
  { code: "+971", label: "UAE" },
  { code: "+965", label: "Kuwait" },
  { code: "+974", label: "Qatar" },
];

type Step1FormData = {
  displayName: string;
  email: string;
  phoneNumber: string;
  dialCode: string;
};

type Step2FormData = {
  password: string;
  confirmPassword: string;
};

function normalizeFullPhone(dialCode: string, phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, "");
  return `${dialCode}${digits}`;
}

function validatePhoneE164(dialCode: string, phoneNumber: string): boolean {
  const digits = phoneNumber.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 12) return false;

  const spec = DIAL_CODE_LOCAL_DIGITS[dialCode];
  if (spec) {
    if (digits.length < spec.min || digits.length > spec.max) return false;
  }

  // Generic full-number check: after + must be 8-15 digits
  const fullDigits = `${dialCode}${digits}`.replace(/^\+/, "");
  if (fullDigits.length < 8 || fullDigits.length > 15) return false;

  return true;
}

export default function PatientSignUpForm({
  callbackUrl,
}: {
  callbackUrl?: string | null;
}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const isRtl = locale.startsWith("ar");
  const router = useRouter();
  const normalizedCallbackUrl = normalizeCallbackPath(callbackUrl);

  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accumulated step 1 data (for step 2 submission)
  const [step1Data, setStep1Data] = useState<{
    displayName: string;
    email: string;
    phone: string;
  } | null>(null);

  const patientRegister = usePatientRegister();
  const isSubmitting = patientRegister.isPending;

  // Schemas built with translated error messages — recreated when locale changes
  const step1Schema = useMemo(() => {
    return z.object({
      displayName: z
        .string()
        .trim()
        .min(1, t("patientSignUp.validation.nameRequired"))
        .min(2, t("patientSignUp.validation.nameTooShort")),
      email: z
        .string()
        .trim()
        .min(1, t("patientSignUp.validation.emailRequired"))
        .email(t("patientSignUp.validation.emailInvalid")),
      phoneNumber: z.string().min(1, t("patientSignUp.validation.phoneRequired")),
      dialCode: z.string().min(1),
    });
  }, [t]);

  const step2Schema = useMemo(() => {
    return z
      .object({
        password: z
          .string()
          .min(1, t("patientSignUp.validation.passwordRequired"))
          .min(8, t("patientSignUp.validation.passwordTooShort")),
        confirmPassword: z.string().min(
          1,
          t("patientSignUp.validation.confirmPasswordRequired")
        ),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: t("patientSignUp.validation.passwordsMismatch"),
        path: ["confirmPassword"],
      });
  }, [t]);

  const form1 = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      displayName: "",
      email: "",
      phoneNumber: "",
      dialCode: DIAL_CODES[0].code,
    },
  });

  const form2 = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // ── Watch step 1 fields to make Next button reactive ──
  const watchedStep1 = useWatch({ control: form1.control });
  const watchedStep1PhoneValid = validatePhoneE164(
    watchedStep1.dialCode ?? DIAL_CODES[0].code,
    watchedStep1.phoneNumber ?? ""
  );

  // ── Watch step 2 fields to make Submit button reactive ──
  const watchedStep2 = useWatch({ control: form2.control });

  const isStep1Valid =
    step === 1 &&
    step1Schema.safeParse(watchedStep1).success &&
    watchedStep1PhoneValid;

  const isStep2Valid =
    step === 2 && step2Schema.safeParse(watchedStep2).success;

  // ── Clear phone manual error when the phone value becomes valid ──
  const prevPhoneValidRef = useRef<boolean>(false);
  useEffect(() => {
    if (prevPhoneValidRef.current === false && watchedStep1PhoneValid) {
      form1.clearErrors("phoneNumber");
    }
    prevPhoneValidRef.current = watchedStep1PhoneValid;
  }, [watchedStep1PhoneValid, form1]);

  function handlePhoneDialChange(dialLabel: string) {
    const entry = DIAL_CODES.find((d) => d.label === dialLabel);
    if (entry) {
      form1.setValue("dialCode", entry.code, { shouldValidate: true });
    }
  }

  function handleNext(data: Step1FormData) {
    setError(null);
    if (!validatePhoneE164(data.dialCode, data.phoneNumber)) {
      form1.setError("phoneNumber", {
        message: t("patientSignUp.validation.phoneInvalid"),
      });
      return;
    }
    setStep1Data({
      displayName: data.displayName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: normalizeFullPhone(data.dialCode, data.phoneNumber),
    });
    setStep(2);
  }

  function handleBack() {
    setError(null);
    setStep(1);
  }

  async function handleSubmit(data: Step2FormData) {
    if (!step1Data) return;
    setError(null);
    try {
      await patientRegister.mutateAsync({
        displayName: step1Data.displayName,
        email: step1Data.email,
        phone: step1Data.phone,
        password: data.password,
      });
      router.replace(normalizedCallbackUrl ?? "/practitioners");
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : t("registrationError")
      );
    }
  }

  return (
    <div className="w-full pb-10">
      <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
        {/* ── Left panel – guidance ── */}
        <section className="rounded-[28px] border border-border-light bg-white/75 p-6 shadow-[0_18px_60px_rgba(16,24,40,0.06)] backdrop-blur dark:border-border-light dark:bg-surface-secondary/70 sm:p-7">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            {t("signUpGuidance.eyebrow")}
          </p>
          <h2 className="text-2xl font-semibold leading-tight text-text-primary dark:text-text-primary">
            {t("patientSignUp.guidanceTitle")}
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-7 text-text-secondary dark:text-text-secondary">
            {t("patientSignUp.guidanceSubtitle")}
          </p>

          <div className="mt-6 grid gap-3">
            {(["c1", "c2", "c3"] as const).map((key, idx) => (
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
            {t("patientSignUp.guidanceNote")}
          </div>
        </section>

        {/* ── Right panel – 2-step form ── */}
        <section className="rounded-[28px] border border-border-light bg-white/92 p-6 shadow-[0_24px_80px_rgba(16,24,40,0.08)] backdrop-blur dark:border-border-light dark:bg-surface-secondary/90 sm:p-8">
          {/* Back nav */}
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary dark:text-text-secondary dark:hover:text-text-primary"
            >
              <ChevronLeftIcon className={isRtl ? "rotate-180" : ""} />
              {t("backToHome")}
            </Link>

            <Link
              href="/signin"
              className="hidden rounded-full border border-border-light bg-surface/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary transition hover:border-primary hover:text-primary dark:border-border-light dark:bg-surface-tertiary/80 dark:text-text-secondary sm:inline-flex"
            >
              {t("chooseAccessPath")}
            </Link>
          </div>

          {/* Header */}
          <div className="mt-6 rounded-[24px] bg-primary-light/55 p-5 dark:bg-primary/10 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  {t("patientSignUp.eyebrow")}
                </p>
                <h1 className="text-3xl font-semibold leading-tight text-text-primary dark:text-text-primary">
                  {t("createAccountTitle")}
                </h1>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/85 text-primary dark:bg-surface/75 dark:text-primary-light">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-sm leading-7 text-text-secondary dark:text-text-secondary">
              {t("signUpDescriptionPatient")}
            </p>

            {/* Step progress bar */}
            <div className="mt-4 flex items-center gap-2">
              <div
                className={`h-2 flex-1 rounded-full transition-colors ${
                  step === 1 ? "bg-primary" : "bg-primary/30"
                }`}
              />
              <div
                className={`h-2 flex-1 rounded-full transition-colors ${
                  step === 2 ? "bg-primary" : "bg-primary/30"
                }`}
              />
            </div>
            <p className="mt-2 text-xs font-medium text-primary">
              {step === 1
                ? t("patientSignUp.step1Label")
                : t("patientSignUp.step2Label")}
            </p>
          </div>

          {/* ─── STEP 1 ─── */}
          {step === 1 && (
            <form
              onSubmit={form1.handleSubmit(handleNext)}
              className="mt-8 space-y-6"
            >
              {/* Name */}
              <div>
                <Label>
                  {t("patientSignUp.name")}{" "}
                  <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder={t("patientSignUp.namePlaceholder")}
                  dir={isRtl ? "rtl" : "ltr"}
                  error={!!form1.formState.errors.displayName}
                  {...form1.register("displayName")}
                />
                {form1.formState.errors.displayName ? (
                  <p className="mt-1.5 text-sm text-error-500">
                    {form1.formState.errors.displayName.message}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs leading-6 text-text-muted">
                    {t("patientSignUp.nameHint")}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <Label>
                  {t("patientSignUp.email")}{" "}
                  <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder={t("patientSignUp.emailPlaceholder")}
                  dir="ltr"
                  error={!!form1.formState.errors.email}
                  {...form1.register("email")}
                />
                {form1.formState.errors.email && (
                  <p className="mt-1.5 text-sm text-error-500">
                    {form1.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Phone + dial code */}
              <div>
                <Label>
                  {t("patientSignUp.phone")}{" "}
                  <span className="text-error-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <div className="w-[120px] shrink-0">
                    <PhoneInput
                      countries={DIAL_CODES}
                      placeholder="+20"
                      selectPosition="start"
                      onChange={handlePhoneDialChange}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="tel"
                      placeholder={t("patientSignUp.phonePlaceholder")}
                      dir="ltr"
                      error={!!form1.formState.errors.phoneNumber}
                      {...form1.register("phoneNumber")}
                    />
                  </div>
                </div>
                {form1.formState.errors.phoneNumber ? (
                  <p className="mt-1.5 text-sm text-error-500">
                    {form1.formState.errors.phoneNumber.message}
                  </p>
                ) : null}
              </div>

              {/* API error */}
              {error ? (
                <div className="rounded-2xl bg-error-50 p-3 text-sm text-error-500 dark:bg-error-500/10">
                  {error}
                </div>
              ) : null}

              {/* Next button */}
              <button
                type="submit"
                disabled={!isStep1Valid}
                className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("patientSignUp.next")}
              </button>
            </form>
          )}

          {/* ─── STEP 2 ─── */}
          {step === 2 && (
            <form
              onSubmit={form2.handleSubmit(handleSubmit)}
              className="mt-8 space-y-6"
            >
              {/* Password */}
              <div>
                <Label>
                  {t("patientSignUp.password")}{" "}
                  <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={t("patientSignUp.passwordPlaceholder")}
                    dir="ltr"
                    error={!!form2.formState.errors.password}
                    {...form2.register("password")}
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
                {form2.formState.errors.password ? (
                  <p className="mt-1.5 text-sm text-error-500">
                    {form2.formState.errors.password.message}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs leading-6 text-text-muted">
                    {t("patientSignUp.passwordHint")}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <Label>
                  {t("patientSignUp.confirmPassword")}{" "}
                  <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t("patientSignUp.confirmPasswordPlaceholder")}
                    dir="ltr"
                    error={!!form2.formState.errors.confirmPassword}
                    {...form2.register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((prev) => !prev)
                    }
                    className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-text-secondary transition hover:text-text-primary"
                  >
                    {showConfirmPassword ? (
                      <EyeIcon className="fill-current" />
                    ) : (
                      <EyeCloseIcon className="fill-current" />
                    )}
                  </button>
                </div>
                {form2.formState.errors.confirmPassword && (
                  <p className="mt-1.5 text-sm text-error-500">
                    {form2.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Pricing note */}
              <div className="flex items-start gap-2 rounded-2xl border border-primary/15 bg-primary-light/55 px-4 py-3 text-xs leading-6 text-text-secondary dark:bg-primary/10 dark:text-text-secondary">
                <svg
                  className="mt-0.5 shrink-0"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {t("patientSignUp.pricingNote")}
              </div>

              {/* API error */}
              {error ? (
                <div className="rounded-2xl bg-error-50 p-3 text-sm text-error-500 dark:bg-error-500/10">
                  {error}
                </div>
              ) : null}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || !isStep2Valid}
                className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting
                  ? t("creatingAccount")
                  : t("patientSignUp.submit")}
              </button>

              {/* Back */}
              <button
                type="button"
                onClick={handleBack}
                className="flex w-full items-center justify-center gap-2 text-sm text-text-secondary transition hover:text-text-primary dark:text-text-secondary dark:hover:text-text-primary"
              >
                <ChevronLeftIcon className={isRtl ? "rotate-180" : ""} />
                {t("patientSignUp.back")}
              </button>
            </form>
          )}

          {/* Google auth — step 1 only */}
          {step === 1 ? (
            <div className="mt-6">
              <PatientGoogleAuthButton
                callbackUrl={callbackUrl}
                defaultRedirect="/practitioners"
              />
            </div>
          ) : null}

          {/* Footer link */}
          <div className="mt-6 border-t border-border-light pt-6 dark:border-border-light">
            <p className="text-sm text-text-secondary dark:text-text-secondary">
              {t("alreadyHaveAccount")}{" "}
              <Link
                href="/signin?mode=patient"
                className="font-medium text-text-brand hover:text-primary-hover"
              >
                {t("signIn")}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}