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
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center py-6 px-4 animate-in fade-in slide-in-from-bottom-6 duration-500">
      
      {/* Premium Unified Split Card */}
      <div className="w-full overflow-hidden rounded-[32px] border border-border-light bg-white/80 shadow-[0_24px_70px_rgba(36,86,79,0.05)] backdrop-blur-md dark:border-white/5 dark:bg-surface-secondary/75 grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        
        {/* Left Side: Brand/Guidance Panel */}
        <div className="relative hidden lg:flex lg:col-span-5 flex-col justify-between p-10 bg-gradient-to-b from-primary/90 via-primary/80 to-primary-hover/90 text-white overflow-hidden border-r border-white/10 dark:border-white/5 rtl:border-r-0 rtl:border-l rtl:border-white/10 rtl:dark:border-white/5">
          {/* Ambient background blur elements */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_50%)]" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />

          {/* Top Header */}
          <div className="relative z-10 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-light/90">
              {t("signUpGuidance.eyebrow")}
            </p>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
              {t("patientSignUp.guidanceTitle")}
            </h2>
            <p className="text-sm leading-6 text-white/80">
              {t("patientSignUp.guidanceSubtitle")}
            </p>
          </div>

          {/* Step list details */}
          <div className="relative z-10 my-8 space-y-4">
            {(["c1", "c2", "c3"] as const).map((key, idx) => (
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

          {/* Guidance Note */}
          <div className="relative z-10 rounded-2xl bg-white/5 border border-white/10 p-4.5 text-xs leading-5 text-white/80">
            {t("patientSignUp.guidanceNote")}
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="col-span-12 lg:col-span-7 flex flex-col justify-between p-8 sm:p-10">
          
          <div>
            {/* Back Home Button */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary dark:text-text-secondary dark:hover:text-text-primary"
              >
                <ChevronLeftIcon className={isRtl ? "rotate-180" : ""} />
                {t("backToHome")}
              </Link>
            </div>

            {/* Header info */}
            <div className="rounded-[24px] bg-primary-light/40 border border-primary/10 p-5 dark:bg-primary/10 sm:p-6 mb-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                    {t("patientSignUp.eyebrow")}
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-white">
                    {t("createAccountTitle")}
                  </h1>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-primary dark:bg-surface/75 dark:text-primary-light shadow-sm">
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
              <p className="mt-2 text-sm leading-6 text-text-secondary dark:text-text-secondary">
                {t("signUpDescriptionPatient")}
              </p>

              {/* Step indicator */}
              <div className="mt-4 flex items-center gap-2">
                <div
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    step === 1 ? "bg-primary" : "bg-primary/20 dark:bg-white/10"
                  }`}
                />
                <div
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    step === 2 ? "bg-primary" : "bg-primary/20 dark:bg-white/10"
                  }`}
                />
              </div>
              <p className="mt-2.5 text-xs font-semibold text-primary">
                {step === 1
                  ? t("patientSignUp.step1Label")
                  : t("patientSignUp.step2Label")}
              </p>
            </div>

            {/* ─── STEP 1 ─── */}
            {step === 1 && (
              <form
                onSubmit={form1.handleSubmit(handleNext)}
                className="space-y-6"
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
                    <p className="mt-1.5 text-xs text-error-500">
                      {form1.formState.errors.displayName.message}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs leading-5 text-text-muted">
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
                    <p className="mt-1.5 text-xs text-error-500">
                      {form1.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Phone */}
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
                  {form1.formState.errors.phoneNumber && (
                    <p className="mt-1.5 text-xs text-error-500">
                      {form1.formState.errors.phoneNumber.message}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="rounded-2xl bg-error-50 p-3.5 text-xs text-error-500 dark:bg-error-500/10">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!isStep1Valid}
                  className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("patientSignUp.next")}
                </button>
              </form>
            )}

            {/* ─── STEP 2 ─── */}
            {step === 2 && (
              <form
                onSubmit={form2.handleSubmit(handleSubmit)}
                className="space-y-6"
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
                      className={`absolute top-1/2 z-10 -translate-y-1/2 text-text-secondary transition hover:text-text-primary ${isRtl ? "left-4" : "right-4"}`}
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-current" />
                      ) : (
                        <EyeCloseIcon className="fill-current" />
                      )}
                    </button>
                  </div>
                  {form2.formState.errors.password ? (
                    <p className="mt-1.5 text-xs text-error-500">
                      {form2.formState.errors.password.message}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs leading-5 text-text-muted">
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
                      className={`absolute top-1/2 z-10 -translate-y-1/2 text-text-secondary transition hover:text-text-primary ${isRtl ? "left-4" : "right-4"}`}
                    >
                      {showConfirmPassword ? (
                        <EyeIcon className="fill-current" />
                      ) : (
                        <EyeCloseIcon className="fill-current" />
                      )}
                    </button>
                  </div>
                  {form2.formState.errors.confirmPassword && (
                    <p className="mt-1.5 text-xs text-error-500">
                      {form2.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Pricing note */}
                <div className="flex items-start gap-2.5 rounded-2xl border border-primary/10 bg-primary-light/30 px-4 py-3 text-xs leading-5 text-text-secondary dark:bg-primary/10 dark:text-text-secondary">
                  <svg
                    className="mt-0.5 shrink-0 text-primary"
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
                  <span>{t("patientSignUp.pricingNote")}</span>
                </div>

                {error && (
                  <div className="rounded-2xl bg-error-50 p-3.5 text-xs text-error-500 dark:bg-error-500/10">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting || !isStep2Valid}
                  className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting
                    ? t("creatingAccount")
                    : t("patientSignUp.submit")}
                </button>

                {/* Back */}
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex w-full items-center justify-center gap-2 text-xs font-semibold text-text-secondary transition hover:text-text-primary dark:text-text-secondary dark:hover:text-text-primary"
                >
                  <ChevronLeftIcon className={isRtl ? "rotate-180" : ""} />
                  {t("patientSignUp.back")}
                </button>
              </form>
            )}

            {/* Google auth — step 1 only */}
            {step === 1 && (
              <div className="mt-6">
                <div className="relative flex items-center justify-center my-4">
                  <div className="absolute w-full border-t border-border-light dark:border-white/5" />
                  <span className="relative bg-white px-3 text-xs text-text-muted dark:bg-surface-secondary dark:text-text-muted uppercase tracking-wider">
                    {t("orContinueWith")}
                  </span>
                </div>
                <PatientGoogleAuthButton
                  callbackUrl={callbackUrl}
                  defaultRedirect="/practitioners"
                />
              </div>
            )}
          </div>

          {/* Footer Link */}
          <div className="mt-8 border-t border-border-light pt-6 dark:border-white/5">
            <p className="text-sm text-text-secondary dark:text-text-secondary">
              {t("alreadyHaveAccount")}{" "}
              <Link
                href="/signin?mode=patient"
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