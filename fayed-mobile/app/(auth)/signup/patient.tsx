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
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const { signUpPatient } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const emailError = useMemo(() => {
    if (!email) return null;
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
              {t("auth.patientSignUp.title")}
            </Text>
            <Text
              style={styles.subtitle}
              color={theme.colors.textSecondary}
            >
              {t("auth.patientSignUp.subtitle")}
            </Text>
          </View>

          {/* Form */}
          <Input
            autoCapitalize="words"
            label={t("auth.fields.displayName")}
            labelDirection={labelAlign}
            placeholder={t("auth.placeholders.displayName")}
            placeholderDirection={labelAlign}
            onChangeText={setDisplayName}
            value={displayName}
          />
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
            helperText={t("auth.validation.passwordHint")}
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
            title={isSubmitting ? t("auth.common.pleaseWait") : t("auth.patientSignUp.submit")}
            onPress={() => void handleSubmit()}
            disabled={isSubmitting || !email || !password || Boolean(emailError)}
            style={styles.primaryButton}
          />

          {/* Bottom Link */}
          <View style={styles.rowWrap}>
            <Text color={theme.colors.textSecondary}>
              {t("auth.patientSignUp.haveAccount")}
            </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/signin/patient")}>
              <Text color={theme.colors.primary} weight="600">
                {t("auth.patientSignUp.goToSignIn")}
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
  eyeButton: {
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});