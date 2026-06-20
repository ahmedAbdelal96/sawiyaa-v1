import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { PatientGoogleSignInButton } from "../../../src/components/auth/PatientGoogleSignInButton";
import { Button, Card, Input, Screen, Text } from "../../../src/components/ui";
import { useAuth } from "../../../src/providers/AuthProvider";
import { useTheme } from "../../../src/providers/ThemeProvider";
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
  const logoAccessibilityLabel = isRtl ? "شعار سويّـة" : "Sawiyaa logo";
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
      <View style={[styles.blobTop, { backgroundColor: theme.colors.mintAccent }]} />
      <View style={[styles.blobBottom, { backgroundColor: theme.colors.creamAccent }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardWrap}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <Image
              source={require("../../../assets/logo.png")}
              style={styles.brandLogo}
              resizeMode="contain"
              accessible
              accessibilityRole="image"
              accessibilityLabel={logoAccessibilityLabel}
            />
          </View>

          <Card
            variant="elevated"
            padding="lg"
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.borderLight,
                ...theme.shadows.md,
              },
            ]}
          >
            <View style={styles.header}>
              <Text variant="h2" weight="700" style={styles.title}>
                {t("auth.patientSignIn.title")}
              </Text>
              <Text variant="body" color={theme.colors.textSecondary} style={styles.subtitle}>
                {t("brand.tagline")}
              </Text>
            </View>

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
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeButton}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
              }
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/(auth)/forgot-password-patient")}
              style={[
                styles.forgotWrap,
                { alignSelf: isRtl ? "flex-start" : "flex-end" },
              ]}
            >
              <Text color={theme.colors.primary} style={styles.forgotText}>
                {t("auth.patientSignIn.forgotPassword")}
              </Text>
            </TouchableOpacity>

            {errorText ? (
              <View style={[styles.errorBox, { backgroundColor: theme.colors.errorLight }]}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                <Text style={[styles.errorText, { textAlign: labelAlign }]} color={theme.colors.error}>
                  {errorText}
                </Text>
              </View>
            ) : null}

            <Button
              title={isSubmitting ? t("auth.common.pleaseWait") : t("auth.patientSignIn.submit")}
              onPress={() => void handleSubmit()}
              disabled={isSubmitting || !email || !password || Boolean(emailError)}
              rightIcon={
                <Ionicons
                  name={isRtl ? "arrow-back" : "arrow-forward"}
                  size={18}
                  color={theme.colors.onPrimary}
                />
              }
              style={styles.primaryButton}
            />

            <View style={styles.altSignInHeader}>
              <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />
              <Text variant="caption" color={theme.colors.textMuted} style={styles.altSignInText}>
                {t("auth.entry.eyebrow")}
              </Text>
              <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />
            </View>

            <PatientGoogleSignInButton
              title={t("auth.patientSignIn.googleButton")}
              unavailableText={t("auth.patientSignIn.googleUnavailable")}
              onTokenReceived={signInPatientWithGoogle}
            />

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
          </Card>

          {__DEV__ && (
            <Card
              variant="flat"
              padding="sm"
              style={[
                styles.devSection,
                {
                  backgroundColor: theme.colors.surfaceContainerLow,
                  borderColor: theme.colors.borderLight,
                },
              ]}
            >
              <View style={[styles.devHeader, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
                <Ionicons name="bug-outline" size={16} color={theme.colors.textMuted} />
                <Text variant="caption" weight="700" color={theme.colors.textMuted}>
                  DEV TEST ACCOUNTS
                </Text>
              </View>
              <View style={styles.devChipsRow}>
                {DEV_ACCOUNTS.map((account) => (
                  <TouchableOpacity
                    key={account.email}
                    style={[
                      styles.devChip,
                      {
                        backgroundColor: theme.colors.surfaceRaised,
                        borderColor: theme.colors.borderLight,
                      },
                    ]}
                    onPress={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                      setErrorText(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.devChipTitle} weight="600">
                      {account.label}
                    </Text>
                    <Text variant="caption" color={theme.colors.textSecondary} style={styles.devChipText}>
                      {account.email}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          )}

          {isSubmitting ? (
            <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  keyboardWrap: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  blobTop: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    top: -160,
    left: -110,
    opacity: 0.56,
  },
  blobBottom: {
    position: "absolute",
    width: 380,
    height: 380,
    borderRadius: 190,
    bottom: -210,
    right: -150,
    opacity: 0.34,
  },
  brandRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 8,
  },
  brandLogo: {
    width: 150,
    height: 54,
  },
  card: {
    borderRadius: 28,
  },
  header: {
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 280,
  },
  forgotWrap: {
    marginTop: -2,
    marginBottom: 14,
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
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  primaryButton: {
    marginBottom: 14,
    borderRadius: 20,
    paddingVertical: 16,
  },
  altSignInHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  altSignInText: {
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontSize: 10,
  },
  rowWrap: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    flexWrap: "wrap",
  },
  devSection: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  devHeader: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  devChipsRow: {
    gap: 10,
  },
  devChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  devChipTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  devChipText: {
    fontSize: 12,
  },
  eyeButton: {
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  loader: {
    marginTop: 2,
  },
});
