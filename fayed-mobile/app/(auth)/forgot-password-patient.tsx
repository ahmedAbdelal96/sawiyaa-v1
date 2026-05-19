import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
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

export default function PatientForgotPasswordScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { requestPatientPasswordReset, resetPatientPassword } = useAuth();

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
      const response = await requestPatientPasswordReset({
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

  return (
    <AuthScaffold
      eyebrow={t("auth.patientForgotPassword.eyebrow")}
      title={t("auth.patientForgotPassword.title")}
      subtitle={t("auth.patientForgotPassword.subtitle")}
      footer={
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/signin/patient")}
        >
          <Text color={theme.colors.textMuted} style={styles.backText}>
            {t("auth.common.backToPatientSignIn")}
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
        editable={!requestSent}
      />

      {!requestSent ? (
        <Button
          title={t("auth.patientForgotPassword.sendCode")}
          onPress={submitRequest}
          disabled={!email || !!emailError || isSubmitting}
          style={styles.primaryButton}
        >
          {isSubmitting && <ActivityIndicator size="small" color="white" />}
        </Button>
      ) : (
        <>
          <Input
            label={t("auth.fields.code")}
            onChangeText={setCode}
            placeholder={t("auth.placeholders.code")}
            value={code}
            keyboardType="number-pad"
            maxLength={8}
          />

          <Input
            label={t("auth.fields.newPassword")}
            onChangeText={setNewPassword}
            placeholder={t("auth.placeholders.newPassword")}
            value={newPassword}
            secureTextEntry
          />

          <Button
            title={t("auth.patientForgotPassword.resetPassword")}
            onPress={submitReset}
            disabled={!code || !newPassword || isSubmitting}
            style={styles.primaryButton}
          >
            {isSubmitting && <ActivityIndicator size="small" color="white" />}
          </Button>

          <TouchableOpacity onPress={() => setRequestSent(false)}>
            <Text color={theme.colors.textMuted} style={styles.backText}>
              {t("auth.common.backToPatientSignIn")}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {errorText && (
        <View
          style={[
            styles.messageBox,
            { backgroundColor: theme.colors.error + "20" },
          ]}
        >
          <Text style={styles.messageText} color={theme.colors.error}>
            {errorText}
          </Text>
        </View>
      )}

      {successText && (
        <View
          style={[
            styles.messageBox,
            { backgroundColor: theme.colors.success + "20" },
          ]}
        >
          <Text style={styles.messageText} color={theme.colors.success}>
            {successText}
          </Text>
        </View>
      )}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    marginTop: 20,
  },
  backText: {
    textAlign: "center",
    marginTop: 16,
  },
  messageBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
