"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import Input from "@/components/form/input/InputField";
import AuthPasswordField from "./AuthPasswordField";
import Label from "@/components/form/Label";
import { InternationalPhoneField } from "@/components/form/group-input/InternationalPhoneField";
import { PHONE_COUNTRIES } from "@/features/auth/phone/phone-countries";
import PatientGoogleAuthButton from "@/components/auth/PatientGoogleAuthButton";
import { usePatientRegister } from "@/features/auth/hooks/use-auth";
import { normalizeCallbackPath } from "@/lib/auth/callback-url";
import { toAppError } from "@/lib/api/errors";
import AuthSplitCard from "./AuthSplitCard";

type SignUpFormData = {
  displayName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  password: string;
  confirmPassword: string;
};

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

  const [error, setError] = useState<string | null>(null);

  const patientRegister = usePatientRegister();
  const isSubmitting = patientRegister.isPending;

  const signUpSchema = useMemo(() => {
    return z
      .object({
        displayName: z
          .string()
          .trim()
          .min(1, isRtl ? "أدخل اسمك." : "Enter your name."),
        email: z
          .string()
          .trim()
          .min(1, isRtl ? "أدخل بريدك الإلكتروني." : "Enter your email.")
          .email(isRtl ? "تحقق من البريد الإلكتروني." : "Check your email."),
        phone: z.string().trim().optional(),
        phoneCountryCode: z.string().optional(),
        password: z
          .string()
          .min(8, isRtl ? "استخدم 8 أحرف على الأقل." : "Use at least 8 characters."),
        confirmPassword: z.string().min(1, isRtl ? "كلمتا المرور غير متطابقتين." : "Passwords do not match."),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: isRtl ? "كلمتا المرور غير متطابقتين." : "Passwords do not match.",
        path: ["confirmPassword"],
      })
      .superRefine((data, ctx) => {
        if (data.phone) {
          try {
            const parsed = parsePhoneNumberFromString(data.phone, data.phoneCountryCode as any);
            if (!parsed) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: isRtl ? "تأكّد من رقم الهاتف والدولة المختارة." : "Check your phone number and selected country.",
                path: ["phone"],
              });
            } else if (!parsed.isValid()) {
              const isPossible = parsed.isPossible();
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: isPossible
                  ? (isRtl ? "تأكّد من رقم الهاتف والدولة المختارة." : "Check your phone number and selected country.")
                  : (isRtl ? "رقم الهاتف غير مكتمل." : "Incomplete phone number."),
                path: ["phone"],
              });
            }
          } catch (e) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: isRtl ? "تأكّد من رقم الهاتف والدولة المختارة." : "Check your phone number and selected country.",
              path: ["phone"],
            });
          }
        }
      });
  }, [isRtl]);

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    mode: "onBlur",
    defaultValues: {
      displayName: "",
      email: "",
      phone: "",
      phoneCountryCode: "EG",
      password: "",
      confirmPassword: "",
    },
  });

  const watchedFields = useWatch({ control: form.control });
  const isFormValid = form.formState.isValid;

  const passwordVal = watchedFields.password || "";
  const passwordStrength = useMemo(() => {
    if (!passwordVal) return { score: 0, text: "", color: "" };
    let score = 0;
    if (passwordVal.length >= 8) score++;
    if (/[a-z]/.test(passwordVal)) score++;
    if (/[A-Z]/.test(passwordVal)) score++;
    if (/[0-9]/.test(passwordVal) || /[^A-Za-z0-9]/.test(passwordVal)) score++;

    let text = "";
    let color = "";
    if (score <= 1) {
      text = isRtl ? "ضعيفة" : "Weak";
      color = "bg-error-500";
    } else if (score === 2) {
      text = isRtl ? "متوسطة" : "Medium";
      color = "bg-warning-500";
    } else if (score >= 3) {
      text = isRtl ? "قوية" : "Strong";
      color = "bg-success-500";
    }
    return { score, text, color };
  }, [passwordVal, isRtl]);

  const getFriendlyErrorMessage = (err: any) => {
    if (!err) return "";

    const appError = toAppError(err);
    if (appError.statusCode === 429) {
      const retryAfterSeconds = appError.retryAfterSeconds;
      if (typeof retryAfterSeconds === "number" && retryAfterSeconds >= 60) {
        return t("registrationRateLimitedMinutes", {
          minutes: Math.ceil(retryAfterSeconds / 60),
        });
      }
      if (typeof retryAfterSeconds === "number" && retryAfterSeconds > 0) {
        return t("registrationRateLimitedSeconds", {
          seconds: Math.ceil(retryAfterSeconds),
        });
      }
      return t("registrationRateLimitedFallback");
    }

    const message = typeof err === "string" ? err : err.message || "";
    const isEmailRegistered =
      err.code === "EMAIL_ALREADY_REGISTERED" ||
      err.messageKey === "auth.errors.emailAlreadyRegistered" ||
      message.includes("EMAIL_ALREADY_REGISTERED") ||
      message.includes("emailAlreadyRegistered");
      
    const isPhoneRegistered =
      err.code === "PHONE_ALREADY_REGISTERED" ||
      err.messageKey === "auth.errors.phoneAlreadyRegistered" ||
      message.includes("PHONE_ALREADY_REGISTERED") ||
      message.includes("phoneAlreadyRegistered");

    if (isEmailRegistered) {
      return isRtl
        ? "هذا البريد الإلكتروني مستخدم بالفعل. جرّب تسجيل الدخول."
        : "This email is already registered. Try signing in.";
    }

    if (isPhoneRegistered) {
      return isRtl
        ? "رقم الهاتف مستخدم بالفعل. جرّب تسجيل الدخول."
        : "This phone number is already registered. Try signing in.";
    }

    if (err.status === 409 || err.statusCode === 409 || message.includes("409") || message.toLowerCase().includes("conflict")) {
      return isRtl
        ? "يوجد حساب بهذه البيانات بالفعل. جرّب تسجيل الدخول."
        : "An account with these details already exists. Try signing in.";
    }

    return isRtl
      ? "تعذر إنشاء الحساب الآن. حاول مرة أخرى."
      : "Could not create the account now. Please try again.";
  };

  async function onSubmit(data: SignUpFormData) {
    setError(null);
    try {
      await patientRegister.mutateAsync({
        displayName: data.displayName.trim(),
        email: data.email.trim().toLowerCase(),
        ...(data.phone?.trim() ? { phone: data.phone, phoneCountryCode: data.phoneCountryCode } : {}),
        password: data.password,
      });
      router.replace(normalizedCallbackUrl ?? "/patient");
      router.refresh();
    } catch (submissionError) {
      setError(getFriendlyErrorMessage(submissionError));
    }
  }

  const onError = (errors: any) => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      const firstErrorKey = errorKeys[0];
      if (firstErrorKey === "phone") {
        const phoneInput = document.querySelector('input[type="tel"]') as HTMLInputElement | null;
        phoneInput?.focus();
      } else {
        const input = document.getElementsByName(firstErrorKey)[0] as HTMLInputElement | null;
        input?.focus();
      }
    }
  };

  const labels = {
    title: isRtl ? "إنشاء حساب مستخدم" : "Create user account",
    subtitle: isRtl ? "ابدأ بخطوات بسيطة." : "Start with simple steps.",
    displayName: isRtl ? "الاسم" : "Name",
    email: isRtl ? "البريد الإلكتروني" : "Email",
    phone: isRtl ? "رقم الهاتف" : "Phone number",
    password: isRtl ? "كلمة المرور" : "Password",
    confirmPassword: isRtl ? "تأكيد كلمة المرور" : "Confirm password",
    submit: isRtl ? "إنشاء الحساب" : "Create account",
    alreadyHaveAccount: isRtl ? "لديك حساب بالفعل؟" : "Already have an account?",
    signIn: isRtl ? "تسجيل الدخول" : "Sign In",
    or: isRtl ? "أو" : "Or",
  };

  return (
    <AuthSplitCard
      title={labels.title}
      subtitle={labels.subtitle}
      mode="patient"
      activeTab="signup"
    >
      <form
        onSubmit={form.handleSubmit(onSubmit, onError)}
        className="space-y-4"
      >
        {/* Name and Email in one row on desktop */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Name */}
          <div>
            <Label>
              {labels.displayName}{" "}
              <span className="text-error-500">*</span>
            </Label>
            <Input
              type="text"
              placeholder={t("patientSignUp.namePlaceholder")}
              dir={isRtl ? "rtl" : "ltr"}
              error={!!form.formState.errors.displayName}
              aria-required="true"
              aria-describedby={form.formState.errors.displayName ? "name-error" : undefined}
              {...form.register("displayName")}
            />
            {form.formState.errors.displayName && (
              <p id="name-error" className="mt-1 text-xs text-error-500" role="alert">
                {form.formState.errors.displayName.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <Label>
              {labels.email}{" "}
              <span className="text-error-500">*</span>
            </Label>
            <Input
              type="email"
              inputMode="email"
              placeholder={t("patientSignUp.emailPlaceholder")}
              dir="ltr"
              error={!!form.formState.errors.email}
              aria-required="true"
              aria-describedby={form.formState.errors.email ? "email-error" : undefined}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p id="email-error" className="mt-1 text-xs text-error-500" role="alert">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
        </div>

        {/* Phone */}
        <div>
          <InternationalPhoneField
            countries={PHONE_COUNTRIES}
            countryIso2={watchedFields.phoneCountryCode ?? "EG"}
            value={watchedFields.phone ?? ""}
            onCountryChange={(value) => form.setValue("phoneCountryCode", value, { shouldValidate: true })}
            onValueChange={(value) => form.setValue("phone", value, { shouldValidate: true })}
            label={labels.phone}
            countryLabel={t("phoneCountry")}
            countryPlaceholder={t("phoneCountryPlaceholder")}
            searchPlaceholder={t("phoneCountrySearchPlaceholder")}
            phonePlaceholder="01012345678"
            countryError={form.formState.errors.phoneCountryCode?.message}
            phoneError={form.formState.errors.phone?.message}
            helperText={undefined}
          />
        </div>

        {/* Password and Confirm Password in one row on desktop */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Password */}
          <div>
            <Label>
              {labels.password}{" "}
              <span className="text-error-500">*</span>
            </Label>
            <AuthPasswordField
              placeholder={t("patientSignUp.passwordPlaceholder")}
              error={!!form.formState.errors.password}
              aria-required="true"
              aria-describedby={form.formState.errors.password ? "password-error" : undefined}
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p id="password-error" className="mt-1 text-xs text-error-500" role="alert">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <Label>
              {labels.confirmPassword}{" "}
              <span className="text-error-500">*</span>
            </Label>
            <AuthPasswordField
              placeholder={t("patientSignUp.confirmPasswordPlaceholder")}
              error={!!form.formState.errors.confirmPassword}
              aria-required="true"
              aria-describedby={form.formState.errors.confirmPassword ? "confirmPassword-error" : undefined}
              {...form.register("confirmPassword")}
            />
            {form.formState.errors.confirmPassword && (
              <p id="confirmPassword-error" className="mt-1 text-xs text-error-500" role="alert">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>

        {/* Password Strength Indicator */}
        {passwordVal && passwordVal.length > 0 && (
          <div className="mt-1 space-y-1.5 select-none">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary dark:text-text-secondary">
                {isRtl ? "قوة كلمة المرور:" : "Password strength:"}{" "}
                <span className="font-semibold">{passwordStrength.text}</span>
              </span>
              <span className="text-text-muted">
                {isRtl ? "8 أحرف على الأقل" : "At least 8 characters"}
              </span>
            </div>
            <div className="flex gap-1 h-1.5">
              <div className={`h-full flex-1 rounded-full transition-colors duration-300 ${passwordStrength.score >= 1 ? passwordStrength.color : "bg-border-light dark:bg-white/5"}`} />
              <div className={`h-full flex-1 rounded-full transition-colors duration-300 ${passwordStrength.score >= 2.5 ? passwordStrength.color : "bg-border-light dark:bg-white/5"}`} />
              <div className={`h-full flex-1 rounded-full transition-colors duration-300 ${passwordStrength.score >= 4 ? passwordStrength.color : "bg-border-light dark:bg-white/5"}`} />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-error-50 p-3.5 text-xs text-error-500 dark:bg-error-500/10" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !isFormValid}
          className="flex w-full items-center justify-center rounded-2xl bg-[#24564F] hover:bg-[#1E4B45] px-4 py-3 text-sm font-semibold text-white shadow-theme-xs transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? (isRtl ? "جاري إنشاء الحساب..." : "Creating account...")
            : labels.submit}
        </button>
      </form>

      {/* Google Auth rendering checks configuration status */}
      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
        <div className="mt-4">
          <div className="relative flex items-center justify-center my-3">
            <div className="absolute w-full border-t border-border-light dark:border-white/5" />
            <span className="relative bg-white px-3 text-xs text-text-muted dark:bg-surface-secondary dark:text-text-muted uppercase tracking-wider">
              {labels.or}
            </span>
          </div>
          <PatientGoogleAuthButton
            callbackUrl={callbackUrl}
            defaultRedirect="/patient"
          />
        </div>
      )}

      {/* Card Footer Link */}
      <div className="mt-6 border-t border-border-light pt-4 dark:border-white/5">
        <p className="text-sm text-text-secondary dark:text-text-secondary">
          {labels.alreadyHaveAccount}{" "}
          <Link
            href="/signin/patient"
            className="font-semibold text-primary hover:text-primary-hover transition-colors"
          >
            {labels.signIn}
          </Link>
        </p>
      </div>
    </AuthSplitCard>
  );
}
