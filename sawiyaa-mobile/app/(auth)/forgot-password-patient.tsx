import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input, Screen, Text } from "../../src/components/ui";
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

function mapPatientResetErrorMessage(
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
    return t("auth.patientForgotPassword.errors.patientAccountNotFound");
  }

  if (typeof message === "string" && message.startsWith("auth.errors.")) {
    return fallback;
  }

  return extractApiErrorMessage(error);
}

type Step = "email" | "otp" | "password";

export default function PatientForgotPasswordScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const {
    requestPatientPasswordReset,
    verifyPatientPasswordResetOtp,
    confirmPatientPasswordReset,
  } = useAuth();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    if (!email) return null;
    return validateEmail(email) ? null : t("auth.validation.email");
  }, [email, t]);

  async function submitRequest() {
    setIsSubmitting(true);
    setErrorText(null);
    setSuccessText(null);
    try {
      const response = await requestPatientPasswordReset({
        email: email.trim(),
      });
      setSuccessText(response.message);
      setStep("otp");
      startCooldown(parseCooldownSeconds(response) ?? RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      const msg = mapPatientResetErrorMessage(
        error,
        t("auth.patientForgotPassword.errorMessage"),
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
      const response = await verifyPatientPasswordResetOtp({
        email: email.trim(),
        code: code.trim(),
      });
      setResetToken(response.resetToken);
      setSuccessText(response.message);
      setCode("");
      setStep("password");
    } catch (error) {
      setErrorText(
        mapPatientResetErrorMessage(
          error,
          t("auth.patientForgotPassword.errorMessage"),
          t,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitConfirmReset() {
    if (!resetToken) {
      setErrorText(t("auth.patientForgotPassword.errorMessage"));
      return;
    }

    if (!confirmPassword || newPassword !== confirmPassword) {
      setErrorText(t("auth.patientForgotPassword.errors.passwordsMismatch"));
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);
    setSuccessText(null);
    try {
      const response = await confirmPatientPasswordReset({
        resetToken,
        newPassword,
      });
      setSuccessText(response.message);
      router.replace("/(auth)/signin/patient");
    } catch (error) {
      setErrorText(
        mapPatientResetErrorMessage(
          error,
          t("auth.patientForgotPassword.errorMessage"),
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
      const response = await requestPatientPasswordReset({
        email: email.trim(),
      });
      setSuccessText(response.message);
      startCooldown(parseCooldownSeconds(response) ?? RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      const msg = mapPatientResetErrorMessage(
        error,
        t("auth.patientForgotPassword.errorMessage"),
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

  const labelAlign = isRtl ? "right" : "left";

  const handleChangeEmail = () => {
    setStep("email");
    setCode("");
    setResetToken(null);
    setCooldown({ active: false, remainingSeconds: 0 });
    setErrorText(null);
    setSuccessText(null);
  };

  return (
    <Screen safeArea bg="background" style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View
            style={[
              styles.brandIcon,
              { backgroundColor: theme.colors.primaryLight },
            ]}
          >
            <Ionicons name="water" size={16} color={theme.colors.primary} />
          </View>
          <Text
            style={[styles.brandName, { color: theme.colors.primary }]}
            weight="600"
          >
            Sawiyaa
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: theme.colors.primaryLight },
            ]}
          >
            <Ionicons
              name="lock-closed"
              size={22}
              color={theme.colors.primary}
            />
          </View>

          <View style={styles.header}>
            <Text
              style={styles.title}
              color={theme.colors.textPrimary}
              weight="bold"
            >
              {step === "email"
                ? t("auth.patientForgotPassword.title")
                : step === "otp"
                  ? t("auth.patientForgotPassword.step2Title")
                  : t("auth.patientForgotPassword.step3Title")}
            </Text>
            <Text style={styles.subtitle} color={theme.colors.textSecondary}>
              {step === "email"
                ? t("auth.patientForgotPassword.subtitle")
                : step === "otp"
                  ? t("auth.patientForgotPassword.step2Description")
                  : t("auth.patientForgotPassword.step3Description")}
            </Text>
          </View>

          {step === "email" ? (
            <>
              <Input
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                label={t("auth.fields.email")}
                labelDirection={labelAlign}
                placeholder={t("auth.placeholders.email")}
                placeholderDirection="left"
                onChangeText={setEmail}
                value={email}
                error={emailError ?? undefined}
              />

              {errorText ? (
                <View
                  style={[
                    styles.errorBox,
                    { backgroundColor: theme.colors.errorLight },
                  ]}
                >
                  <Ionicons
                    name="alert-circle"
                    size={16}
                    color={theme.colors.error}
                  />
                  <Text
                    style={[styles.errorText, { textAlign: labelAlign }]}
                    color={theme.colors.error}
                  >
                    {errorText}
                  </Text>
                </View>
              ) : null}

              <Button
                title={t("auth.patientForgotPassword.sendCode")}
                onPress={submitRequest}
                disabled={!email || !!emailError || isSubmitting}
                style={styles.primaryButton}
              >
                {isSubmitting && (
                  <ActivityIndicator size="small" color="white" />
                )}
              </Button>
            </>
          ) : null}

          {step === "otp" ? (
            <>
              <View
                style={[
                  styles.infoBox,
                  {
                    borderColor: theme.colors.borderLight,
                    backgroundColor: theme.colors.surfaceSecondary,
                  },
                ]}
              >
                <Text
                  style={[styles.infoLabel, { textAlign: labelAlign }]}
                  color={theme.colors.textSecondary}
                >
                  {t("auth.patientForgotPassword.otpEmailInfoLabel")}
                </Text>
                <Text
                  style={[styles.infoValue, { textAlign: "left" }]}
                  color={theme.colors.textPrimary}
                >
                  {email}
                </Text>
              </View>

              <Input
                label={t("auth.fields.resetCode")}
                labelDirection={labelAlign}
                placeholder={t("auth.placeholders.resetCode")}
                placeholderDirection="left"
                onChangeText={setCode}
                value={code}
                keyboardType="number-pad"
                maxLength={8}
              />

              {errorText ? (
                <View
                  style={[
                    styles.errorBox,
                    { backgroundColor: theme.colors.errorLight },
                  ]}
                >
                  <Ionicons
                    name="alert-circle"
                    size={16}
                    color={theme.colors.error}
                  />
                  <Text
                    style={[styles.errorText, { textAlign: labelAlign }]}
                    color={theme.colors.error}
                  >
                    {errorText}
                  </Text>
                </View>
              ) : null}

              <Button
                title={t("auth.patientForgotPassword.verifyOtp")}
                onPress={submitVerifyOtp}
                disabled={!code || isSubmitting}
                style={styles.primaryButton}
              >
                {isSubmitting && (
                  <ActivityIndicator size="small" color="white" />
                )}
              </Button>

              <View style={styles.resendWrap}>
                {cooldown.active ? (
                  <Text
                    color={theme.colors.textMuted}
                    style={{ textAlign: "center", fontSize: 13 }}
                  >
                    {t("auth.patientForgotPassword.cooldownMessage", {
                      seconds: cooldown.remainingSeconds,
                    })}
                  </Text>
                ) : null}
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={cooldown.active || isSubmitting}
                >
                  <Text
                    color={
                      cooldown.active || isSubmitting
                        ? theme.colors.textMuted
                        : theme.colors.primary
                    }
                    style={{ textAlign: "center", fontSize: 13 }}
                  >
                    {cooldown.active
                      ? formatCountdown(cooldown.remainingSeconds)
                      : t("auth.patientForgotPassword.resendCode")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleChangeEmail}
                  disabled={isSubmitting}
                >
                  <Text
                    color={
                      isSubmitting
                        ? theme.colors.textMuted
                        : theme.colors.textSecondary
                    }
                    style={{ textAlign: "center", fontSize: 13 }}
                  >
                    {t("auth.patientForgotPassword.changeEmail")}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          {step === "password" ? (
            <>
              <View
                style={[
                  styles.infoBox,
                  {
                    borderColor: theme.colors.borderLight,
                    backgroundColor: theme.colors.surfaceSecondary,
                  },
                ]}
              >
                <Text
                  style={[styles.infoLabel, { textAlign: labelAlign }]}
                  color={theme.colors.textSecondary}
                >
                  {t("auth.patientForgotPassword.passwordEmailInfoLabel")}
                </Text>
                <Text
                  style={[styles.infoValue, { textAlign: "left" }]}
                  color={theme.colors.textPrimary}
                >
                  {email}
                </Text>
              </View>

              {successText ? (
                <View
                  style={[
                    styles.successBox,
                    { backgroundColor: theme.colors.successLight },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={theme.colors.success}
                  />
                  <Text
                    style={[styles.successText, { textAlign: labelAlign }]}
                    color={theme.colors.success}
                  >
                    {successText}
                  </Text>
                </View>
              ) : null}

              <Input
                label={t("auth.fields.newPassword")}
                labelDirection={labelAlign}
                placeholder={t("auth.placeholders.newPassword")}
                placeholderDirection="left"
                secureTextEntry={!showPassword}
                onChangeText={setNewPassword}
                value={newPassword}
                rightElement={
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                }
              />

              <Input
                label={t("auth.patientForgotPassword.confirmPassword")}
                labelDirection={labelAlign}
                placeholder={t(
                  "auth.patientForgotPassword.confirmPasswordPlaceholder",
                )}
                placeholderDirection="left"
                secureTextEntry={!showConfirmPassword}
                onChangeText={setConfirmPassword}
                value={confirmPassword}
                rightElement={
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword((v) => !v)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off" : "eye"}
                      size={20}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                }
              />

              {errorText ? (
                <View
                  style={[
                    styles.errorBox,
                    { backgroundColor: theme.colors.errorLight },
                  ]}
                >
                  <Ionicons
                    name="alert-circle"
                    size={16}
                    color={theme.colors.error}
                  />
                  <Text
                    style={[styles.errorText, { textAlign: labelAlign }]}
                    color={theme.colors.error}
                  >
                    {errorText}
                  </Text>
                </View>
              ) : null}

              <Button
                title={t("auth.patientForgotPassword.resetPassword")}
                onPress={submitConfirmReset}
                disabled={!newPassword || !confirmPassword || isSubmitting}
                style={styles.primaryButton}
              >
                {isSubmitting && (
                  <ActivityIndicator size="small" color="white" />
                )}
              </Button>
            </>
          ) : null}

          <View style={styles.rowWrap}>
            <Text color={theme.colors.textSecondary}>
              {t("auth.patientForgotPassword.rememberPassword")}
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/(auth)/signin/patient")}
            >
              <Text color={theme.colors.primary} weight="600">
                {t("auth.patientForgotPassword.goToSignIn")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {isSubmitting && (
          <ActivityIndicator
            style={styles.loader}
            color={theme.colors.primary}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    gap: 8,
  },
  brandIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 15,
    letterSpacing: 0.3,
  },
  card: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 18,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 300,
  },
  errorBox: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  successBox: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  successText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    lineHeight: 17,
  },
  infoValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  primaryButton: {
    marginTop: 2,
  },
  eyeButton: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  resendWrap: {
    marginTop: 8,
    gap: 8,
    alignItems: "center",
  },
  rowWrap: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  loader: {
    marginTop: 12,
  },
});
