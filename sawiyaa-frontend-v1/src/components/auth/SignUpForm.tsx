"use client";
/* eslint-disable react-hooks/refs */

import { useRef, useState, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Input from "@/components/form/input/InputField";
import AuthPasswordField from "./AuthPasswordField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import MultiSelect from "@/components/form/MultiSelect";
import { GroupIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import {
  useSpecialties,
  useSpecialtyCategories,
} from "@/features/specialties/hooks/use-specialties";
import {
  usePatientRegister,
  usePractitionerRegister,
  usePractitionerVerifyRegistrationOtp,
  usePractitionerResendRegistrationOtp,
} from "@/features/auth/hooks/use-auth";
import { normalizeCallbackPath } from "@/lib/auth/callback-url";
import {
  getLocalizedSpecialtyCategoryName,
  getLocalizedSpecialtyName,
} from "@/features/specialties/utils/localized-specialty";
import AuthSplitCard from "./AuthSplitCard";
import { PractitionerPhoneField } from "@/components/form/group-input/PractitionerPhoneField";
import AuthOtpInput from "./AuthOtpInput";
import AuthOtpTimer from "./AuthOtpTimer";
import type { PractitionerRegistrationResponse } from "@/features/auth/types/auth.types";

function buildAuthHref(basePath: string, params: Record<string, string | null>) {
  const [pathname, existingQuery = ""] = basePath.split("?");
  const search = new URLSearchParams(existingQuery);
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export const SIGN_UP_MODES = ["patient", "practitioner"] as const;
export type SignUpMode = (typeof SIGN_UP_MODES)[number];

const staticSignUpSchema = z.object({
  displayName: z.string(),
  email: z.string(),
  phoneCountryCode: z.string().optional(),
  phone: z.string().optional(),
  password: z.string(),
  confirmPassword: z.string(),
  primarySpecialtyCategoryId: z.string().optional(),
  specialtyIds: z.array(z.string()).optional(),
});

const PRACTITIONER_PHONE_COUNTRIES = [
  { value: "EG", label: "Egypt (EG)", phoneCode: "+20", searchText: "Egypt EG +20" },
  { value: "SA", label: "Saudi Arabia (SA)", phoneCode: "+966", searchText: "Saudi Arabia SA +966" },
  { value: "AE", label: "United Arab Emirates (AE)", phoneCode: "+971", searchText: "United Arab Emirates UAE AE +971" },
  { value: "KW", label: "Kuwait (KW)", phoneCode: "+965", searchText: "Kuwait KW +965" },
  { value: "QA", label: "Qatar (QA)", phoneCode: "+974", searchText: "Qatar QA +974" },
];

type SignUpFormData = z.infer<typeof staticSignUpSchema>;

type SignUpFormProps = {
  accountType: SignUpMode;
};

export default function SignUpForm({ accountType }: SignUpFormProps) {
  const mode = accountType;
  const t = useTranslations("auth");
  const locale = useLocale();
  const isRtl = locale.startsWith("ar");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const normalizedCallbackUrl = normalizeCallbackPath(callbackUrl);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationChallenge, setRegistrationChallenge] = useState<PractitionerRegistrationResponse | null>(null);
  const [registrationCode, setRegistrationCode] = useState("");
  const submitLockRef = useRef(false);

  const patientRegister = usePatientRegister();
  const practitionerRegister = usePractitionerRegister();
  const practitionerVerifyRegistrationOtp = usePractitionerVerifyRegistrationOtp();
  const practitionerResendRegistrationOtp = usePractitionerResendRegistrationOtp();
  const specialtyCategoriesQuery = useSpecialtyCategories(mode === "practitioner");
  const specialtiesQuery = useSpecialties(undefined, mode === "practitioner");
  const isSubmitting = patientRegister.isPending || practitionerRegister.isPending || practitionerVerifyRegistrationOtp.isPending || practitionerResendRegistrationOtp.isPending;

  const signUpSchema = useMemo(() => {
    return z
      .object({
        displayName: z.string().min(1, t("signUpForm.validation.nameRequired")),
        email: z.string().email(t("signUpForm.validation.emailInvalid")),
         phoneCountryCode: z.string().optional(),
         phone: z.string().optional(),
        password: z.string().min(8, t("signUpForm.validation.passwordTooShort")),
        confirmPassword: z.string().min(1, t("patientSignUp.validation.confirmPasswordRequired")),
        primarySpecialtyCategoryId: z.string().optional(),
        specialtyIds: z.array(z.string()).optional(),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: t("patientSignUp.validation.passwordsMismatch"),
        path: ["confirmPassword"],
      });
  }, [mode, t]);

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      displayName: "",
      email: "",
      phoneCountryCode: "",
      phone: "",
      password: "",
      confirmPassword: "",
      primarySpecialtyCategoryId: "",
      specialtyIds: [],
    },
  });

  const getLocalizedError = (err: any): string => {
    if (!err) return "";

    if (
      err.code === "EMAIL_ALREADY_REGISTERED" ||
      err.messageKey === "auth.errors.emailAlreadyRegistered"
    ) {
      return t("errors.emailAlreadyRegistered");
    }

    if (typeof err.code === "string" && err.code.startsWith("PHONE_")) {
      const phoneKey: Record<string, string> = {
        PHONE_ALREADY_REGISTERED: "errors.phoneAlreadyRegistered",
        PHONE_INVALID: "errors.phoneInvalid",
        PHONE_INCOMPLETE: "errors.phoneIncomplete",
        PHONE_TOO_LONG: "errors.phoneTooLong",
        PHONE_COUNTRY_MISMATCH: "errors.phoneCountryMismatch",
        PHONE_UNSUPPORTED_FORMAT: "errors.phoneUnsupportedFormat",
        PHONE_REQUIRED: "phoneRequired",
        PHONE_COUNTRY_REQUIRED: "phoneCountryRequired",
      };
      const key = phoneKey[err.code];
      if (key) return t(key as never);
    }

    if (Array.isArray(err.errors) && err.errors.length > 0) {
      const rawMsg = err.errors[0];
      if (typeof rawMsg === "string") {
        if (rawMsg.includes("email must be an email")) {
          return t("signUpForm.validation.emailInvalid");
        }
        if (rawMsg.includes("password must be longer than or equal to 8")) {
          return t("signUpForm.validation.passwordTooShort");
        }
        if (rawMsg.includes("primarySpecialtyCategoryId must be a UUID") || rawMsg.includes("primarySpecialtyCategoryId")) {
          return t("signUpForm.validation.categoryRequired");
        }
        if (rawMsg.includes("specialtyIds") && (rawMsg.includes("at least 1") || rawMsg.includes("UUID"))) {
          return t("signUpForm.validation.subSpecialtyRequired");
        }
      }
      return t("signUpForm.validation.genericError");
    }

    if (typeof err.message === "string" && err.message.trim()) {
      const msgLower = err.message.toLowerCase();
      if (msgLower.includes("email must be an email")) {
        return t("signUpForm.validation.emailInvalid");
      }
      if (msgLower.includes("password must be longer")) {
        return t("signUpForm.validation.passwordTooShort");
      }
      if (msgLower.includes("primaryspecialtycategoryid")) {
        return t("signUpForm.validation.categoryRequired");
      }
      if (msgLower.includes("specialtyids")) {
        return t("signUpForm.validation.subSpecialtyRequired");
      }
      return err.message.trim();
    }

    return t("registrationError");
  };

  const selectedCategoryId = useWatch({
    control: form.control,
    name: "primarySpecialtyCategoryId",
  });
  const selectedSpecialtyIds =
    useWatch({
      control: form.control,
      name: "specialtyIds",
    }) ?? [];
  const selectedPhoneCountryCode = useWatch({ control: form.control, name: "phoneCountryCode" }) ?? "";
  const enteredPhone = useWatch({ control: form.control, name: "phone" }) ?? "";
  const passwordVal = useWatch({ control: form.control, name: "password" }) ?? "";
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
    if (submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
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

       const registration = await practitionerRegister.mutateAsync({
        displayName: data.displayName,
        email: data.email,
        ...(data.phone?.trim() ? { phoneCountryCode: data.phoneCountryCode, phone: data.phone } : {}),
        password: data.password,
        primarySpecialtyCategoryId: selectedCategory,
        specialtyIds: selectedSpecialties,
      });
       setRegistrationChallenge(registration);
       setRegistrationCode("");
    } catch (submissionError) {
      setError(getLocalizedError(submissionError));
    } finally {
      submitLockRef.current = false;
    }
  };

  const verifyPractitionerRegistration = async () => {
    if (!registrationChallenge?.challengeId || registrationCode.length !== 6) return;
    try {
      await practitionerVerifyRegistrationOtp.mutateAsync({ challengeId: registrationChallenge.challengeId, code: registrationCode });
      form.reset();
      window.location.replace(`/${locale}${buildAuthHref("/signin", { callbackUrl: normalizedCallbackUrl, mode: "practitioner" })}`);
    } catch (verificationError) {
      setError(getLocalizedError(verificationError));
    }
  };

  const resendPractitionerRegistration = async () => {
    if (!registrationChallenge?.challengeId) return;
    try {
      const next = await practitionerResendRegistrationOtp.mutateAsync({ challengeId: registrationChallenge.challengeId });
      setRegistrationChallenge(next);
      setRegistrationCode("");
      setError(null);
    } catch (resendError) {
      setError(getLocalizedError(resendError));
    }
  };

  const signInHref = buildAuthHref("/signin", {
    callbackUrl: normalizedCallbackUrl,
    mode,
  });

  const modeLabels = {
    patient: isRtl ? "بوابة تسجيل الدخول" : "Client Portal",
    practitioner: isRtl ? "بوابة المعالجين" : "Specialist Portal",
  };

  const getDynamicTitle = () => {
    return isRtl ? "إنشاء حساب كممارس" : "Create Practitioner Account";
  };
  const getDynamicSubtitle = () => {
    return isRtl ? "أنشئ حسابك أولًا، وبعدها نكمل بيانات طلب الانضمام." : "Create your account first, then continue the joining request.";
  };

  return (
    <AuthSplitCard
      title={getDynamicTitle()}
      subtitle={getDynamicSubtitle()}
      mode={mode}
      activeTab="signup"
    >
      {/* Portal Indicator Badge */}
      <div className="mb-6 flex select-none">
        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide ${
          mode === "patient" ? "border border-primary/15 bg-primary-light/40 text-primary dark:border-primary/20 dark:bg-primary/10 dark:text-primary-light" :
          "border border-sky-500/15 bg-sky-500/10 text-sky-600 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400"
        }`}>
          <GroupIcon className="h-4 w-4" />
          <span>{modeLabels[mode]}</span>
        </div>
      </div>

      {/* Form */}
      {/* react-hook-form requires handleSubmit to be passed from the form instance. */}
      {registrationChallenge?.nextStep === "OTP_REQUIRED" && mode === "practitioner" ? (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-text-primary dark:text-white">{t("practitionerRegistrationOtp.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary dark:text-text-secondary">{t("practitionerRegistrationOtp.description", { target: registrationChallenge.maskedTarget ?? "" })}</p>
          </div>
          <AuthOtpInput value={registrationCode} onChange={setRegistrationCode} disabled={isSubmitting} error={error ?? undefined} />
          <AuthOtpTimer expiresAt={registrationChallenge.expiresAt ?? ""} />
          <button type="button" onClick={verifyPractitionerRegistration} disabled={isSubmitting || registrationCode.length !== 6} className="flex w-full items-center justify-center rounded-2xl bg-[#1A365D] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{t("practitionerRegistrationOtp.verify")}</button>
          <button type="button" onClick={resendPractitionerRegistration} disabled={isSubmitting} className="w-full text-sm font-semibold text-primary disabled:opacity-50">{t("practitionerRegistrationOtp.resend")}</button>
          <button type="button" onClick={() => { setRegistrationChallenge(null); setRegistrationCode(""); setError(null); }} className="w-full rounded-2xl border border-border-light px-4 py-3 text-sm font-semibold text-text-secondary">{t("practitionerRegistrationOtp.back")}</button>
        </div>
      ) : (
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              {...form.register("email", {
                onChange: () => setError(null),
              })}
              dir="ltr"
            />
            {form.formState.errors.email && (
              <p className="mt-1.5 text-xs text-error-500">
                {form.formState.errors.email.message}
              </p>
            )}
            {mode === "practitioner" && <p className="mt-1.5 text-xs leading-5 text-text-secondary">{t("practitionerEmailVerificationHint")}</p>}
          </div>

          <div>
            <Label>
              {t("password")} <span className="text-error-500">*</span>
            </Label>
            <AuthPasswordField
              placeholder={t("passwordPlaceholder")}
              error={!!form.formState.errors.password}
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="mt-1.5 text-xs text-error-500">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <div>
            <Label>
              {t("patientSignUp.confirmPassword")} <span className="text-error-500">*</span>
            </Label>
            <AuthPasswordField
              placeholder={t("patientSignUp.confirmPasswordPlaceholder")}
              error={!!form.formState.errors.confirmPassword}
              {...form.register("confirmPassword")}
            />
            {form.formState.errors.confirmPassword && (
              <p className="mt-1.5 text-xs text-error-500">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Password Strength Indicator */}
          {passwordVal && passwordVal.length > 0 && (
            <div className="sm:col-span-2 mt-1 space-y-1.5 select-none">
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

          {mode === "practitioner" ? (
            <div className="sm:col-span-2">
              <PractitionerPhoneField
                countryCode={selectedPhoneCountryCode}
                phone={enteredPhone}
                countries={PRACTITIONER_PHONE_COUNTRIES}
                onCountryChange={(value) => form.setValue("phoneCountryCode", value, { shouldValidate: true })}
                onPhoneChange={(value) => form.setValue("phone", value, { shouldValidate: true })}
                countryLabel={t("phoneCountry")}
                phoneLabel={t("phone")}
                countryPlaceholder={t("phoneCountryPlaceholder")}
                searchPlaceholder={t("phoneCountrySearchPlaceholder")}
                phonePlaceholder={t("phonePlaceholder")}
                countryError={form.formState.errors.phoneCountryCode?.message}
                phoneError={form.formState.errors.phone?.message}
              />
            </div>
          ) : null}

        </div>

        {mode === "practitioner" && (
          <div className="rounded-2xl border border-border-light bg-surface-tertiary/40 p-4.5 dark:border-white/5">
            <div className="mb-4">
              <p className="text-sm font-semibold text-text-primary dark:text-text-primary">
                {t("signUpInitialSpecialty.title")}
              </p>
              <p className="mt-1 text-xs leading-5 text-text-secondary dark:text-text-secondary">
                {t("signUpInitialSpecialty.helper")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>
                  {t("practitionerSpecialties.categoryLabel")} <span className="text-error-500">*</span>
                </Label>
                <Select
                  key={`signup-category-${categoryOptions.length}`}
                  options={categoryOptions}
                  placeholder={
                    specialtyCategoriesQuery.isPending
                      ? (isRtl ? "جاري تحميل التخصصات..." : "Loading specialties...")
                      : t("practitionerSpecialties.categoryPlaceholder")
                  }
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
                  placeholder={
                    selectedCategoryId
                      ? (isRtl ? "اختر التخصصات المناسبة" : "Select sub-specialties")
                      : t("practitionerSpecialties.subSpecialtyPlaceholder")
                  }
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

            {(specialtyCategoriesQuery.isError || specialtiesQuery.isError) && (
              <p className="text-xs text-error-500 mt-2">
                {isRtl
                  ? "لم نتمكن من تحميل التخصصات. حاول مرة أخرى."
                  : "Failed to load specialties. Please try again."}
              </p>
            )}
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
          className="flex w-full items-center justify-center rounded-2xl bg-[#1A365D] hover:bg-[#2A4D7C] px-4 py-3 text-sm font-semibold text-white shadow-theme-xs transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? t("creatingAccount") : t("createAccountButton")}
        </button>
      </form>
      )}

      {/* Footer Switch Link */}
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
    </AuthSplitCard>
  );
}
