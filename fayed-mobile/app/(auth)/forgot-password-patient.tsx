import React, { useMemo, useState } from "react";
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

export default function PatientForgotPasswordScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const { requestPatientPasswordReset, resetPatientPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  const emailError = useMemo(() => {
    if (!email) return null;
    return validateEmail(email) ? null : t("auth.validation.email");
  }, [email, t]);

  async function submitRequest() {
    setIsSubmitting(true);
    setErrorText(null);
    setSuccessText(null);
    try {
      const response = await requestPatientPasswordReset({ email: email.trim() });
      setRequestSent(true);
      setSuccessText(response.message);
    } catch (error) {
      setErrorText(extractApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitReset() {
    setIsSubmitting(true);
    setErrorText(null);
    setSuccessText(null);
    try {
      const response = await resetPatientPassword({
        email: email.trim(),
        code: code.trim(),
        newPassword,
      });
      setSuccessText(response.message);
      router.replace("/(auth)/signin/patient");
    } catch (error) {
      setErrorText(extractApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const labelAlign = isRtl ? "right" : "left";

  return (
    <Screen safeArea bg="background" style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Row */}
        <View style={styles.brandRow}>
          <View style={[styles.brandIcon, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="water" size={16} color={theme.colors.primary} />
          </View>
          <Text style={[styles.brandName, { color: theme.colors.primary }]} weight="600">
            Fayed
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="lock-closed" size={22} color={theme.colors.primary} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text
              style={styles.title}
              color={theme.colors.textPrimary}
              weight="bold"
            >
              {t("auth.patientForgotPassword.title")}
            </Text>
            <Text
              style={styles.subtitle}
              color={theme.colors.textSecondary}
            >
              {t("auth.patientForgotPassword.subtitle")}
            </Text>
          </View>

          {!requestSent ? (
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
                <View style={[styles.errorBox, { backgroundColor: theme.colors.errorLight }]}>
                  <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                  <Text style={[styles.errorText, { textAlign: labelAlign }]} color={theme.colors.error}>
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
                {isSubmitting && <ActivityIndicator size="small" color="white" />}
              </Button>
            </>
          ) : (
            <>
              <View style={[styles.successBox, { backgroundColor: theme.colors.successLight }]}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                <Text style={[styles.successText, { textAlign: labelAlign }]} color={theme.colors.success}>
                  {successText ?? t("auth.patientForgotPassword.successMessage")}
                </Text>
              </View>

              <Input
                label={t("auth.fields.code")}
                labelDirection={labelAlign}
                placeholder={t("auth.placeholders.code")}
                placeholderDirection="left"
                onChangeText={setCode}
                value={code}
                keyboardType="number-pad"
                maxLength={8}
              />

              <Input
                label={t("auth.fields.newPassword")}
                labelDirection={labelAlign}
                placeholder={t("auth.placeholders.newPassword")}
                placeholderDirection="left"
                secureTextEntry={!showPassword}
                onChangeText={setNewPassword}
                value={newPassword}
                rightElement={
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                }
              />

              {errorText ? (
                <View style={[styles.errorBox, { backgroundColor: theme.colors.errorLight }]}>
                  <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                  <Text style={[styles.errorText, { textAlign: labelAlign }]} color={theme.colors.error}>
                    {errorText}
                  </Text>
                </View>
              ) : null}

              <Button
                title={t("auth.patientForgotPassword.resetPassword")}
                onPress={submitReset}
                disabled={!code || !newPassword || isSubmitting}
                style={styles.primaryButton}
              >
                {isSubmitting && <ActivityIndicator size="small" color="white" />}
              </Button>

              <TouchableOpacity onPress={() => setRequestSent(false)} style={styles.resendWrap}>
                <Text color={theme.colors.primary} style={{ textAlign: "center" }}>
                  {t("auth.patientForgotPassword.resendCode")}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Bottom Link */}
          <View style={styles.rowWrap}>
            <Text color={theme.colors.textSecondary}>
              {t("auth.patientForgotPassword.rememberPassword")}
            </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/signin/patient")}>
              <Text color={theme.colors.primary} weight="600">
                {t("auth.patientForgotPassword.goToSignIn")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {isSubmitting && (
          <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 24,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
    gap: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 4,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 18,
  },
  card: {
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  successText: {
    fontSize: 13,
    flex: 1,
  },
  primaryButton: {
    marginTop: 20,
    marginBottom: 4,
    borderRadius: 12,
    paddingVertical: 16,
  },
  resendWrap: {
    alignSelf: "center",
    marginTop: 12,
  },
  rowWrap: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    marginTop: 16,
  },
  loader: {
    marginTop: 8,
  },
  eyeButton: {
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});