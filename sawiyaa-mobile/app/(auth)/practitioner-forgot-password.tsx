import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { AuthScaffold } from "../../src/components/auth/AuthScaffold";
import { Button, Input, Text } from "../../src/components/ui";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { extractApiErrorMessage } from "../../src/lib/api";

function validateEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email.trim());
}

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
        const secondsUntilAvailable = Math.ceil(
          (resendTimestamp - Date.now()) / 1000,
        );
        if (secondsUntilAvailable > 0) {
          return secondsUntilAvailable;
        }
      }
    }
  }

  return null;
}

function mapPractitionerResetErrorMessage(
  error: unknown,
  fallback: string,
  t: (key: string) => string,
): string {
  const root = toRecord(error);
  const response = toRecord(root?.response);
  const responseData = toRecord(response?.data);
  const data = toRecord(responseData?.data);

  const errorCode =
    (typeof responseData?.error === "string" ? responseData.error : null) ??
    (typeof data?.error === "string" ? data.error : null);
  const message =
    (typeof responseData?.message === "string" ? responseData.message : null) ??
    (typeof data?.message === "string" ? data.message : null);

  if (errorCode === "PASSWORD_RESET_ACCOUNT_NOT_FOUND") {
    return t(
      "auth.practitionerForgotPassword.errors.practitionerAccountNotFound",
    );
  }

  if (typeof message === "string" && message.startsWith("auth.errors.")) {
    return fallback;
  }

  return extractApiErrorMessage(error);
}

type Step = "email" | "otp" | "password";

export default function PractitionerForgotPasswordScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const {
    requestPractitionerPasswordReset,
    verifyPractitionerPasswordResetOtp,
    confirmPractitionerPasswordReset,
  } = useAuth();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState({
    active: false,
    remainingSeconds: 0,
  });

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

  const startCooldown = (seconds: number) => {
    setCooldown({ active: true, remainingSeconds: seconds });
  };

  const emailError = useMemo(() => {
    if (!email) {
      return null;
    }
    return validateEmail(email) ? null : t("auth.validation.email");
  }, [email, t]);

  async function submitRequest() {
    setIsSubmitting(true);
    setErrorText(null);
    setSuccessText(null);

    try {
      const response = await requestPractitionerPasswordReset({
        email: email.trim(),
      });
      setSuccessText(response.message);
      setStep("otp");
      startCooldown(parseCooldownSeconds(response) ?? RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      const msg = mapPractitionerResetErrorMessage(
        error,
        t("auth.practitionerForgotPassword.errorMessage"),
        t,
      );
      const cooldownSec = parseCooldownSeconds(error);
      if (cooldownSec) {
        startCooldown(cooldownSec);
      }
      setErrorText(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitVerifyOtp() {
    setIsSubmitting(true);
    setErrorText(null);
    setSuccessText(null);

    try {
      const response = await verifyPractitionerPasswordResetOtp({
        email: email.trim(),
        code: code.trim(),
      });
      setResetToken(response.resetToken);
      setSuccessText(response.message);
      setCode("");
      setStep("password");
    } catch (error) {
      setErrorText(
        mapPractitionerResetErrorMessage(
          error,
          t("auth.practitionerForgotPassword.errorMessage"),
          t,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitConfirmReset() {
    if (!resetToken) {
      setErrorText(t("auth.practitionerForgotPassword.errorMessage"));
      return;
    }

    if (!confirmPassword || newPassword !== confirmPassword) {
      setErrorText(
        t("auth.practitionerForgotPassword.errors.passwordsMismatch"),
      );
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);
    setSuccessText(null);

    try {
      const response = await confirmPractitionerPasswordReset({
        resetToken,
        newPassword,
      });
      setSuccessText(response.message);
      router.replace("/(auth)/signin/practitioner");
    } catch (error) {
      setErrorText(
        mapPractitionerResetErrorMessage(
          error,
          t("auth.practitionerForgotPassword.errorMessage"),
          t,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (cooldown.active || step !== "otp") return;
    setIsSubmitting(true);
    setErrorText(null);
    setSuccessText(null);
    try {
      const response = await requestPractitionerPasswordReset({
        email: email.trim(),
      });
      setSuccessText(response.message);
      startCooldown(parseCooldownSeconds(response) ?? RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      const msg = mapPractitionerResetErrorMessage(
        error,
        t("auth.practitionerForgotPassword.errorMessage"),
        t,
      );
      const cooldownSec = parseCooldownSeconds(error);
      if (cooldownSec) {
        startCooldown(cooldownSec);
      }
      setErrorText(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleChangeEmail = () => {
    setStep("email");
    setCode("");
    setResetToken(null);
    setCooldown({ active: false, remainingSeconds: 0 });
    setErrorText(null);
    setSuccessText(null);
  };

  return (
    <AuthScaffold
      eyebrow={t("auth.practitionerForgotPassword.eyebrow")}
      title={
        step === "email"
          ? t("auth.practitionerForgotPassword.title")
          : step === "otp"
            ? t("auth.practitionerForgotPassword.step2Title")
            : t("auth.practitionerForgotPassword.step3Title")
      }
      subtitle={
        step === "email"
          ? t("auth.practitionerForgotPassword.subtitle")
          : step === "otp"
            ? t("auth.practitionerForgotPassword.step2Description")
            : t("auth.practitionerForgotPassword.step3Description")
      }
      footer={
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/signin/practitioner")}
        >
          <Text color={theme.colors.textMuted} style={styles.backText}>
            {t("auth.common.backToPractitionerSignIn")}
          </Text>
        </TouchableOpacity>
      }
    >
      {step === "email" ? (
        <Input
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          label={t("auth.fields.email")}
          onChangeText={setEmail}
          placeholder={t("auth.placeholders.email")}
          value={email}
          error={emailError ?? undefined}
        />
      ) : null}

      {step === "otp" ? (
        <>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel} color={theme.colors.textMuted}>
              {t("auth.practitionerForgotPassword.otpEmailInfoLabel")}
            </Text>
            <Text style={styles.infoValue} color={theme.colors.textPrimary}>
              {email}
            </Text>
          </View>
          <Input
            keyboardType="number-pad"
            label={t("auth.fields.resetCode")}
            onChangeText={setCode}
            placeholder={t("auth.placeholders.resetCode")}
            value={code}
          />
        </>
      ) : null}

      {step === "password" ? (
        <>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel} color={theme.colors.textMuted}>
              {t("auth.practitionerForgotPassword.passwordEmailInfoLabel")}
            </Text>
            <Text style={styles.infoValue} color={theme.colors.textPrimary}>
              {email}
            </Text>
          </View>
          {successText ? (
            <Text style={styles.successText} color="#15803d">
              {successText}
            </Text>
          ) : null}
          <Input
            autoCapitalize="none"
            autoComplete="password"
            label={t("auth.fields.newPassword")}
            onChangeText={setNewPassword}
            placeholder={t("auth.placeholders.newPassword")}
            secureTextEntry
            value={newPassword}
          />
          <Input
            autoCapitalize="none"
            autoComplete="password"
            label={t("auth.practitionerForgotPassword.confirmPassword")}
            onChangeText={setConfirmPassword}
            placeholder={t(
              "auth.practitionerForgotPassword.confirmPasswordPlaceholder",
            )}
            secureTextEntry
            value={confirmPassword}
          />
        </>
      ) : null}

      {step !== "password" && successText ? (
        <Text style={styles.successText} color="#15803d">
          {successText}
        </Text>
      ) : null}
      {errorText ? (
        <Text style={styles.errorText} color="#dc2626">
          {errorText}
        </Text>
      ) : null}

      {step === "email" ? (
        <Button
          title={
            isSubmitting
              ? t("auth.common.pleaseWait")
              : t("auth.practitionerForgotPassword.sendCode")
          }
          onPress={() => void submitRequest()}
          disabled={isSubmitting || !email || Boolean(emailError)}
        />
      ) : null}

      {step === "otp" ? (
        <Button
          title={
            isSubmitting
              ? t("auth.common.pleaseWait")
              : t("auth.practitionerForgotPassword.verifyOtp")
          }
          onPress={() => void submitVerifyOtp()}
          disabled={isSubmitting || !code}
        />
      ) : null}

      {step === "password" ? (
        <Button
          title={
            isSubmitting
              ? t("auth.common.pleaseWait")
              : t("auth.practitionerForgotPassword.resetPassword")
          }
          onPress={() => void submitConfirmReset()}
          disabled={isSubmitting || !newPassword || !confirmPassword}
        />
      ) : null}

      {isSubmitting ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : null}

      {step === "otp" && (
        <View style={styles.cooldownRow}>
          {cooldown.active ? (
            <Text style={styles.cooldownText} color={theme.colors.textMuted}>
              {t("auth.practitionerForgotPassword.cooldownMessage", {
                seconds: cooldown.remainingSeconds,
              })}
            </Text>
          ) : null}
          <TouchableOpacity
            onPress={handleResend}
            disabled={cooldown.active || isSubmitting}
          >
            <Text
              style={styles.resendText}
              color={
                cooldown.active || isSubmitting
                  ? theme.colors.textMuted
                  : theme.colors.primary
              }
            >
              {cooldown.active
                ? formatCountdown(cooldown.remainingSeconds)
                : t("auth.practitionerForgotPassword.resendCode")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleChangeEmail} disabled={isSubmitting}>
            <Text
              style={styles.resendText}
              color={
                isSubmitting
                  ? theme.colors.textMuted
                  : theme.colors.textSecondary
              }
            >
              {t("auth.practitionerForgotPassword.changeEmail")}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  infoBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  infoValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  errorText: {
    fontSize: 13,
    marginBottom: 12,
  },
  successText: {
    fontSize: 13,
    marginBottom: 12,
  },
  backText: {
    fontSize: 13,
    textAlign: "center",
  },
  loader: {
    marginTop: 12,
  },
  cooldownRow: {
    alignSelf: "center",
    marginTop: 12,
  },
  cooldownText: {
    fontSize: 13,
    textAlign: "center",
  },
  resendText: {
    fontSize: 13,
    textAlign: "center",
  },
});
