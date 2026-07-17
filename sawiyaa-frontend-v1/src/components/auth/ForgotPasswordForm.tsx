"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ChevronLeft, Eye, EyeOff, UserRound, Stethoscope } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Input from "@/components/form/input/InputField";
import AuthPasswordField from "./AuthPasswordField";
import AuthOtpInput from "./AuthOtpInput";
import AuthOtpTimer from "./AuthOtpTimer";
import Label from "@/components/form/Label";
import {
  usePatientForgotPassword,
  usePatientVerifyPasswordResetOtp,
  usePatientConfirmPasswordReset,
  usePractitionerForgotPassword,
  usePractitionerVerifyPasswordResetOtp,
  usePractitionerConfirmPasswordReset,
} from "@/features/auth/hooks/use-auth";
import type { SignInMode } from "./SignInForm";
import AuthSplitCard from "./AuthSplitCard";

type ForgotPasswordMode = Extract<SignInMode, "patient" | "practitioner">;

const requestSchema = z.object({
  email: z.string().min(1, "emailRequired").email("emailInvalid"),
});

const otpSchema = z.object({
  code: z.string().min(4, "codeInvalid").max(8, "codeInvalid"),
});

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, "passwordTooShort"),
    confirmPassword: z.string().min(1, "confirmPasswordRequired"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "passwordsMismatch",
    path: ["confirmPassword"],
  });

type OtpFormData = z.infer<typeof otpSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type RequestFormData = z.infer<typeof requestSchema>;

type CooldownState = {
  active: boolean;
  remainingSeconds: number;
};

const RESEND_COOLDOWN_SECONDS = 120;

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return null;
}

function parseCooldownSeconds(source: unknown): number | null {
  const root = toRecord(source);
  const data = toRecord(root?.data);
  const response = toRecord(root?.response);
  const responseData = toRecord(response?.data);
  const responseInnerData = toRecord(responseData?.data);

  const candidates = [root, data, responseData, responseInnerData];
  for (const candidate of candidates) {
    if (!candidate) continue;

    const retryAfterRaw = candidate.retryAfterSeconds;
    if (typeof retryAfterRaw === "number" && Number.isFinite(retryAfterRaw)) {
      return Math.max(1, Math.ceil(retryAfterRaw));
    }

    const resendAvailableAtRaw = candidate.resendAvailableAt;
    if (typeof resendAvailableAtRaw === "string") {
      const resendTimestamp = Date.parse(resendAvailableAtRaw);
      if (!Number.isNaN(resendTimestamp)) {
        const secondsUntilAvailable = Math.ceil((resendTimestamp - Date.now()) / 1000);
        if (secondsUntilAvailable > 0) {
          return secondsUntilAvailable;
        }
      }
    }
  }

  return null;
}

type ForgotPasswordFormProps = {
  mode: ForgotPasswordMode;
};

export default function ForgotPasswordForm({ mode }: ForgotPasswordFormProps) {
  const tFp = useTranslations("auth.forgotPassword");
  const tFpValidation = useTranslations("auth.forgotPassword.validation");
  const locale = useLocale();
  const router = useRouter();

  const [step, setStep] = useState<"request" | "otp" | "password" | "success">("request");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [lockedEmail, setLockedEmail] = useState<string>("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<CooldownState>({ active: false, remainingSeconds: 0 });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null);

  const patientForgotPassword = usePatientForgotPassword();
  const patientVerifyPasswordResetOtp = usePatientVerifyPasswordResetOtp();
  const patientConfirmPasswordReset = usePatientConfirmPasswordReset();
  const practitionerForgotPassword = usePractitionerForgotPassword();
  const practitionerVerifyPasswordResetOtp = usePractitionerVerifyPasswordResetOtp();
  const practitionerConfirmPasswordReset = usePractitionerConfirmPasswordReset();

  const isPractitioner = mode === "practitioner";
  const isSubmitting =
    patientForgotPassword.isPending ||
    practitionerForgotPassword.isPending ||
    patientVerifyPasswordResetOtp.isPending ||
    practitionerVerifyPasswordResetOtp.isPending ||
    patientConfirmPasswordReset.isPending ||
    practitionerConfirmPasswordReset.isPending;

  const requestMutation = isPractitioner ? practitionerForgotPassword : patientForgotPassword;
  const verifyOtpMutation = isPractitioner
    ? practitionerVerifyPasswordResetOtp
    : patientVerifyPasswordResetOtp;
  const confirmMutation = isPractitioner
    ? practitionerConfirmPasswordReset
    : patientConfirmPasswordReset;

  const requestForm = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const startCooldown = useCallback((seconds: number) => {
    setCooldown({ active: true, remainingSeconds: seconds });
    setOtpExpiresAt(new Date(Date.now() + seconds * 1000));
  }, []);

  useEffect(() => {
    if (!cooldown.active) return;
    const id = setInterval(() => {
      setCooldown((prev) => {
        const next = prev.remainingSeconds - 1;
        if (next <= 0) return { active: false, remainingSeconds: 0 };
        return { ...prev, remainingSeconds: next };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown.active]);

  const getErrorMessage = (err: unknown) => {
    const root = toRecord(err);
    const response = toRecord(root?.response);
    const responseData = toRecord(response?.data);
    const data = toRecord(responseData?.data);

    const errorCode =
      (typeof responseData?.error === "string" ? responseData.error : null) ??
      (typeof data?.error === "string" ? data.error : null);
    const messageKey =
      (typeof responseData?.message === "string" ? responseData.message : null) ??
      (typeof data?.message === "string" ? data.message : null);

    const isRawBackendKey = (value: string | null) =>
      typeof value === "string" && value.startsWith("auth.errors.");

    if (errorCode === "PASSWORD_RESET_ACCOUNT_NOT_FOUND") {
      return isPractitioner
        ? tFp("errors.practitionerAccountNotFound")
        : tFp("errors.patientAccountNotFound");
    }

    if (isRawBackendKey(messageKey)) {
      return tFp("errorMessage");
    }

    if (typeof responseData?.message === "string") {
      return responseData.message;
    }
    if (typeof data?.message === "string") {
      return data.message;
    }
    if (typeof root?.message === "string") {
      return root.message;
    }

    return tFp("errorMessage");
  };

  const handleRequestSubmit = async (data: RequestFormData) => {
    setServerError(null);
    try {
      const normalizedEmail = data.email.trim().toLowerCase();
      const response = await requestMutation.mutateAsync({ email: normalizedEmail });
      setLockedEmail(normalizedEmail);
      otpForm.reset();
      setStep("otp");
      startCooldown(parseCooldownSeconds(response) ?? RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const cooldownSeconds = parseCooldownSeconds(err);
      if (cooldownSeconds) {
        startCooldown(cooldownSeconds);
      }
      setServerError(getErrorMessage(err));
    }
  };

  const handleResend = async () => {
    if (cooldown.active || step !== "otp" || !lockedEmail) return;
    setServerError(null);
    try {
      const response = await requestMutation.mutateAsync({ email: lockedEmail });
      startCooldown(parseCooldownSeconds(response) ?? RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const cooldownSeconds = parseCooldownSeconds(err);
      if (cooldownSeconds) {
        startCooldown(cooldownSeconds);
      }
      setServerError(getErrorMessage(err));
    }
  };

  const handleVerifyOtpSubmit = async (otpData: OtpFormData) => {
    setServerError(null);
    if (!lockedEmail) {
      setServerError(tFp("errorMessage"));
      return;
    }

    try {
      const response = await verifyOtpMutation.mutateAsync({
        email: lockedEmail,
        code: otpData.code,
      });
      setResetToken(response.resetToken);
      setStep("password");
      otpForm.resetField("code");
    } catch (err) {
      setServerError(getErrorMessage(err));
      otpForm.resetField("code");
    }
  };

  const handleConfirmSubmit = async (data: PasswordFormData) => {
    setServerError(null);
    if (!resetToken) {
      setServerError(tFp("errorMessage"));
      return;
    }

    try {
      await confirmMutation.mutateAsync({
        resetToken,
        newPassword: data.newPassword,
      });
      setStep("success");
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  const handleChangeEmail = () => {
    setStep("request");
    setLockedEmail("");
    otpForm.reset();
    passwordForm.reset();
    setResetToken(null);
    setServerError(null);
    setCooldown({ active: false, remainingSeconds: 0 });
  };

  const goBack = () => {
    if (step === "password") {
      setStep("otp");
      passwordForm.reset();
      setServerError(null);
      return;
    }

    if (step === "otp") {
      handleChangeEmail();
    } else {
      router.push(`/signin${isPractitioner ? "?mode=practitioner" : ""}`);
    }
  };

  const isRtl = locale === "ar";
  const ModeIcon = isPractitioner ? Stethoscope : UserRound;
  const modeLabels: Record<ForgotPasswordMode, string> = {
    patient: isRtl ? "استعادة حساب العميل" : "Client Recovery",
    practitioner: isRtl ? "استعادة حساب المعالج" : "Specialist Recovery",
  };

  const getDynamicTitle = () => {
    if (step === "success") return isRtl ? "تمت استعادة الحساب" : "Account Recovered";
    if (step === "otp") return isRtl ? "رمز التحقق" : "Verification Code";
    if (step === "password") return isRtl ? "تعيين كلمة المرور" : "Set New Password";
    return isRtl ? "استعادة كلمة المرور" : "Reset Password";
  };

  const getDynamicSubtitle = () => {
    if (step === "success") return undefined;
    if (step === "otp") return isRtl ? "أدخل الرمز المرسل لتأكيد الهوية." : "Enter the sent code to confirm your identity.";
    if (step === "password") return isRtl ? "أدخل كلمة مرور جديدة قوية لحسابك." : "Enter a strong new password for your account.";
    return isRtl ? "أدخل بياناتك لإرسال تعليمات إعادة التعيين." : "Enter your email to send reset instructions.";
  };

  return (
    <AuthSplitCard
      title={getDynamicTitle()}
      subtitle={getDynamicSubtitle()}
      mode="forgot"
      activeTab="forgot"
    >
      {/* Portal Indicator Badge */}
      {step !== "success" && (
        <div className="mb-6 flex select-none">
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide ${
            mode === "patient" ? "border border-primary/15 bg-primary-light/40 text-primary dark:border-primary/20 dark:bg-primary/10 dark:text-primary-light" :
            "border border-sky-500/15 bg-sky-500/10 text-sky-600 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400"
          }`}>
            <ModeIcon className="h-4 w-4" />
            <span>{modeLabels[mode]}</span>
          </div>
        </div>
      )}

      {step === "success" && (
        <div className="text-center py-6 select-none">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/10">
            <svg className="h-8 w-8 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">
            {tFp("resetSuccessMessage")}
          </p>
          <Link
            href={`/signin${isPractitioner ? "?mode=practitioner" : ""}`}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-primary-hover active:scale-[0.98]"
          >
            {tFp("signInNow")}
          </Link>
        </div>
      )}

      {step === "otp" && (
        <>
          <form onSubmit={otpForm.handleSubmit(handleVerifyOtpSubmit)}>
            <div className="space-y-5">
              <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 dark:border-white/5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">{tFp("otpEmailInfoLabel")}</p>
                <p className="mt-1 text-sm font-semibold text-text-primary" dir="ltr">{lockedEmail}</p>
              </div>

              <div>
                <Label className="mb-3 block text-center">
                  {tFp("codeLabel")} <span className="text-error-500">*</span>
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
                            ? String(
                                tFpValidation(
                                  otpForm.formState.errors.code.message ?? "codeInvalid"
                                )
                              )
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

              {otpExpiresAt && (
                <AuthOtpTimer expiresAt={otpExpiresAt} />
              )}

              {serverError && (
                <div className="rounded-2xl bg-error-50 p-3 text-xs text-error-500 dark:bg-error-500/10">
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? tFp("verifyingOtp") : tFp("verifyOtpButton")}
              </button>

              <div className="flex items-center justify-between gap-3 text-xs">
                {cooldown.active ? (
                  <p className="text-text-secondary dark:text-text-secondary">
                    {tFp("cooldownMessage", { seconds: cooldown.remainingSeconds })}
                  </p>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown.active || requestMutation.isPending}
                  className="font-semibold text-primary transition hover:text-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cooldown.active ? (
                    <span className="font-mono">{formatCountdown(cooldown.remainingSeconds)}</span>
                  ) : (
                    tFp("resendButton")
                  )}
                </button>
              </div>

              <div className="border-t border-border-light pt-4 dark:border-white/5 flex justify-between items-center text-xs select-none">
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="font-semibold text-primary hover:text-primary-hover"
                >
                  {tFp("changeEmail")}
                </button>
                <button
                  type="button"
                  onClick={goBack}
                  className="font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1"
                >
                  <ChevronLeft className={`h-3 w-3 ${isRtl ? "rotate-180" : ""}`} />
                  {tFp("backToSignIn")}
                </button>
              </div>
            </div>
          </form>
        </>
      )}

      {step === "password" && (
        <>
          <form onSubmit={passwordForm.handleSubmit(handleConfirmSubmit)}>
            <div className="space-y-5">
              <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 dark:border-white/5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">{tFp("passwordEmailInfoLabel")}</p>
                <p className="mt-1 text-sm font-semibold text-text-primary" dir="ltr">{lockedEmail}</p>
              </div>

              <div>
                <Label>{tFp("newPasswordLabel")} <span className="text-error-500">*</span></Label>
                <AuthPasswordField
                  placeholder={tFp("newPasswordPlaceholder")}
                  error={!!passwordForm.formState.errors.newPassword}
                  {...passwordForm.register("newPassword")}
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="mt-1.5 text-xs text-error-500">
                    {tFpValidation(passwordForm.formState.errors.newPassword.message ?? "passwordTooShort")}
                  </p>
                )}
              </div>

              <div>
                <Label>{tFp("confirmPasswordLabel")} <span className="text-error-500">*</span></Label>
                <AuthPasswordField
                  placeholder={tFp("confirmPasswordPlaceholder")}
                  error={!!passwordForm.formState.errors.confirmPassword}
                  {...passwordForm.register("confirmPassword")}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-error-500">
                    {tFpValidation(passwordForm.formState.errors.confirmPassword.message ?? "confirmPasswordRequired")}
                  </p>
                )}
              </div>

              {serverError && (
                <div className="rounded-2xl bg-error-50 p-3 text-xs text-error-500 dark:bg-error-500/10">
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? tFp("resetting") : tFp("resetButton")}
              </button>

              <div className="border-t border-border-light pt-4 dark:border-white/5 flex justify-end text-xs select-none">
                <button
                  type="button"
                  onClick={goBack}
                  className="font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1"
                >
                  <ChevronLeft className={`h-3 w-3 ${isRtl ? "rotate-180" : ""}`} />
                  {tFp("backToOtp")}
                </button>
              </div>
            </div>
          </form>
        </>
      )}

      {step === "request" && (
        <>
          <form onSubmit={requestForm.handleSubmit(handleRequestSubmit)}>
            <div className="space-y-5">
              <div>
                <Label>
                  {tFp("emailLabel")} <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder={tFp("emailPlaceholder")}
                  dir="ltr"
                  {...requestForm.register("email")}
                  error={!!requestForm.formState.errors.email}
                />
                {requestForm.formState.errors.email && (
                  <p className="mt-1.5 text-xs text-error-500">
                    {tFpValidation(requestForm.formState.errors.email.message ?? "emailRequired")}
                  </p>
                )}
              </div>

              {serverError && (
                <div className="rounded-2xl bg-error-50 p-3 text-xs text-error-500 dark:bg-error-500/10">
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? tFp("submitting") : tFp("submit")}
              </button>

              <div className="border-t border-border-light pt-4 dark:border-white/5 flex justify-end text-xs select-none">
                <button
                  type="button"
                  onClick={goBack}
                  className="font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1"
                >
                  <ChevronLeft className={`h-3 w-3 ${isRtl ? "rotate-180" : ""}`} />
                  {tFp("backToSignIn")}
                </button>
              </div>
            </div>
          </form>
        </>
      )}
    </AuthSplitCard>
  );
}
