import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
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

export default function PractitionerForgotPasswordScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { requestPractitionerPasswordReset, resetPractitionerPassword } =
    useAuth();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

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
      const response = await resetPractitionerPassword({
        email: email.trim(),
        code: code.trim(),
        newPassword,
      });
      setSuccessText(response.message);
      router.replace("/(auth)/signin/practitioner");
    } catch (error) {
      setErrorText(extractApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScaffold
      eyebrow={t("auth.practitionerForgotPassword.eyebrow")}
      title={t("auth.practitionerForgotPassword.title")}
      subtitle={t("auth.practitionerForgotPassword.subtitle")}
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

      {requestSent ? (
        <>
          <Input
            keyboardType="number-pad"
            label={t("auth.fields.resetCode")}
            onChangeText={setCode}
            placeholder={t("auth.placeholders.resetCode")}
            value={code}
          />
          <Input
            autoCapitalize="none"
            autoComplete="password"
            label={t("auth.fields.newPassword")}
            onChangeText={setNewPassword}
            placeholder={t("auth.placeholders.newPassword")}
            secureTextEntry
            value={newPassword}
          />
        </>
      ) : null}

      {successText ? (
        <Text style={styles.successText} color="#15803d">
          {successText}
        </Text>
      ) : null}
      {errorText ? (
        <Text style={styles.errorText} color="#dc2626">
          {errorText}
        </Text>
      ) : null}

      {!requestSent ? (
        <Button
          title={
            isSubmitting
              ? t("auth.common.pleaseWait")
              : t("auth.practitionerForgotPassword.sendCode")
          }
          onPress={() => void submitRequest()}
          disabled={isSubmitting || !email || Boolean(emailError)}
        />
      ) : (
        <Button
          title={
            isSubmitting
              ? t("auth.common.pleaseWait")
              : t("auth.practitionerForgotPassword.resetPassword")
          }
          onPress={() => void submitReset()}
          disabled={isSubmitting || !code || !newPassword}
        />
      )}

      {isSubmitting ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : null}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
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
});
