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
import {
  ChevronLeftIcon,
  EyeCloseIcon,
  EyeIcon,
  GridIcon,
  GroupIcon,
  UserCircleIcon,
} from "@/icons";
import PatientGoogleAuthButton from "@/components/auth/PatientGoogleAuthButton";
import {
  useAdminLogin,
  usePatientLogin,
  usePractitionerLogin,
  usePractitionerVerifyOtp,
} from "@/features/auth/hooks/use-auth";
import type {
  AuthenticatedUser,
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

type ModeConfig = {
  icon: typeof UserCircleIcon;
};

const MODE_CONFIG: Record<SignInMode, ModeConfig> = {
  patient: { icon: UserCircleIcon },
  practitioner: { icon: GroupIcon },
  admin: { icon: GridIcon },
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

const PRACTITIONER_TEST_CREDENTIALS = [
  { email: "dr.ahmed@hesba.local", password: "Practitioner@12345" },
  { email: "dr.mohamed@hesba.local", password: "Practitioner2@12345" },
  { email: "dr.youssef@hesba.local", password: "Practitioner5@12345" },
  { email: "dr.karim@hesba.local", password: "Practitioner6@12345" },
  { email: "dr.sara@hesba.local", password: "Practitioner7@12345" },
  { email: "dr.nour@hesba.local", password: "Practitioner8@12345" },
];

const PATIENT_TEST_CREDENTIALS = [
  { email: "ahmed.patient@hesba.local", password: "Patient@12345" },
  { email: "mohamed.patient@hesba.local", password: "Patient2@12345" },
];

const ADMIN_TEST_CREDENTIALS = [{ email: "admin@hesba.local", password: "Admin@12345" }];

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

  const redirectAfterAuth = (user: AuthenticatedUser) => {
    const resolvedRole = resolveRole(user.roles[0]) ?? "PATIENT";
    const practitionerNeedsOnboarding =
      resolvedRole === "PRACTITIONER" && user.practitionerStatus !== "APPROVED";
    const target = practitionerNeedsOnboarding
      ? "/practitioner/application"
      : (normalizedCallbackUrl ?? getDefaultRouteByRole(resolvedRole));

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

      if ("tokens" in loginResponse) {
        redirectAfterAuth(loginResponse.user);
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
      redirectAfterAuth(result.user);
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
  const shouldShowTestCredentials = process.env.NODE_ENV !== "production";
  const modeConfig = MODE_CONFIG[mode];
  const ModeIcon = modeConfig.icon;
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
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary dark:text-text-secondary dark:hover:text-text-primary"
        >
          <ChevronLeftIcon />
          {t("backToHome")}
        </Link>

        <div className="rounded-full border border-border-light bg-surface/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-text-secondary dark:border-border-light dark:bg-surface-tertiary/80 dark:text-text-secondary">
          {t(`modes.${mode}`)}
        </div>
      </div>

      <div className="py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,30rem)] lg:items-start">
          <section className="rounded-[30px] border border-border-light bg-surface/65 p-6 dark:border-border-light dark:bg-surface-tertiary/45 lg:sticky lg:top-6">
            <div className="rounded-[26px] bg-primary-light/50 p-5 dark:bg-primary/10 sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                    {challenge ? t("verifyOtpTitle") : t(`entryCards.${mode}.eyebrow`)}
                  </p>
                  <h1 className="text-3xl font-semibold leading-tight text-text-primary dark:text-text-primary sm:text-4xl">
                    {challenge ? t("verifyOtpTitle") : t(`entryCards.${mode}.title`)}
                  </h1>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-primary dark:bg-surface/75 dark:text-primary-light">
                  <ModeIcon className="h-5 w-5" />
                </div>
              </div>

              <p className="text-sm leading-7 text-text-secondary dark:text-text-secondary sm:text-base">
                {challenge
                  ? t("verifyOtpDescription", { target: challenge.maskedTarget })
                  : t(descriptionKey)}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-full border border-primary/15 bg-white/85 px-4 py-2 text-xs font-medium text-primary dark:bg-surface/75 dark:text-primary-light">
                  {t(`entryCards.${mode}.meta`)}
                </div>
                {mode === "practitioner" && !challenge ? (
                  <div className="rounded-full border border-border-light bg-white/75 px-4 py-2 text-xs font-medium text-text-secondary dark:border-border-light dark:bg-surface/75 dark:text-text-secondary">
                    {t("practitionerOtpHint")}
                  </div>
                ) : null}
              </div>
            </div>

            {!challenge && shouldShowTestCredentials && (
              <div className="mt-5 rounded-[24px] border border-primary/15 bg-white/78 p-5 dark:border-primary/20 dark:bg-surface/65">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      {t("testCredentials.badge")}
                    </p>
                    <p className="text-sm font-medium text-text-primary dark:text-text-primary">
                      {t("testCredentials.title")}
                    </p>
                    <p className="text-xs leading-6 text-text-secondary dark:text-text-secondary">
                      {t("testCredentials.description")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => applyTestCredentials()}
                    className="shrink-0 rounded-full border border-primary/20 px-3 py-1.5 text-xs font-medium text-primary transition hover:border-primary hover:bg-primary hover:text-white"
                  >
                    {t("testCredentials.apply")}
                  </button>
                </div>

                <div className="mt-4 grid gap-3 rounded-2xl bg-surface/85 p-4 text-xs text-text-secondary dark:bg-surface-tertiary/80 dark:text-text-secondary">
                  <div className="flex items-center justify-between gap-3">
                    <span>{t("testCredentials.emailLabel")}</span>
                    <span className="font-medium text-text-primary dark:text-text-primary">
                      {testCredentials.email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>{t("testCredentials.passwordLabel")}</span>
                    <span className="font-medium text-text-primary dark:text-text-primary">
                      {testCredentials.password}
                    </span>
                  </div>
                </div>

                {quickAccounts.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {quickAccounts.map((item) => (
                      <button
                        key={item.email}
                        type="button"
                        onClick={() => applyTestCredentials(item)}
                        className="rounded-full border border-primary/20 bg-surface px-3 py-1.5 text-xs font-medium text-primary transition hover:border-primary hover:bg-primary hover:text-white dark:bg-surface-tertiary"
                      >
                        {item.email}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-[30px] border border-border-light bg-white/94 p-6 shadow-[0_24px_80px_rgba(16,24,40,0.08)] backdrop-blur dark:border-border-light dark:bg-surface-secondary/92 sm:p-8">
            {!challenge ? (
              <form onSubmit={credentialsForm.handleSubmit(onSubmitCredentials)}>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-text-primary dark:text-text-primary">
                      {t("welcomeBack")}
                    </h2>
                    <p className="text-sm leading-7 text-text-secondary dark:text-text-secondary">
                      {t(`entryCards.${mode}.description`)}
                    </p>
                  </div>

                  <div className="space-y-5">
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
                        <p className="mt-1.5 text-sm text-error-500">
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
                      {credentialsForm.formState.errors.password && (
                        <p className="mt-1.5 text-sm text-error-500">
                          {credentialsForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border-light bg-surface/75 px-4 py-3 text-xs leading-6 text-text-secondary dark:border-border-light dark:bg-surface-tertiary/70 dark:text-text-secondary">
                    {mode === "practitioner" ? t("practitionerOtpHint") : t("forgotPassword")}
                  </div>

                  {error && (
                    <div className="rounded-2xl bg-error-50 p-3 text-sm text-error-500 dark:bg-error-500/10">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? t("signingIn") : t("signInButton")}
                  </button>

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
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-text-primary dark:text-text-primary">
                      {t("verifyOtpTitle")}
                    </h2>
                    <p className="text-sm leading-7 text-text-secondary dark:text-text-secondary">
                      {t("verifyOtpDescription", { target: challenge.maskedTarget })}
                    </p>
                  </div>

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
                      <p className="mt-1.5 text-sm text-error-500">
                        {otpForm.formState.errors.code.message}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border-light bg-surface/75 px-4 py-3 text-xs leading-6 text-text-secondary dark:border-border-light dark:bg-surface-tertiary/70 dark:text-text-secondary">
                    {t("otpExpiresAt", {
                      date: new Date(challenge.expiresAt).toLocaleString(),
                    })}
                  </div>

                  {error && (
                    <div className="rounded-2xl bg-error-50 p-3 text-sm text-error-500 dark:bg-error-500/10">
                      {error}
                    </div>
                  )}

                  <div className="space-y-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting ? t("verifyingOtp") : t("verifyOtpButton")}
                    </button>

                    <button
                      type="button"
                      onClick={resetPractitionerOtpState}
                      className="w-full rounded-2xl border border-border-light px-4 py-3 text-sm font-medium text-text-secondary transition hover:border-primary hover:text-primary"
                    >
                      {t("backToCredentials")}
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="mt-6 border-t border-border-light pt-6 dark:border-border-light">
              {signUpHref ? (
                <p className="text-sm text-text-secondary dark:text-text-secondary">
                  {mode === "practitioner"
                    ? t("practitionerJoinPrompt")
                    : t("dontHaveAccount")} {" "}
                  <Link href={signUpHref} className="font-medium text-text-brand hover:text-primary-hover">
                    {mode === "practitioner" ? t("joinAsPractitioner") : t("createAccount")}
                  </Link>
                </p>
              ) : (
                <p className="text-sm text-text-secondary dark:text-text-secondary">
                  {t("entryCards.admin.supportNote")}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
