import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { AuthScaffold } from "../../../src/components/auth/AuthScaffold";
import { Button, Input, Text } from "../../../src/components/ui";
import { useAuth } from "../../../src/providers/AuthProvider";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { extractApiErrorMessage } from "../../../src/lib/api";
import type { OtpChallengeResponse } from "../../../src/features/auth/contracts";

function validateEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email.trim());
}

const DEV_ACCOUNTS = [
  {
    label: "dr.mohamed",
    email: "dr.mohamed@hesba.local",
    password: "Practitioner2@12345",
  },
  {
    label: "dr.youssef",
    email: "dr.youssef@hesba.local",
    password: "Practitioner5@12345",
  },
  {
    label: "dr.karim",
    email: "dr.karim@hesba.local",
    password: "Practitioner6@12345",
  },
  {
    label: "dr.sara",
    email: "dr.sara@hesba.local",
    password: "Practitioner7@12345",
  },
  {
    label: "dr.nour",
    email: "dr.nour@hesba.local",
    password: "Practitioner8@12345",
  },
];

export default function PractitionerSignInScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { startPractitionerLogin, verifyPractitionerOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [challenge, setChallenge] = useState<OtpChallengeResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [infoText, setInfoText] = useState<string | null>(null);

  const emailError = useMemo(() => {
    if (!email) {
      return null;
    }

    return validateEmail(email) ? null : t("auth.validation.email");
  }, [email, t]);

  async function submitCredentials() {
    setIsSubmitting(true);
    setErrorText(null);
    setInfoText(null);

    try {
      const response = await startPractitionerLogin({
        email: email.trim(),
        password,
      });
      setChallenge(response);
      setInfoText(response.message);
    } catch (error) {
      setErrorText(extractApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitOtp() {
    if (!challenge) {
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);

    try {
      await verifyPractitionerOtp({
        challengeId: challenge.challengeId,
        code: otpCode.trim(),
      });
    } catch (error) {
      setErrorText(extractApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScaffold
      eyebrow={t("auth.practitionerSignIn.eyebrow")}
      title={t("auth.practitionerSignIn.title")}
      subtitle={t("auth.practitionerSignIn.subtitle")}
      footer={
        <TouchableOpacity onPress={() => router.replace("/(auth)")}>
          <Text color={theme.colors.textMuted} style={styles.backText}>
            {t("auth.common.backToEntry")}
          </Text>
        </TouchableOpacity>
      }
    >
      {!challenge ? (
        <>
          {__DEV__ && (
            <View style={styles.devBox}>
              <Text style={styles.devLabel} color={theme.colors.textMuted}>
                DEV · بيانات تجريبية
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
                    <Text
                      style={styles.devChipText}
                      color={theme.colors.primary}
                    >
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
            onPress={() => router.push("/(auth)/practitioner-forgot-password")}
          >
            <Text
              color={theme.colors.textBrand}
              weight="600"
              style={styles.inlineLink}
            >
              {t("auth.practitionerSignIn.forgotPassword")}
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
                : t("auth.practitionerSignIn.submit")
            }
            onPress={() => void submitCredentials()}
            disabled={
              isSubmitting || !email || !password || Boolean(emailError)
            }
            style={styles.primaryButton}
          />

          <View style={styles.rowWrap}>
            <Text color={theme.colors.textSecondary}>
              {t("auth.practitionerSignIn.noAccount")}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/signup/practitioner")}
            >
              <Text color={theme.colors.textBrand} weight="600">
                {t("auth.practitionerSignIn.createAccount")}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <View
            style={[
              styles.challengeCard,
              {
                backgroundColor: theme.colors.primaryLight,
                borderColor: theme.colors.borderStrong,
              },
            ]}
          >
            <Text
              weight="600"
              color={theme.colors.textPrimary}
              style={styles.challengeTitle}
            >
              {t("auth.practitionerSignIn.otpTitle")}
            </Text>
            <Text
              color={theme.colors.textSecondary}
              style={styles.challengeBody}
            >
              {t("auth.practitionerSignIn.otpHint", {
                channel: challenge.channel,
                target: challenge.maskedTarget,
              })}
            </Text>
            <Text color={theme.colors.textMuted} style={styles.challengeMeta}>
              {t("auth.practitionerSignIn.challengeExpires", {
                expiresAt: new Date(challenge.expiresAt).toLocaleString(),
              })}
            </Text>
          </View>

          <Input
            autoCapitalize="none"
            keyboardType="number-pad"
            label={t("auth.fields.otpCode")}
            maxLength={8}
            onChangeText={setOtpCode}
            placeholder={t("auth.placeholders.otpCode")}
            value={otpCode}
          />

          {infoText ? (
            <Text style={styles.infoText} color={theme.colors.textSecondary}>
              {infoText}
            </Text>
          ) : null}
          {errorText ? (
            <Text style={styles.errorText} color="#dc2626">
              {errorText}
            </Text>
          ) : null}

          <Button
            title={
              isSubmitting
                ? t("auth.common.pleaseWait")
                : t("auth.practitionerSignIn.verifyOtp")
            }
            onPress={() => void submitOtp()}
            disabled={isSubmitting || otpCode.trim().length < 4}
            style={styles.primaryButton}
          />
          <Button
            title={t("auth.practitionerSignIn.changeCredentials")}
            variant="secondary"
            onPress={() => {
              setChallenge(null);
              setOtpCode("");
              setErrorText(null);
              setInfoText(null);
            }}
          />
        </>
      )}

      {isSubmitting ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : null}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
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
  inlineLink: {
    fontSize: 13,
    marginBottom: 14,
  },
  primaryButton: {
    marginBottom: 14,
  },
  rowWrap: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    marginBottom: 12,
  },
  challengeCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  challengeTitle: {
    fontSize: 16,
    marginBottom: 6,
  },
  challengeBody: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 6,
  },
  challengeMeta: {
    fontSize: 12,
  },
  backText: {
    fontSize: 13,
    textAlign: "center",
  },
  loader: {
    marginTop: 12,
  },
});
