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
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { PatientGoogleSignInButton } from "../../../src/components/auth/PatientGoogleSignInButton";
import { Button, Card, Input, Screen, Text } from "../../../src/components/ui";
import { useAuth } from "../../../src/providers/AuthProvider";
import { usePublicTheme } from "../../../src/features/public/theme/public-theme";
import { useAppDirection } from "../../../src/i18n/direction";
import { getAuthLockoutErrorMessage } from "../../../src/features/auth/auth-lockout-messages";

function validateEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email.trim());
}

const DEV_ACCOUNTS: Array<{ label: string; email: string; password: string }> = [];

export default function PatientSignInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string; redirectIntent?: string }>();
  const redirectAfterLogin = params.redirect || null;
  const { publicTheme } = usePublicTheme();
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, arrowBack, arrowForward, rowDirection } = useAppDirection();
  const logoAccessibilityLabel = isRTL ? "شعار سويّـة" : "Sawiyaa logo";
  const { signInPatient, signInPatientWithGoogle, setPendingRedirect } = useAuth();
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
      // Set the pending redirect BEFORE signing in so AuthProvider picks it up
      if (redirectAfterLogin) {
        setPendingRedirect(redirectAfterLogin);
      }
      await signInPatient({ email: email.trim(), password });
    } catch (error) {
      // Clear the redirect on failure — user stays on sign-in screen
      setPendingRedirect(null);
      setErrorText(getAuthLockoutErrorMessage(error, "patient", t));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen safeArea bg="background" style={[styles.screen, { backgroundColor: publicTheme.canvas }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardWrap}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Navigation Bar with RTL/LTR aware placement */}
          <View style={[styles.navHeader, { flexDirection: rowDirection }]}>
            <TouchableOpacity
              onPress={() => router.push("/(public)")}
              style={[styles.backButton, { backgroundColor: publicTheme.raisedSurface, borderColor: publicTheme.subtleBorder }]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isRTL ? "الرجوع للصفحة الرئيسية" : "Back to Home"}
            >
              <Ionicons name={arrowBack} size={18} color={publicTheme.primaryText} />
            </TouchableOpacity>

            <View style={styles.headerLogoContainer}>
              <Image
                source={require("../../../assets/logo_transparent.png")}
                style={styles.brandLogo}
                resizeMode="contain"
                accessible
                accessibilityRole="image"
                accessibilityLabel={logoAccessibilityLabel}
              />
            </View>

            <View style={styles.headerPlaceholder} />
          </View>

          {/* Main Auth Card */}
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
            <View style={styles.header}>
              <Text variant="h2" weight="bold" style={[styles.title, { color: publicTheme.primaryText, textAlign }]}>
                {t("auth.patientSignIn.title")}
              </Text>
              <Text variant="body" color={publicTheme.secondaryText} style={[styles.subtitle, { textAlign }]}>
                {t("brand.tagline", { defaultValue: isRTL ? "رعاية للعقل والجسم والتوازن" : "Care for mind, body, and balance" })}
              </Text>
            </View>

            <Input
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label={t("auth.fields.email")}
              labelDirection={textAlign}
              onChangeText={setEmail}
              placeholder={t("auth.placeholders.email")}
              placeholderDirection={textAlign}
              value={email}
              error={emailError ?? undefined}
            />

            <Input
              autoCapitalize="none"
              autoComplete="password"
              label={t("auth.fields.password")}
              labelDirection={textAlign}
              placeholder={t("auth.placeholders.password")}
              placeholderDirection={textAlign}
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
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={publicTheme.secondaryText}
                  />
                </TouchableOpacity>
              }
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/(auth)/forgot-password-patient")}
              style={[
                styles.forgotWrap,
                { alignSelf: isRTL ? "flex-start" : "flex-end" },
              ]}
            >
              <Text style={[styles.forgotText, { color: publicTheme.primaryText }]}>
                {t("auth.patientSignIn.forgotPassword")}
              </Text>
            </TouchableOpacity>

            {errorText ? (
              <View style={[styles.errorBox, { backgroundColor: "rgba(220, 38, 38, 0.08)" }]}>
                <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                <Text style={[styles.errorText, { textAlign }]} color="#DC2626">
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
                  name={arrowForward}
                  size={16}
                  color="#FFFFFF"
                />
              }
              style={[styles.primaryButton, { backgroundColor: publicTheme.primaryText }]}
            />

            <View style={styles.altSignInHeader}>
              <View style={[styles.divider, { backgroundColor: publicTheme.subtleBorder }]} />
              <Text variant="caption" color={publicTheme.secondaryText} style={styles.altSignInText}>
                {t("auth.entry.eyebrow", { defaultValue: isRTL ? "دخول التطبيق" : "Sign In Options" })}
              </Text>
              <View style={[styles.divider, { backgroundColor: publicTheme.subtleBorder }]} />
            </View>

            <PatientGoogleSignInButton
              title={t("auth.patientSignIn.googleButton")}
              unavailableText={t("auth.patientSignIn.googleUnavailable")}
              onTokenReceived={signInPatientWithGoogle}
            />

            <View style={[styles.rowWrap, { flexDirection: rowDirection }]}>
              <Text color={publicTheme.secondaryText} style={{ fontSize: 13.5 }}>
                {t("auth.patientSignIn.noAccount")}
              </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/signup/patient")}>
                <Text style={[styles.linkText, { color: publicTheme.primaryText }]}>
                  {t("auth.patientSignIn.createAccount")}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Dev Accounts Helper */}
          {__DEV__ && (
            <Card
              variant="flat"
              padding="sm"
              style={[
                styles.devSection,
                {
                  backgroundColor: publicTheme.accentMint,
                  borderColor: publicTheme.subtleBorder,
                },
              ]}
            >
              <View style={[styles.devHeader, { flexDirection: rowDirection }]}>
                <Ionicons name="bug-outline" size={14} color={publicTheme.primaryText} />
                <Text variant="caption" weight="700" color={publicTheme.primaryText}>
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
                        backgroundColor: publicTheme.raisedSurface,
                        borderColor: publicTheme.subtleBorder,
                      },
                    ]}
                    onPress={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                      setErrorText(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.devChipTitle, { color: publicTheme.primaryText }]} weight="700">
                      {account.label}
                    </Text>
                    <Text variant="caption" color={publicTheme.secondaryText} style={styles.devChipText}>
                      {account.email}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          )}

          {isSubmitting ? (
            <ActivityIndicator style={styles.loader} color={publicTheme.primaryText} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  keyboardWrap: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 14,
  },
  navHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    marginBottom: 2,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerLogoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandLogo: {
    width: 110,
    height: 34,
  },
  headerPlaceholder: {
    width: 36,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 20,
    shadowColor: "rgba(5, 63, 56, 0.08)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 21,
    lineHeight: 28,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  forgotWrap: {
    marginTop: -2,
    marginBottom: 14,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12.5,
    flex: 1,
  },
  primaryButton: {
    marginBottom: 14,
    borderRadius: 14,
    minHeight: 48,
    justifyContent: "center",
  },
  altSignInHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 8,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  altSignInText: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 10.5,
    fontWeight: "700",
  },
  rowWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 12,
    flexWrap: "wrap",
  },
  linkText: {
    fontWeight: "800",
    textDecorationLine: "underline",
    fontSize: 13.5,
  },
  devSection: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  devHeader: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  devChipsRow: {
    gap: 8,
  },
  devChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  devChipTitle: {
    fontSize: 13,
    marginBottom: 1,
  },
  devChipText: {
    fontSize: 11.5,
  },
  eyeButton: {
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  loader: {
    marginTop: 4,
  },
});
