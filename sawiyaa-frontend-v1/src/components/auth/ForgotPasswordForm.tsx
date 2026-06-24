"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Input from "@/components/form/input/InputField";
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

  // Start cooldown countdown
  const startCooldown = useCallback((seconds: number) => {
    setCooldown({ active: true, remainingSeconds: seconds });
  }, []);

  // Cooldown ticker
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

  if (step === "success") {
    return (
      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-[30px] border border-border-light bg-white/94 p-8 shadow-[0_24px_80px_rgba(16,24,40,0.08)] backdrop-blur dark:border-border-light dark:bg-surface-secondary/92">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/10">
              <svg className="h-8 w-8 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-text-primary dark:text-text-primary">
              {tFp("resetSuccessTitle")}
            </h1>
            <p className="mt-3 text-sm leading-7 text-text-secondary dark:text-text-secondary">
              {tFp("resetSuccessMessage")}
            </p>
            <Link
              href={`/signin${isPractitioner ? "?mode=practitioner" : ""}`}
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-primary-hover"
            >
              {tFp("signInNow")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div className="mx-auto w-full max-w-lg">
        <button
          onClick={goBack}
          className="mb-4 inline-flex items-center gap-2 text-sm text-text-secondary transition hover:text-text-primary dark:text-text-secondary dark:hover:text-text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          {tFp("backToSignIn")}
        </button>

        <div className="rounded-[30px] border border-border-light bg-white/94 p-8 shadow-[0_24px_80px_rgba(16,24,40,0.08)] backdrop-blur dark:border-border-light dark:bg-surface-secondary/92">
          <div className="mb-6 space-y-2">
            <h1 className="text-2xl font-semibold text-text-primary dark:text-text-primary">
              {tFp("step2Title")}
            </h1>
            <p className="text-sm leading-7 text-text-secondary dark:text-text-secondary">
              {tFp("step2Description")}
            </p>
          </div>

          <form onSubmit={otpForm.handleSubmit(handleVerifyOtpSubmit)}>
            <div className="space-y-5">
              <div className="rounded-2xl border border-border-light bg-surface px-4 py-3 dark:bg-white/5">
                <p className="text-xs font-medium text-text-secondary">{tFp("otpEmailInfoLabel")}</p>
                <p className="mt-1 text-sm font-semibold text-text-primary" dir="ltr">{lockedEmail}</p>
              </div>

              <div>
                <Label>{tFp("codeLabel")} <span className="text-error-500">*</span></Label>
                <Input
                  type="text"
                  placeholder={tFp("codePlaceholder")}
                  dir="ltr"
                  {...otpForm.register("code")}
                  error={!!otpForm.formState.errors.code}
                />
                {otpForm.formState.errors.code && (
                  <p className="mt-1.5 text-sm text-error-500">
                    {tFpValidation(otpForm.formState.errors.code.message ?? "codeInvalid")}
                  </p>
                )}
              </div>

              {serverError && (
                <div className="rounded-2xl bg-error-50 p-3 text-sm text-error-500 dark:bg-error-500/10">
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? tFp("verifyingOtp") : tFp("verifyOtpButton")}
              </button>

              {/* Countdown + resend */}
              <div className="flex items-center justify-between gap-3">
                {cooldown.active ? (
                  <p className="text-xs text-text-secondary dark:text-text-secondary">
                    {tFp("cooldownMessage", { seconds: cooldown.remainingSeconds })}
                  </p>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown.active || requestMutation.isPending}
                  className="text-xs font-medium text-primary transition hover:text-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cooldown.active ? (
                    <span className="font-mono text-xs">{formatCountdown(cooldown.remainingSeconds)}</span>
                  ) : (
                    tFp("resendButton")
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={handleChangeEmail}
                className="text-xs font-medium text-text-secondary transition hover:text-primary"
              >
                {tFp("changeEmail")}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (step === "password") {
    return (
      <div className="mx-auto w-full max-w-lg">
        <button
          onClick={goBack}
          className="mb-4 inline-flex items-center gap-2 text-sm text-text-secondary transition hover:text-text-primary dark:text-text-secondary dark:hover:text-text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          {tFp("backToOtp")}
        </button>

        <div className="rounded-[30px] border border-border-light bg-white/94 p-8 shadow-[0_24px_80px_rgba(16,24,40,0.08)] backdrop-blur dark:border-border-light dark:bg-surface-secondary/92">
          <div className="mb-6 space-y-2">
            <h1 className="text-2xl font-semibold text-text-primary dark:text-text-primary">
              {tFp("step3Title")}
            </h1>
            <p className="text-sm leading-7 text-text-secondary dark:text-text-secondary">
              {tFp("step3Description")}
            </p>
          </div>

          <form onSubmit={passwordForm.handleSubmit(handleConfirmSubmit)}>
            <div className="space-y-5">
              <div className="rounded-2xl border border-border-light bg-surface px-4 py-3 dark:bg-white/5">
                <p className="text-xs font-medium text-text-secondary">{tFp("passwordEmailInfoLabel")}</p>
                <p className="mt-1 text-sm font-semibold text-text-primary" dir="ltr">{lockedEmail}</p>
              </div>
              <div>
                <Label>{tFp("newPasswordLabel")} <span className="text-error-500">*</span></Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder={tFp("newPasswordPlaceholder")}
                    dir="ltr"
                    {...passwordForm.register("newPassword")}
                    error={!!passwordForm.formState.errors.newPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((p) => !p)}
                    className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-text-secondary transition hover:text-text-primary"
                  >
                    {showNewPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                {passwordForm.formState.errors.newPassword && (
                  <p className="mt-1.5 text-sm text-error-500">
                    {tFpValidation(passwordForm.formState.errors.newPassword.message ?? "passwordTooShort")}
                  </p>
                )}
              </div>

              <div>
                <Label>{tFp("confirmPasswordLabel")} <span className="text-error-500">*</span></Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={tFp("confirmPasswordPlaceholder")}
                    dir="ltr"
                    {...passwordForm.register("confirmPassword")}
                    error={!!passwordForm.formState.errors.confirmPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-text-secondary transition hover:text-text-primary"
                  >
                    {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="mt-1.5 text-sm text-error-500">
                    {tFpValidation(passwordForm.formState.errors.confirmPassword.message ?? "confirmPasswordRequired")}
                  </p>
                )}
              </div>

              {serverError && (
                <div className="rounded-2xl bg-error-50 p-3 text-sm text-error-500 dark:bg-error-500/10">
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? tFp("resetting") : tFp("resetButton")}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Step: request
  return (
    <div className="mx-auto w-full max-w-lg">
      <button
        onClick={goBack}
        className="mb-4 inline-flex items-center gap-2 text-sm text-text-secondary transition hover:text-text-primary dark:text-text-secondary dark:hover:text-text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        {tFp("backToSignIn")}
      </button>

      <div className="rounded-[30px] border border-border-light bg-white/94 p-8 shadow-[0_24px_80px_rgba(16,24,40,0.08)] backdrop-blur dark:border-border-light dark:bg-surface-secondary/92">
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-text-primary">
            {tFp("title")}
          </h1>
          <p className="text-sm leading-7 text-text-secondary dark:text-text-secondary">
            {tFp("description")}
          </p>
        </div>

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
                <p className="mt-1.5 text-sm text-error-500">
                  {tFpValidation(requestForm.formState.errors.email.message ?? "emailRequired")}
                </p>
              )}
            </div>

            {serverError && (
              <div className="rounded-2xl bg-error-50 p-3 text-sm text-error-500 dark:bg-error-500/10">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? tFp("submitting") : tFp("submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
