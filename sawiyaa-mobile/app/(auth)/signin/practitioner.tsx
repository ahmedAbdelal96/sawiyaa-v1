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
import { getAuthLockoutErrorMessage } from "../../../src/features/auth/auth-lockout-messages";
import type {
  PractitionerOtpChallengeResponse,
  PractitionerLoginResponse,
} from "../../../src/features/auth/contracts";

function validateEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email.trim());
}

const DEV_ACCOUNTS = [
  {
    label: "dr.mohamed",
    email: "amohamef206@gmail.com",
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
  const { t, i18n } = useTranslation();
  const { startPractitionerLogin, verifyPractitionerOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [challenge, setChallenge] =
    useState<PractitionerOtpChallengeResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [infoText, setInfoText] = useState<string | null>(null);

  const isArabic = i18n.language?.startsWith("ar");
  const practitionerEyebrow = isArabic ? "دخول المختص" : t("auth.practitionerSignIn.eyebrow");
  const practitionerTitle = isArabic ? "ادخل إلى مساحة عملك كمختص" : t("auth.practitionerSignIn.title");
  const practitionerSubtitle = isArabic
    ? "في وضع التطوير الحالي، إذا رجع السيرفر جلسة مباشرة سيتم الدخول فورًا بدون OTP."
    : t("auth.practitionerSignIn.subtitle");

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
      if (response.nextStep === "OTP_REQUIRED" && isOtpChallengeResponse(response)) {
        setChallenge(response);
        setOtpCode("");
        setErrorText(null);
        setInfoText(null);
      } else if (response.nextStep === "AUTHENTICATED") {
        setChallenge(null);
      } else {
        throw new Error("PRACTITIONER_LOGIN_UNKNOWN_NEXT_STEP");
      }
      setInfoText(response.message);
    } catch (error) {
      setErrorText(getAuthLockoutErrorMessage(error, "practitioner-password", t));
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
      setErrorText(getAuthLockoutErrorMessage(error, "practitioner-otp", t));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScaffold
      eyebrow={practitionerEyebrow}
      title={practitionerTitle}
      subtitle={practitionerSubtitle}
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
                : isArabic
                  ? "دخول المختص"
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
              {isArabic ? "ليس لديك حساب مختص؟" : t("auth.practitionerSignIn.noAccount")}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/signup/practitioner")}
            >
              <Text color={theme.colors.textBrand} weight="600">
                {isArabic ? "سجل عبر الويب" : t("auth.practitionerSignIn.createAccount")}
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
                expiresAt: challenge.expiresAt
                  ? new Date(challenge.expiresAt).toLocaleString()
                  : "—",
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
            style={styles.primaryButton}
          />
        </>
      )}

      {isSubmitting ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : null}
    </AuthScaffold>
  );
}

function isOtpChallengeResponse(
  response: unknown,
): response is PractitionerOtpChallengeResponse {
  if (typeof response !== "object" || response === null) {
    return false;
  }

  const value = response as Record<string, unknown>;
  return (
    value.nextStep === "OTP_REQUIRED" &&
    typeof value.challengeId === "string" &&
    typeof value.maskedTarget === "string" &&
    typeof value.expiresAt === "string" &&
    typeof value.channel === "string" &&
    value.requiresOtpVerification === true
  );
}

const styles = StyleSheet.create({
  devBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3f7dcf33",
    backgroundColor: "#3f7dcf0a",
    padding: 9,
    marginBottom: 12,
  },
  devLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  devRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  devChip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  devChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  inlineLink: {
    fontSize: 12,
    marginBottom: 10,
  },
  primaryButton: {
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  rowWrap: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    marginBottom: 8,
  },
  challengeCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 11,
    marginBottom: 12,
  },
  challengeTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  challengeBody: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  challengeMeta: {
    fontSize: 10,
  },
  backText: {
    fontSize: 12,
    textAlign: "center",
  },
  loader: {
    marginTop: 10,
  },
});
