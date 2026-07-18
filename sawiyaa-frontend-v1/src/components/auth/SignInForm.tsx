"use client";

import { useRef, useState } from "react";
import type { ComponentType } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, LayoutGrid, Stethoscope, UserRound, Terminal } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Input from "@/components/form/input/InputField";
import AuthPasswordField from "./AuthPasswordField";
import AuthOtpInput from "./AuthOtpInput";
import AuthOtpTimer from "./AuthOtpTimer";
import Label from "@/components/form/Label";
import PatientGoogleAuthButton from "@/components/auth/PatientGoogleAuthButton";
import {
  useAdminLogin,
  usePatientLogin,
  usePractitionerLogin,
  usePractitionerVerifyOtp,
} from "@/features/auth/hooks/use-auth";
import { getAuthLockoutErrorMessage } from "@/features/auth/lib/auth-lockout-errors";
import type {
  AuthenticatedUser,
  PractitionerOtpChallengeResponse,
  PractitionerAuthenticatedResponse,
} from "@/features/auth/types/auth.types";
import { getDefaultRouteByRole, resolveRole } from "@/config/route-access";
import { normalizeCallbackPath } from "@/lib/auth/callback-url";
import AuthSplitCard from "./AuthSplitCard";

export const SIGN_IN_MODES = ["patient", "practitioner", "admin"] as const;
export type SignInMode = (typeof SIGN_IN_MODES)[number];

const credentialsSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const otpSchema = z.object({
  code: z
    .string()
    .min(4, "Verification code is required")
    .max(8, "Verification code is invalid"),
});

type CredentialsFormData = z.infer<typeof credentialsSchema>;
type OtpFormData = z.infer<typeof otpSchema>;

type PractitionerChallengeState = {
  challengeId: string;
  maskedTarget: string;
  expiresAt: string;
};

type PractitionerLoginResponse =
  | PractitionerOtpChallengeResponse
  | PractitionerAuthenticatedResponse;

type ModeConfig = {
  icon: ComponentType<{ className?: string }>;
};

const MODE_CONFIG: Record<SignInMode, ModeConfig> = {
  patient: { icon: UserRound },
  practitioner: { icon: Stethoscope },
  admin: { icon: LayoutGrid },
};

function buildAuthHref(basePath: string, params: Record<string, string | null>) {
  const [pathname, existingQuery = ""] = basePath.split("?");
  const search = new URLSearchParams(existingQuery);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

type SignInFormProps = {
  mode: SignInMode;
};

type CredentialPreset = {
  label: string;
  email: string;
  password: string;
  note: string;
};

const TEST_CREDENTIALS_BY_MODE: Record<SignInMode, CredentialPreset> = {
  patient: {
    label: "الافتراضي: مريض QA مصري",
    email: "ahmed.patient@hesba.local",
    password: "Patient@12345",
    note: "AHMED / القاهرة",
  },
  practitioner: {
    label: "الافتراضي: معالج QA معتمد",
    email: "amohamef206@gmail.com",
    password: "Practitioner2@12345",
    note: "DR. MOHAMED / القاهرة",
  },
  admin: {
    label: "الافتراضي: مدير النظام",
    email: "admin@hesba.local",
    password: "Admin@12345",
    note: "SUPER_ADMIN",
  },
};

const PATIENT_TEST_CREDENTIALS: CredentialPreset[] = [
  {
    label: "مريض QA 1",
    email: "ahmed.patient@hesba.local",
    password: "Patient@12345",
    note: "القاهرة",
  },
  {
    label: "مريض QA 2",
    email: "mohamed.patient@hesba.local",
    password: "Patient2@12345",
    note: "دبي",
  },
  {
    label: "مريض QA 3",
    email: "omar.patient@hesba.local",
    password: "Patient3@12345",
    note: "خيار إضافي",
  },
];

const PRACTITIONER_TEST_CREDENTIALS: CredentialPreset[] = [
  {
    label: "معالج QA 1",
    email: "ahmed.m.abdelal57@gmail.com",
    password: "Practitioner@12345",
    note: "القاهرة",
  },
  {
    label: "معالج QA 2",
    email: "amohamef206@gmail.com",
    password: "Practitioner2@12345",
    note: "الرياض",
  },
  {
    label: "معالج QA 3",
    email: "dr.mahmoud@hesba.local",
    password: "Practitioner3@12345",
    note: "خيار إضافي",
  },
  {
    label: "معالج QA 4",
    email: "dr.abdelfattah@hesba.local",
    password: "Practitioner4@12345",
    note: "خيار إضافي",
  },
];

const ADMIN_TEST_CREDENTIALS: CredentialPreset[] = [
  {
    label: "مدير النظام",
    email: "admin@hesba.local",
    password: "Admin@12345",
    note: "SUPER_ADMIN",
  },
  {
    label: "مدير النظام الاحتياطي",
    email: "qa.super.admin.backup@hesba.local",
    password: "BackupSuper@12345",
    note: "SUPER_ADMIN",
  },
  {
    label: "مدير الإدارة",
    email: "qa.admin@hesba.local",
    password: "AdminQa@12345",
    note: "ADMIN",
  },
  {
    label: "المدير الهدف",
    email: "qa.target.admin@hesba.local",
    password: "TargetAdmin@12345",
    note: "ADMIN",
  },
  {
    label: "وكيل الدعم",
    email: "support@hesba.local",
    password: "Support@12345",
    note: "SUPPORT",
  },
  {
    label: "المالية",
    email: "finance@hesba.local",
    password: "Finance@12345",
    note: "FINANCE_STAFF",
  },
  {
    label: "مراجع التطبيقات",
    email: "practitioner.reviewer@hesba.local",
    password: "ReviewerQa@12345",
    note: "PRACTITIONER_REVIEWER",
  },
  {
    label: "مراجع المحتوى",
    email: "reviewer@hesba.local",
    password: "Reviewer@12345",
    note: "CONTENT_REVIEWER",
  },
  {
    label: "عمليات المرضى",
    email: "patient.ops@hesba.local",
    password: "PatientOps@12345",
    note: "PATIENT_OPERATIONS",
  },
  {
    label: "التسويق",
    email: "marketing@hesba.local",
    password: "Marketing@12345",
    note: "MARKETING_STAFF",
  },
];

function isOtpChallengeResponse(
  response: unknown,
): response is PractitionerOtpChallengeResponse {
  if (typeof response !== "object" || response === null) {
    return false;
  }

  const value = response as Record<string, unknown>;
  return (
    value.nextStep === "OTP_REQUIRED" &&
    typeof value.challengeId === "string" &&
    typeof value.maskedTarget === "string" &&
    typeof value.expiresAt === "string" &&
    typeof value.channel === "string" &&
    value.requiresOtpVerification === true
  );
}

export default function SignInForm({ mode }: SignInFormProps) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const normalizedCallbackUrl = normalizeCallbackPath(callbackUrl);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<PractitionerChallengeState | null>(null);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const credentialsSubmitLockRef = useRef(false);
  const otpSubmitLockRef = useRef(false);

  const patientLogin = usePatientLogin();
  const practitionerLogin = usePractitionerLogin();
  const practitionerVerifyOtp = usePractitionerVerifyOtp();
  const adminLogin = useAdminLogin();

  const isSubmitting =
    patientLogin.isPending ||
    practitionerLogin.isPending ||
    practitionerVerifyOtp.isPending ||
    adminLogin.isPending;

  const credentialsForm = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      code: "",
    },
  });

  const toLocalizedPath = (path: string): string => {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    if (!path.startsWith("/")) {
      return path;
    }

    if (path === "/") {
      return `/${locale}`;
    }

    return `/${locale}${path}`;
  };

  const redirectAfterAuth = (user: AuthenticatedUser) => {
    const resolvedRole = resolveRole(user.roles[0]) ?? "PATIENT";
    const practitionerNeedsOnboarding =
      resolvedRole === "PRACTITIONER" && user.practitionerStatus !== "APPROVED";
    const target = practitionerNeedsOnboarding
      ? "/practitioner/application"
      : (normalizedCallbackUrl ?? getDefaultRouteByRole(resolvedRole));
    window.location.replace(toLocalizedPath(target));
  };

  const resetPractitionerOtpState = () => {
    setChallenge(null);
    otpForm.reset({ code: "" });
    otpSubmitLockRef.current = false;
  };

  const getSafeCredentialsErrorMessage = (cause: unknown) =>
    getAuthLockoutErrorMessage(
      cause,
      mode === "practitioner" ? "practitioner-password" : mode,
      t,
    );
  const getSafeOtpErrorMessage = (cause: unknown) =>
    getAuthLockoutErrorMessage(cause, "practitioner-otp", t);

  const onSubmitCredentials = async (data: CredentialsFormData) => {
    if (credentialsSubmitLockRef.current) {
      return;
    }

    credentialsSubmitLockRef.current = true;
    setError(null);

    try {
      if (mode === "patient") {
        const result = await patientLogin.mutateAsync(data);
        redirectAfterAuth(result.user);
        return;
      }

      if (mode === "admin") {
        const result = await adminLogin.mutateAsync(data);
        redirectAfterAuth(result.user);
        return;
      }

      const loginResponse = (await practitionerLogin.mutateAsync(
        data,
      )) as PractitionerLoginResponse;

      if (loginResponse.nextStep === "AUTHENTICATED") {
        resetPractitionerOtpState();
        redirectAfterAuth(loginResponse.user);
        return;
      }

      if (isOtpChallengeResponse(loginResponse)) {
        setChallenge({
          challengeId: loginResponse.challengeId,
          maskedTarget: loginResponse.maskedTarget,
          expiresAt: loginResponse.expiresAt,
        });
        otpForm.reset({ code: "" });
        setError(null);
        return;
      }

      throw new Error("PRACTITIONER_LOGIN_UNKNOWN_NEXT_STEP");
    } catch (cause) {
      setError(getSafeCredentialsErrorMessage(cause));
    } finally {
      credentialsSubmitLockRef.current = false;
    }
  };

  const onSubmitOtp = async (data: OtpFormData) => {
    if (!challenge || otpSubmitLockRef.current) return;

    otpSubmitLockRef.current = true;
    setError(null);
    let verified = false;

    try {
      const result = await practitionerVerifyOtp.mutateAsync({
        challengeId: challenge.challengeId,
        code: data.code,
      });
      verified = true;
      setChallenge(null);
      otpForm.reset({ code: "" });
      redirectAfterAuth(result.user);
    } catch (cause) {
      setError(getSafeOtpErrorMessage(cause));
    } finally {
      // Keep the one-shot lock through navigation so a double-submit cannot
      // reuse the already-consumed challenge and surface a misleading error.
      if (!verified) {
        otpSubmitLockRef.current = false;
      }
    }
  };

  const signUpHref =
    mode === "patient"
      ? buildAuthHref("/signup", { callbackUrl: normalizedCallbackUrl, mode: "patient" })
      : mode === "practitioner"
        ? buildAuthHref("/signup", { callbackUrl: normalizedCallbackUrl, mode: "practitioner" })
        : null;

  const forgotPasswordHref =
    mode === "patient"
      ? buildAuthHref("/forgot-password/patient", {})
      : mode === "practitioner"
        ? buildAuthHref("/forgot-password/practitioner", {})
        : null;
  const shouldShowTestCredentials =
    process.env.NEXT_PUBLIC_SHOW_TEST_CREDENTIALS === "true";
  const modeConfig = MODE_CONFIG[mode];
  const ModeIcon = modeConfig.icon;
  const testCredentials = TEST_CREDENTIALS_BY_MODE[mode];
  const quickAccountsByMode: Record<SignInMode, CredentialPreset[]> = {
    patient: PATIENT_TEST_CREDENTIALS,
    practitioner: PRACTITIONER_TEST_CREDENTIALS,
    admin: ADMIN_TEST_CREDENTIALS,
  };
  const quickAccounts = quickAccountsByMode[mode];

  const applyTestCredentials = (credentials = testCredentials) => {
    credentialsForm.setValue("email", credentials.email, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    credentialsForm.setValue("password", credentials.password, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setError(null);
  };

  const isRtl = locale === "ar";
  const modeLabels: Record<SignInMode, string> = {
    patient: isRtl ? "بوابة تسجيل الدخول" : "Client Portal",
    practitioner: isRtl ? "بوابة المعالجين" : "Specialist Portal",
    admin: isRtl ? "بوابة الإدارة" : "Admin Portal",
  };

  const getDynamicTitle = () => {
    if (challenge) {
      return isRtl ? "التحقق من تسجيل الدخول" : "Verify your sign in";
    }
    if (mode === "admin") {
      return isRtl ? "تسجيل دخول الإدارة" : "Admin Sign In";
    }
    if (mode === "practitioner") {
      return isRtl ? "تسجيل دخول الممارس" : "Practitioner sign in";
    }
    return isRtl ? "تسجيل دخول المستخدم " : "Patient sign in";
  };

  const getDynamicSubtitle = () => {
    if (challenge) {
      return isRtl ? "أدخل الرمز المرسل إلى بريدك الإلكتروني." : "Enter the code sent to your email.";
    }
    if (mode === "admin") {
      return isRtl ? "ادخل لإدارة المنصة ومتابعة العمليات." : "Sign in to manage the platform and its operations.";
    }
    if (mode === "practitioner") {
      return isRtl ? "ادخل لإدارة جلساتك ومواعيدك." : "Sign in to manage your sessions and availability.";
    }
    return isRtl ? "ادخل لحجز جلساتك ومتابعة مواعيدك." : "Sign in to book sessions and manage your appointments.";
  };

  return (
    <>
      <AuthSplitCard
        title={getDynamicTitle()}
        subtitle={getDynamicSubtitle()}
        mode={mode}
        activeTab={challenge ? "otp" : "signin"}
      >
        {/* Portal Indicator Badge */}
        <div className="mb-6 flex select-none">
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide ${
            mode === "patient" ? "border border-primary/15 bg-primary-light/40 text-primary dark:border-primary/20 dark:bg-primary/10 dark:text-primary-light" :
            mode === "practitioner" ? "border border-sky-500/15 bg-sky-500/10 text-sky-600 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400" :
            "border border-indigo-500/15 bg-indigo-500/10 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400"
          }`}>
            <ModeIcon className="h-4 w-4" />
            <span>{modeLabels[mode]}</span>
          </div>
        </div>

        {!challenge ? (
          <form onSubmit={credentialsForm.handleSubmit(onSubmitCredentials)}>
            <div className="space-y-5">
              
              {/* Email Input */}
              <div>
                <Label>
                  {t("email")} <span className="text-error-500">*</span>
                </Label>
                <Input
                  placeholder={t("emailPlaceholder")}
                  type="email"
                  {...credentialsForm.register("email")}
                  error={!!credentialsForm.formState.errors.email}
                  dir="ltr"
                />
                {credentialsForm.formState.errors.email && (
                  <p className="mt-1.5 text-xs text-error-500">
                    {credentialsForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label className="mb-0">
                    {t("password")} <span className="text-error-500">*</span>
                  </Label>
                  {forgotPasswordHref && (
                    <Link
                      href={forgotPasswordHref}
                      className="text-xs font-semibold text-primary hover:text-primary-hover dark:text-text-brand dark:hover:text-primary transition-colors"
                    >
                      {t("forgotPasswordLink")}
                    </Link>
                  )}
                </div>
                <AuthPasswordField
                  placeholder={t("passwordPlaceholder")}
                  {...credentialsForm.register("password")}
                  error={!!credentialsForm.formState.errors.password}
                />
                {credentialsForm.formState.errors.password && (
                  <p className="mt-1.5 text-xs text-error-500">
                    {credentialsForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              {/* Practitioner OTP Hint */}
              {!forgotPasswordHref && mode === "practitioner" && (
                <div className="rounded-2xl border border-border-light bg-surface/75 px-4 py-3 text-xs leading-5 text-text-secondary dark:border-white/5 dark:bg-surface-tertiary/70">
                  {t("practitionerOtpHint")}
                </div>
              )}

              {/* Server Error Message */}
              {error && (
                <div className="rounded-2xl bg-error-50 p-3.5 text-xs text-error-500 dark:bg-error-500/10">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-theme-xs transition-all hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? t("signingIn") : t("signInButton")}
              </button>

              {/* Google Auth Option */}
              {mode === "patient" && (
                <div className="space-y-4">
                  <div className="relative flex items-center justify-center my-3">
                    <div className="absolute w-full border-t border-border-light dark:border-white/5" />
                    <span className="relative bg-white px-3 text-xs text-text-muted dark:bg-surface-secondary dark:text-text-muted uppercase tracking-wider">
                      {t("orContinueWith")}
                    </span>
                  </div>
                  <PatientGoogleAuthButton
                    callbackUrl={callbackUrl}
                    defaultRedirect={getDefaultRouteByRole("PATIENT")}
                  />
                </div>
              )}
            </div>
          </form>
        ) : (
          <form onSubmit={otpForm.handleSubmit(onSubmitOtp)}>
            <div className="space-y-6">
              <div>
                <Label className="mb-3 block text-center">
                  {t("otpCode")} <span className="text-error-500">*</span>
                </Label>
                <div className="flex flex-col items-center justify-center">
                  <Controller
                    control={otpForm.control}
                    name="code"
                    render={({ field }) => (
                      <AuthOtpInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        length={6}
                        disabled={isSubmitting}
                        error={
                          otpForm.formState.errors.code
                            ? String(otpForm.formState.errors.code.message)
                            : undefined
                        }
                      />
                    )}
                  />
                </div>
                <p className="mt-2.5 text-xs text-text-secondary text-center leading-normal">
                  {isRtl ? "أدخل الرمز المكون من 6 أرقام." : "Enter the 6-digit code."}
                </p>
              </div>

              <AuthOtpTimer expiresAt={challenge.expiresAt} />

              {error && (
                <div className="rounded-2xl bg-error-50 p-3.5 text-xs text-error-500 dark:bg-error-500/10">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? t("verifyingOtp") : t("verifyOtpButton")}
                </button>

                <button
                  type="button"
                  onClick={resetPractitionerOtpState}
                  className="w-full rounded-2xl border border-border-light bg-white/70 px-4 py-3 text-sm font-semibold text-text-secondary transition hover:border-primary hover:text-primary dark:border-white/5 dark:bg-surface-secondary dark:text-text-secondary"
                >
                  {t("backToCredentials")}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Card Footer Switch Links */}
        <div className="mt-8 border-t border-border-light pt-6 dark:border-white/5">
          {signUpHref ? (
            <p className="text-sm text-text-secondary dark:text-white/70">
              {mode === "practitioner"
                ? t("practitionerJoinPrompt")
                : t("dontHaveAccount")}{" "}
              <Link href={signUpHref} className="font-semibold text-primary hover:text-primary-hover transition-colors">
                {mode === "practitioner" ? t("joinAsPractitioner") : t("createAccount")}
              </Link>
            </p>
          ) : (
            <p className="text-xs leading-5 text-text-muted dark:text-white/40">
              {t("entryCards.admin.supportNote")}
            </p>
          )}
        </div>
      </AuthSplitCard>

      {/* Floating Developer Test Credentials Drawer (visible only in Local Development) */}
      {shouldShowTestCredentials && (
        <button
          type="button"
          onClick={() => setShowDevPanel(!showDevPanel)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500 hover:bg-amber-600 px-5 py-3.5 text-xs font-bold text-white shadow-xl active:scale-95 transition-all duration-200"
        >
          <Terminal className="h-4 w-4" />
          <span>{isRtl ? "بيانات الاختبار السريع" : "Quick QA Accounts"}</span>
        </button>
      )}

      {shouldShowTestCredentials && showDevPanel && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-xs transition-opacity duration-200" 
            onClick={() => setShowDevPanel(false)} 
          />
          <div className={`fixed bottom-24 z-50 w-full max-w-[360px] rounded-3xl border border-border-light bg-surface/96 p-5 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-surface-secondary/96 animate-in slide-in-from-bottom duration-200 ${isRtl ? "left-6" : "right-6"}`}>
            <div className="mb-4 flex items-center justify-between border-b border-border-light pb-2 dark:border-white/5">
              <div>
                <h3 className="text-xs font-bold text-text-primary">{isRtl ? "حسابات الاختبار السريع" : "Quick Test Accounts"}</h3>
                <p className="text-[10px] text-text-secondary mt-0.5">{isRtl ? "اضغط للتعبئة التلقائية السريعة" : "Click any account to auto-fill the form"}</p>
              </div>
              <button onClick={() => setShowDevPanel(false)} className="text-text-muted hover:text-text-primary text-xs font-semibold px-2 py-1">✕</button>
            </div>

            <button
              type="button"
              onClick={() => {
                applyTestCredentials();
                setShowDevPanel(false);
              }}
              className="w-full text-start p-3.5 rounded-2xl border border-primary/15 bg-primary-light/45 hover:bg-primary-light/75 transition duration-150 mb-3.5 dark:border-primary/20 dark:bg-primary/10 dark:hover:bg-primary/20"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-primary dark:text-primary-light">{isRtl ? "الحساب التجريبي الافتراضي" : "Primary Test Account"}</span>
                <span className="text-[9px] uppercase tracking-wider bg-primary/8 text-primary px-1.5 py-0.5 rounded-md dark:bg-primary/20 dark:text-primary-light">{t(`modes.${mode}`)}</span>
              </div>
              <p className="text-[11px] text-text-secondary mt-1.5 truncate">Email: {testCredentials.email}</p>
              <p className="text-[11px] text-text-secondary truncate">Password: {testCredentials.password}</p>
              <p className="text-[10px] text-text-muted mt-2 border-t border-primary/10 pt-1.5 dark:border-white/5">{testCredentials.label}</p>
            </button>

            {quickAccounts.length > 0 && (
              <div className="space-y-2 mt-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted mb-1.5 px-0.5">{isRtl ? "الحسابات المتاحة" : "Available Accounts"}</p>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {quickAccounts.map((item) => (
                    <button
                      key={item.email}
                      type="button"
                      onClick={() => {
                        applyTestCredentials(item);
                        setShowDevPanel(false);
                      }}
                      className="w-full text-start p-3 rounded-2xl border border-border-light bg-surface hover:bg-primary-light/30 transition duration-150 dark:border-white/5 dark:bg-surface-tertiary dark:hover:bg-primary/10"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-primary">{item.label}</span>
                        <span className="text-[8px] uppercase tracking-wider bg-text-muted/10 text-text-secondary px-1.5 py-0.5 rounded-md">{item.note}</span>
                      </div>
                      <p className="text-[10px] text-text-secondary mt-1.5 truncate">Email: {item.email}</p>
                      <p className="text-[10px] text-text-secondary truncate">Password: {item.password}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
