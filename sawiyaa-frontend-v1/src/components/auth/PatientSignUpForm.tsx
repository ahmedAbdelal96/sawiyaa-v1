"use client";

import { useMemo, useEffect, useRef } from "react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import Input from "@/components/form/input/InputField";
import AuthPasswordField from "./AuthPasswordField";
import Label from "@/components/form/Label";
import PhoneInput from "@/components/form/group-input/PhoneInput";
import PatientGoogleAuthButton from "@/components/auth/PatientGoogleAuthButton";
import { usePatientRegister } from "@/features/auth/hooks/use-auth";
import { ChevronLeftIcon } from "@/icons";
import { normalizeCallbackPath } from "@/lib/auth/callback-url";
import AuthSplitCard from "./AuthSplitCard";

const DIAL_CODE_LOCAL_DIGITS: Record<string, { min: number; max: number }> = {
  "+20": { min: 10, max: 10 },
  "+966": { min: 9, max: 9 },
  "+971": { min: 9, max: 9 },
  "+965": { min: 8, max: 8 },
  "+974": { min: 8, max: 8 },
};

const DIAL_CODES = [
  { code: "+20", label: "Egypt" },
  { code: "+966", label: "Saudi Arabia" },
  { code: "+971", label: "UAE" },
  { code: "+965", label: "Kuwait" },
  { code: "+974", label: "Qatar" },
];

type Step1FormData = {
  email: string;
  password: string;
  confirmPassword: string;
};

type Step2FormData = {
  displayName: string;
  phoneNumber: string;
  dialCode: string;
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
  const [error, setError] = useState<string | null>(null);

  const [step1Data, setStep1Data] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const patientRegister = usePatientRegister();
  const isSubmitting = patientRegister.isPending;

  const step1Schema = useMemo(() => {
    return z
      .object({
        email: z
          .string()
          .trim()
          .min(1, t("patientSignUp.validation.emailRequired"))
          .email(t("patientSignUp.validation.emailInvalid")),
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

  const step2Schema = useMemo(() => {
    return z.object({
      displayName: z
        .string()
        .trim()
        .min(1, t("patientSignUp.validation.nameRequired"))
        .min(2, t("patientSignUp.validation.nameTooShort")),
      phoneNumber: z.string().min(1, t("patientSignUp.validation.phoneRequired")),
      dialCode: z.string().min(1),
    });
  }, [t]);

  const form1 = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const form2 = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
    mode: "onChange",
    defaultValues: {
      displayName: "",
      phoneNumber: "",
      dialCode: DIAL_CODES[0].code,
    },
  });

  const watchedStep1 = useWatch({ control: form1.control });
  const watchedStep2 = useWatch({ control: form2.control });

  const watchedStep2PhoneValid = validatePhoneE164(
    watchedStep2.dialCode ?? DIAL_CODES[0].code,
    watchedStep2.phoneNumber ?? ""
  );

  const isStep1Valid =
    step === 1 && step1Schema.safeParse(watchedStep1).success;

  const isStep2Valid =
    step === 2 &&
    step2Schema.safeParse(watchedStep2).success &&
    watchedStep2PhoneValid;

  const prevPhoneValidRef = useRef<boolean>(false);
  useEffect(() => {
    if (prevPhoneValidRef.current === false && watchedStep2PhoneValid) {
      form2.clearErrors("phoneNumber");
    }
    prevPhoneValidRef.current = watchedStep2PhoneValid;
  }, [watchedStep2PhoneValid, form2]);

  function handlePhoneDialChange(dialLabel: string) {
    const entry = DIAL_CODES.find((d) => d.label === dialLabel);
    if (entry) {
      form2.setValue("dialCode", entry.code, { shouldValidate: true });
    }
  }

  function handleNext(data: Step1FormData) {
    setError(null);
    setStep1Data({
      email: data.email.trim().toLowerCase(),
      password: data.password,
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
    if (!validatePhoneE164(data.dialCode, data.phoneNumber)) {
      form2.setError("phoneNumber", {
        message: t("patientSignUp.validation.phoneInvalid"),
      });
      return;
    }
    try {
      await patientRegister.mutateAsync({
        displayName: data.displayName.trim(),
        email: step1Data.email,
        phone: normalizeFullPhone(data.dialCode, data.phoneNumber),
        password: step1Data.password,
      });
      router.replace(normalizedCallbackUrl ?? "/patient");
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : t("registrationError")
      );
    }
  }

  const modeLabels = {
    patient: isRtl ? "بوابة تسجيل الدخول" : "Client Portal",
  };

  const getDynamicTitle = () => {
    return isRtl ? "إنشاء حساب مراجع" : "Create a patient account";
  };
  const getDynamicSubtitle = () => {
    return isRtl ? "أنشئ حسابك وابدأ حجز جلساتك بسهولة." : "Create your account and start booking sessions easily.";
  };

  return (
    <AuthSplitCard
      title={getDynamicTitle()}
      subtitle={getDynamicSubtitle()}
      mode="patient"
      activeTab="signup"
    >
      {/* Portal Indicator Badge */}
      <div className="mb-6 flex select-none">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide border border-primary/15 bg-primary-light/40 text-primary dark:border-primary/20 dark:bg-primary/10 dark:text-primary-light">
          <svg
            className="h-4 w-4"
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
          <span>{modeLabels.patient}</span>
        </div>
      </div>

      {/* Step progress bar */}
      <div className="mb-6 space-y-1.5 select-none">
          <div className="flex items-center gap-2">
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
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">
            {step === 1
              ? t("patientSignUp.step1Label")
              : t("patientSignUp.step2Label")}
          </p>
      </div>

      {/* ─── STEP 1 ─── */}
      {step === 1 && (
        <form
          onSubmit={form1.handleSubmit(handleNext)}
          className="space-y-5"
        >
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

          {/* Password */}
          <div>
            <Label>
              {t("patientSignUp.password")}{" "}
              <span className="text-error-500">*</span>
            </Label>
            <AuthPasswordField
              placeholder={t("patientSignUp.passwordPlaceholder")}
              error={!!form1.formState.errors.password}
              {...form1.register("password")}
            />
            {form1.formState.errors.password ? (
              <p className="mt-1.5 text-xs text-error-500">
                {form1.formState.errors.password.message}
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] leading-relaxed text-text-muted">
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
            <AuthPasswordField
              placeholder={t("patientSignUp.confirmPasswordPlaceholder")}
              error={!!form1.formState.errors.confirmPassword}
              {...form1.register("confirmPassword")}
            />
            {form1.formState.errors.confirmPassword && (
              <p className="mt-1.5 text-xs text-error-500">
                {form1.formState.errors.confirmPassword.message}
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
          className="space-y-5"
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
              error={!!form2.formState.errors.displayName}
              {...form2.register("displayName")}
            />
            {form2.formState.errors.displayName ? (
              <p className="mt-1.5 text-xs text-error-500">
                {form2.formState.errors.displayName.message}
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] leading-relaxed text-text-muted">
                {t("patientSignUp.nameHint")}
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
              <div className="w-[110px] shrink-0">
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
                  error={!!form2.formState.errors.phoneNumber}
                  {...form2.register("phoneNumber")}
                />
              </div>
            </div>
            {form2.formState.errors.phoneNumber && (
              <p className="mt-1.5 text-xs text-error-500">
                {form2.formState.errors.phoneNumber.message}
              </p>
            )}
          </div>

          {/* Pricing/reassurance note */}
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

          <button
            type="submit"
            disabled={isSubmitting || !isStep2Valid}
            className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? t("creatingAccount")
              : t("patientSignUp.submit")}
          </button>

          {/* Back Button */}
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

      {/* Google auth in step 1 only */}
      {step === 1 && (
        <div className="mt-5">
          <div className="relative flex items-center justify-center my-4">
            <div className="absolute w-full border-t border-border-light dark:border-white/5" />
            <span className="relative bg-white px-3 text-xs text-text-muted dark:bg-surface-secondary dark:text-text-muted uppercase tracking-wider">
              {t("orContinueWith")}
            </span>
          </div>
          <PatientGoogleAuthButton
            callbackUrl={callbackUrl}
            defaultRedirect="/patient"
          />
        </div>
      )}

      {/* Card Footer Link */}
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
    </AuthSplitCard>
  );
}
