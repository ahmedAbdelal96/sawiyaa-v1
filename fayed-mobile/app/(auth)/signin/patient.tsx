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
import { PatientGoogleSignInButton } from "../../../src/components/auth/PatientGoogleSignInButton";
import { Button, Input, Screen, Text } from "../../../src/components/ui";
import { useAuth } from "../../../src/providers/AuthProvider";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { extractApiErrorMessage } from "../../../src/lib/api";

function validateEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email.trim());
}

const DEV_ACCOUNTS = [
  {
    label: "ahmed.patient",
    email: "ahmed.patient@hesba.local",
    password: "Patient@12345",
  },
  {
    label: "mohamed.patient",
    email: "mohamed.patient@hesba.local",
    password: "Patient2@12345",
  },
];

export default function PatientSignInScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const { signInPatient, signInPatientWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const emailError = useMemo(() => {
    if (!email) return null;
    return validateEmail(email) ? null : t("auth.validation.email");
  }, [email, t]);

  async function handleSubmit() {
    setIsSubmitting(true);
    setErrorText(null);
    try {
      await signInPatient({ email: email.trim(), password });
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
          {/* Header */}
          <View style={styles.header}>
            <Text
              style={styles.title}
              color={theme.colors.textPrimary}
              weight="bold"
            >
              {t("auth.patientSignIn.title")}
            </Text>
            <Text
              style={styles.subtitle}
              color={theme.colors.textSecondary}
            >
              {t("auth.patientSignIn.subtitle")}
            </Text>
          </View>

          {/* Form */}
          <Input
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label={t("auth.fields.email")}
            labelDirection={labelAlign}
            onChangeText={setEmail}
            placeholder={t("auth.placeholders.email")}
            placeholderDirection="left"
            value={email}
            error={emailError ?? undefined}
          />
          <Input
            autoCapitalize="none"
            autoComplete="password"
            label={t("auth.fields.password")}
            labelDirection={labelAlign}
            placeholder={t("auth.placeholders.password")}
            placeholderDirection="left"
            secureTextEntry={!showPassword}
            onChangeText={setPassword}
            value={password}
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

          {/* Forgot */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(auth)/forgot-password-patient")}
            style={styles.forgotWrap}
          >
            <Text
              color={theme.colors.primary}
              style={[styles.forgotText, { textAlign: isRtl ? "right" : "left" }]}
            >
              {t("auth.patientSignIn.forgotPassword")}
            </Text>
          </TouchableOpacity>

          {/* Error */}
          {errorText ? (
            <View style={[styles.errorBox, { backgroundColor: theme.colors.errorLight }]}>
              <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
              <Text style={[styles.errorText, { textAlign: labelAlign }]} color={theme.colors.error}>
                {errorText}
              </Text>
            </View>
          ) : null}

          {/* Primary Button */}
          <Button
            title={isSubmitting ? t("auth.common.pleaseWait") : t("auth.patientSignIn.submit")}
            onPress={() => void handleSubmit()}
            disabled={isSubmitting || !email || !password || Boolean(emailError)}
            style={styles.primaryButton}
          />

          {/* Google */}
          <PatientGoogleSignInButton
            title={t("auth.patientSignIn.googleButton")}
            unavailableText={t("auth.patientSignIn.googleUnavailable")}
            onTokenReceived={signInPatientWithGoogle}
          />

          {/* Bottom Link */}
          <View style={styles.rowWrap}>
            <Text color={theme.colors.textSecondary}>
              {t("auth.patientSignIn.noAccount")}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/signup/patient")}>
              <Text color={theme.colors.primary} weight="600">
                {t("auth.patientSignIn.createAccount")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dev Accounts */}
        {__DEV__ && (
          <View style={styles.devSection}>
            <TouchableOpacity
              style={styles.devToggle}
              onPress={() => {}}
              activeOpacity={0.8}
            >
              <Text style={styles.devToggleText}>DEV TEST ACCOUNTS</Text>
              <Ionicons name="chevron-down" size={12} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.devChipsRow}>
              {DEV_ACCOUNTS.map((a) => (
                <TouchableOpacity
                  key={a.email}
                  style={[styles.devChip, { borderColor: theme.colors.primary + "60" }]}
                  onPress={() => {
                    setEmail(a.email);
                    setPassword(a.password);
                    setErrorText(null);
                  }}
                >
                  <Text style={styles.devChipText} color={theme.colors.primary}>
                    {a.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

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
    gap: 0,
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
  forgotWrap: {
    alignSelf: "flex-end",
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 13,
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
  primaryButton: {
    marginBottom: 12,
    borderRadius: 12,
    paddingVertical: 16,
  },
  rowWrap: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  loader: {
    marginTop: 8,
  },
  devSection: {
    marginTop: 4,
    paddingHorizontal: 4,
  },
  devToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
  },
  devToggleText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#7a8891",
  },
  devChipsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  devChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  devChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  eyeButton: {
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});