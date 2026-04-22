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
  const { t } = useTranslation();
  const { signInPatient, signInPatientWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const emailError = useMemo(() => {
    if (!email) {
      return null;
    }

    return validateEmail(email) ? null : t("auth.validation.email");
  }, [email, t]);

  async function handleSubmit() {
    setIsSubmitting(true);
    setErrorText(null);

    try {
      await signInPatient({
        email: email.trim(),
        password,
      });
    } catch (error) {
      setErrorText(extractApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen safeArea bg="background" style={styles.screen}>
      <View
        style={[styles.radialTop, { backgroundColor: theme.colors.accent }]}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => router.replace("/(auth)")}
          style={styles.backWrap}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-back"
            size={18}
            color={theme.colors.textMuted}
          />
          <Text color={theme.colors.textMuted} style={styles.backText}>
            {t("auth.common.backToEntry")}
          </Text>
        </TouchableOpacity>

        <View style={styles.hero}>
          <View
            style={[
              styles.logoCircle,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Ionicons name="water" size={30} color={theme.colors.primary} />
          </View>
          <Text
            style={styles.title}
            color={theme.colors.textPrimary}
            weight="bold"
          >
            {t("auth.patientSignIn.title")}
          </Text>
          <Text style={styles.subtitle} color={theme.colors.textSecondary}>
            {t("auth.patientSignIn.subtitle")}
          </Text>
        </View>

        {__DEV__ && (
          <View style={styles.devBox}>
            <Text style={styles.devLabel} color={theme.colors.textMuted}>
              DEV - TEST ACCOUNTS
            </Text>
            <View style={styles.devRow}>
              {DEV_ACCOUNTS.map((a) => (
                <TouchableOpacity
                  key={a.email}
                  style={[
                    styles.devChip,
                    { borderColor: theme.colors.primary },
                  ]}
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
        <Input
          autoCapitalize="none"
          autoComplete="password"
          label={t("auth.fields.password")}
          onChangeText={setPassword}
          placeholder={t("auth.placeholders.password")}
          secureTextEntry
          value={password}
        />

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/(auth)/forgot-password-patient")}
          style={styles.forgotWrap}
        >
          <Text color={theme.colors.textMuted} style={styles.forgotText}>
            {t("auth.patientSignIn.forgotPassword")}
          </Text>
        </TouchableOpacity>

        {errorText ? (
          <Text style={styles.errorText} color="#dc2626">
            {errorText}
          </Text>
        ) : null}

        <Button
          title={
            isSubmitting
              ? t("auth.common.pleaseWait")
              : t("auth.patientSignIn.submit")
          }
          onPress={() => void handleSubmit()}
          disabled={isSubmitting || !email || !password || Boolean(emailError)}
          style={styles.primaryButton}
        />

        <PatientGoogleSignInButton
          title={t("auth.patientSignIn.googleButton")}
          helperText={t("auth.patientSignIn.googleHelper")}
          unavailableText={t("auth.patientSignIn.googleUnavailable")}
          onTokenReceived={signInPatientWithGoogle}
        />

        <View style={styles.rowWrap}>
          <Text color={theme.colors.textSecondary}>
            {t("auth.patientSignIn.noAccount")}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(auth)/signup/patient")}
          >
            <Text color={theme.colors.textBrand} weight="600">
              {t("auth.patientSignIn.createAccount")}
            </Text>
          </TouchableOpacity>
        </View>

        {isSubmitting ? (
          <ActivityIndicator
            style={styles.loader}
            color={theme.colors.primary}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 20,
  },
  radialTop: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    top: -180,
    left: -120,
    opacity: 0.5,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 28,
  },
  backWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
    alignSelf: "flex-start",
  },
  hero: {
    alignItems: "center",
    marginBottom: 18,
  },
  logoCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 34,
    lineHeight: 42,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  devBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3f7dcf33",
    backgroundColor: "#3f7dcf0a",
    padding: 12,
    marginBottom: 16,
  },
  devLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  devRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  devChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  devChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  forgotWrap: {
    marginTop: -4,
    marginBottom: 12,
    alignSelf: "flex-end",
  },
  forgotText: {
    fontSize: 12,
  },
  primaryButton: {
    marginBottom: 12,
    borderRadius: 999,
    paddingVertical: 15,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 12,
  },
  rowWrap: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  backText: {
    fontSize: 13,
  },
  loader: {
    marginTop: 12,
  },
});
