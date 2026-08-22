import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AuthScaffold } from "../../../src/components/auth/AuthScaffold";
import { Button, Input, Text, OtpInput } from "../../../src/components/ui";
import { useAuth } from "../../../src/providers/AuthProvider";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { usePublicTheme } from "../../../src/features/public/theme/public-theme";
import { useAppDirection } from "../../../src/i18n/direction";
import { useTranslation } from "react-i18next";
import { formatViewerDateTime } from "../../../src/lib/time-formatting";
import { getAuthLockoutErrorMessage } from "../../../src/features/auth/auth-lockout-messages";
import type { PractitionerOtpChallengeResponse } from "../../../src/features/auth/contracts";

function validateEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email.trim());
}

const DEV_ACCOUNTS: Array<{ label: string; email: string; password: string }> = __DEV__
  ? [
      {
        label: "د. ممارس تجريبي",
        email: "dr.mohamed@hesba.local",
        password: "Practitioner2@12345",
      },
    ]
  : [];

export default function PractitionerSignInScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { publicTheme } = usePublicTheme();
  const { t, i18n } = useTranslation();
  const { isRTL } = useAppDirection();
  const { startPractitionerLogin, verifyPractitionerOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [challenge, setChallenge] =
    useState<PractitionerOtpChallengeResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [infoText, setInfoText] = useState<string | null>(null);

  const isArabic = i18n.language?.startsWith("ar");
  const practitionerEyebrow = isArabic
    ? "🩺 بوابة المختصين والخبراء"
    : t("auth.practitionerSignIn.eyebrow", { defaultValue: "Practitioner Portal" });
  const practitionerTitle = isArabic
    ? "دخول مساحة عمل المختص"
    : t("auth.practitionerSignIn.title", { defaultValue: "Sign In as Practitioner" });
  const practitionerSubtitle = isArabic
    ? "أهلاً بك دكتور، سجل دخولك لمتابعة استشاراتك ورعاية مرضاك"
    : t("auth.practitionerSignIn.subtitle", { defaultValue: "Access your dashboard, schedule, and patient care requests" });

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
      if (
        response.nextStep === "OTP_REQUIRED" &&
        isOtpChallengeResponse(response)
      ) {
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
      setErrorText(
        getAuthLockoutErrorMessage(error, "practitioner-password", t),
      );
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
            {t("auth.common.backToEntry", { defaultValue: isArabic ? "الرجوع لاختيار مسار الدخول" : "Back to sign in options" })}
          </Text>
        </TouchableOpacity>
      }
    >
      {!challenge ? (
        <>
          {/* Email Input */}
          <Input
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label={t("auth.fields.email", { defaultValue: isArabic ? "البريد الإلكتروني" : "Email address" })}
            onChangeText={setEmail}
            placeholder={t("auth.placeholders.email", { defaultValue: "practitioner@domain.com" })}
            value={email}
            error={emailError ?? undefined}
            leftElement={
              <Ionicons
                name="mail-outline"
                size={19}
                color={publicTheme.secondaryText}
              />
            }
          />

          {/* Password Input */}
          <Input
            autoCapitalize="none"
            autoComplete="password"
            label={t("auth.fields.password", { defaultValue: isArabic ? "كلمة المرور" : "Password" })}
            onChangeText={setPassword}
            placeholder={t("auth.placeholders.password", { defaultValue: "••••••••••••" })}
            secureTextEntry={!showPassword}
            value={password}
            leftElement={
              <Ionicons
                name="lock-closed-outline"
                size={19}
                color={publicTheme.secondaryText}
              />
            }
            rightElement={
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeButton}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={19}
                  color={publicTheme.secondaryText}
                />
              </TouchableOpacity>
            }
          />

          {/* Forgot Password Link */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(auth)/practitioner-forgot-password")}
            style={[
              styles.forgotWrap,
              { alignSelf: isRTL ? "flex-start" : "flex-end" },
            ]}
          >
            <Text
              color={theme.colors.textBrand}
              weight="700"
              style={styles.forgotText}
            >
              {t("auth.practitionerSignIn.forgotPassword", { defaultValue: isArabic ? "نسيت كلمة المرور؟" : "Forgot password?" })}
            </Text>
          </TouchableOpacity>

          {/* Error Banner */}
          {errorText ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.errorText} color="#DC2626">
                {errorText}
              </Text>
            </View>
          ) : null}

          {/* Main Action Button */}
          <Button
            title={
              isSubmitting
                ? t("auth.common.pleaseWait", { defaultValue: isArabic ? "جارٍ تسجيل الدخول..." : "Please wait..." })
                : isArabic
                  ? "دخول مساحة العمل"
                  : t("auth.practitionerSignIn.submit", { defaultValue: "Sign In as Practitioner" })
            }
            onPress={() => void submitCredentials()}
            disabled={
              isSubmitting || !email || !password || Boolean(emailError)
            }
            style={[
              styles.primaryButton,
              { backgroundColor: publicTheme.primaryText },
            ]}
          />

          {/* Practitioner registration is intentionally Web-only. Keep the route
              available for existing product flows, but do not expose navigation
              to it from Mobile sign-in. */}
          <View style={styles.footerNotice}>
            <Text
              color={publicTheme.secondaryText}
              style={styles.footerNoticeText}
            >
              {t("auth.practitionerSignIn.registrationWebOnly", {
                defaultValue: isArabic
                  ? "إنشاء حساب المختص والتقديم متاحان عبر الموقع الإلكتروني فقط."
                  : "Practitioner account creation and applications are available on the Web only.",
              })}
            </Text>
          </View>

          {/* Dev Test Accounts Section */}
          {__DEV__ && DEV_ACCOUNTS.length > 0 && (
            <View
              style={[
                styles.devBox,
                {
                  backgroundColor: publicTheme.accentMint,
                  borderColor: publicTheme.subtleBorder,
                },
              ]}
            >
              <View style={styles.devHeader}>
                <Ionicons name="flash-outline" size={14} color={publicTheme.primaryText} />
                <Text
                  variant="caption"
                  weight="700"
                  color={publicTheme.primaryText}
                  style={styles.devTitle}
                >
                  حسابات التجربة والاختبار
                </Text>
              </View>
              <View style={styles.devRow}>
                {DEV_ACCOUNTS.map((a) => (
                  <TouchableOpacity
                    key={a.email}
                    style={[
                      styles.devChip,
                      {
                        backgroundColor: publicTheme.raisedSurface,
                        borderColor: publicTheme.subtleBorder,
                      },
                    ]}
                    onPress={() => {
                      setEmail(a.email);
                      setPassword(a.password);
                      setErrorText(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.devChipTitle, { color: publicTheme.primaryText }]}
                      weight="700"
                    >
                      {a.label}
                    </Text>
                    <Text
                      variant="caption"
                      color={publicTheme.secondaryText}
                      style={styles.devChipText}
                    >
                      {a.email}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </>
      ) : (
        <>
          {/* OTP Challenge Screen */}
          <View
            style={[
              styles.challengeCard,
              {
                backgroundColor: publicTheme.accentMint,
                borderColor: publicTheme.subtleBorder,
              },
            ]}
          >
            <View style={styles.challengeIconRow}>
              <Ionicons name="shield-checkmark-outline" size={24} color={publicTheme.primaryText} />
              <Text
                weight="bold"
                color={publicTheme.primaryText}
                style={styles.challengeTitle}
              >
                {t("auth.practitionerSignIn.otpTitle", { defaultValue: isArabic ? "التحقق المزدوج المطلوب" : "OTP Verification" })}
              </Text>
            </View>
            <Text
              color={publicTheme.secondaryText}
              style={styles.challengeBody}
            >
              {t("auth.practitionerSignIn.otpHint", {
                channel: challenge.channel,
                target: challenge.maskedTarget,
                defaultValue: `أدخل كود التحقق المرسل عبر ${challenge.channel} إلى ${challenge.maskedTarget}`,
              })}
            </Text>
            <Text color={publicTheme.secondaryText} style={styles.challengeMeta}>
              {t("auth.practitionerSignIn.challengeExpires", {
                expiresAt: challenge.expiresAt
                  ? formatViewerDateTime(challenge.expiresAt, {
                      locale: i18n.language,
                      fallbackText: "-",
                    })
                  : "—",
              })}
            </Text>
          </View>

          <OtpInput
            value={otpCode}
            onChangeText={setOtpCode}
            length={6}
            disabled={isSubmitting}
            label={t("auth.fields.otpCode", { defaultValue: isArabic ? "رمز التحقق (OTP)" : "Verification Code" })}
          />

          {infoText ? (
            <Text style={styles.infoText} color={publicTheme.secondaryText}>
              {infoText}
            </Text>
          ) : null}
          {errorText ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.errorText} color="#DC2626">
                {errorText}
              </Text>
            </View>
          ) : null}

          <Button
            title={
              isSubmitting
                ? t("auth.common.pleaseWait", { defaultValue: "Please wait..." })
                : t("auth.practitionerSignIn.verifyOtp", { defaultValue: isArabic ? "تأكيد والوصول" : "Verify Code" })
            }
            onPress={() => void submitOtp()}
            disabled={isSubmitting || otpCode.trim().length < 6}
            style={[
              styles.primaryButton,
              { backgroundColor: publicTheme.primaryText },
            ]}
          />
          <Button
            title={t("auth.practitionerSignIn.changeCredentials", { defaultValue: isArabic ? "تغيير بيانات الدخول" : "Change Login Info" })}
            variant="secondary"
            onPress={() => {
              setChallenge(null);
              setOtpCode("");
              setErrorText(null);
              setInfoText(null);
            }}
            style={styles.secondaryButton}
          />
        </>
      )}

      {isSubmitting ? (
        <ActivityIndicator style={styles.loader} color={publicTheme.primaryText} />
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
  forgotWrap: {
    marginTop: -4,
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 13,
    textDecorationLine: "underline",
  },
  eyeButton: {
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  infoText: {
    fontSize: 13,
    marginBottom: 10,
    textAlign: "center",
  },
  primaryButton: {
    borderRadius: 16,
    minHeight: 52,
    justifyContent: "center",
    marginBottom: 14,
  },
  secondaryButton: {
    borderRadius: 16,
    minHeight: 48,
    justifyContent: "center",
    marginBottom: 14,
  },
  footerNotice: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingHorizontal: 16,
  },
  footerNoticeText: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
  },
  devBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginTop: 18,
    gap: 8,
  },
  devHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  devTitle: {
    fontSize: 12,
  },
  devRow: {
    gap: 6,
  },
  devChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  devChipTitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  devChipText: {
    fontSize: 11.5,
  },
  challengeCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  challengeIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  challengeTitle: {
    fontSize: 15,
  },
  challengeBody: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  challengeMeta: {
    fontSize: 11.5,
  },
  backText: {
    fontSize: 13,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  loader: {
    marginTop: 8,
  },
});
