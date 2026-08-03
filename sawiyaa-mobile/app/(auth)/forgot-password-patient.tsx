import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Input, Screen, Text, OtpInput } from "../../src/components/ui";
import { useAuth } from "../../src/providers/AuthProvider";
import { usePublicTheme } from "../../src/features/public/theme/public-theme";
import { useAppDirection } from "../../src/i18n/direction";
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

  if (errorCode === "PASSWORD_RESET_ACCOUNT_NOT_FOUND") {
    return t("auth.patientForgotPassword.errors.patientAccountNotFound");
  }

  return extractApiErrorMessage(error);
}

type Step = "email" | "otp" | "password";

export default function PatientForgotPasswordScreen() {
  const router = useRouter();
  const { publicTheme } = usePublicTheme();
  const { t, i18n } = useTranslation();
  const { textAlign, arrowBack } = useAppDirection();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const logoAccessibilityLabel = isRtl ? "شعار سويّـة" : "Sawiyaa logo";
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

  const handleChangeEmail = () => {
    setStep("email");
    setCode("");
    setResetToken(null);
    setCooldown({ active: false, remainingSeconds: 0 });
    setErrorText(null);
    setSuccessText(null);
  };

  return (
    <Screen safeArea bg="background" style={[styles.screen, { backgroundColor: publicTheme.canvas }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Navigation Bar with Back Button */}
        <View style={styles.navHeader}>
          <TouchableOpacity
            onPress={() => router.push("/(public)")}
            style={[styles.backButton, { backgroundColor: publicTheme.raisedSurface, borderColor: publicTheme.subtleBorder }]}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={isRtl ? "الرجوع للصفحة الرئيسية" : "Back to Home"}
          >
            <Ionicons name={arrowBack} size={20} color={publicTheme.primaryText} />
          </TouchableOpacity>

          <View style={styles.headerLogoContainer}>
            <Image
              source={require("../../assets/logo_transparent.png")}
              style={styles.brandLogo}
              resizeMode="contain"
              accessible
              accessibilityRole="image"
              accessibilityLabel={logoAccessibilityLabel}
            />
          </View>

          <View style={styles.headerPlaceholder} />
        </View>

        <Card
          variant="elevated"
          padding="lg"
          style={[
            styles.card,
            {
              backgroundColor: publicTheme.raisedSurface,
              borderColor: publicTheme.subtleBorder,
            },
          ]}
        >
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: publicTheme.accentMint },
            ]}
          >
            <Ionicons
              name="lock-closed"
              size={24}
              color={publicTheme.primaryText}
            />
          </View>

          <View style={styles.header}>
            <Text
              style={[styles.title, { color: publicTheme.primaryText, textAlign }]}
              weight="bold"
            >
              {step === "email"
                ? t("auth.patientForgotPassword.title")
                : step === "otp"
                  ? t("auth.patientForgotPassword.step2Title")
                  : t("auth.patientForgotPassword.step3Title")}
            </Text>
            <Text style={[styles.subtitle, { color: publicTheme.secondaryText, textAlign }]}>
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
                labelDirection={textAlign}
                placeholder={t("auth.placeholders.email")}
                placeholderDirection={textAlign}
                onChangeText={setEmail}
                value={email}
                error={emailError ?? undefined}
              />

              {errorText ? (
                <View
                  style={[
                    styles.errorBox,
                    { backgroundColor: "rgba(186, 26, 26, 0.1)" },
                  ]}
                >
                  <Ionicons
                    name="alert-circle"
                    size={18}
                    color="#BA1A1A"
                  />
                  <Text
                    style={[styles.errorText, { textAlign }]}
                    color="#BA1A1A"
                  >
                    {errorText}
                  </Text>
                </View>
              ) : null}

              <Button
                title={t("auth.patientForgotPassword.sendCode")}
                onPress={submitRequest}
                disabled={!email || !!emailError || isSubmitting}
                style={[styles.primaryButton, { backgroundColor: publicTheme.primaryText }]}
              />
            </>
          ) : null}

          {step === "otp" ? (
            <>
              <View
                style={[
                  styles.infoBox,
                  {
                    borderColor: publicTheme.subtleBorder,
                    backgroundColor: publicTheme.accentMint,
                  },
                ]}
              >
                <Text
                  style={[styles.infoLabel, { textAlign }]}
                  color={publicTheme.secondaryText}
                >
                  {t("auth.patientForgotPassword.otpEmailInfoLabel")}
                </Text>
                <Text
                  style={[styles.infoValue, { textAlign }]}
                  color={publicTheme.primaryText}
                >
                  {email}
                </Text>
              </View>

              <OtpInput
                label={t("auth.fields.resetCode")}
                onChangeText={setCode}
                value={code}
                length={6}
                disabled={isSubmitting}
              />

              {errorText ? (
                <View
                  style={[
                    styles.errorBox,
                    { backgroundColor: "rgba(186, 26, 26, 0.1)" },
                  ]}
                >
                  <Ionicons
                    name="alert-circle"
                    size={18}
                    color="#BA1A1A"
                  />
                  <Text
                    style={[styles.errorText, { textAlign }]}
                    color="#BA1A1A"
                  >
                    {errorText}
                  </Text>
                </View>
              ) : null}

              <Button
                title={t("auth.patientForgotPassword.verifyOtp")}
                onPress={submitVerifyOtp}
                disabled={code.trim().length < 6 || isSubmitting}
                style={[styles.primaryButton, { backgroundColor: publicTheme.primaryText }]}
              />

              <View style={styles.resendWrap}>
                {cooldown.active ? (
                  <Text
                    color={publicTheme.secondaryText}
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
                        ? publicTheme.secondaryText
                        : publicTheme.primaryText
                    }
                    style={{ textAlign: "center", fontSize: 13, fontWeight: "700" }}
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
                    color={publicTheme.secondaryText}
                    style={{ textAlign: "center", fontSize: 13, textDecorationLine: "underline" }}
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
                    borderColor: publicTheme.subtleBorder,
                    backgroundColor: publicTheme.accentMint,
                  },
                ]}
              >
                <Text
                  style={[styles.infoLabel, { textAlign }]}
                  color={publicTheme.secondaryText}
                >
                  {t("auth.patientForgotPassword.passwordEmailInfoLabel")}
                </Text>
                <Text
                  style={[styles.infoValue, { textAlign }]}
                  color={publicTheme.primaryText}
                >
                  {email}
                </Text>
              </View>

              {successText ? (
                <View
                  style={[
                    styles.successBox,
                    { backgroundColor: "rgba(36, 86, 79, 0.1)" },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={publicTheme.primaryText}
                  />
                  <Text
                    style={[styles.successText, { textAlign }]}
                    color={publicTheme.primaryText}
                  >
                    {successText}
                  </Text>
                </View>
              ) : null}

              <Input
                label={t("auth.fields.newPassword")}
                labelDirection={textAlign}
                placeholder={t("auth.placeholders.newPassword")}
                placeholderDirection={textAlign}
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
                      color={publicTheme.secondaryText}
                    />
                  </TouchableOpacity>
                }
              />

              <Input
                label={t("auth.fields.confirmPassword")}
                labelDirection={textAlign}
                placeholder={t("auth.placeholders.confirmPassword")}
                placeholderDirection={textAlign}
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
                      color={publicTheme.secondaryText}
                    />
                  </TouchableOpacity>
                }
              />

              {errorText ? (
                <View
                  style={[
                    styles.errorBox,
                    { backgroundColor: "rgba(186, 26, 26, 0.1)" },
                  ]}
                >
                  <Ionicons
                    name="alert-circle"
                    size={18}
                    color="#BA1A1A"
                  />
                  <Text
                    style={[styles.errorText, { textAlign }]}
                    color="#BA1A1A"
                  >
                    {errorText}
                  </Text>
                </View>
              ) : null}

              <Button
                title={t("auth.patientForgotPassword.resetPassword")}
                onPress={submitConfirmReset}
                disabled={!newPassword || !confirmPassword || isSubmitting}
                style={[styles.primaryButton, { backgroundColor: publicTheme.primaryText }]}
              />
            </>
          ) : null}

          <View style={styles.rowWrap}>
            <Text color={publicTheme.secondaryText}>
              {t("auth.patientForgotPassword.rememberPassword")}
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/(auth)/signin/patient")}
            >
              <Text style={[styles.linkText, { color: publicTheme.primaryText }]}>
                {t("auth.patientForgotPassword.goToSignIn")}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {isSubmitting && (
          <ActivityIndicator
            style={styles.loader}
            color={publicTheme.primaryText}
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 16,
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    marginBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerLogoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandLogo: {
    width: 120,
    height: 38,
  },
  headerPlaceholder: {
    width: 40,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    gap: 16,
    shadowColor: "rgba(5, 63, 56, 0.12)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    lineHeight: 32,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 300,
  },
  errorBox: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
  },
  successBox: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  successText: {
    flex: 1,
    fontSize: 13,
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  infoLabel: {
    fontSize: 12.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 16,
    minHeight: 52,
    justifyContent: "center",
  },
  eyeButton: {
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  resendWrap: {
    marginTop: 8,
    gap: 8,
    alignItems: "center",
  },
  rowWrap: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  linkText: {
    fontWeight: "800",
    textDecorationLine: "underline",
    fontSize: 14,
  },
  loader: {
    marginTop: 10,
  },
});
