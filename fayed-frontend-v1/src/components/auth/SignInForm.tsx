"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import PatientGoogleAuthButton from "@/components/auth/PatientGoogleAuthButton";
import {
  useAdminLogin,
  usePatientLogin,
  usePractitionerLogin,
  usePractitionerVerifyOtp,
} from "@/features/auth/hooks/use-auth";
import type {
  AuthSuccessResponse,
  OtpChallengeResponse,
} from "@/features/auth/types/auth.types";
import { getDefaultRouteByRole, resolveRole } from "@/config/route-access";
import { normalizeCallbackPath } from "@/lib/auth/callback-url";

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

type PractitionerLoginResponse = OtpChallengeResponse | AuthSuccessResponse;

function buildAuthHref(basePath: string, params: Record<string, string | null>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

type SignInFormProps = {
  mode: SignInMode;
};

const TEST_CREDENTIALS_BY_MODE: Record<
  SignInMode,
  {
    email: string;
    password: string;
  }
> = {
  patient: {
    email: "ahmed.patient@hesba.local",
    password: "Patient@12345",
  },
  practitioner: {
    email: "dr.mohamed@hesba.local",
    password: "Practitioner2@12345",
  },
  admin: {
    email: "admin@hesba.local",
    password: "Admin@12345",
  },
};

const PRACTITIONER_TEST_CREDENTIALS: Array<{
  email: string;
  password: string;
}> = [
  { email: "dr.ahmed@hesba.local", password: "Practitioner@12345" },
  { email: "dr.mohamed@hesba.local", password: "Practitioner2@12345" },
  { email: "dr.youssef@hesba.local", password: "Practitioner5@12345" },
  { email: "dr.karim@hesba.local", password: "Practitioner6@12345" },
  { email: "dr.sara@hesba.local", password: "Practitioner7@12345" },
  { email: "dr.nour@hesba.local", password: "Practitioner8@12345" },
];

const PATIENT_TEST_CREDENTIALS: Array<{
  email: string;
  password: string;
}> = [
  { email: "ahmed.patient@hesba.local", password: "Patient@12345" },
  { email: "mohamed.patient@hesba.local", password: "Patient2@12345" },
];

const ADMIN_TEST_CREDENTIALS: Array<{
  email: string;
  password: string;
}> = [{ email: "admin@hesba.local", password: "Admin@12345" }];

export default function SignInForm({ mode }: SignInFormProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const normalizedCallbackUrl = normalizeCallbackPath(callbackUrl);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<PractitionerChallengeState | null>(null);

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

  const redirectAfterAuth = (roles: string[]) => {
    const resolvedRole = resolveRole(roles[0]) ?? "PATIENT";
    const target = normalizedCallbackUrl ?? getDefaultRouteByRole(resolvedRole);

    router.replace(target);
    router.refresh();
  };

  const resetPractitionerOtpState = () => {
    setChallenge(null);
    otpForm.reset({ code: "" });
  };

  const getSafeCredentialsErrorMessage = () => t("loginError");

  const getSafeOtpErrorMessage = () => t("otpError");

  const onSubmitCredentials = async (data: CredentialsFormData) => {
    setError(null);

    try {
      if (mode === "patient") {
        const result = await patientLogin.mutateAsync(data);
        redirectAfterAuth(result.user.roles);
        return;
      }

      if (mode === "admin") {
        const result = await adminLogin.mutateAsync(data);
        redirectAfterAuth(result.user.roles);
        return;
      }

      const loginResponse = (await practitionerLogin.mutateAsync(
        data,
      )) as PractitionerLoginResponse;

      if ("tokens" in loginResponse) {
        redirectAfterAuth(loginResponse.user.roles);
        return;
      }

      setChallenge({
        challengeId: loginResponse.challengeId,
        maskedTarget: loginResponse.maskedTarget,
        expiresAt: loginResponse.expiresAt,
      });
    } catch {
      setError(getSafeCredentialsErrorMessage());
    }
  };

  const onSubmitOtp = async (data: OtpFormData) => {
    if (!challenge) return;

    setError(null);

    try {
      const result = await practitionerVerifyOtp.mutateAsync({
        challengeId: challenge.challengeId,
        code: data.code,
      });
      redirectAfterAuth(result.user.roles);
    } catch {
      setError(getSafeOtpErrorMessage());
    }
  };

  const descriptionKey =
    mode === "admin"
      ? "signInDescriptionAdmin"
      : mode === "practitioner"
        ? "signInDescriptionPractitioner"
        : "signInDescriptionPatient";
  const signUpHref =
    mode === "patient"
      ? buildAuthHref("/signup", { callbackUrl: normalizedCallbackUrl, mode: "patient" })
      : mode === "practitioner"
        ? buildAuthHref("/signup", { callbackUrl: normalizedCallbackUrl, mode: "practitioner" })
        : null;
  const chooserHref = buildAuthHref("/signin", { callbackUrl: normalizedCallbackUrl });
  const shouldShowTestCredentials = process.env.NODE_ENV !== "production";
  const testCredentials = TEST_CREDENTIALS_BY_MODE[mode];
  const quickAccountsByMode: Record<
    SignInMode,
    Array<{
      email: string;
      password: string;
    }>
  > = {
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

  return (
    <div className="flex w-full flex-1 flex-col lg:w-1/2">
      <div className="mx-auto mb-5 w-full max-w-md sm:pt-10">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          {t("backToHome")}
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 text-title-sm font-semibold text-gray-800 dark:text-white/90 sm:text-title-md">
              {challenge ? t("verifyOtpTitle") : t("welcomeBack")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {challenge
                ? t("verifyOtpDescription", { target: challenge.maskedTarget })
                : t(descriptionKey)}
            </p>
          </div>

          {!challenge ? (
            <form onSubmit={credentialsForm.handleSubmit(onSubmitCredentials)}>
              <div className="space-y-6">
                {shouldShowTestCredentials && (
                  <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 dark:border-primary/20 dark:bg-primary/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                          {t("testCredentials.badge")}
                        </p>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-text-primary dark:text-white/90">
                            {t("testCredentials.title")}
                          </p>
                          <p className="text-xs text-text-secondary dark:text-white/70">
                            {t("testCredentials.description")}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => applyTestCredentials()}
                        className="shrink-0 rounded-full border border-primary/20 px-3 py-1.5 text-xs font-medium text-primary transition hover:border-primary hover:bg-primary hover:text-white"
                      >
                        {t("testCredentials.apply")}
                      </button>
                    </div>

                    <div className="mt-3 grid gap-2 rounded-xl bg-white/80 p-3 text-xs text-text-secondary dark:bg-white/5 dark:text-white/70">
                      <div className="flex items-center justify-between gap-3">
                        <span>{t("testCredentials.emailLabel")}</span>
                        <span className="font-medium text-text-primary dark:text-white/90">
                          {testCredentials.email}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>{t("testCredentials.passwordLabel")}</span>
                        <span className="font-medium text-text-primary dark:text-white/90">
                          {testCredentials.password}
                        </span>
                      </div>
                    </div>

                    {quickAccounts.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {quickAccounts.map((item) => (
                          <button
                            key={item.email}
                            type="button"
                            onClick={() => applyTestCredentials(item)}
                            className="rounded-full border border-primary/20 bg-white/80 px-3 py-1.5 text-xs font-medium text-primary transition hover:border-primary hover:bg-primary hover:text-white dark:bg-white/5"
                          >
                            {item.email}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

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
                    <p className="mt-1 text-sm text-error-500">
                      {credentialsForm.formState.errors.email.message}
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
                      {...credentialsForm.register("password")}
                      error={!!credentialsForm.formState.errors.password}
                      dir="ltr"
                    />
                    <span
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                  {credentialsForm.formState.errors.password && (
                    <p className="mt-1 text-sm text-error-500">
                      {credentialsForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {mode === "practitioner" && (
                  <p className="text-xs text-text-muted">{t("practitionerOtpHint")}</p>
                )}

                <div className="flex items-center justify-end">
                  <span className="text-sm text-gray-400 dark:text-gray-500">
                    {t("forgotPassword")}
                  </span>
                </div>

                {error && (
                  <div className="rounded-lg bg-error-50 p-3 text-sm text-error-500 dark:bg-error-500/10">
                    {error}
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? t("signingIn") : t("signInButton")}
                  </button>
                </div>

                {mode === "patient" && (
                  <PatientGoogleAuthButton
                    callbackUrl={callbackUrl}
                    defaultRedirect={getDefaultRouteByRole("PATIENT")}
                  />
                )}
              </div>
            </form>
          ) : (
            <form onSubmit={otpForm.handleSubmit(onSubmitOtp)}>
              <div className="space-y-6">
                <div>
                  <Label>
                    {t("otpCode")} <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder={t("otpPlaceholder")}
                    {...otpForm.register("code")}
                    error={!!otpForm.formState.errors.code}
                    dir="ltr"
                  />
                  {otpForm.formState.errors.code && (
                    <p className="mt-1 text-sm text-error-500">
                      {otpForm.formState.errors.code.message}
                    </p>
                  )}
                </div>

                <p className="text-xs text-text-muted">
                  {t("otpExpiresAt", { date: new Date(challenge.expiresAt).toLocaleString() })}
                </p>

                {error && (
                  <div className="rounded-lg bg-error-50 p-3 text-sm text-error-500 dark:bg-error-500/10">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? t("verifyingOtp") : t("verifyOtpButton")}
                  </button>

                  <button
                    type="button"
                    onClick={resetPractitionerOtpState}
                    className="w-full rounded-lg border border-border-light px-4 py-3 text-sm font-medium text-text-secondary transition hover:border-primary hover:text-primary"
                  >
                    {t("backToCredentials")}
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="mt-5">
            {signUpHref ? (
              <p className="text-center text-sm font-normal text-gray-700 dark:text-gray-400 sm:text-start">
                {mode === "practitioner"
                  ? t("practitionerJoinPrompt")
                  : t("dontHaveAccount")}{" "}
                <Link
                  href={signUpHref}
                  className="text-text-brand hover:text-primary-hover"
                >
                  {mode === "practitioner" ? t("joinAsPractitioner") : t("createAccount")}
                </Link>
              </p>
            ) : (
              <p className="text-center text-sm font-normal text-gray-700 dark:text-gray-400 sm:text-start">
                {t("needDifferentAccessPath")}{" "}
                <Link
                  href={chooserHref}
                  className="text-text-brand hover:text-primary-hover"
                >
                  {t("chooseAccessPath")}
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
