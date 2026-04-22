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
import { Button, Input, Screen, Text } from "../../../src/components/ui";
import { useAuth } from "../../../src/providers/AuthProvider";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { extractApiErrorMessage } from "../../../src/lib/api";

function validateEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email.trim());
}

export default function PatientSignUpScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { signUpPatient } = useAuth();
  const [displayName, setDisplayName] = useState("");
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
      await signUpPatient({
        displayName: displayName.trim() || undefined,
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
          onPress={() => router.replace("/(auth)/signin/patient")}
          style={styles.backWrap}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-back"
            size={18}
            color={theme.colors.textMuted}
          />
          <Text color={theme.colors.textMuted} style={styles.backText}>
            {t("auth.common.backToPatientSignIn")}
          </Text>
        </TouchableOpacity>

        <View style={styles.hero}>
          <View
            style={[
              styles.logoCircle,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Ionicons
              name="person-add"
              size={30}
              color={theme.colors.primary}
            />
          </View>
          <Text
            style={styles.title}
            color={theme.colors.textPrimary}
            weight="bold"
          >
            {t("auth.patientSignUp.title")}
          </Text>
          <Text style={styles.subtitle} color={theme.colors.textSecondary}>
            {t("auth.patientSignUp.subtitle")}
          </Text>
        </View>

        <Input
          autoCapitalize="words"
          label={t("auth.fields.displayName")}
          onChangeText={setDisplayName}
          placeholder={t("auth.placeholders.displayName")}
          value={displayName}
        />
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
          helperText={t("auth.validation.passwordHint")}
        />

        {errorText ? (
          <Text style={styles.errorText} color="#dc2626">
            {errorText}
          </Text>
        ) : null}

        <Button
          title={
            isSubmitting
              ? t("auth.common.pleaseWait")
              : t("auth.patientSignUp.submit")
          }
          onPress={() => void handleSubmit()}
          disabled={isSubmitting || !email || !password || Boolean(emailError)}
          style={styles.primaryButton}
        />

        <View style={styles.rowWrap}>
          <Text color={theme.colors.textSecondary}>
            {t("auth.patientSignUp.haveAccount")}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/(auth)/signin/patient")}
          >
            <Text color={theme.colors.textBrand} weight="600">
              {t("auth.patientSignUp.goToSignIn")}
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
  errorText: {
    fontSize: 13,
    marginBottom: 12,
  },
  primaryButton: {
    borderRadius: 999,
    paddingVertical: 15,
  },
  rowWrap: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
  },
  backText: {
    fontSize: 13,
  },
  loader: {
    marginTop: 12,
  },
});
